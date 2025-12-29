import express from 'express';
import authenticate from '../middleware/auth.js';
import {
    createHealthAdvice,
    getHealthAdvice,
} from '../controllers/healthController.js';

const router = express.Router();

router.post('/advice', authenticate, createHealthAdvice);
router.get('/advice', authenticate, getHealthAdvice);

export default router;
