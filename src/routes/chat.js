import express from 'express';
import {
    sendMessage,
    handleResponse,
} from '../controllers/chatController.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

router.post(
    '/sendMessage',
    authenticate,
    sendMessage,
    handleResponse
);

export default router;
