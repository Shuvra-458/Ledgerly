const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { redirectIfAuth } = require('../middleware/authMiddleware');

// Public pages 
router.get('/register', redirectIfAuth, authController.showRegister);
router.post('/register', redirectIfAuth, authController.registerUser);

router.get('/login', redirectIfAuth, authController.showLogin);
router.post('/login', redirectIfAuth, authController.loginUser);

// Logout is allowed for everyone
router.post('/logout', authController.logoutUser);

module.exports = router;

