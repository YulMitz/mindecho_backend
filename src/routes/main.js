const express = require('express');
const { authenticate } = require('../middleware/auth');
const { updateMentalHealthMetric, getMentalHealthMetric } = require('../controllers/mainPage/metricController');

const router = express.Router();

router.post('/updateMetrics', authenticate, updateMentalHealthMetric);
router.get('/getMetrics', authenticate, getMentalHealthMetric);

module.exports = router;