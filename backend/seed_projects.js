const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Project = require('./models/Project');

dotenv.config();

const SEED_PROJECTS = [
  {
    name: 'Strategic Brand Identity Dashboard',
    description: 'A premium real-time brand analytics portal for enterprise marketing metrics, featuring custom data visualization, performance reporting, and visual brand guidelines configuration.',
    status: 'in_progress',
    progress: 75,
    totalAmount: 180000,
    paidAmount: 90000,
    currency: 'INR',
    color: '#7c3aed',
    liveUrl: 'http://localhost:3000/',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    milestones: [
      { title: 'Brand Audit & Metric Dashboards Wireframing', status: 'completed', dueDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
      { title: 'UI/UX Visual Design Templates (Figma)', status: 'completed', dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
      { title: 'Backend REST API Integration', status: 'in-progress', dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
      { title: 'Beta Release & Feedback Audits', status: 'pending', dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) }
    ],
    updates: [
      { title: 'Visual Templates Completed', description: 'Interactive wireframes and high-fidelity dashboard graphics have been designed and approved.', category: 'milestone' },
      { title: 'Project Kicked Off', description: 'Briefing, credentials setup, and database design finalized.', category: 'general' }
    ]
  },
  {
    name: 'SaaS Analytics Platform Integration',
    description: 'An advanced cloud computing analytics system built on Node.js/MongoDB with secure JWT session authentication, real-time alert logs, and Stripe invoice billing integration.',
    status: 'review',
    progress: 90,
    totalAmount: 220000,
    paidAmount: 110000,
    currency: 'INR',
    color: '#0284c7',
    liveUrl: 'http://localhost:3000/',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    milestones: [
      { title: 'Infrastructure Setup & DB Schema design', status: 'completed', dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      { title: 'Auth Service & Multi-tenant logic', status: 'completed', dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
      { title: 'Analytics reporting hooks', status: 'completed', dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      { title: 'Stripe webhook security check', status: 'in-progress', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) }
    ],
    updates: [
      { title: 'Reporting Hooks Completed', description: 'Aggregation algorithms integrated into backend controllers.', category: 'milestone' },
      { title: 'Schema Completed', description: 'DB indices optimized for scale and quick analytics fetches.', category: 'general' }
    ]
  },
  {
    name: 'E-Commerce Web Portal',
    description: 'Custom e-commerce shopping platform built for direct sales, inventory control checks, multiple payment modes, and optimized SEO landing layouts.',
    status: 'in_progress',
    progress: 45,
    totalAmount: 150000,
    paidAmount: 75000,
    currency: 'INR',
    color: '#10b981',
    liveUrl: 'http://localhost:3000/',
    imageUrl: 'https://images.unsplash.com/photo-1557821552-17105176677c?auto=format&fit=crop&w=800&q=80',
    milestones: [
      { title: 'SEO Landing Page Design Layout', status: 'completed', dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      { title: 'Shopping Cart System Logic', status: 'in-progress', dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
      { title: 'Payment Gateways Integrations', status: 'pending', dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) }
    ],
    updates: [
      { title: 'Landing Layout Completed', description: 'Fully audited SEO layout with meta tag configurations passed.', category: 'milestone' }
    ]
  },
  {
    name: 'AI Chatbot Support Assistant',
    description: 'Intelligent OpenAI-integrated customer care bot capable of answering complex inquiries, scheduling calendar slots, and managing CRM data pipelines.',
    status: 'completed',
    progress: 100,
    totalAmount: 3000,
    paidAmount: 3000,
    currency: 'USD',
    color: '#f59e0b',
    liveUrl: 'http://localhost:3000/',
    imageUrl: 'https://images.unsplash.com/photo-1531746790731-6c087fecd77a?auto=format&fit=crop&w=800&q=80',
    milestones: [
      { title: 'NLP Models configuration & Prompts design', status: 'completed', dueDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) },
      { title: 'Integration with support ticket system', status: 'completed', dueDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) },
      { title: 'Live preview portal testing', status: 'completed', dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
    ],
    updates: [
      { title: 'NLP Models Live', description: 'Prompts tuned and context size calibrated successfully.', category: 'milestone' }
    ]
  },
  {
    name: 'Creative Agency Hub',
    description: 'An interactive portfolio space for content designers, featuring custom CSS transitions, media assets folders, and custom content delivery configs.',
    status: 'completed',
    progress: 100,
    totalAmount: 110000,
    paidAmount: 110000,
    currency: 'INR',
    color: '#ec4899',
    liveUrl: 'http://localhost:3000/',
    imageUrl: 'https://images.unsplash.com/photo-1542744094-3a31f103e35f?auto=format&fit=crop&w=800&q=80',
    milestones: [
      { title: 'Interactive CSS layout mockup', status: 'completed', dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
      { title: 'Visual media folder structures', status: 'completed', dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
    ],
    updates: [
      { title: 'Interactive Hub Live', description: 'Sleek custom scroll designs and media player modules finished.', category: 'milestone' }
    ]
  },
  {
    name: 'Mobile App Dashboard API',
    description: 'A robust, lightweight REST backend for supporting Android & iOS client applications with auto-scaling instances, Redis cache keys, and push notifications.',
    status: 'planning',
    progress: 10,
    totalAmount: 250000,
    paidAmount: 0,
    currency: 'INR',
    color: '#ef4444',
    liveUrl: 'http://localhost:3000/',
    imageUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80',
    milestones: [
      { title: 'Database indexes & API routing specs', status: 'in-progress', dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
      { title: 'Firebase Cloud Messaging setup', status: 'pending', dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) }
    ],
    updates: [
      { title: 'Initiating Routing Spec', description: 'Writing endpoints schemas for API endpoints compilation.', category: 'general' }
    ]
  }
];

async function runSeeder() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/strategic-brand-solutions');
    console.log('MongoDB Connected for Project Seeding...');

    // 1. Get or Create Clients
    let arjun = await User.findOne({ email: 'arjun@techflow.in' });
    if (!arjun) {
      arjun = await User.create({
        name: 'Arjun Sen',
        email: 'arjun@techflow.in',
        password: 'client123',
        plainPassword: 'client123',
        role: 'client',
        company: 'TechFlow Solutions',
        phone: '+91 98765 43210'
      });
      console.log('Arjun client seeded.');
    }

    let rohit = await User.findOne({ email: 'rohit@bluecreative.co' });
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
      console.log('Rohit client seeded.');
    }

    // 2. Delete existing projects to reseed fresh showcase set
    await Project.deleteMany({});
    console.log('Cleared all existing projects.');

    // 3. Create projects
    for (let i = 0; i < SEED_PROJECTS.length; i++) {
      const projData = SEED_PROJECTS[i];
      // Alternate clients
      const client = i % 2 === 0 ? arjun._id : rohit._id;
      
      await Project.create({
        ...projData,
        client,
        showcase: true,
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      });
    }

    console.log('Successfully seeded 6 premium showcase projects! 🎉');
    process.exit(0);
  } catch (error) {
    console.error('Seeding projects failed:', error.message);
    process.exit(1);
  }
}

runSeeder();
