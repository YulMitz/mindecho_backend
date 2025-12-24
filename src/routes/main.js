import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
    updateMentalHealthMetric,
    getMentalHealthMetric,
    submitDailyQuestions,
    getDailyQuestions,
    getScaleQuestions,
    submitScaleAnswers,
    getUserScaleSessions,
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
router.get('/scales/:code/questions', authenticate, getScaleQuestions);
router.post('/scales/:code/answers', authenticate, submitScaleAnswers);
router.get('/scales/sessions', authenticate, getUserScaleSessions);

export default router;
