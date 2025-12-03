import express from 'express';
import { getConsultingReport } from '../controllers/analysisController.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

router.get('/getReport', authenticate, getConsultingReport);

export default router;