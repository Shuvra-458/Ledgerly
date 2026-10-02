require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const CATEGORIES = ['Food', 'Rent', 'Salary', 'Transport', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Other'];

const rand = (min, max) => Math.random() * (max - min) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

(async () => {
  await connectDB();

  const email = 'demo@example.com';
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ name: 'Demo User', email, password: 'demo1234' });
    console.log('✅ Demo user created: demo@example.com / demo1234');
  } else {
    await Transaction.deleteMany({ user: user._id });
    console.log('🧹 Cleared existing demo transactions');
  }

  const tx = [];
  const now = new Date();

  // Generate ~80 transactions across the last 6 months
  for (let i = 0; i < 80; i++) {
    const daysAgo = Math.floor(rand(0, 180));
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    const isIncome = Math.random() < 0.2; // 20% income
    if (isIncome) {
      tx.push({
        user: user._id,
        title: 'Salary',
        amount: rand(2000, 4000),
        type: 'income',
        category: 'Salary',
        date,
      });
    } else {
      const category = pick(CATEGORIES.filter((c) => c !== 'Salary'));
      tx.push({
        user: user._id,
        title: category + ' expense',
        amount: -rand(10, 400),
        type: 'expense',
        category,
        date,
      });
    }
  }

  await Transaction.insertMany(tx);
  console.log(`✅ Seeded ${tx.length} transactions for ${email}`);
  await mongoose.connection.close();
})();