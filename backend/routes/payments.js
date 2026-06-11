const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const Payment = require('../models/Payment');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Message = require('../models/Message');
const fs = require('fs');
const path = require('path');

const generateInvoiceFile = async (paymentId) => {
  const { generateInvoiceFile: gen } = require('../utils/invoice');
  return gen(paymentId);
  try {
    const payment = await Payment.findById(paymentId);
    if (!payment) return null;

    const adminUser = await User.findOne({ role: 'admin' });
    const adminName = adminUser ? adminUser.name : 'Strategic Brand Solutions';
    const adminCompany = adminUser ? (adminUser.company || 'Strategic Brand Solutions') : 'Strategic Brand Solutions';
    const adminEmail = adminUser ? adminUser.email : 'admin@strategicbrand.solutions';
    const adminPhone = adminUser && adminUser.phone ? `<div>Phone: ${adminUser.phone}</div>` : '';
    const adminAddress = adminUser ? (adminUser.address || 'Mumbai, Maharashtra, India') : 'Mumbai, Maharashtra, India';
    const adminLogoText = adminUser ? (adminUser.logoText || 'Strategic Brand') : 'Strategic Brand';

    const brandLogoPath = adminUser && adminUser.logoUrl
      ? (adminUser.logoUrl.startsWith('http') ? adminUser.logoUrl : `http://localhost:5000${adminUser.logoUrl}`)
      : '';

    const logoInitials = adminLogoText
      .split(/\s+/)
      .map(w => w[0])
      .join('')
      .slice(0, 3)
      .toUpperCase() || 'S';

    const brandLogoHtml = brandLogoPath
      ? `<img src="${brandLogoPath}" alt="Logo" class="brand-logo-img shrink-0 object-cover" />`
      : `<div class="brand-logo">${logoInitials}</div>`;

    let clientUser = null;
    if (payment.project) {
      const project = await Project.findById(payment.project).populate('client');
      if (project && project.client) {
        clientUser = project.client;
      }
    }
    
    if (!clientUser) {
      clientUser = await User.findOne({ name: payment.clientName, role: 'client' });
    }

    const invoicesDir = path.join(__dirname, '../uploads/invoices');
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }

    const invoiceNo = payment._id.toString().substring(18).toUpperCase();
    const createdAtLabel = new Date(payment.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formatCurrency = (val, curr) => {
      const isInteger = parseFloat(val) % 1 === 0;
      const digits = isInteger ? 0 : 2;
      if (curr === 'USD') return `$${parseFloat(val).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: 2 })}`;
      return `₹${parseFloat(val).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: 2 })}`;
    };

    const formattedAmount = formatCurrency(payment.amount, payment.currency);
    const currencySymbol = payment.currency === 'USD' ? '$' : '₹';

    let statusClass = 'status-pending';
    let statusLabel = 'Pending';
    if (payment.status === 'verified') {
      statusClass = 'status-verified';
      statusLabel = 'Paid';
    } else if (payment.status === 'submitted') {
      statusClass = 'status-submitted';
      statusLabel = 'Submitted';
    } else if (payment.status === 'rejected') {
      statusClass = 'status-rejected';
      statusLabel = 'Rejected';
    }

    const companyLine = (clientUser && clientUser.company) ? `<div class="client-info">Company: ${clientUser.company}</div>` : '';
    const emailLine = (clientUser && clientUser.email) ? `<div class="client-info">${clientUser.email}</div>` : '';
    const phoneLine = (clientUser && clientUser.phone) ? `<div class="client-info">Phone: ${clientUser.phone}</div>` : '';

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${payment.projectName || 'Payment'}</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #7c3aed;
      --primary-dark: #6d28d9;
      --primary-light: #a78bfa;
      --accent: #10b981;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --border-color: #e2e8f0;
      --bg-light: #f8fafc;
      --bg-card: #ffffff;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: 'Outfit', sans-serif;
      color: var(--text-main);
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .container {
      width: 210mm;
      height: 297mm;
      margin: 30px auto;
      padding: 15mm 15mm;
      background-color: var(--bg-card);
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.03);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
    }
    .gradient-banner {
      height: 4px;
      background: linear-gradient(90deg, #7c3aed 0%, #a78bfa 50%, #10b981 100%);
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      border-top-left-radius: 16px;
      border-top-right-radius: 16px;
    }
    .invoice-body {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }
    .logo-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-top: 5px;
      margin-bottom: 15px;
    }
    .brand-title-centered {
      font-size: 22px;
      font-weight: 900;
      color: var(--primary);
      margin-top: 10px;
      margin-bottom: 2px;
      letter-spacing: -0.5px;
    }
    .brand-subtitle-centered {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .brand-logo {
      width: 70px;
      height: 70px;
      border-radius: 16px;
      background: linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 900;
      font-size: 22px;
      letter-spacing: -0.5px;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.15);
    }
    .brand-logo-img {
      width: 70px;
      height: 70px;
      border-radius: 16px;
      border: 1px solid var(--border-color);
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.15);
      object-fit: cover;
    }
    .divider {
      height: 1px;
      background-color: var(--border-color);
      margin-bottom: 20px;
    }
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .invoice-title-block {
      text-align: left;
    }
    .invoice-title {
      font-size: 32px;
      font-weight: 900;
      color: var(--text-main);
      letter-spacing: -1px;
      line-height: 1;
      margin: 0 0 6px 0;
    }
    .invoice-meta-item {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .invoice-meta-item span {
      font-weight: 700;
      color: var(--text-main);
    }
    .agency-details {
      text-align: right;
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .billing-status-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .section-label {
      font-size: 10px;
      font-weight: 800;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1.2px;
      margin-bottom: 6px;
    }
    .client-name {
      font-size: 16px;
      font-weight: 800;
      color: var(--text-main);
      margin-bottom: 4px;
    }
    .client-info {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .status-pill-large {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 12px;
      border: 1.5px solid;
    }
    .status-verified {
      color: #10b981;
      border-color: #a7f3d0;
      background-color: #ecfdf5;
    }
    .status-pending {
      color: #d97706;
      border-color: #fde68a;
      background-color: #fefbeb;
    }
    .status-submitted {
      color: #2563eb;
      border-color: #bfdbfe;
      background-color: #eff6ff;
    }
    .status-rejected {
      color: #dc2626;
      border-color: #fca5a5;
      background-color: #fef2f2;
    }
    .check-icon {
      font-size: 14px;
      font-weight: bold;
    }
    .item-box {
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 15px;
    }
    .item-box-header {
      background-color: #f8fafc;
      display: flex;
      justify-content: space-between;
      padding: 10px 20px;
      font-size: 10px;
      font-weight: 800;
      color: var(--text-muted);
      letter-spacing: 1.2px;
      border-bottom: 1px solid var(--border-color);
    }
    .item-box-body {
      background-color: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 20px;
    }
    .item-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
    }
    .item-subtitle {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .item-amount {
      font-size: 18px;
      font-weight: 800;
      color: var(--text-main);
    }
    .total-due-box {
      background-color: #f8fafc;
      border-radius: 12px;
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      border: 1px solid var(--border-color);
    }
    .total-due-text {
      font-size: 11px;
      color: var(--text-muted);
      max-width: 60%;
      line-height: 1.5;
    }
    .total-due-amount-container {
      text-align: right;
    }
    .total-due-amount {
      font-size: 22px;
      font-weight: 900;
      color: var(--text-main);
    }
    .payment-info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .payment-info-left {
      text-align: left;
    }
    .payment-method-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 4px;
    }
    .payment-method-desc {
      font-size: 12px;
      color: var(--text-muted);
    }
    .payment-method-desc span {
      font-family: monospace;
      font-weight: 750;
      color: var(--text-main);
      background-color: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .qr-code-container {
      padding: 6px;
      background-color: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
      display: inline-block;
    }
    .qr-code-img {
      width: 80px;
      height: 80px;
      display: block;
    }
    .footer {
      text-align: center;
      border-top: 1px solid var(--border-color);
      padding-top: 12px;
      margin-top: auto;
    }
    .footer .thank-you {
      font-weight: 700;
      color: var(--text-main);
      font-size: 12px;
      margin: 0 0 3px 0;
    }
    .footer .disclaimer {
      font-size: 10px;
      color: var(--text-muted);
      margin: 0;
    }
    .actions-row {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 12px;
      border-top: 1px dashed var(--border-color);
      padding-top: 12px;
    }
    .btn {
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
      font-weight: 700;
      padding: 8px 18px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-secondary {
      background-color: transparent;
      border: 1.5px solid #0f172a;
      color: #0f172a;
    }
    .btn-secondary:hover {
      background-color: #f8fafc;
    }
    .btn-primary {
      background: linear-gradient(135deg, var(--primary) 0%, #6d28d9 100%);
      border: none;
      color: white;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.15);
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 15px rgba(124, 58, 237, 0.25);
    }
    @media print {
      @page {
        size: A4;
        margin: 0;
      }
      body {
        background: #ffffff;
        color: #000000;
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      .container {
        width: 210mm;
        height: 297mm;
        margin: 0;
        border: none;
        box-shadow: none;
        border-radius: 0;
        padding: 15mm 15mm;
        background: #ffffff;
        box-sizing: border-box;
        page-break-inside: avoid;
      }
      .gradient-banner {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="gradient-banner"></div>
    
    <div class="invoice-body">
      <div class="logo-container">
        ${brandLogoHtml}
        <div class="brand-title-centered">${adminCompany}</div>
        <div class="brand-subtitle-centered">Creative Digital Consultancy</div>
      </div>
      
      <div class="divider"></div>
      
      <div class="invoice-header">
        <div class="invoice-title-block">
          <div class="invoice-title">Invoice</div>
          <div class="invoice-meta-item">Invoice Reference: <span>#SBS-INV-${invoiceNo}</span></div>
          <div class="invoice-meta-item">Issue Date: <span>${createdAtLabel}</span></div>
        </div>
        <div class="agency-details">
          <div>${adminEmail}</div>
          ${adminPhone}
          <div>${adminAddress}</div>
        </div>
      </div>
      
      <div class="billing-status-row">
        <div class="billed-to">
          <div class="section-label">BILLED TO</div>
          <div class="client-name">${payment.clientName}</div>
          ${emailLine}
          ${companyLine}
          ${phoneLine}
        </div>
        <div class="status-box">
          <div class="section-label" style="text-align: right;">PAYMENT STATUS</div>
          <div class="status-pill-large ${statusClass}">
            ${statusLabel === 'Paid' ? 'Verified / Paid <span class="check-icon">✓</span>' : statusLabel}
          </div>
        </div>
      </div>
      
      <div class="item-box">
        <div class="item-box-header">
          <div>SERVICE / PROJECT ITEM</div>
          <div>REQUESTED AMOUNT</div>
        </div>
        <div class="item-box-body">
          <div>
            <div class="item-title">${payment.projectName || 'web managment'}</div>
            <div class="item-subtitle">${payment.note || 'Initial Project Invoice'}</div>
          </div>
          <div class="item-amount">${formattedAmount}</div>
        </div>
      </div>
      
      <div class="total-due-box">
        <div class="total-due-text">
          All invoice transactions are secured by ${adminCompany}. Please complete pending payments via payment QR codes or direct transfer.
        </div>
        <div class="total-due-amount-container">
          <div class="section-label" style="margin-bottom: 2px;">TOTAL BILL DUE</div>
          <div class="total-due-amount">${formattedAmount}</div>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <div class="payment-info-row">
        <div class="payment-info-left">
          <div class="section-label">PAYMENT INFORMATION</div>
          <div class="payment-method-title">UPI Payment (GPay / PhonePe / Paytm)</div>
          <div class="payment-method-desc">UPI ID: <span>akhilthadaka1@ybl</span></div>
        </div>
        <div class="payment-info-right">
          <div class="qr-code-container">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('upi://pay?pa=akhilthadaka1@ybl&pn=' + adminCompany + '&cu=INR&am=' + payment.amount)}" alt="UPI QR Code" class="qr-code-img" />
          </div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p class="thank-you">Thank you for choosing ${adminCompany}!</p>
      <p class="disclaimer">This is a system generated document. For billing queries, please contact ${adminEmail}.</p>
      
      <div class="actions-row no-print">
        <button class="btn btn-secondary" onclick="window.opener ? window.close() : window.location.href='/client/payments'">Completed</button>
        <button class="btn btn-primary" onclick="window.print()">Print / Save PDF</button>
      </div>
    </div>
  </div>
</body>
</html>`;

    const invoicePath = path.join(invoicesDir, `invoice-${payment._id}.html`);
    fs.writeFileSync(invoicePath, htmlContent, 'utf8');
    return `/uploads/invoices/invoice-${payment._id}.html`;
  } catch (error) {
    console.error('Invoice generation failed:', error);
    return null;
  }
};

const sendInvoiceToChat = async (payment, req, force = false) => {
  try {
    if (payment.invoiceSent && !force) return;

    let clientUser = null;
    if (payment.project) {
      const project = await Project.findById(payment.project).populate('client');
      if (project && project.client) {
        clientUser = project.client;
      }
    }
    
    if (!clientUser) {
      clientUser = await User.findOne({ name: payment.clientName, role: 'client' });
    }

    if (!clientUser) {
      console.log('Client user not found for invoice chat transmission');
      return;
    }

    const Message = require('../models/Message');
    const invoiceUrl = `http://localhost:5000/uploads/invoices/invoice-${payment._id}.html`;
    const msgText = `Here is your invoice for project **${payment.projectName || 'Direct Payment'}**:\n${invoiceUrl}`;
    
    // Check if message with this invoice URL already exists to be extra safe
    if (!force) {
      const existingMsg = await Message.findOne({ text: { $regex: payment._id.toString(), $options: 'i' } });
      if (existingMsg) {
        console.log('Invoice message already sent to chat, skipping');
        payment.invoiceSent = true;
        await payment.save();
        return;
      }
    }

    const adminUser = await User.findOne({ role: 'admin' });
    const senderId = req.user ? req.user._id : adminUser._id;

    const newMsg = await Message.create({
      sender: senderId,
      recipient: clientUser._id,
      text: msgText
    });

    payment.invoiceSent = true;
    await payment.save();

    const populatedMsg = await Message.findById(newMsg._id).populate('sender', 'name role');

    // Notify client via websocket
    const io = req.app.get('socketio');
    if (io) {
      io.to(clientUser._id.toString()).emit('new_message', populatedMsg);
      io.to(senderId.toString()).emit('new_message', populatedMsg);
    }

    // Create client portal notification
    await Notification.create({
      user: clientUser._id,
      title: 'Invoice Sent 📄',
      message: `An invoice has been sent to your chat for payment of ${payment.currency} ${payment.amount}.`,
      category: 'chat'
    });
  } catch (error) {
    console.error('Failed to send invoice to chat:', error);
  }
};

// @route   GET /api/payments
// @desc    Get payments (for both Admin and Client)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let payments;
    if (req.user.role === 'admin') {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const { projectId, search, submittedOnly } = req.query;
      let filter = {};
      if (projectId && projectId !== 'undefined') {
        filter.project = projectId;
      }

      if (submittedOnly === 'true') {
        filter.$or = [
          { screenshotUrl: { $exists: true, $ne: '' } },
          { note: { $regex: 'Manual Payment', $options: 'i' } }
        ];
      }

      if (search && search.trim() !== '') {
        const searchRegex = new RegExp(search.trim(), 'i');
        const searchFilter = {
          $or: [
            { clientName: searchRegex },
            { projectName: searchRegex },
            { note: searchRegex }
          ]
        };
        if (filter.$or) {
          filter = { $and: [ { $or: filter.$or }, searchFilter ] };
        } else {
          filter.$or = searchFilter.$or;
        }
      }

      let payments;
      let total;

      if (submittedOnly === 'true') {
        const allPayments = await Payment.find(filter);
        allPayments.sort((a, b) => {
          const getStatusWeight = (status) => {
            if (status === 'submitted') return 1;
            if (status === 'first_verified') return 2;
            if (status === 'verified') return 3;
            if (status === 'rejected') return 4;
            if (status === 'failed') return 5;
            return 6;
          };
          const weightA = getStatusWeight(a.status);
          const weightB = getStatusWeight(b.status);
          if (weightA !== weightB) {
            return weightA - weightB;
          }
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        total = allPayments.length;
        payments = allPayments.slice(skip, skip + limit);
      } else {
        total = await Payment.countDocuments(filter);
        payments = await Payment.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);
      }

      const formatted = payments.map(p => ({
        id: p._id,
        projectId: p.project,
        projectName: p.projectName,
        clientName: p.clientName,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        qrToken: p.qrToken,
        isUsed: p.isUsed,
        screenshotUrl: p.screenshotUrl,
        note: p.note,
        rejectReason: p.rejectReason || '',
        verificationStep: p.verificationStep,
        firstVerifiedAt: p.firstVerifiedAt,
        secondVerifiedAt: p.secondVerifiedAt,
        createdAt: p.createdAt
      }));

      return res.json({ data: formatted, page, totalPages: Math.ceil(total / limit), total });
    } else {
      // Find all project IDs for this client securely
      const clientProjects = await Project.find({ client: req.user._id }).select('_id');
      const projectIds = clientProjects.map(p => p._id);
      
      const { projectId } = req.query;
      let filter = { project: { $in: projectIds } };
      
      if (projectId && projectId !== 'undefined') {
        const idStr = projectId.toString();
        if (projectIds.map(id => id.toString()).includes(idStr)) {
          filter.project = idStr;
        } else {
          // If the requested project does not belong to this client, secure output by returning no payments
          filter.project = null;
        }
      }
      
      payments = await Payment.find(filter).sort({ createdAt: -1 });
      
      // Fetch admin user settings for auto-removing rejected payments from client side
      const adminUser = await User.findOne({ role: 'admin' });
      const expiryHours = adminUser && adminUser.rejectedPaymentsExpiryHours !== undefined ? adminUser.rejectedPaymentsExpiryHours : 24;

      const now = new Date();
      let filteredPayments = payments;
      if (expiryHours > 0) {
        filteredPayments = payments.filter(p => {
          if (p.status === 'rejected') {
            const rejectedTime = p.rejectedAt || p.createdAt;
            const hoursElapsed = (now - new Date(rejectedTime)) / (1000 * 60 * 60);
            return hoursElapsed <= expiryHours;
          }
          return true;
        });
      }

      const formatted = filteredPayments.map(p => ({
        id: p._id,
        projectId: p.project,
        projectName: p.projectName,
        clientName: p.clientName,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        qrToken: p.qrToken,
        isUsed: p.isUsed,
        screenshotUrl: p.screenshotUrl,
        note: p.note,
        rejectReason: p.rejectReason || '',
        firstVerifiedAt: p.firstVerifiedAt,
        secondVerifiedAt: p.secondVerifiedAt,
        rejectedAt: p.rejectedAt,
        createdAt: p.createdAt
      }));

      return res.json({ data: formatted });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error fetching payments' });
  }
});

// @route   POST /api/payments
// @desc    Request a payment (creates pending transaction with QR token)
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  const { projectId, amount, currency, note } = req.body;

  try {
    if (!projectId || !amount) {
      return res.status(400).json({ error: 'Project ID and amount are required' });
    }

    const project = await Project.findById(projectId).populate('client');
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Generate unique QR Token
    const qrToken = `SBS-PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payment = await Payment.create({
      project: projectId,
      projectName: project.name,
      clientName: project.client ? project.client.name : 'Unknown Client',
      amount,
      currency: currency || 'INR',
      note: note || '',
      qrToken,
      status: 'pending'
    });

    // Notify client inbox of the new payment request
    await Notification.create({
      user: project.client._id,
      title: 'New Payment Invoice Requested',
      message: `Strategic Brand Solutions has requested a payment of ${currency} ${amount} for project "${project.name}". Please scan the QR code to proceed.`,
      category: 'general'
    });

    return res.status(201).json({
      id: payment._id,
      projectId: payment.project,
      projectName: payment.projectName,
      clientName: payment.clientName,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      qrToken: payment.qrToken,
      createdAt: payment.createdAt
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error requesting payment' });
  }
});

// @route   POST /api/payments/manual
// @desc    Admin manually records a payment for a project (instant verification and credit)
// @access  Private/Admin
router.post('/manual', protect, admin, async (req, res) => {
  const { projectId, amount, paymentType, note, currency } = req.body;

  try {
    if (!projectId || !amount || !paymentType) {
      return res.status(400).json({ error: 'Project, amount, and payment type are required' });
    }

    const project = await Project.findById(projectId).populate('client');
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Generate manual payment request and mark it fully verified instantly
    const payment = await Payment.create({
      project: projectId,
      projectName: project.name,
      clientName: project.client ? project.client.name : 'Unknown Client',
      amount: parseFloat(amount),
      currency: currency || project.currency || 'INR',
      note: `${paymentType} (Manual Payment)${note ? ` - ${note}` : ''}`,
      status: 'verified',
      verificationStep: 2,
      secondVerifiedAt: new Date()
    });

    // Auto-generate HTML invoice
    await generateInvoiceFile(payment._id);

    // Auto-send invoice link to client chat exactly once - DISABLED AUTO-SEND
    // await sendInvoiceToChat(payment, req);

    // Directly credit the project budget balance
    project.paidAmount = (project.paidAmount || 0) + parseFloat(amount);
    project.updates.push({
      title: 'Manual Payment Recorded ✅',
      description: `Admin recorded a manual payment of ${payment.currency} ${amount} via ${paymentType}. Note: ${note || 'None'}`,
      category: 'payment'
    });
    await project.save();

    // Create client portal notification if user exists
    if (project.client) {
      await Notification.create({
        user: project.client._id,
        title: 'Manual Payment Confirmed ✅',
        message: `A manual payment of ${payment.currency} ${amount} has been successfully recorded and credited to project "${project.name}".`,
        category: 'general'
      });
    }

    return res.status(201).json({ success: true, payment });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error recording manual payment' });
  }
});

// @route   POST /api/payments/direct-submit
// @desc    Client submits direct payment proof without an admin invoice request
// @access  Private/Client
router.post('/direct-submit', protect, async (req, res) => {
  const { screenshotUrl, paymentType, note, amount, currency, projectId } = req.body;

  try {
    if (!screenshotUrl || !paymentType || !amount) {
      return res.status(400).json({ error: 'Screenshot, payment method, and amount are required' });
    }

    // Find the client's project for association
    let clientProject = null;
    if (projectId) {
      clientProject = await Project.findById(projectId);
    }
    if (!clientProject) {
      clientProject = await Project.findOne({ client: req.user._id }).sort({ createdAt: -1 });
    }

    const payment = await Payment.create({
      project: clientProject?._id ?? null,
      projectName: clientProject?.name ?? 'Direct Payment',
      clientName: req.user.name,
      amount: parseFloat(amount),
      currency: currency || 'INR',
      note: `${paymentType}${note ? ` - ${note}` : ''} (Direct Payment - No Invoice Request)`,
      status: 'submitted',
      screenshotUrl,
    });

    // Notify admin
    const adminUser = await User.findOne({ role: 'admin' });
    if (adminUser) {
      await Notification.create({
        user: adminUser._id,
        title: 'Direct Payment Submitted by Client',
        message: `Client "${req.user.name}" submitted a direct payment proof of ${currency || 'INR'} ${amount} via ${paymentType}. No invoice request was linked.`,
        category: 'general'
      });
    }

    return res.status(201).json({ success: true, payment });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error submitting direct payment' });
  }
});

// @route   POST /api/payments/:id/submit
// @desc    Client submits payment screenshot and proof
// @access  Private
router.post('/:id/submit', protect, async (req, res) => {
  const { screenshotUrl, paymentType, note, amount } = req.body;

  try {
    if (!screenshotUrl || !paymentType) {
      return res.status(400).json({ error: 'Screenshot and payment method are required' });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment request not found' });
    }

    // Verify payment belongs to this client
    const project = await Project.findById(payment.project);
    if (!project || project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied to this payment' });
    }

    payment.status = 'submitted';
    payment.screenshotUrl = screenshotUrl;
    payment.note = `${paymentType}${note ? ` - ${note}` : ''}`;
    if (amount) payment.amount = amount;

    await payment.save();

    // Create project timeline activity log
    project.updates.push({
      title: 'Payment Receipt Uploaded 💳',
      description: `Payment proof of ${payment.currency} ${payment.amount} via ${paymentType} has been submitted for review.`,
      category: 'payment'
    });
    await project.save();

    // Send dashboard notification to admin
    const adminUser = await User.findOne({ role: 'admin' });
    if (adminUser) {
      await Notification.create({
        user: adminUser._id,
        title: 'Payment Submitted by Client',
        message: `Client "${req.user.name}" has uploaded a payment proof of ${payment.currency} ${payment.amount} using ${paymentType} for project "${project.name}".`,
        category: 'general'
      });
    }

    return res.json({ success: true, payment });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error submitting payment proof' });
  }
});

// @route   POST /api/payments/:id/verify-step1
// @desc    First verification step for payment receipt
// @access  Private/Admin
router.post('/:id/verify-step1', protect, admin, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    payment.status = 'first_verified';
    payment.verificationStep = 1;
    payment.firstVerifiedAt = new Date();

    await payment.save();

    // Create activity timeline log on the project
    const project = await Project.findById(payment.project);
    if (project) {
      project.updates.push({
        title: 'Payment First Verified',
        description: `Payment of ${payment.currency} ${payment.amount} has passed the initial validation check.`,
        category: 'payment'
      });
      await project.save();
    }

    return res.json({ success: true, payment });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error during first verification' });
  }
});

// @route   POST /api/payments/:id/verify
// @desc    Final verification step for payment
// @access  Private/Admin
router.post('/:id/verify', protect, admin, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    payment.status = 'verified';
    payment.verificationStep = 2;
    payment.secondVerifiedAt = new Date();

    await payment.save();

    // Auto-generate HTML invoice
    await generateInvoiceFile(payment._id);

    // Auto-send invoice link to client chat exactly once - DISABLED AUTO-SEND
    // await sendInvoiceToChat(payment, req);

    // Update paid amount on the project and add to timeline
    const project = await Project.findById(payment.project);
    if (project) {
      project.paidAmount = (project.paidAmount || 0) + payment.amount;
      project.updates.push({
        title: 'Payment Verified & Applied',
        description: `Final verification approved for ${payment.currency} ${payment.amount}. Applied to project budget.`,
        category: 'payment'
      });
      await project.save();

      // Send invoice verification notification to client
      await Notification.create({
        user: project.client,
        title: 'Payment Confirmed ✅',
        message: `Your payment of ${payment.currency} ${payment.amount} for "${project.name}" has been fully verified and credited. Thank you!`,
        category: 'general'
      });
    }

    return res.json({ success: true, payment });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error during final verification' });
  }
});

// @route   POST /api/payments/:id/reject
// @desc    Reject payment request or proof with reason
// @access  Private/Admin
router.post('/:id/reject', protect, admin, async (req, res) => {
  const { rejectReason } = req.body;

  try {
    if (!rejectReason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    payment.status = 'rejected';
    payment.rejectReason = rejectReason;
    payment.verificationStep = 0; // reset verification step if rejected
    payment.rejectedAt = new Date();

    await payment.save();

    // Log update on the project timeline if exists
    const project = await Project.findById(payment.project);
    if (project) {
      project.updates.push({
        title: 'Payment Rejected ❌',
        description: `Payment request of ${payment.currency} ${payment.amount} has been rejected. Reason: ${rejectReason}`,
        category: 'payment'
      });
      await project.save();

      // Send automated notification to client
      await Notification.create({
        user: project.client,
        title: 'Payment Submission Rejected ❌',
        message: `Your payment proof of ${payment.currency} ${payment.amount} for "${project.name}" has been rejected. Reason: ${rejectReason}`,
        category: 'general'
      });

    }

    return res.json({ success: true, payment });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error during payment rejection' });
  }
});

// @route   POST /api/payments/:id/send-invoice
// @desc    Generate HTML invoice and send it to client chat
// @access  Private/Admin
router.post('/:id/send-invoice', protect, admin, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Auto-generate HTML invoice
    const invoicePath = await generateInvoiceFile(payment._id);
    if (!invoicePath) {
      return res.status(500).json({ error: 'Failed to generate invoice file' });
    }

    // Send invoice to chat, forcing it to resend if already sent
    await sendInvoiceToChat(payment, req, true);

    const invoiceUrl = `http://localhost:5000/uploads/invoices/invoice-${payment._id}.html`;
    return res.json({ success: true, url: invoiceUrl });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error generating or sending invoice' });
  }
});

// @route   DELETE /api/payments/:id
// @desc    Delete a payment request (only if status is not 'verified')
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    if (payment.status === 'verified') {
      return res.status(400).json({ error: 'Cannot delete a verified payment' });
    }
    await Payment.deleteOne({ _id: payment._id });
    return res.json({ success: true, message: 'Payment request deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error deleting payment request' });
  }
});

module.exports = router;
