const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', reviewController.list);
router.post('/generate', reviewController.generate);
router.get('/:id', reviewController.show);

module.exports = router;
