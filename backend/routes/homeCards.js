const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const HomeCard = require('../models/HomeCard');

// Default initial seed data for Services and Testimonials
const SEED_SERVICES = [
  {
    type: 'service',
    title: 'Web Development',
    subtitle: '🌐 Web Development',
    bullets: ['Responsive Websites', 'Business Websites', 'Landing Pages', 'Portfolio Websites'],
    icon: 'Globe'
  },
  {
    type: 'service',
    title: 'MERN Stack Development',
    subtitle: '⚛️ MERN Stack',
    bullets: ['React.js Applications', 'Node.js & Express.js APIs', 'MongoDB Integration', 'Full-Stack Web Applications'],
    icon: 'Code2'
  },
  {
    type: 'service',
    title: 'Admin Dashboard Development',
    subtitle: '📊 Dashboard Panels',
    bullets: ['User Management Systems', 'Analytics Dashboards', 'CRM & ERP Panels', 'Inventory Management'],
    icon: 'LayoutDashboard'
  },
  {
    type: 'service',
    title: 'E-Commerce Development',
    subtitle: '🛒 E-Commerce Solutions',
    bullets: ['Online Stores', 'Shopping Cart Systems', 'Payment Gateway Integration', 'Order Management'],
    icon: 'ShoppingCart'
  },
  {
    type: 'service',
    title: 'AI Chatbot Development',
    subtitle: '🤖 AI Chatbot Solutions',
    bullets: ['Customer Support Bots', 'Website Chatbots', 'OpenAI Integration', 'WhatsApp Chatbots'],
    icon: 'Cpu'
  },
  {
    type: 'service',
    title: 'API & Backend Development',
    subtitle: '🔗 API & Backend Dev',
    bullets: ['REST APIs', 'Authentication (JWT)', 'Database Design', 'Third-Party API Integration'],
    icon: 'Link2'
  }
];

const SEED_TESTIMONIALS = [
  {
    type: 'testimonial',
    title: 'Professional and timely delivery',
    content: 'The client portal space made tracking updates extremely transparent. Highly recommended for full-stack engineering!',
    author: 'Arjun Sen',
    company: 'TechFlow Solutions',
    rating: 5
  },
  {
    type: 'testimonial',
    title: 'Outstanding Dashboard Architecture',
    content: 'Revamping our backend APIs and building a custom dashboard streamlined our inventory controls significantly.',
    author: 'Rohit Sharma',
    company: 'Blue Creative Co',
    rating: 5
  }
];

// @route   GET /api/home-cards
// @desc    Get all services and testimonials for the Home Page
// @access  Public
router.get('/', async (req, res) => {
  try {
    let cards = await HomeCard.find({}).sort({ createdAt: 1 });
    
    // Auto-seed if database collection is empty
    if (cards.length === 0) {
      console.log("[Seeding] Pre-populating services and testimonials into database...");
      await HomeCard.insertMany([...SEED_SERVICES, ...SEED_TESTIMONIALS]);
      cards = await HomeCard.find({}).sort({ createdAt: 1 });
    }

    const services = cards.filter(c => c.type === 'service');
    const testimonials = cards.filter(c => c.type === 'testimonial');

    return res.json({ services, testimonials });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching home page cards' });
  }
});

// @route   POST /api/home-cards
// @desc    Create a new home card (Admin Only)
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  const { type, title, subtitle, content, bullets, icon, author, company, rating, avatarUrl } = req.body;

  try {
    if (!type || !title) {
      return res.status(400).json({ error: 'Type (service/testimonial) and title are required' });
    }

    const card = await HomeCard.create({
      type,
      title,
      subtitle: subtitle || '',
      content: content || '',
      bullets: bullets || [],
      icon: icon || 'Globe',
      author: author || '',
      company: company || '',
      rating: rating || 5,
      avatarUrl: avatarUrl || ''
    });

    return res.status(201).json(card);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error creating home card' });
  }
});

// @route   PUT /api/home-cards/:id
// @desc    Update an existing home card (Admin Only)
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  const { title, subtitle, content, bullets, icon, author, company, rating, avatarUrl } = req.body;

  try {
    const card = await HomeCard.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (title) card.title = title;
    if (subtitle !== undefined) card.subtitle = subtitle;
    if (content !== undefined) card.content = content;
    if (bullets !== undefined) card.bullets = bullets;
    if (icon !== undefined) card.icon = icon;
    if (author !== undefined) card.author = author;
    if (company !== undefined) card.company = company;
    if (rating !== undefined) card.rating = rating;
    if (avatarUrl !== undefined) card.avatarUrl = avatarUrl;

    await card.save();
    return res.json(card);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error updating home card' });
  }
});

// @route   DELETE /api/home-cards/:id
// @desc    Delete a home card (Admin Only)
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const card = await HomeCard.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    await HomeCard.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Card deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error deleting home card' });
  }
});

module.exports = router;
