import express from 'express';
import {
    createChatTopic,
    sendMessage,
    handleResponse,
} from '../controllers/chatController.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

router.post('/createTopic', authenticate, createChatTopic);

router.post(
    '/sendMessage',
    authenticate,
    sendMessage,
    handleResponse
);

export default router;
