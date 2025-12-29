import dayjs from 'dayjs';
import prisma from '../config/database.js';

export const createReason = async (req, res) => {
    try {
        const { title, content, date } = req.body;

        if (!title || !content) {
            return res.status(400).json({
                message: 'Missing title or content.',
            });
        }

        const normalizedDate = date ? dayjs(date).toDate() : new Date();

        const reason = await prisma.reason.create({
            data: {
                userId: req.user.id,
                title,
                content,
                date: normalizedDate,
            },
        });

        res.status(201).json({
            message: 'Reason created successfully',
            reason,
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getReasons = async (req, res) => {
    try {
        const includeDeleted = req.query.includeDeleted === 'true';

        const reasons = await prisma.reason.findMany({
            where: {
                userId: req.user.id,
                ...(includeDeleted ? {} : { isDeleted: false }),
            },
            orderBy: { date: 'desc' },
        });

        res.status(200).json({
            message: 'Reasons retrieved successfully',
            reasons,
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getReasonById = async (req, res) => {
    try {
        const includeDeleted = req.query.includeDeleted === 'true';

        const reason = await prisma.reason.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
                ...(includeDeleted ? {} : { isDeleted: false }),
            },
        });

        if (!reason) {
            return res.status(404).json({ message: 'Reason not found.' });
        }

        res.status(200).json({
            message: 'Reason retrieved successfully',
            reason,
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const updateReason = async (req, res) => {
    try {
        const { title, content, date, isDeleted } = req.body;

        if (
            title === undefined &&
            content === undefined &&
            date === undefined &&
            isDeleted === undefined
        ) {
            return res.status(400).json({
                message: 'Nothing to update.',
            });
        }

        const existingReason = await prisma.reason.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });

        if (!existingReason) {
            return res.status(404).json({ message: 'Reason not found.' });
        }

        const normalizedDate = date ? dayjs(date).toDate() : undefined;

        const updatedReason = await prisma.reason.update({
            where: { id: existingReason.id },
            data: {
                ...(title !== undefined ? { title } : {}),
                ...(content !== undefined ? { content } : {}),
                ...(normalizedDate ? { date: normalizedDate } : {}),
                ...(isDeleted !== undefined ? { isDeleted } : {}),
            },
        });

        res.status(200).json({
            message: 'Reason updated successfully',
            reason: updatedReason,
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteReason = async (req, res) => {
    try {
        const existingReason = await prisma.reason.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
                isDeleted: false,
            },
        });

        if (!existingReason) {
            return res.status(404).json({ message: 'Reason not found.' });
        }

        const updatedReason = await prisma.reason.update({
            where: { id: existingReason.id },
            data: { isDeleted: true },
        });

        res.status(200).json({
            message: 'Reason deleted successfully',
            reason: updatedReason,
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export default {
    createReason,
    getReasons,
    getReasonById,
    updateReason,
    deleteReason,
};
