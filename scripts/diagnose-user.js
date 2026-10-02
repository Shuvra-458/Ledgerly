require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const users = await User.find().limit(1);
    console.log('👥 Users in DB:', users.length);

    if (users[0]) {
      console.log('🔑 First user keys:', Object.keys(users[0].toObject()));
      console.log('📧 First user email:', users[0].email);
      console.log('🔒 Password field value:', users[0].password);
      console.log('   (undefined = select:false is working correctly)');
    }

    // Now test the +password fetch (used by login)
    if (users[0]) {
      const withPassword = await User.findById(users[0]._id).select('+password');
      console.log('\n🔓 Fetch with +password:');
      console.log('   password type:', typeof withPassword.password);
      console.log('   is bcrypt hash?', /^\$2[aby]\$/.test(withPassword.password || '') ? '✅' : '❌');
    }

    console.log('\n🎉 No bcrypt error on find — model is fine');
  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error('\n📚 Stack trace:');
    console.error(err.stack);
  } finally {
    await mongoose.connection.close();
  }
})();