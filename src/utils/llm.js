import dotenv from 'dotenv';
dotenv.config();

import prisma from '../config/database.js';

const INFERENCE_SERVICE_URL = process.env.INFERENCE_SERVICE_URL || 'http://localhost:6001';

/*
    Session definition configuration
    - Two confitions can determine if an user's chat session is active:
        - User is sending messages within time window.
        - If the topic that user is sending message to, have history length less than configuration.
*/
const ACTIVE_SESSION_WINDOW = 10 * 60 * 1000; // 10 minutes in milliseconds
const MAX_HISTORY_MESSAGES = 50;

// Maximum number of rounds allowed in an INITIAL consultation session.
// 1 round = 1 user message + 1 AI response.
export const INITIAL_MAX_ROUNDS = 5;

/*
    Parse the hidden mode-selection marker appended by the AI in INITIAL mode.
    Returns { cleanText, selectedMode } where selectedMode is null if the marker is absent.
*/
export const parseInitialModeMarker = (text) => {
  const match = text.match(/\n?<<SELECTED_MODE:(CBT|MBT|MBCT)>>\s*$/);
  if (!match) return { cleanText: text, selectedMode: null };
  return {
    cleanText: text.slice(0, match.index).trimEnd(),
    selectedMode: match[1],
  };
};

export const generateResponse = async (sessionId, chatbotType, text, provider = 'GEMINI') => {
  try {
    // Get session info to check last activity
    const session = await prisma.chatSession.findUnique({
      where: { sessionId }
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const now = new Date();
    const lastActivity = new Date(session.updatedAt);
    const timeSinceLastActivity = now - lastActivity;

    // Check if user is actively chatting (within time window)
    const isActiveSession = timeSinceLastActivity <= ACTIVE_SESSION_WINDOW;

    // Get message count for the session
    const messageCount = await prisma.message.count({
      where: { sessionId }
    });

    let conversationHistory = [];

    // Load history based on conditions
    if (isActiveSession || messageCount < MAX_HISTORY_MESSAGES) {
      console.log(`Loading full history: ${isActiveSession ? 'active session' : 'message count not reach limit'} (${messageCount} messages)`);

      conversationHistory = await prisma.message.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' }
      });
    } else {
      console.log(`Session inactive and has ${messageCount} messages - using recent context only`);

      // Load only recent messages (last 20) for context
      const recentHistory = await prisma.message.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'desc' },
        take: 20
      });

      conversationHistory = recentHistory.reverse(); // Restore chronological order
    }

    // For INITIAL mode, determine the current round number BEFORE storing the user message.
    // Round = number of USER messages already stored + 1 (the one about to be stored).
    let promptOptions = {};
    if (chatbotType === 'INITIAL') {
      const priorUserMessages = await prisma.message.count({
        where: { sessionId, messageType: 'USER' },
      });
      promptOptions = { currentRound: priorUserMessages + 1, maxRounds: INITIAL_MAX_ROUNDS };
    }

    // Store user message first
    await prisma.message.create({
      data: {
        sessionId,
        userId: session.userId,
        messageType: 'USER',
        chatbotType,
        content: text,
      }
    });

    // Call the Python inference service
    const inferenceBody = {
      session_id: sessionId,
      chatbot_type: chatbotType,
      message: text,
      conversation_history: conversationHistory.map((msg) => ({
        role: msg.messageType === 'USER' ? 'user' : 'model',
        content: msg.content,
      })),
      provider,
      prompt_options: promptOptions,
    };

    const inferenceResponse = await fetch(`${INFERENCE_SERVICE_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inferenceBody),
    });

    if (!inferenceResponse.ok) {
      const errorBody = await inferenceResponse.json().catch(() => ({}));
      throw new Error(errorBody.detail || `Inference service error: ${inferenceResponse.status}`);
    }

    return await inferenceResponse.json();
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
};

/*
    Handle metadata and response storage after sending a message
*/
export const storeResponse = async (
  sessionId,
  userId,
  chatbotType,
  response,
  provider = 'GEMINI'
) => {
  try {
    // Store the bot response
    const message = await prisma.message.create({
      data: {
        sessionId,
        userId,
        messageType: 'MODEL',
        chatbotType,
        provider,
        content: response.text,
      }
    });

    // Update session timestamp for activity tracking
    await prisma.chatSession.update({
      where: { sessionId },
      data: { updatedAt: new Date() }
    });

    console.log('Response stored successfully for session:', sessionId);
    return message;
  } catch (error) {
    console.error('Error storing response:', error);
    throw error;
  }
};

export default {
  generateResponse,
  storeResponse,
};
