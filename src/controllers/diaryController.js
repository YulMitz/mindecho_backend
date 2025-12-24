import dayjs from 'dayjs';
import prisma from '../config/database.js';

/*
    - Post a new diary entry for an user.
*/
export const postDiaryEntry = async (req, res) => {
    try {
        const { userId, mood, content, entryDate } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'Missing userId.' });
        }

        if (!content) {
            return res.status(400).json({ message: 'Missing diary content.' });
        }

        if (!mood) {
            return res.status(400).json({ message: 'Missing mood.' });
        }

        const user = await prisma.user.findUnique({ where: { userId } });
        if (!user) {
            return res
                .status(400)
                .json({ message: 'User not found. Please provide a valid userId.' });
        }

        const normalizedEntryDate = entryDate
            ? dayjs(entryDate).toDate()
            : new Date();

        let diary = await prisma.diary.findFirst({
            where: { userId: user.id },
        });

        if (!diary) {
            diary = await prisma.diary.create({
                data: { userId: user.id },
            });
        }

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
    } catch (error) {
        res.status(400).json({ message: error.message });
        return;
    }
};

export default { postDiaryEntry, updateDiaryEntry, getDiaryHistory };
