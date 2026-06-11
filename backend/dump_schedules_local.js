const mongoose = require('mongoose');
const Schedule = require('./models/Schedule');

async function checkSchedules() {
  try {
    await mongoose.connect('mongodb://localhost:27017/strategic-brand-solutions');
    console.log("Connected to MongoDB.");
    const schedules = await Schedule.find({});
    console.log("--- SCHEDULES ---");
    console.log(JSON.stringify(schedules, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkSchedules();
