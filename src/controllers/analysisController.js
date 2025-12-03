import consultingService from '../services/consulting.js';

export const getConsultingReport = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'userId is required'
            });
        }

        // Generate consulting report
        const report = await consultingService.generateConsultingReport(userId);

        res.json({
            status: 'success',
            report
        });

    } catch (error) {
        console.error('Error generating consulting report:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to generate consulting report',
            error: error.message
        });
    }
};

export default {
    getConsultingReport
};