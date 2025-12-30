const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const averageMetric = (entries = []) => {
    if (!Array.isArray(entries) || entries.length === 0) return null;
    const values = entries
        .map((entry) => toNumber(entry?.value))
        .filter((value) => value !== null);
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const buildAdvice = (metrics = {}) => {
    const hrvAvg = averageMetric(metrics.hrv);
    const sleepAvg = averageMetric(metrics.sleepHours);
    const stepsAvg = averageMetric(metrics.steps);

    const items = [];
    const candidates = [];
    const summaryBits = [];

    if (sleepAvg !== null && sleepAvg < 7) {
        summaryBits.push('睡眠偏少');
        candidates.push({
            key: 'sleep',
            title: '改善睡眠',
            detail: '睡前減少藍光並固定作息，有助提升睡眠品質。',
            severity: sleepAvg < 5 ? 'high' : 'medium',
        });
    }

    if (hrvAvg !== null && hrvAvg < 50) {
        summaryBits.push('壓力略高');
        candidates.push({
            key: 'hrv',
            title: '提高 HRV',
            detail: '每天 10 分鐘深呼吸或冥想，幫助放鬆。',
            severity: hrvAvg < 35 ? 'high' : 'medium',
        });
    }

    if (stepsAvg !== null && stepsAvg < 7000) {
        summaryBits.push('活動量偏低');
        candidates.push({
            key: 'steps',
            title: '增加活動量',
            detail: '每天多走 10-15 分鐘，逐步提升步數。',
            severity: stepsAvg < 4000 ? 'high' : 'medium',
        });
    }

    if (candidates.length) {
        const severityRank = { high: 2, medium: 1, low: 0 };
        const priorityRank = { hrv: 3, sleep: 2, steps: 1 };

        candidates.sort((a, b) => {
            const severityDiff =
                severityRank[b.severity] - severityRank[a.severity];
            if (severityDiff !== 0) return severityDiff;
            return priorityRank[b.key] - priorityRank[a.key];
        });

        const { key, ...topPick } = candidates[0];
        items.push(topPick);
    }

    if (!summaryBits.length) {
        summaryBits.push('狀態穩定');
    }

    return {
        summary: summaryBits.join('，'),
        items,
    };
};

export const createHealthAdvice = async (req, res) => {
    try {
        const { range, metrics } = req.body;

        if (!range?.startDate || !range?.endDate) {
            return res.status(400).json({
                message: 'Missing range startDate or endDate.',
            });
        }

        if (!metrics || typeof metrics !== 'object') {
            return res.status(400).json({
                message: 'Missing metrics.',
            });
        }

        const advice = buildAdvice(metrics);

        res.status(200).json(advice);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getHealthAdvice = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                message: 'Missing startDate or endDate.',
            });
        }

        res.status(200).json({
            summary: '尚無可用資料',
            items: [],
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export default {
    createHealthAdvice,
    getHealthAdvice,
};
