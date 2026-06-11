const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Payment = require('./models/Payment');
const Project = require('./models/Project');
const Notification = require('./models/Notification');
const User = require('./models/User');

async function simulateSubmitProof() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/strategic-brand-solutions');
    console.log('Connected to MongoDB...');

    // Find the pending payment for John Doe
    const payment = await Payment.findOne({ clientName: 'John Doe', status: 'pending' });
    if (!payment) {
      console.log('No pending payment found for John Doe.');
      process.exit(1);
    }

    const clientUser = await User.findOne({ name: 'John Doe', role: 'client' });
    if (!clientUser) {
      console.log('Client user John Doe not found.');
      process.exit(1);
    }

    const project = await Project.findById(payment.project);
    if (!project) {
      console.log('Project not found for the payment.');
      process.exit(1);
    }

    // Update payment details
    payment.status = 'submitted';
    payment.screenshotUrl = '/uploads/payments/mock_screenshot.png';
    payment.note = 'GPay - Upfront deposit';
    await payment.save();
    console.log(`Updated payment status to "submitted" for payment ID: ${payment._id}`);

    // Create project timeline activity log
    project.updates.push({
      title: 'Payment Receipt Uploaded 💳',
      description: `Payment proof of ${payment.currency} ${payment.amount} via GPay has been submitted for review.`,
      category: 'payment'
    });
    await project.save();
    console.log('Added payment upload update to project timeline.');

    // Send dashboard notification to admin
    const adminUser = await User.findOne({ role: 'admin' });
    if (adminUser) {
      await Notification.create({
        user: adminUser._id,
        title: 'Payment Submitted by Client',
        message: `Client "John Doe" has uploaded a payment proof of ${payment.currency} ${payment.amount} using GPay for project "${project.name}".`,
        category: 'general'
      });
      console.log('Created admin notification.');
    }

    console.log('Simulated client payment proof submission successfully! 🎉');
    process.exit(0);
  } catch (error) {
    console.error('Error submitting proof:', error);
    process.exit(1);
  }
}

simulateSubmitProof();
