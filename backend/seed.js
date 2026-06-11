const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Project = require('./models/Project');
const Payment = require('./models/Payment');
const Notification = require('./models/Notification');

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/strategic-brand-solutions');
    console.log('MongoDB Connected for Seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Project.deleteMany({});
    await Payment.deleteMany({});
    await Notification.deleteMany({});
    console.log('Database cleared.');

    // 1. Create Admin
    const adminUser = await User.create({
      name: 'Akhil Thadaka',
      email: 'akhilthadaka97@gmail.com',
      password: 'Akhil@7777',
      plainPassword: 'Akhil@7777',
      role: 'admin'
    });
    console.log('Admin user seeded.');

    // 2. Create Client 1
    const clientUser = await User.create({
      name: 'Arjun Sen',
      email: 'arjun@techflow.in',
      password: 'client123',
      plainPassword: 'client123',
      role: 'client',
      company: 'TechFlow Solutions',
      phone: '+91 98765 43210'
    });
    console.log('Client 1 user seeded.');

    // 3. Create Client 2
    const clientUser2 = await User.create({
      name: 'Rohit Sharma',
      email: 'rohit@bluecreative.co',
      password: 'client456',
      plainPassword: 'client456',
      role: 'client',
      company: 'Blue Creative Agency',
      phone: '+91 87654 32109'
    });
    console.log('Client 2 user seeded.');

    // 4. Create Sample Project for Client 1
    const project = await Project.create({
      name: 'TechFlow Brand Strategy & Rebranding',
      description: 'Comprehensive brand audit, visual identity revamp, website mockup design, and messaging strategy for TechFlow Solutions SaaS platform.',
      client: clientUser._id,
      status: 'in_progress',
      progress: 60,
      totalAmount: 150000,
      paidAmount: 50000,
      currency: 'INR',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      milestones: [
        { title: 'Brand Discovery & Stakeholder Audits', status: 'completed', dueDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) },
        { title: 'Logo System & Visual Identity Board', status: 'completed', dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
        { title: 'Brand Guidelines Document', status: 'in-progress', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
        { title: 'Website Mockups (Figma)', status: 'pending', dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000) }
      ],
      updates: [
        { title: 'Visual Identity Board Approved', description: 'The typography, color schemes, and new logo versions were approved by the board.', category: 'milestone', createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
        { title: 'Brand Audit Completed', description: 'Finished stakeholder interviews and competitor brand landscape audit.', category: 'general', createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) },
        { title: 'Project Kicked Off', description: 'Initial briefing call complete. Rebranding project successfully initiated.', category: 'general', createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      ],
      messages: [
        { sender: adminUser._id, message: 'Hi Arjun! I have uploaded the final visual identity board. Let me know if you have any feedback.' },
        { sender: clientUser._id, message: 'Looks absolutely amazing, Akhil! The team loves the modern look. Approved.' }
      ]
    });
    console.log('Sample project for Client 1 seeded.');

    // 5. Create Sample Project for Client 2
    const project2 = await Project.create({
      name: 'Blue Creative Identity Design',
      description: 'Brand logo revamping, stationery template package, and primary social visual templates.',
      client: clientUser2._id,
      status: 'planning',
      progress: 15,
      totalAmount: 90000,
      paidAmount: 0,
      currency: 'INR',
      startDate: new Date(),
      deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      milestones: [
        { title: 'Moodboard & Visual Directions', status: 'completed', dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
        { title: 'Stationery Templates Mockups', status: 'pending', dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) }
      ],
      updates: [
        { title: 'Project Initiated', description: 'Blue Creative Identity design roadmap planned and kickoff initiated.', category: 'general' }
      ]
    });
    console.log('Sample project for Client 2 seeded.');

    // 6. Create Sample Payment for Client 1
    const qrToken = `SBS-PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await Payment.create({
      project: project._id,
      projectName: project.name,
      clientName: clientUser.name,
      amount: 50000,
      currency: 'INR',
      status: 'verified',
      qrToken,
      note: '50% Upfront deposit',
      verificationStep: 2,
      firstVerifiedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
      secondVerifiedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
    });

    // 7. Create Pending Payment Request for Client 1
    const pendingQrToken = `SBS-PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await Payment.create({
      project: project._id,
      projectName: project.name,
      clientName: clientUser.name,
      amount: 100000,
      currency: 'INR',
      status: 'pending',
      qrToken: pendingQrToken,
      note: 'Remaining balance upon milestones completion',
      verificationStep: 0,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    });

    // 8. Create Pending Payment Request for Client 2
    const pendingQrToken2 = `SBS-PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await Payment.create({
      project: project2._id,
      projectName: project2.name,
      clientName: clientUser2.name,
      amount: 45000,
      currency: 'INR',
      status: 'pending',
      qrToken: pendingQrToken2,
      note: '50% Upfront deposit',
      verificationStep: 0,
      createdAt: new Date()
    });
    console.log('Payments seeded.');

    // 9. Create notifications
    await Notification.create({
      user: clientUser._id,
      title: 'Welcome to your portal!',
      message: 'Welcome to Strategic Brand Solutions client portal. Track updates, visual revisions, and payments here.'
    });

    await Notification.create({
      user: clientUser2._id,
      title: 'Welcome to your portal!',
      message: 'Welcome to Strategic Brand Solutions client portal. Track updates, visual revisions, and payments here.'
    });

    await Notification.create({
      user: adminUser._id,
      title: 'Client Approved Visual Board',
      message: 'Arjun Sen approved the Logo System & Visual Identity board.'
    });

    console.log('Notifications seeded.');
    console.log('Database Seeding Completed Successfully! 🎉');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error.message);
    process.exit(1);
  }
};

seedData();
