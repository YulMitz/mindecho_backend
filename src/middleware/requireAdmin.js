// Admin allowlist middleware. Runs AFTER `authenticate` (req.user is the Prisma User row).
// ADMIN_USERNAMES is a comma-separated list of User.userId values.
// Empty allowlist → all requests get 403 (safe default).
const getAdminSet = () =>
    new Set(
        (process.env.ADMIN_USERNAMES || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
    );

export const requireAdmin = (req, res, next) => {
    const set = getAdminSet();
    const id = req.user?.email?.toLowerCase();
    if (id && set.has(id)) return next();
    return res.status(403).json({ message: 'Forbidden — admin only' });
};

export default requireAdmin;
