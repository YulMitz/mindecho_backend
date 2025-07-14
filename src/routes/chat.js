import express from 'express';
import { sendMessage } from '../controllers/chatController.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

router.post('/sendMessage', authenticate, sendMessage);

export default router;