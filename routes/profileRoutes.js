const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', profileController.showProfile);
router.post('/', profileController.updateProfile);
router.post('/password', profileController.changePassword);

module.exports = router;