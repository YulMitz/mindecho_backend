import dayjs from 'dayjs';
import prisma from '../config/database.js';
import { DiaryAnalysisService } from '../services/diaryAnalysisService.js';

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

// Same with getDiaryHistory but format for userId is fixed
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

/*
    - Generate 30-day emotional insight report using LLM analysis.
    - Analysis is only accessible every 30 days per user.
*/
export const analyzeDiaries = async (req, res) => {
  try {
    const { mode = 'cbt', provider = 'gemini' } = req.body;

    // Validate mode
    if (!['cbt', 'mbt'].includes(mode.toLowerCase())) {
      return res.status(400).json({
        message: 'Invalid analysis mode. Use "cbt" or "mbt".',
      });
    }

    // Get user from auth middleware
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(400).json({ message: 'User not found.' });
    }

    // Check 30-day analysis eligibility
    const eligibility = DiaryAnalysisService.checkAnalysisEligibility(
      user.lastDiaryAnalysisAt
    );

    if (!eligibility.eligible) {
      return res.status(429).json({
        message: `Analysis is only available every 30 days. Please wait ${eligibility.daysRemaining} more days.`,
        daysRemaining: eligibility.daysRemaining,
        lastAnalysisDate: user.lastDiaryAnalysisAt,
      });
    }

    // Get diary entries from the last 30 days
    const thirtyDaysAgo = dayjs().subtract(30, 'day').startOf('day').toDate();

    const entries = await prisma.diaryEntry.findMany({
      where: {
        userId: user.id,
        entryDate: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: { entryDate: 'asc' },
      select: {
        id: true,
        content: true,
        mood: true,
        entryDate: true,
      },
    });

    if (entries.length === 0) {
      return res.status(400).json({
        message: 'No diary entries found in the last 30 days. Please write some diary entries first.',
      });
    }

    // Call Python LangChain module for analysis
    const analysisResult = await DiaryAnalysisService.analyzeDiaries(
      entries,
      mode,
      provider
    );

    // Store the analysis result
    const savedAnalysis = await prisma.diaryAnalysis.create({
      data: {
        userId: user.id,
        mode: mode.toUpperCase(),
        result: analysisResult,
        riskLevel: analysisResult.risk_level || 'unknown',
        entriesCount: entries.length,
      },
    });

    // Update user's last analysis date
    await prisma.user.update({
      where: { id: user.id },
      data: { lastDiaryAnalysisAt: new Date() },
    });

    res.status(200).json({
      message: 'Diary analysis completed successfully',
      analysis: {
        id: savedAnalysis.id,
        mode: savedAnalysis.mode,
        entriesAnalyzed: entries.length,
        result: analysisResult,
        createdAt: savedAnalysis.createdAt,
      },
    });
  } catch (error) {
    console.error('Diary analysis error:', error);
    res.status(500).json({
      message: 'Failed to analyze diaries. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/*
    - Delete a diary entry by ID for the authenticated user.
*/
export const deleteDiaryEntry = async (req, res) => {
  try {
    const { entryId } = req.params;

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

    const existingEntry = await prisma.diaryEntry.findFirst({
      where: {
        id: entryId,
        userId: user.id,
      },
    });

    if (!existingEntry) {
      return res.status(404).json({ message: 'Diary entry not found.' });
    }

    await prisma.diaryEntry.delete({ where: { id: existingEntry.id } });

    res.status(200).json({ message: 'Diary entry deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export default {
  postDiaryEntry,
  updateDiaryEntry,
  getDiaryHistory,
  listDiaryEntries,
  deleteDiaryEntry,
  analyzeDiaries,
};
