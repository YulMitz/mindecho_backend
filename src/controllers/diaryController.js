import dayjs from 'dayjs';
import prisma from '../config/database.js';

const resolveUserId = (req) => {
    return req.body?.userId || req.body?.user_id || req.user?.userId;
};

const resolveUserDbId = async (req) => {
    const userId = resolveUserId(req);
    if (!userId) {
        return { error: 'Missing userId.' };
    }

    const user = await prisma.user.findUnique({ where: { userId } });
    if (!user) {
        return { error: 'User not found. Please provide a valid userId.' };
    }

    return { user };
};

const ensureDiaryForUser = async (userDbId) => {
    let diary = await prisma.diary.findFirst({
        where: { userId: userDbId },
    });

    if (!diary) {
        diary = await prisma.diary.create({
            data: { userId: userDbId },
        });
    }

    return diary;
};

/*
    - Post a new diary entry for an user.
*/
export const postDiaryEntry = async (req, res) => {
    try {
        const { mood, content, entryDate } = req.body;

        if (!content) {
            return res.status(400).json({ message: 'Missing diary content.' });
        }

        if (!mood) {
            return res.status(400).json({ message: 'Missing mood.' });
        }

        const { user, error } = await resolveUserDbId(req);
        if (error) {
            return res.status(400).json({ message: error });
        }

        const normalizedEntryDate = entryDate
            ? dayjs(entryDate).toDate()
            : new Date();

        const diary = await ensureDiaryForUser(user.id);

        const entry = await prisma.diaryEntry.create({
            data: {
                diaryId: diary.id,
                userId: user.id,
                content,
                mood,
                entryDate: normalizedEntryDate,
            },
        });

        res.status(201).json({
            message: 'Diary entry recorded successfully',
            entry: {
                id: entry.id,
                userId: user.userId,
                mood: entry.mood,
                entryDate: entry.entryDate,
            },
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
        return;
    }
};

/*
    - Update an existing diary entry for an user.
*/
export const updateDiaryEntry = async (req, res) => {
    try {
        const { entryId, content, mood, entryDate } = req.body;

        if (!entryId) {
            return res.status(400).json({ message: 'Missing entryId.' });
        }

        if (
            content === undefined &&
            mood === undefined &&
            entryDate === undefined
        ) {
            return res.status(400).json({ message: 'Nothing to update.' });
        }

        const { user, error } = await resolveUserDbId(req);
        if (error) {
            return res.status(400).json({ message: error });
        }

        const existingEntry = await prisma.diaryEntry.findFirst({
            where: {
                id: entryId,
                userId: user.id,
            },
        });

        if (!existingEntry) {
            return res.status(404).json({ message: 'Diary entry not found.' });
        }

        const normalizedEntryDate = entryDate
            ? dayjs(entryDate).toDate()
            : undefined;

        const updatedEntry = await prisma.diaryEntry.update({
            where: { id: existingEntry.id },
            data: {
                ...(content !== undefined ? { content } : {}),
                ...(mood !== undefined ? { mood } : {}),
                ...(normalizedEntryDate ? { entryDate: normalizedEntryDate } : {}),
            },
        });

        res.status(200).json({
            message: 'Diary entry updated successfully',
            entry: {
                id: updatedEntry.id,
                userId: user.userId,
                mood: updatedEntry.mood,
                entryDate: updatedEntry.entryDate,
            },
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
        return;
    }
};

/*
    - Get diary history for an user.
*/
export const getDiaryHistory = async (req, res) => {
    try {
        const { startDate, endDate, limit } = req.body;

        const { user, error } = await resolveUserDbId(req);
        if (error) {
            return res.status(400).json({ message: error });
        }

        const dateFilter = {};
        if (startDate) {
            dateFilter.gte = dayjs(startDate).toDate();
        }
        if (endDate) {
            dateFilter.lte = dayjs(endDate).toDate();
        }

        const entries = await prisma.diaryEntry.findMany({
            where: {
                userId: user.id,
                ...(Object.keys(dateFilter).length ? { entryDate: dateFilter } : {}),
            },
            orderBy: { entryDate: 'desc' },
            ...(limit ? { take: Number(limit) } : {}),
        });

        res.status(200).json({
            message: 'Diary history retrieved successfully',
            entries,
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
        return;
    }
};

export const listDiaryEntries = async (req, res) => {
    try {
        const { startDate, endDate, limit, offset } = req.query;

        const userId = req.user?.userId;
        if (!userId) {
            return res.status(400).json({ message: 'Missing userId.' });
        }

        const user = await prisma.user.findUnique({ where: { userId } });
        if (!user) {
            return res
                .status(400)
                .json({ message: 'User not found. Please provide a valid userId.' });
        }

        const dateFilter = {};
        if (startDate) {
            dateFilter.gte = dayjs(startDate).toDate();
        }
        if (endDate) {
            dateFilter.lte = dayjs(endDate).toDate();
        }

        const entries = await prisma.diaryEntry.findMany({
            where: {
                userId: user.id,
                ...(Object.keys(dateFilter).length ? { entryDate: dateFilter } : {}),
            },
            orderBy: { entryDate: 'desc' },
            ...(limit ? { take: Number(limit) } : {}),
            ...(offset ? { skip: Number(offset) } : {}),
        });

        res.status(200).json({
            message: 'Diary entries retrieved successfully',
            entries,
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getDiaryEntryById = async (req, res) => {
    try {
        const entry = await prisma.diaryEntry.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });

        if (!entry) {
            return res.status(404).json({ message: 'Diary entry not found.' });
        }

        res.status(200).json({
            message: 'Diary entry retrieved successfully',
            entry,
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const updateDiaryEntryById = async (req, res) => {
    try {
        const { content, mood, entryDate } = req.body;

        if (
            content === undefined &&
            mood === undefined &&
            entryDate === undefined
        ) {
            return res.status(400).json({ message: 'Nothing to update.' });
        }

        const entry = await prisma.diaryEntry.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });

        if (!entry) {
            return res.status(404).json({ message: 'Diary entry not found.' });
        }

        const normalizedEntryDate = entryDate
            ? dayjs(entryDate).toDate()
            : undefined;

        const updatedEntry = await prisma.diaryEntry.update({
            where: { id: entry.id },
            data: {
                ...(content !== undefined ? { content } : {}),
                ...(mood !== undefined ? { mood } : {}),
                ...(normalizedEntryDate ? { entryDate: normalizedEntryDate } : {}),
            },
        });

        res.status(200).json({
            message: 'Diary entry updated successfully',
            entry: updatedEntry,
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteDiaryEntryById = async (req, res) => {
    try {
        const entry = await prisma.diaryEntry.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });

        if (!entry) {
            return res.status(404).json({ message: 'Diary entry not found.' });
        }

        await prisma.diaryEntry.delete({
            where: { id: entry.id },
        });

        res.status(200).json({
            message: 'Diary entry deleted successfully',
            entry: {
                id: entry.id,
            },
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export default {
    postDiaryEntry,
    updateDiaryEntry,
    getDiaryHistory,
    listDiaryEntries,
    getDiaryEntryById,
    updateDiaryEntryById,
    deleteDiaryEntryById,
};
