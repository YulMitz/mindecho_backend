import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
    updateMentalHealthMetric,
    getMentalHealthMetric,
    submitDailyQuestions,
    getDailyQuestions,
} from '../controllers/metricController.js';

const router = express.Router();

/*
Responsible for setting up routes for api services on the main page
*/

router.post('/updateMetrics', authenticate, updateMentalHealthMetric);

router.post('/getMetrics', authenticate, getMentalHealthMetric);
router.get('/getMetrics', authenticate, getMentalHealthMetric);
router.post('/dailyQuestions', authenticate, submitDailyQuestions);
router.get('/dailyQuestions', authenticate, getDailyQuestions);

export default router;
