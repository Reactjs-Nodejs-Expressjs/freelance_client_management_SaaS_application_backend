const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const Project = require('../models/Project');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');

// @route   GET /api/dashboard/summary
router.get('/summary', protect, admin, async (req, res) => {
  try {
    const activeProjects = await Project.countDocuments({ status: { $ne: 'completed' } });
    const totalClients = await User.countDocuments({ role: 'client' });
    const projects = await Project.find({});
    
    let totalRevenueINR = 0, totalRevenueUSD = 0;
    projects.forEach(p => {
      if (p.currency === 'INR') {
        totalRevenueINR += p.paidAmount || 0;
      } else {
        totalRevenueUSD += p.paidAmount || 0;
      }
    });

    let pendingPaymentsINR = 0, pendingPaymentsUSD = 0;
    projects.forEach(p => {
      const due = (p.totalAmount || 0) - (p.paidAmount || 0);
      if (due > 0) {
        if (p.currency === 'USD') {
          pendingPaymentsUSD += due;
        } else {
          pendingPaymentsINR += due;
        }
      }
    });

    return res.json({ 
      activeProjects, 
      totalClients, 
      totalRevenueINR, 
      totalRevenueUSD, 
      pendingPaymentsINR, 
      pendingPaymentsUSD 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching summary' });
  }
});

// @route   GET /api/dashboard/activity
router.get('/activity', protect, admin, async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 }).limit(5);
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(5);
    const activities = [];

    payments.forEach(p => {
      activities.push({
        id: p._id,
        message: `Payment of ${p.currency} ${p.amount} for "${p.projectName}" — ${p.status}`,
        type: 'payment',
        status: p.status,
        createdAt: p.createdAt
      });
    });

    notifications.forEach(n => {
      // Detect chat messages — show summary instead of full content
      const isChat = n.title && (n.title.toLowerCase().includes('message') || n.title.toLowerCase().includes('chat'));
      activities.push({
        id: n._id,
        message: isChat ? n.title : n.message,
        type: isChat ? 'chat' : 'notification',
        status: n.isRead ? 'read' : 'unread',
        createdAt: n.createdAt
      });
    });

    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json(activities.slice(0, 10));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching activity' });
  }
});

// @route   GET /api/dashboard/payment-stats?period=day|month|year
router.get('/payment-stats', protect, admin, async (req, res) => {
  try {
    const period = req.query.period || 'month';
    const projects = await Project.find({});
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let statsMap = {};
    let labels = [];

    if (period === 'day') {
      // Last 30 days
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = `${d.getDate()}/${d.getMonth() + 1}`;
        labels.push(key);
        statsMap[key] = { day: key, collected: 0, pending: 0 };
      }
      projects.forEach(p => {
        const date = new Date(p.startDate || p.createdAt);
        const key = `${date.getDate()}/${date.getMonth() + 1}`;
        if (statsMap[key]) {
          const collectedINR = p.currency === 'USD' ? (p.paidAmount || 0) * 83 : (p.paidAmount || 0);
          statsMap[key].collected += collectedINR;
          
          const due = (p.totalAmount || 0) - (p.paidAmount || 0);
          if (due > 0) {
            const pendingINR = p.currency === 'USD' ? due * 83 : due;
            statsMap[key].pending += pendingINR;
          }
        }
      });
      const result = labels.map(k => ({ ...statsMap[k], month: k }));
      return res.json({ paymentsByMonth: result });

    } else if (period === 'year') {
      // Last 5 years
      for (let i = 4; i >= 0; i--) {
        const y = currentYear - i;
        labels.push(String(y));
        statsMap[y] = { month: String(y), collected: 0, pending: 0 };
      }
      projects.forEach(p => {
        const date = new Date(p.startDate || p.createdAt);
        const y = date.getFullYear();
        if (statsMap[y]) {
          const collectedINR = p.currency === 'USD' ? (p.paidAmount || 0) * 83 : (p.paidAmount || 0);
          statsMap[y].collected += collectedINR;
          
          const due = (p.totalAmount || 0) - (p.paidAmount || 0);
          if (due > 0) {
            const pendingINR = p.currency === 'USD' ? due * 83 : due;
            statsMap[y].pending += pendingINR;
          }
        }
      });
      return res.json({ paymentsByMonth: labels.map(k => statsMap[k]) });

    } else {
      // Default: month view for current year
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach(m => { statsMap[m] = { month: m, collected: 0, pending: 0 }; });
      projects.forEach(p => {
        const date = new Date(p.startDate || p.createdAt);
        if (date.getFullYear() === currentYear) {
          const monthName = months[date.getMonth()];
          const collectedINR = p.currency === 'USD' ? (p.paidAmount || 0) * 83 : (p.paidAmount || 0);
          statsMap[monthName].collected += collectedINR;
          
          const due = (p.totalAmount || 0) - (p.paidAmount || 0);
          if (due > 0) {
            const pendingINR = p.currency === 'USD' ? due * 83 : due;
            statsMap[monthName].pending += pendingINR;
          }
        }
      });
      return res.json({ paymentsByMonth: Object.values(statsMap) });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching payment stats' });
  }
});

// @route   GET /api/dashboard/project-progress
router.get('/project-progress', protect, admin, async (req, res) => {
  try {
    const projects = await Project.find({})
      .populate('client', 'name')
      .sort({ updatedAt: -1 });

    const progressList = projects.map(p => ({
      id: p._id,
      name: p.name,
      clientName: p.client ? p.client.name : 'Unknown Client',
      startDate: p.startDate,
      progress: p.progress,
      totalAmount: p.totalAmount,
      paidAmount: p.paidAmount,
      currency: p.currency,
      status: p.status
    }));

    return res.json(progressList);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching project progress' });
  }
});

module.exports = router;
