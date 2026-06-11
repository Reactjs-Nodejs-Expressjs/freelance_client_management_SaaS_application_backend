const mongoose = require('mongoose');
const User = require('./models/User');

async function checkAdmin() {
  try {
    await mongoose.connect('mongodb://localhost:27017/strategic-brand-solutions');
    console.log("Connected to MongoDB.");
    const adminUser = await User.findOne({ role: 'admin' });
    console.log("--- ADMIN USER ---");
    console.log(JSON.stringify(adminUser, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkAdmin();
