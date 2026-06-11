const mongoose = require('mongoose');
const User = require('./models/User');

async function setLogo() {
  try {
    await mongoose.connect('mongodb://localhost:27017/strategic-brand-solutions');
    console.log("Connected to MongoDB.");
    
    // Update admin user logoUrl with the latest uploaded logo
    const result = await User.updateOne(
      { role: 'admin' },
      { $set: { logoUrl: '/uploads/admin/logo/brand_logo_1780730969460.jpg' } }
    );
    
    console.log("Update result:", result);
    
    const adminUser = await User.findOne({ role: 'admin' });
    console.log("Updated Admin Logo URL:", adminUser.logoUrl);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
setLogo();
