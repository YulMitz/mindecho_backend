import express from 'express';
import {
    createChatTopic,
    sendMessage,
    handleResponse,
    createChatSession,
    listChatSessions,
    sendSessionMessage,
    getSessionMessages,
    deleteChatSession,
} from '../controllers/chatController.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

router.post('/sessions', authenticate, createChatSession);
router.get('/sessions', authenticate, listChatSessions);
router.post('/sessions/:id/messages', authenticate, sendSessionMessage);
router.get('/sessions/:id/messages', authenticate, getSessionMessages);
router.delete('/sessions/:id', authenticate, deleteChatSession);

router.post(
    '/sendMessage',
    authenticate,
    sendMessage,
    handleResponse
);

export default router;
