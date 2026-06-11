const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Project = require('./models/Project');
const Schedule = require('./models/Schedule');
const Payment = require('./models/Payment');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/strategic-brand-solutions');
    console.log("CONNECTED TO MONGO");
    
    const payments = await Payment.find({});
    console.log("\n--- PAYMENTS ---");
    console.log(payments.map(p => ({
      id: p._id,
      client: p.clientName,
      projectName: p.projectName,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      createdAt: p.createdAt
    })));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
