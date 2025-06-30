const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', authenticate, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        preferences: req.user.preferences
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;