const express = require('express');
const router = express.Router();
const txController = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

// Every route below requires auth
router.use(protect);

router.get('/', txController.listTransactions);
router.get('/new', txController.showNewForm);
router.post('/', txController.createTransaction);

router.get('/:id/edit', txController.showEditForm);
router.post('/:id', txController.updateTransaction);
router.post('/:id/delete', txController.deleteTransaction);

module.exports = router;

