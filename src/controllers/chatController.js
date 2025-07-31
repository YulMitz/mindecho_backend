import { generateResponse, storeResponseAndMetadata } from "../utils/llm.js";

/*
    Send a message and get a response from the LLM
*/
export const sendMessage = async (req, res, next) => {
    try {
        const { userId, chatbotType, text } = req.body;
        
        // Generate response using LLM
        const response = await generateResponse(userId, chatbotType, text);

        // Store the response in the req for next middleware
        req.userMessage = text;
        req.response = response;
        req.userId = userId;
        req.chatbotType = chatbotType; 

        // Send the response to the next middleware for storage
        next();
    } catch (error) {
        res.status(400).json({ message: error.message });
        return;
    }
};

/*
    Middleware function after sending a message
*/
export const handleResponseAndMetadata = async(req, res) => {
    try {
        const { userId, userMessage, chatbotType, response } = req;

        await storeResponseAndMetadata(userId, chatbotType, response);
        console.log('Response and metadata stored successfully');

        // Send final response to the client
        res.json({
            message: 'Message sent successfully',
            userMessage: userMessage,
            response: response.text,
            timeSent: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Error in storeResponseAndMetadata:', error);
        throw error;
    }
};

/*
    Retrieve chat history for a user
*/
export const getChatHistory = async (req, res) => {
    try {

    } catch (error) {
        res.status(400).json({ message: error.message });
        return;
    }
};

export default {
    sendMessage,
    handleResponseAndMetadata
};