import mongoose from 'mongoose';

import Metrics from '../models/Metrics.js';
import User from '../models/User.js';

/*
Responsible for updating and retrieving mental health metrics for users
*/

export const updateMentalHealthMetric = async (req, res) => {
    try {
        const { userId, physical, mood, sleep, energy, appetite } = req.body;

        // Validate request data
        const user = await User.findOne({ userId: userId });
        if (!user) {
            return res
                .status(400)
                .json({
                    message: 'User not found. Please provide a valid userId.',
                });
        }

        // Create new user mental health metric data
        const metric = new Metrics({
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
        });

        await metric.save();

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
        // 支援兩種方式獲取 userId：
        // 1. 從 request body 獲取 (POST/PUT 請求)
        // 2. 從 URL 參數獲取 (GET 請求)
        let userId;

        if (req.method === 'GET') {
            // 從 URL 參數獲取 userId
            userId = req.query.userId || req.params.userId;
        } else {
            // 從 request body 獲取 userId
            userId = req.body.userId;
        }

        // Validate request data
        const user = await User.findOne({ userId: userId });
        if (!user) {
            return res
                .status(400)
                .json({
                    message: 'User not found. Please provide a valid userId.',
                });
        }

        const metrics = await Metrics.findOne({ userId: userId }).sort({
            entryDate: -1,
        });

        if (!metrics || metrics.length === 0) {
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
