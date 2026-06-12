const mongoose = require('mongoose');
const Payment = require('./models/Payment');

async function checkPayments() {
  try {
    await mongoose.connect('mongodb://localhost:27017/strategic-brand-solutions');
    console.log("Connected to MongoDB.");
    
    const payments = await Payment.find({});
    console.log("Total Payments:", payments.length);
    payments.forEach(p => {
      console.log(`ID: ${p._id}, Project: ${p.projectName}, Amount: ${p.amount}, Status: ${p.status}, ScreenshotUrl: ${p.screenshotUrl}, Note: ${p.note}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}
checkPayments();
