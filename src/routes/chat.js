import express from 'express';
import { sendMessage, handleResponseAndMetadata } from '../controllers/chatController.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

router.post('/sendMessage', authenticate, sendMessage, handleResponseAndMetadata);

export default router;