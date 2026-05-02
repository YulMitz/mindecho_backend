import { PrismaClient } from '../../prisma-client/index.js';

const prisma = new PrismaClient();

const TZ_OFFSET_MIN = 8 * 60; // Asia/Taipei
const TAIPEI_OFFSET_MS = TZ_OFFSET_MIN * 60_000;

const STATS_WINDOW_DAYS = 30;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const MAX_MESSAGES_PER_SESSION = 500;

// Returns Monday-00:00 Taipei (as a UTC Date) for the week containing `now`,
// plus the exclusive end (next Monday 00:00 Taipei).
export function taipeiWeekRange(now = new Date()) {
    const taipeiNow = new Date(now.getTime() + TZ_OFFSET_MIN * 60_000);
    const dow = (taipeiNow.getUTCDay() + 6) % 7; // Mon=0..Sun=6
    const taipeiMondayMidnightAsUtcParts = new Date(
        Date.UTC(
            taipeiNow.getUTCFullYear(),
            taipeiNow.getUTCMonth(),
            taipeiNow.getUTCDate() - dow,
            0, 0, 0, 0,
        )
    );
    const weekStartUtc = new Date(
        taipeiMondayMidnightAsUtcParts.getTime() - TZ_OFFSET_MIN * 60_000
    );
    const weekEndUtc = new Date(weekStartUtc.getTime() + 7 * 24 * 3600_000);
    return { weekStartUtc, weekEndUtc };
}

// "YYYY-MM-DD" in Asia/Taipei for a given UTC Date.
function taipeiDateString(date) {
    const t = new Date(date.getTime() + TAIPEI_OFFSET_MS);
    return t.toISOString().slice(0, 10);
}

// ─── GET /api/admin/users ────────────────────────────────────────────────────
export const listUsers = async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                userId: true,
                email: true,
                name: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
                dataAnalysisConsent: true,
            },
        });

        const userIds = users.map((u) => u.id);

        const [msgGroups, sessGroups, lastMsgGroups] = await Promise.all([
            prisma.message.groupBy({
                by: ['userId'],
                where: { userId: { in: userIds } },
                _count: { _all: true },
            }),
            prisma.chatSession.groupBy({
                by: ['userId'],
                where: { userId: { in: userIds } },
                _count: { _all: true },
            }),
            prisma.message.groupBy({
                by: ['userId'],
                where: { userId: { in: userIds } },
                _max: { timestamp: true },
            }),
        ]);

        const msgMap = new Map(msgGroups.map((g) => [g.userId, g._count._all]));
        const sessMap = new Map(sessGroups.map((g) => [g.userId, g._count._all]));
        const lastMap = new Map(
            lastMsgGroups.map((g) => [g.userId, g._max.timestamp])
        );

        return res.json({
            users: users.map((u) => ({
                ...u,
                messageCount: msgMap.get(u.id) ?? 0,
                sessionCount: sessMap.get(u.id) ?? 0,
                lastMessageAt: lastMap.get(u.id) ?? null,
            })),
        });
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/admin/llm-stats ────────────────────────────────────────────────
export const llmStats = async (req, res, next) => {
    try {
        const now = new Date();
        const days = STATS_WINDOW_DAYS;
        const todayTaipeiStr = taipeiDateString(now);
        const todayTaipeiMidnightUtc = new Date(`${todayTaipeiStr}T00:00:00+08:00`);
        const from = new Date(todayTaipeiMidnightUtc.getTime() - (days - 1) * 24 * 3600_000);
        const to = new Date(todayTaipeiMidnightUtc.getTime() + 24 * 3600_000);

        // Pull all MODEL messages in the window with the fields we need.
        const messages = await prisma.message.findMany({
            where: {
                messageType: 'MODEL',
                timestamp: { gte: from, lt: to },
            },
            select: {
                userId: true,
                chatbotType: true,
                provider: true,
                metadata: true,
                timestamp: true,
            },
        });

        const tokensOf = (m) => {
            const t = m?.metadata?.tokens || {};
            const input = Number(t.input) || 0;
            const output = Number(t.output) || 0;
            const total = Number(t.total) || (input + output);
            return { input, output, total };
        };

        const totals = {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            requestCount: messages.length,
            activeUsers: new Set(messages.map((m) => m.userId)).size,
        };
        const byChatbotMap = new Map();
        const byProviderMap = new Map();
        const byDayMap = new Map();
        const perUserMap = new Map(); // user.id -> aggregates

        for (const m of messages) {
            const { input, output, total } = tokensOf(m);
            totals.inputTokens += input;
            totals.outputTokens += output;
            totals.totalTokens += total;

            const cb = m.chatbotType || 'UNKNOWN';
            const cur1 = byChatbotMap.get(cb) || { chatbotType: cb, requestCount: 0, totalTokens: 0 };
            cur1.requestCount += 1;
            cur1.totalTokens += total;
            byChatbotMap.set(cb, cur1);

            const pv = m.provider || 'UNKNOWN';
            const cur2 = byProviderMap.get(pv) || { provider: pv, requestCount: 0, totalTokens: 0 };
            cur2.requestCount += 1;
            cur2.totalTokens += total;
            byProviderMap.set(pv, cur2);

            const day = taipeiDateString(m.timestamp);
            const cur3 = byDayMap.get(day) || { date: day, requestCount: 0, totalTokens: 0 };
            cur3.requestCount += 1;
            cur3.totalTokens += total;
            byDayMap.set(day, cur3);

            const cur4 = perUserMap.get(m.userId) || {
                userIdPk: m.userId,
                requestCount: 0,
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
            };
            cur4.requestCount += 1;
            cur4.inputTokens += input;
            cur4.outputTokens += output;
            cur4.totalTokens += total;
            perUserMap.set(m.userId, cur4);
        }

        // Fill day buckets aligned to Taipei dates within [from, to).
        const byDay = [];
        for (let i = 0; i < days; i++) {
            const d = new Date(from.getTime() + i * 24 * 3600_000);
            const key = taipeiDateString(d);
            byDay.push(byDayMap.get(key) || { date: key, requestCount: 0, totalTokens: 0 });
        }

        // Weekly active time per user: based on this Taipei-week's messages
        // (USER + MODEL both count as activity).
        const { weekStartUtc, weekEndUtc } = taipeiWeekRange(now);
        const weekMessages = await prisma.message.findMany({
            where: { timestamp: { gte: weekStartUtc, lt: weekEndUtc } },
            select: { userId: true, timestamp: true },
        });

        // user.id -> { dayKey -> { min, max } }
        const userDayRange = new Map();
        for (const m of weekMessages) {
            const dayKey = taipeiDateString(m.timestamp);
            if (!userDayRange.has(m.userId)) userDayRange.set(m.userId, new Map());
            const dayMap = userDayRange.get(m.userId);
            const cur = dayMap.get(dayKey);
            const ts = m.timestamp.getTime();
            if (!cur) dayMap.set(dayKey, { min: ts, max: ts, count: 1 });
            else {
                cur.min = Math.min(cur.min, ts);
                cur.max = Math.max(cur.max, ts);
                cur.count += 1;
            }
        }

        const weeklyActiveSecOf = (userPk) => {
            const dayMap = userDayRange.get(userPk);
            if (!dayMap) return 0;
            let total = 0;
            for (const { min, max, count } of dayMap.values()) {
                if (count >= 2) total += Math.floor((max - min) / 1000);
            }
            return total;
        };

        // Also include users active this week even if they had no MODEL messages in 30d.
        const userPks = new Set([
            ...perUserMap.keys(),
            ...userDayRange.keys(),
        ]);
        const userRows = userPks.size
            ? await prisma.user.findMany({
                  where: { id: { in: [...userPks] } },
                  select: { id: true, userId: true, name: true, email: true },
              })
            : [];
        const userById = new Map(userRows.map((u) => [u.id, u]));

        const perUser = [...userPks].map((pk) => {
            const u = userById.get(pk);
            const agg = perUserMap.get(pk) || {
                requestCount: 0,
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
            };
            return {
                userId: u?.userId || null,
                name: u?.name || null,
                email: u?.email || null,
                requestCount: agg.requestCount,
                inputTokens: agg.inputTokens,
                outputTokens: agg.outputTokens,
                totalTokens: agg.totalTokens,
                weeklyActiveTimeSec: weeklyActiveSecOf(pk),
            };
        });

        return res.json({
            window: { from: from.toISOString(), to: to.toISOString(), days },
            totals,
            byChatbotType: [...byChatbotMap.values()],
            byProvider: [...byProviderMap.values()],
            byDay,
            perUser,
        });
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/admin/users/:userId/chats ──────────────────────────────────────
export const getUserChats = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const pageSize = Math.min(
            MAX_PAGE_SIZE,
            Math.max(1, parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE)
        );

        const user = await prisma.user.findUnique({
            where: { userId },
            select: { id: true, userId: true, name: true, email: true },
        });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const [totalSessions, sessions] = await Promise.all([
            prisma.chatSession.count({ where: { userId: user.id } }),
            prisma.chatSession.findMany({
                where: { userId: user.id },
                orderBy: { updatedAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    sessionId: true,
                    title: true,
                    chatbotType: true,
                    provider: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: { select: { messages: true } },
                    messages: {
                        orderBy: { timestamp: 'asc' },
                        take: MAX_MESSAGES_PER_SESSION,
                        select: {
                            id: true,
                            sessionId: true,
                            messageType: true,
                            chatbotType: true,
                            provider: true,
                            content: true,
                            metadata: true,
                            timestamp: true,
                        },
                    },
                },
            }),
        ]);

        return res.json({
            user,
            sessions: sessions.map((s) => {
                const { _count, ...rest } = s;
                const messageCount = _count.messages;
                return {
                    ...rest,
                    messageCount,
                    messagesTruncated: messageCount > MAX_MESSAGES_PER_SESSION,
                };
            }),
            pagination: { page, pageSize, totalSessions },
        });
    } catch (err) {
        next(err);
    }
};

export default { listUsers, llmStats, getUserChats };
