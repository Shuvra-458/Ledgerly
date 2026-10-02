require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

(async () => {
  await connectDB();

  try {
    // --- Clean up any prior test data ---
    await User.deleteMany({ email: 'test@example.com' });
    await Transaction.deleteMany({ title: 'Test Coffee' });

    // --- 1. Create user (check hashing) ---
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'secret123',
    });
    console.log('✅ User created:', user.email);
    console.log('   Hashed password starts with:', user.password.slice(0, 7), '...');

    // --- 2. Verify password matching ---
    const withPassword = await User.findById(user._id).select('+password');
    const isMatch = await withPassword.matchPassword('secret123');
    const isWrong = await withPassword.matchPassword('wrongpass');
    console.log(`   matchPassword("secret123") → ${isMatch ? '✅' : '❌'}`);
    console.log(`   matchPassword("wrongpass") → ${isWrong ? '❌' : '✅ (correctly rejected)'}`);

    // --- 3. Create transactions ---
    const income = await Transaction.create({
      user: user._id,
      title: 'Monthly Salary',
      amount: 5000,
      type: 'income',
      category: 'Salary',
    });
    const expense = await Transaction.create({
      user: user._id,
      title: 'Test Coffee',
      amount: -4.5,
      type: 'expense',
      category: 'Food',
    });
    console.log('✅ Transactions created:');
    console.log('  ', income.displayAmount);
    console.log('  ', expense.displayAmount);

    // --- 4. Aggregate balance ---
    const [balance] = await Transaction.aggregate([
      { $match: { user: user._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    console.log(`✅ Balance: $${balance.total.toFixed(2)} (expected $4995.50)`);

    // --- 5. Cleanup ---
    await Transaction.deleteMany({ user: user._id });
    await User.deleteOne({ _id: user._id });
    console.log('🧹 Cleaned up test data');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  } finally {
    await mongoose.connection.close();
  }
})();