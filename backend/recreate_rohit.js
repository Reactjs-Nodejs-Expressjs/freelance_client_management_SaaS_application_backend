const mongoose = require('mongoose');
const User = require('./models/User');
const Project = require('./models/Project');
const Payment = require('./models/Payment');

async function recreate() {
  try {
    await mongoose.connect('mongodb://localhost:27017/strategic-brand-solutions');
    console.log("Connected to MongoDB.");

    let rohit = await User.findOne({ name: "Rohit Sharma" });
    if (!rohit) {
      rohit = await User.create({
        name: 'Rohit Sharma',
        email: 'rohit@bluecreative.co',
        password: 'client456',
        plainPassword: 'client456',
        role: 'client',
        company: 'Blue Creative Agency',
        phone: '+91 87654 32109'
      });
      console.log("Created Rohit Sharma client user.");
    } else {
      console.log("Rohit Sharma client user already exists:", rohit._id);
    }

    let project = await Project.findOne({ name: "Blue Creative Identity Design" });
    if (!project) {
      project = await Project.create({
        name: 'Blue Creative Identity Design',
        description: 'Brand logo revamping, stationery template package, and primary social visual templates.',
        client: rohit._id,
        status: 'completed',
        progress: 100,
        totalAmount: 90000,
        paidAmount: 90000,
        currency: 'INR',
        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        deadline: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        color: '#8b5cf6',
        milestones: [
          { title: 'Moodboard & Visual Directions', status: 'completed', dueDate: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000) },
          { title: 'Stationery Templates Mockups', status: 'completed', dueDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) }
        ],
        updates: [
          { title: 'Project Initiated', description: 'Blue Creative Identity design roadmap planned and kickoff initiated.', category: 'general', createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
          { title: 'Project Completed', description: 'All visual brand identity deliverables sent and approved.', category: 'general', createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), progress: 100 }
        ]
      });
      console.log("Created Blue Creative Identity Design project for Rohit Sharma.");
    } else {
      project.status = "completed";
      project.progress = 100;
      project.totalAmount = 90000;
      project.paidAmount = 90000;
      await project.save();
      console.log("Updated Blue Creative Identity Design project to completed.");
    }

    const payment = await Payment.findOne({ clientName: "Rohit Sharma", amount: 90000 });
    if (!payment) {
      await Payment.create({
        project: project._id,
        projectName: project.name,
        clientName: rohit.name,
        amount: 90000,
        currency: 'INR',
        status: 'verified',
        qrToken: `SBS-PAY-${Date.now()}-ROHIT`,
        note: 'Full payment for Identity Design',
        verificationStep: 2,
        firstVerifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        secondVerifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      });
      console.log("Created Payment for Rohit Sharma project.");
    }

    console.log("Recreation successful.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
recreate();
