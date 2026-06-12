const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Payment = require('./models/Payment');

dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI;
    console.log("Connecting to:", mongoUri ? mongoUri.split('@')[1] || mongoUri : 'undefined');
    await mongoose.connect(mongoUri);
    console.log("Connected successfully.");

    const payments = await Payment.find({}).sort({ createdAt: -1 }).limit(10);
    console.log("Recent 10 Payments:");
    payments.forEach(p => {
      console.log(`ID: ${p._id}`);
      console.log(`  ProjectName: ${p.projectName}`);
      console.log(`  Amount: ${p.amount} ${p.currency}`);
      console.log(`  Status: ${p.status}`);
      console.log(`  ScreenshotUrl: ${p.screenshotUrl}`);
      console.log(`  Note: ${p.note}`);
      console.log(`  CreatedAt: ${p.createdAt}`);
      console.log('----------------------------------------');
    });

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
