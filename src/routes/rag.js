import express from 'express';
import { getUserMessages, markMessagesAsDigested } from '../controllers/internalController.js';

const router = express.Router();

// Get user messages (with optional incremental fetch)
router.get('/user/:userId/messages', getUserMessages);

// Mark messages as digested
router.put('/user/:userId/messages/digested', markMessagesAsDigested);

export default router;