import prisma from '../config/database.js';

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

export default {
    updateMentalHealthMetric,
    getMentalHealthMetric,
};