import axios from 'axios';

class ConsultingService {
    constructor() {
        this.ragApiUrl = process.env.RAG_API_URL || 'http://localhost:5001';
    }

    async digestUserHistory(userId, forceRefresh = false) {
        try {
            const { userId } = req.params;
            const { forceRefresh = false } = req.body;

            // Call RAG system to digest history
            const response = await axios.post(
                `${this.ragApiUrl}/user/${userId}/digest`,
                { force_refresh: forceRefresh },
                { timeout: 60000 } // Increased timeout for digest operations
            );

            res.json({
                status: 'success',
                ...response.data
            });

        } catch (error) {
            console.error('Error digesting user history:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to digest user history',
                error: error.message
            });
        }
    }

    async getUserContext(userId, query = '', therapyType = 'DEFAULT', limit = 5) {
        try {
            const response = await axios.get(
                `${this.ragApiUrl}/user/${userId}/context`,
                {
                    params: { query, therapy_type: therapyType, limit },
                    timeout: 10000
                }
            );

            return response.data.context;
        } catch (error) {
            console.error('Error getting user context:', error);
            return null;
        }
    }

    async getUserInsights(userId) {
        try {
            const response = await axios.get(
                `${this.ragApiUrl}/user/${userId}/insights`,
                { timeout: 15000 }
            );

            return response.data.insights;
        } catch (error) {
            console.error('Error getting user insights:', error);
            return null;
        }
    }

    async getUserSummary(userId, days = 30) {
        try {
            const response = await axios.get(
                `${this.ragApiUrl}/user/${userId}/summary`,
                {
                    params: { days },
                    timeout: 10000
                }
            );

            return response.data.summary;
        } catch (error) {
            console.error('Error getting user summary:', error);
            return null;
        }
    }

    async getEnhancedContext(userId, currentMessage, therapyType) {
        try {
            // Get relevant context based on current message
            const context = await this.getUserContext(
                userId,
                currentMessage,
                therapyType,
                3
            );

            if (!context) return null;

            // Format context for LLM prompt
            const formattedContext = this.formatContextForLLM(context);

            return formattedContext;
        } catch (error) {
            console.error('Error getting enhanced context:', error);
            return null;
        }
    }

    formatContextForLLM(context) {
        if (!context.relevant_content || context.relevant_content.length === 0) {
            return null;
        }

        const contextSummary = {
            main_themes: context.main_themes,
            recent_patterns: context.recent_patterns,
            relevant_conversations: context.relevant_content.map(item => ({
                content: item.content.substring(0, 200) + '...',
                topics: item.topics,
                sentiment: item.sentiment,
                timestamp: item.timestamp
            }))
        };

        return contextSummary;
    }
}

export default new ConsultingService();