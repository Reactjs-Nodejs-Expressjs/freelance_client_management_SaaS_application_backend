const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Project = require('./models/Project');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/strategic-brand-solutions');
    console.log('Connected to MongoDB.');

    const client = await User.findOne({ email: 'john.doe@example.com' });
    if (!client) {
      console.error('John Doe client not found. Please run seed_one_client.js first.');
      process.exit(1);
    }

    // 1. Update "Doe Corp Branding"
    let p1 = await Project.findOne({ name: 'Doe Corp Branding' });
    if (p1) {
      p1.description = 'A premium real-time brand analytics portal for enterprise marketing metrics, featuring custom data visualization, performance reporting, and visual brand guidelines configuration.';
      p1.liveUrl = 'http://localhost:3000/';
      p1.color = '#7c3aed';
      p1.showcase = true;
      await p1.save();
      console.log('Updated project 1: Doe Corp Branding');
    } else {
      p1 = await Project.create({
        name: 'Doe Corp Branding',
        description: 'A premium real-time brand analytics portal for enterprise marketing metrics, featuring custom data visualization, performance reporting, and visual brand guidelines configuration.',
        client: client._id,
        status: 'in_progress',
        progress: 20,
        totalAmount: 100000,
        paidAmount: 0,
        currency: 'INR',
        color: '#7c3aed',
        liveUrl: 'http://localhost:3000/',
        showcase: true
      });
      console.log('Created project 1: Doe Corp Branding');
    }

    // 2. Update "social media posting"
    let p2 = await Project.findOne({ name: 'social media posting' });
    if (p2) {
      p2.description = 'An advanced cloud computing analytics system built on Node.js/MongoDB with secure JWT session authentication, real-time alert logs, and Stripe invoice billing integration.';
      p2.liveUrl = 'http://localhost:3000/';
      p2.color = '#0284c7';
      p2.showcase = true;
      await p2.save();
      console.log('Updated project 2: social media posting');
    } else {
      p2 = await Project.create({
        name: 'social media posting',
        description: 'An advanced cloud computing analytics system built on Node.js/MongoDB with secure JWT session authentication, real-time alert logs, and Stripe invoice billing integration.',
        client: client._id,
        status: 'planning',
        progress: 0,
        totalAmount: 50000,
        paidAmount: 0,
        currency: 'INR',
        color: '#0284c7',
        liveUrl: 'http://localhost:3000/',
        showcase: true
      });
      console.log('Created project 2: social media posting');
    }

    // 3. Create/Update "E-Commerce Web Portal"
    let p3 = await Project.findOne({ name: 'E-Commerce Web Portal' });
    if (p3) {
      p3.description = 'Custom e-commerce shopping platform built for direct sales, inventory control checks, multiple payment modes, and optimized SEO landing layouts.';
      p3.liveUrl = 'http://localhost:3000/';
      p3.color = '#10b981';
      p3.showcase = true;
      await p3.save();
      console.log('Updated project 3: E-Commerce Web Portal');
    } else {
      p3 = await Project.create({
        name: 'E-Commerce Web Portal',
        description: 'Custom e-commerce shopping platform built for direct sales, inventory control checks, multiple payment modes, and optimized SEO landing layouts.',
        client: client._id,
        status: 'in_progress',
        progress: 45,
        totalAmount: 150000,
        paidAmount: 75000,
        currency: 'INR',
        color: '#10b981',
        liveUrl: 'http://localhost:3000/',
        showcase: true
      });
      console.log('Created project 3: E-Commerce Web Portal');
    }

    console.log('Verification:');
    const allShowcases = await Project.find({ showcase: true });
    console.log(`Total showcase projects: ${allShowcases.length}`);
    allShowcases.forEach(p => {
      console.log(`- "${p.name}" (Showcase: ${p.showcase}, Color: ${p.color}, LiveUrl: ${p.liveUrl})`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
