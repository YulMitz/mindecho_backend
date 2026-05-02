import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
    listUsers,
    llmStats,
    getUserChats,
} from '../controllers/adminController.js';

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/users', listUsers);
router.get('/llm-stats', llmStats);
router.get('/users/:userId/chats', getUserChats);

export default router;
