export const profileGate = (req, res, next) => {
    const mode = req.body?.mode;

    // initial consultation sessions are always allowed
    if (mode === 'initial') return next();

    // Temporarily bypass profile completion gate for chat sessions.
    // if (!req.user || req.user.userInfoProgress < 100) {
    //     return res.status(403).json({
    //         message: 'Profile incomplete. Please complete your profile before starting a chat session.',
    //         userInfoProgress: req.user?.userInfoProgress ?? 0,
    //     });
    // }

    next();
};
