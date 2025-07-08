import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { 
    updateMentalHealthMetric, 
    getMentalHealthMetric 
} from '../controllers/metricController.js';

const router = express.Router();

/*
Responsible for setting up routes for api services on the main page
*/

router.post('/updateMetrics', authenticate, updateMentalHealthMetric);
router.get('/getMetrics', authenticate, getMentalHealthMetric);

export default router;