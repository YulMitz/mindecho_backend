import prisma from '../config/database.js';
import dayjs from 'dayjs';

/*
Responsible for updating and retrieving mental health metrics for users
*/

export const updateMentalHealthMetric = async (req, res) => {
    try {
        const { userId, physical, mood, sleep, energy, appetite } = req.body;

        // Validate request data
        const user = await prisma.user.findUnique({ where: { userId } });
        if (!user) {
            return res.status(400).json({
                message: 'User not found. Please provide a valid userId.',
            });
        }

        // Create new user mental health metric data
        const metric = await prisma.mentalHealthMetric.create({
            data: {
                userId: userId,
                physical: {
                    description: physical.description,
                    value: physical.value,
                },
                mood: {
                    description: mood.description,
                    value: mood.value,
                },
                sleep: {
                    description: sleep.description,
                    value: sleep.value,
                },
                energy: {
                    description: energy.description,
                    value: energy.value,
                },
                appetite: {
                    description: appetite.description,
                    value: appetite.value,
                },
                entryDate: new Date(),
            },
        });

        res.status(201).json({
            message: 'User mental health metric update successfully',
            user: {
                id: userId,
            },
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getMentalHealthMetric = async (req, res) => {
    try {
        // Support two ways to get userId:
        // 1. From request body (POST/PUT requests)
        // 2. From URL parameters (GET requests)
        let userId;

        if (req.method === 'GET') {
            // Get userId from URL parameters
            userId = req.query.userId || req.params.userId;
        } else {
            // Get userId from request body
            userId = req.body.userId;
        }

        // Validate request data
        const user = await prisma.user.findUnique({ where: { userId } });
        if (!user) {
            return res.status(400).json({
                message: 'User not found. Please provide a valid userId.',
            });
        }

        const metrics = await prisma.mentalHealthMetric.findFirst({
            where: { userId: userId },
            orderBy: { entryDate: 'desc' },
        });

        if (!metrics) {
            return res
                .status(404)
                .json({ message: 'No metrics found for this user' });
        }

        res.status(200).json({
            message: 'User mental health metrics retrieved successfully',
            metrics,
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Record daily five answers
export const submitDailyQuestions = async (req, res) => {
    try {
        const {
            userId,
            physical,
            mental,
            emotion,
            sleep,
            diet,
            entryDate,
        } = req.body;
        console.log(
            userId,
            physical,
            mental,
            emotion,
            sleep,
            diet,
            entryDate,
        )
        // Validate user
        const user = await prisma.user.findUnique({ where: { userId } });
        if (!user) {
            return res
                .status(400)
                .json({ message: 'User not found. Please provide a valid userId.' });
        }

        // Normalize entry date (default: today, date only)
        const normalizedDate = entryDate
            ? dayjs(entryDate).startOf('day').toDate()
            : dayjs().startOf('day').toDate();

        if (
            physical == null ||
            mental == null ||
            emotion == null ||
            sleep == null ||
            diet == null
        ) {
            return res.status(400).json({
                message:
                    'Missing daily questions. Please provide physical, mental, emotion, sleep, and diet.',
            });
        }

        const record = await prisma.dailyQuestion.create({
            data: {
                userId: user.id,
                entryDate: normalizedDate,
                physical,
                mental,
                emotion,
                sleep,
                diet,
            },
        });

        res.status(201).json({
            message: 'Daily questions recorded successfully',
            record: {
                id: record.id,
                userId: user.userId,
                entryDate: record.entryDate,
            },
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getDailyQuestions = async (req, res) => {
    try {
        let userId;

        if (req.method === 'GET') {
            userId = req.query.userId || req.params.userId;
        } else {
            userId = req.body.userId;
        }

        const user = await prisma.user.findUnique({ where: { userId } });
        if (!user) {
            return res
                .status(400)
                .json({ message: 'User not found. Please provide a valid userId.' });
        }

        const dailyQuestions = await prisma.dailyQuestion.findMany({
            where: { userId: user.id },
            orderBy: { entryDate: 'desc' },
        });

        res.status(200).json({
            message: 'Daily questions retrieved successfully',
            dailyQuestions,
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getScaleQuestions = async (req, res) => {
    try {
        const scaleCode = req.params.code || req.query.code;
        if (!scaleCode) {
            return res
                .status(400)
                .json({ message: 'Missing scale code.' });
        }

        const scale = await prisma.scale.findUnique({
            where: { code: scaleCode },
            include: {
                questions: {
                    orderBy: { order: 'asc' },
                    select: {
                        id: true,
                        order: true,
                        text: true,
                        isReverse: true,
                    },
                },
            },
        });

        if (!scale) {
            return res.status(404).json({ message: 'Scale not found.' });
        }

        res.status(200).json({
            message: 'Scale questions retrieved successfully',
            scale: {
                id: scale.id,
                code: scale.code,
                name: scale.name,
                description: scale.description,
                questions: scale.questions,
            },
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const submitScaleAnswers = async (req, res) => {
    try {
        console.log('submitScaleAnswers body:', req.body);
        const { userId, answers } = req.body;
        const scaleCode = req.params.code || req.body.scaleCode;

        if (!userId || !scaleCode) {
            return res.status(400).json({
                message: 'Missing userId or scale code.',
                details: {
                    userId: Boolean(userId),
                    scaleCode: Boolean(scaleCode),
                },
            });
        }

        if (!Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({
                message: 'Missing answers.',
                details: {
                    answersType: Array.isArray(answers) ? 'array' : typeof answers,
                    answersLength: Array.isArray(answers) ? answers.length : 0,
                },
            });
        }

        const user = await prisma.user.findUnique({ where: { userId } });
        if (!user) {
            return res
                .status(400)
                .json({ message: 'User not found. Please provide a valid userId.' });
        }

        const scale = await prisma.scale.findUnique({
            where: { code: scaleCode },
            include: {
                questions: {
                    orderBy: { order: 'asc' },
                    select: { id: true, isReverse: true },
                },
            },
        });

        if (!scale) {
            return res.status(404).json({ message: 'Scale not found.' });
        }

        const questionIdSet = new Set(scale.questions.map((q) => q.id));
        const answerMap = new Map();
        const unknownQuestionIds = [];

        for (const answer of answers) {
            if (!answer || !answer.questionId) {
                continue;
            }
            if (!questionIdSet.has(answer.questionId)) {
                unknownQuestionIds.push(answer.questionId);
                continue;
            }
            answerMap.set(answer.questionId, answer.value);
        }

        if (unknownQuestionIds.length > 0) {
            return res.status(400).json({
                message: 'Unknown questionId provided.',
                details: { unknownQuestionIds },
            });
        }

        let totalScore = 0;
        const answerRows = [];

        for (const question of scale.questions) {
            const value = answerMap.get(question.id);
            if (value == null) {
                return res.status(400).json({
                    message: 'Missing answer for one or more questions.',
                    details: {
                        missingQuestionId: question.id,
                    },
                });
            }
            if (!Number.isInteger(value) || value < 1 || value > 5) {
                return res.status(400).json({
                    message: 'Answer value must be an integer between 1 and 5.',
                    details: {
                        questionId: question.id,
                        value,
                    },
                });
            }

            const scoredValue = question.isReverse ? 6 - value : value;
            totalScore += scoredValue;

            answerRows.push({
                questionId: question.id,
                value,
            });
        }

        const session = await prisma.$transaction(async (tx) => {
            const createdSession = await tx.scaleSession.create({
                data: {
                    userId: user.id,
                    scaleId: scale.id,
                    totalScore,
                },
            });

            await tx.scaleAnswer.createMany({
                data: answerRows.map((answer) => ({
                    sessionId: createdSession.id,
                    questionId: answer.questionId,
                    value: answer.value,
                })),
            });

            return createdSession;
        });

        res.status(201).json({
            message: 'Scale answers submitted successfully',
            session: {
                id: session.id,
                userId: user.userId,
                scaleCode: scale.code,
                totalScore,
                createdAt: session.createdAt,
            },
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getUserScaleSessions = async (req, res) => {
    try {
        let userId;

        if (req.method === 'GET') {
            userId = req.query.userId || req.params.userId;
        } else {
            userId = req.body.userId;
        }

        if (!userId) {
            return res.status(400).json({ message: 'Missing userId.' });
        }

        const user = await prisma.user.findUnique({ where: { userId } });
        if (!user) {
            return res
                .status(400)
                .json({ message: 'User not found. Please provide a valid userId.' });
        }

        const scales = await prisma.scale.findMany({
            orderBy: { code: 'asc' },
            include: {
                sessions: {
                    where: { userId: user.id },
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                    select: {
                        id: true,
                        totalScore: true,
                        createdAt: true,
                    },
                },
            },
        });

        res.status(200).json({
            message: 'User scale sessions retrieved successfully',
            scales: scales.map((scale) => ({
                id: scale.id,
                code: scale.code,
                name: scale.name,
                description: scale.description,
                sessions: scale.sessions,
            })),
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export default {
    updateMentalHealthMetric,
    getMentalHealthMetric,
    submitDailyQuestions,
    getDailyQuestions,
    getScaleQuestions,
    submitScaleAnswers,
    getUserScaleSessions,
};
