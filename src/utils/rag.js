import axios from 'axios';
import { PrismaClient } from '../../prisma-client/index.js';

const prisma = new PrismaClient();

class ConsultingService {
    constructor() {
        this.ragApiUrl = process.env.RAG_API_URL || 'http://localhost:5001';
    }

    async generateConsultingReport(userId) {
        try {
            // 1. Get user's chat embeddings from RAG system
            const embeddings = await this.getUserEmbeddings(userId);

            // 2. Get user's recent diary entries (7 days)
            const diaryEntries = await this.getUserRecentDiary(userId, 7);

            // 3. Generate consulting report
            const report = await this.createConsultingReport(userId, embeddings, diaryEntries);

            return report;

        } catch (error) {
            console.error('Error generating consulting report:', error);
            throw error;
        }
    }

    async getUserEmbeddings(userId) {
        try {
            const response = await axios.get(
                `${this.ragApiUrl}/user/${userId}/embeddings`,
                {
                    params: {
                        query: 'mental health patterns, concerns, progress, therapy sessions',
                        limit: 25
                    },
                    timeout: 15000
                }
            );

            return response.data.embeddings || [];
        } catch (error) {
            console.error('Error getting user embeddings:', error);
            return [];
        }
    }

    async getUserRecentDiary(userId, days = 7) {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const diaryEntries = await prisma.diaryEntry.findMany({
                where: {
                    userId: userId,
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                include: {
                    diary: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return diaryEntries.map(entry => ({
                id: entry.id,
                content: entry.content,
                mood: entry.mood,
                date: entry.createdAt.toISOString().split('T')[0],
                timestamp: entry.createdAt,
                diaryTitle: entry.diary?.title || 'Daily Entry'
            }));

        } catch (error) {
            console.error('Error getting user diary entries:', error);
            return [];
        }
    }

    async createConsultingReport(userId, embeddings, diaryEntries) {
        try {
            // Analyze chat patterns
            const chatAnalysis = this.analyzeChatPatterns(embeddings);

            // Analyze diary patterns
            const diaryAnalysis = this.analyzeDiaryPatterns(diaryEntries);

            // Generate comprehensive report
            const report = {
                user_id: userId,
                generated_at: new Date().toISOString(),
                period: {
                    diary_days: 7,
                    chat_sessions_analyzed: embeddings.length
                },

                // Mental Health Overview
                mental_health_overview: {
                    primary_concerns: chatAnalysis.primary_concerns,
                    mood_trend: diaryAnalysis.mood_trend,
                    engagement_level: chatAnalysis.engagement_level,
                    progress_indicators: this.identifyProgressIndicators(chatAnalysis, diaryAnalysis)
                },

                // Detailed Analysis
                chat_analysis: {
                    dominant_themes: chatAnalysis.dominant_themes,
                    therapy_engagement: chatAnalysis.therapy_engagement,
                    concerning_patterns: chatAnalysis.concerning_patterns,
                    positive_patterns: chatAnalysis.positive_patterns,
                    session_frequency: chatAnalysis.session_frequency
                },

                diary_analysis: {
                    mood_patterns: diaryAnalysis.mood_patterns,
                    entry_frequency: diaryAnalysis.entry_frequency,
                    key_insights: diaryAnalysis.key_insights,
                    emotional_trends: diaryAnalysis.emotional_trends
                },

                // Recommendations
                recommendations: this.generateRecommendations(chatAnalysis, diaryAnalysis),

                // Risk Assessment
                risk_assessment: this.assessRisk(chatAnalysis, diaryEntries),

                // Progress Summary
                progress_summary: this.summarizeProgress(chatAnalysis, diaryAnalysis)
            };

            return report;

        } catch (error) {
            console.error('Error creating consulting report:', error);
            throw error;
        }
    }

    analyzeChatPatterns(embeddings) {
        if (!embeddings || embeddings.length === 0) {
            return {
                primary_concerns: [],
                dominant_themes: [],
                engagement_level: 'low',
                therapy_engagement: {},
                concerning_patterns: [],
                positive_patterns: [],
                session_frequency: 'low'
            };
        }

        // Extract all topics and concerns
        const allTopics = embeddings.flatMap(e => e.topics || []);
        const allConcerns = embeddings.flatMap(e => e.concerns_identified || []);
        const sentiments = embeddings.map(e => e.sentiment);

        // Count topic frequency
        const topicCounts = {};
        allTopics.forEach(topic => {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });

        // Get dominant themes
        const dominantThemes = Object.entries(topicCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([topic, count]) => ({ topic, frequency: count }));

        // Analyze sentiment trends
        const positiveCount = sentiments.filter(s => s === 'positive').length;
        const negativeCount = sentiments.filter(s => s === 'negative').length;
        const neutralCount = sentiments.filter(s => s === 'neutral').length;

        // Therapy type engagement
        const therapyEngagement = {};
        embeddings.forEach(e => {
            const type = e.therapy_type || 'DEFAULT';
            therapyEngagement[type] = (therapyEngagement[type] || 0) + 1;
        });

        // Identify patterns
        const concerningPatterns = this.identifyConcerningPatterns(embeddings);
        const positivePatterns = this.identifyPositivePatterns(embeddings);

        return {
            primary_concerns: [...new Set(allConcerns)],
            dominant_themes: dominantThemes,
            engagement_level: this.calculateEngagementLevel(embeddings.length),
            therapy_engagement: therapyEngagement,
            concerning_patterns: concerningPatterns,
            positive_patterns: positivePatterns,
            session_frequency: this.calculateSessionFrequency(embeddings),
            sentiment_distribution: {
                positive: positiveCount,
                negative: negativeCount,
                neutral: neutralCount
            }
        };
    }

    analyzeDiaryPatterns(diaryEntries) {
        if (!diaryEntries || diaryEntries.length === 0) {
            return {
                mood_trend: 'neutral',
                mood_patterns: [],
                entry_frequency: 'low',
                key_insights: [],
                emotional_trends: []
            };
        }

        // Analyze mood trends
        const moods = diaryEntries.map(entry => entry.mood).filter(Boolean);
        const moodCounts = {};
        moods.forEach(mood => {
            moodCounts[mood] = (moodCounts[mood] || 0) + 1;
        });

        // Calculate mood trend (recent vs earlier entries)
        const recentMoods = diaryEntries.slice(0, 3).map(e => e.mood).filter(Boolean);
        const earlierMoods = diaryEntries.slice(-3).map(e => e.mood).filter(Boolean);

        const moodTrend = this.calculateMoodTrend(recentMoods, earlierMoods);

        // Extract key insights from diary content
        const keyInsights = this.extractDiaryInsights(diaryEntries);

        return {
            mood_trend: moodTrend,
            mood_patterns: Object.entries(moodCounts).map(([mood, count]) => ({ mood, count })),
            entry_frequency: this.calculateDiaryFrequency(diaryEntries.length),
            key_insights: keyInsights,
            emotional_trends: this.analyzeEmotionalTrends(diaryEntries),
            total_entries: diaryEntries.length
        };
    }

    identifyProgressIndicators(chatAnalysis, diaryAnalysis) {
        const indicators = [];

        // Positive chat patterns
        if (chatAnalysis.positive_patterns.length > 0) {
            indicators.push({
                type: 'positive',
                category: 'therapy_engagement',
                description: 'Showing positive engagement in therapy conversations'
            });
        }

        // Improving mood trend
        if (diaryAnalysis.mood_trend === 'improving') {
            indicators.push({
                type: 'positive',
                category: 'mood_improvement',
                description: 'Recent diary entries show mood improvement'
            });
        }

        // Regular engagement
        if (chatAnalysis.engagement_level === 'high') {
            indicators.push({
                type: 'positive',
                category: 'consistent_engagement',
                description: 'Maintaining consistent engagement with mental health support'
            });
        }

        return indicators;
    }

    generateRecommendations(chatAnalysis, diaryAnalysis) {
        const recommendations = [];

        // Based on primary concerns
        if (chatAnalysis.primary_concerns.includes('anxiety')) {
            recommendations.push({
                category: 'anxiety_management',
                priority: 'high',
                recommendation: 'Consider incorporating more CBT techniques and anxiety management strategies',
                rationale: 'Anxiety patterns identified in chat history'
            });
        }

        if (chatAnalysis.primary_concerns.includes('depression')) {
            recommendations.push({
                category: 'depression_support',
                priority: 'high',
                recommendation: 'Focus on mood tracking and behavioral activation techniques',
                rationale: 'Depression-related concerns identified in conversations'
            });
        }

        // Based on diary frequency
        if (diaryAnalysis.entry_frequency === 'low') {
            recommendations.push({
                category: 'self_monitoring',
                priority: 'medium',
                recommendation: 'Encourage more regular diary entries for better mood tracking',
                rationale: 'Low diary entry frequency may limit self-awareness'
            });
        }

        // Based on therapy engagement
        const totalSessions = Object.values(chatAnalysis.therapy_engagement).reduce((a, b) => a + b, 0);
        if (totalSessions > 10) {
            recommendations.push({
                category: 'therapy_progression',
                priority: 'medium',
                recommendation: 'Consider exploring advanced therapeutic techniques',
                rationale: 'High engagement suggests readiness for deeper therapeutic work'
            });
        }

        return recommendations;
    }

    assessRisk(chatAnalysis, diaryEntries) {
        let riskLevel = 'low';
        const riskFactors = [];

        // Check for high-risk concerns
        const highRiskConcerns = ['suicidal_ideation', 'self_harm'];
        const hasHighRiskConcerns = chatAnalysis.primary_concerns.some(concern =>
            highRiskConcerns.includes(concern)
        );

        if (hasHighRiskConcerns) {
            riskLevel = 'high';
            riskFactors.push('High-risk concerns identified in conversations');
        }

        // Check for concerning patterns
        if (chatAnalysis.concerning_patterns.length > 2) {
            riskLevel = riskLevel === 'high' ? 'high' : 'medium';
            riskFactors.push('Multiple concerning patterns identified');
        }

        // Check diary mood patterns
        const recentNegativeMoods = diaryEntries
            .slice(0, 3)
            .filter(entry => ['very_sad', 'depressed', 'anxious'].includes(entry.mood));

        if (recentNegativeMoods.length >= 2) {
            riskLevel = riskLevel === 'high' ? 'high' : 'medium';
            riskFactors.push('Recent diary entries show persistent negative moods');
        }

        return {
            level: riskLevel,
            factors: riskFactors,
            assessment_date: new Date().toISOString()
        };
    }

    summarizeProgress(chatAnalysis, diaryAnalysis) {
        return {
            overall_progress: this.calculateOverallProgress(chatAnalysis, diaryAnalysis),
            key_achievements: this.identifyKeyAchievements(chatAnalysis, diaryAnalysis),
            areas_for_improvement: this.identifyImprovementAreas(chatAnalysis, diaryAnalysis),
            next_steps: this.suggestNextSteps(chatAnalysis, diaryAnalysis)
        };
    }

    // Helper methods
    calculateEngagementLevel(sessionCount) {
        if (sessionCount >= 20) return 'high';
        if (sessionCount >= 10) return 'medium';
        return 'low';
    }

    calculateSessionFrequency(embeddings) {
        if (embeddings.length === 0) return 'low';

        // Get unique sessions
        const uniqueSessions = new Set(embeddings.map(e => e.session_info?.session_id));
        const sessionCount = uniqueSessions.size;

        if (sessionCount >= 15) return 'high';
        if (sessionCount >= 8) return 'medium';
        return 'low';
    }

    calculateMoodTrend(recentMoods, earlierMoods) {
        // Simple mood scoring
        const moodScores = {
            'very_happy': 5, 'happy': 4, 'neutral': 3, 'sad': 2, 'very_sad': 1,
            'excited': 5, 'content': 4, 'okay': 3, 'down': 2, 'depressed': 1
        };

        const recentAvg = recentMoods.reduce((sum, mood) => sum + (moodScores[mood] || 3), 0) / (recentMoods.length || 1);
        const earlierAvg = earlierMoods.reduce((sum, mood) => sum + (moodScores[mood] || 3), 0) / (earlierMoods.length || 1);

        if (recentAvg > earlierAvg + 0.5) return 'improving';
        if (recentAvg < earlierAvg - 0.5) return 'declining';
        return 'stable';
    }

    calculateDiaryFrequency(entryCount) {
        if (entryCount >= 6) return 'high';    // Almost daily
        if (entryCount >= 3) return 'medium';  // Few times per week
        return 'low';                          // Rare entries
    }

    identifyConcerningPatterns(embeddings) {
        const patterns = [];

        // Check for increasing negative sentiment
        const recentEmbeddings = embeddings.slice(0, 5);
        const negativeRecent = recentEmbeddings.filter(e => e.sentiment === 'negative').length;

        if (negativeRecent >= 3) {
            patterns.push('Increasing negative sentiment in recent conversations');
        }

        // Check for high-risk concerns
        const highRiskCount = embeddings.filter(e =>
            e.concerns_identified?.some(c => ['suicidal_ideation', 'self_harm'].includes(c))
        ).length;

        if (highRiskCount > 0) {
            patterns.push('High-risk mental health concerns identified');
        }

        return patterns;
    }

    identifyPositivePatterns(embeddings) {
        const patterns = [];

        // Check for progress mentions
        const progressMentions = embeddings.filter(e =>
            e.content.toLowerCase().includes('progress') ||
            e.content.toLowerCase().includes('better') ||
            e.content.toLowerCase().includes('improvement')
        ).length;

        if (progressMentions >= 2) {
            patterns.push('User expressing sense of progress and improvement');
        }

        // Check for positive sentiment trend
        const recentEmbeddings = embeddings.slice(0, 5);
        const positiveRecent = recentEmbeddings.filter(e => e.sentiment === 'positive').length;

        if (positiveRecent >= 2) {
            patterns.push('Recent conversations show more positive sentiment');
        }

        return patterns;
    }

    extractDiaryInsights(diaryEntries) {
        const insights = [];

        // Look for common themes in diary content
        const allContent = diaryEntries.map(e => e.content || '').join(' ').toLowerCase();

        if (allContent.includes('sleep') && (allContent.includes('problem') || allContent.includes('difficult'))) {
            insights.push('Sleep-related concerns mentioned in diary entries');
        }

        if (allContent.includes('work') && allContent.includes('stress')) {
            insights.push('Work-related stress appears in diary reflections');
        }

        if (allContent.includes('grateful') || allContent.includes('thankful')) {
            insights.push('Expressing gratitude in diary entries - positive indicator');
        }

        return insights;
    }

    analyzeEmotionalTrends(diaryEntries) {
        // Track emotional keywords over time
        const emotionalKeywords = {
            'anxiety': ['anxious', 'worried', 'nervous', 'panic'],
            'sadness': ['sad', 'down', 'depressed', 'blue'],
            'anger': ['angry', 'frustrated', 'mad', 'irritated'],
            'joy': ['happy', 'excited', 'joyful', 'glad']
        };

        const trends = {};

        diaryEntries.forEach((entry, index) => {
            const content = (entry.content || '').toLowerCase();
            const timeSlot = index < diaryEntries.length / 2 ? 'recent' : 'earlier';

            Object.entries(emotionalKeywords).forEach(([emotion, keywords]) => {
                if (keywords.some(keyword => content.includes(keyword))) {
                    if (!trends[emotion]) trends[emotion] = { recent: 0, earlier: 0 };
                    trends[emotion][timeSlot]++;
                }
            });
        });

        return trends;
    }

    calculateOverallProgress(chatAnalysis, diaryAnalysis) {
        let score = 0;

        // Positive factors
        if (chatAnalysis.positive_patterns.length > 0) score += 2;
        if (diaryAnalysis.mood_trend === 'improving') score += 2;
        if (chatAnalysis.engagement_level === 'high') score += 1;
        if (diaryAnalysis.entry_frequency !== 'low') score += 1;

        // Negative factors
        if (chatAnalysis.concerning_patterns.length > 2) score -= 2;
        if (diaryAnalysis.mood_trend === 'declining') score -= 2;
        if (chatAnalysis.primary_concerns.includes('suicidal_ideation')) score -= 3;

        if (score >= 4) return 'excellent';
        if (score >= 2) return 'good';
        if (score >= 0) return 'stable';
        return 'needs_attention';
    }

    identifyKeyAchievements(chatAnalysis, diaryAnalysis) {
        const achievements = [];

        if (chatAnalysis.engagement_level === 'high') {
            achievements.push('Maintaining consistent engagement with mental health support');
        }

        if (diaryAnalysis.entry_frequency === 'high') {
            achievements.push('Regular self-reflection through diary entries');
        }

        if (chatAnalysis.positive_patterns.length > 0) {
            achievements.push('Demonstrating positive therapeutic engagement');
        }

        return achievements;
    }

    identifyImprovementAreas(chatAnalysis, diaryAnalysis) {
        const areas = [];

        if (chatAnalysis.concerning_patterns.length > 0) {
            areas.push('Address concerning patterns identified in conversations');
        }

        if (diaryAnalysis.entry_frequency === 'low') {
            areas.push('Increase frequency of self-monitoring through diary entries');
        }

        if (chatAnalysis.primary_concerns.length > 3) {
            areas.push('Focus on primary mental health concerns systematically');
        }

        return areas;
    }

    suggestNextSteps(chatAnalysis, diaryAnalysis) {
        const steps = [];

        // Based on dominant themes
        const topTheme = chatAnalysis.dominant_themes[0];
        if (topTheme) {
            steps.push(`Focus next sessions on ${topTheme.topic} management strategies`);
        }

        // Based on risk level
        if (chatAnalysis.primary_concerns.includes('anxiety')) {
            steps.push('Implement anxiety management techniques and coping strategies');
        }

        // Based on progress
        if (diaryAnalysis.mood_trend === 'improving') {
            steps.push('Continue current therapeutic approach while monitoring progress');
        }

        steps.push('Schedule follow-up assessment in 2-3 weeks');

        return steps;
    }
}

export default new ConsultingService();
