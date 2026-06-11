const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Project = require('./models/Project');
const Payment = require('./models/Payment');

async function seedOneClient() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/strategic-brand-solutions');
    console.log('Connected to MongoDB...');

    // 1. Create Client
    let client = await User.findOne({ email: 'john.doe@example.com' });
    if (!client) {
      client = await User.create({
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        plainPassword: 'password123',
        role: 'client',
        company: 'Doe Corp',
        phone: '+1234567890'
      });
      console.log('Created client John Doe:', client._id);
    } else {
      console.log('Client John Doe already exists:', client._id);
    }

    // 2. Create Project
    let project = await Project.findOne({ name: 'Doe Corp Branding', client: client._id });
    if (!project) {
      project = await Project.create({
        name: 'Doe Corp Branding',
        description: 'Rebranding and Website development',
        client: client._id,
        status: 'in_progress',
        progress: 20,
        totalAmount: 100000,
        paidAmount: 0,
        currency: 'INR',
        startDate: new Date(),
        deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        milestones: [
          { title: 'Design Mockups', status: 'pending', dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
          { title: 'Development Phase', status: 'pending', dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) }
        ],
        updates: [
          { title: 'Project Initiated', description: 'Kickoff call complete and designs started.', category: 'general' }
        ]
      });
      console.log('Created project Doe Corp Branding:', project._id);
    } else {
      console.log('Project Doe Corp Branding already exists:', project._id);
    }

    // 3. Create Pending Payment
    let payment = await Payment.findOne({ project: project._id, amount: 40000 });
    if (!payment) {
      const qrToken = `SBS-PAY-${Date.now()}-JOHN`;
      payment = await Payment.create({
        project: project._id,
        projectName: project.name,
        clientName: client.name,
        amount: 40000,
        currency: 'INR',
        status: 'pending',
        qrToken,
        note: 'Upfront deposit',
        verificationStep: 0,
        createdAt: new Date()
      });
      console.log('Created pending payment request for 40000 INR:', payment._id);
    } else {
      console.log('Payment request already exists:', payment._id);
    }

    console.log('Seed one client finished successfully! 🎉');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding one client:', error);
    process.exit(1);
  }
}

seedOneClient();
