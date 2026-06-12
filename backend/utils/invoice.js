const fs = require('fs');
const path = require('path');
const Payment = require('../models/Payment');
const Project = require('../models/Project');
const User = require('../models/User');

const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

const generateInvoiceFile = async (paymentId) => {
  try {
    const payment = await Payment.findById(paymentId);
    if (!payment) return null;

    const adminUser = await User.findOne({ role: 'admin' });
    const adminCompany = adminUser ? (adminUser.company || 'Strategic Brand Solutions') : 'Strategic Brand Solutions';
    const adminEmail = adminUser ? adminUser.email : 'admin@strategicbrand.solutions';
    const adminPhone = adminUser && adminUser.phone ? `<div>Phone: ${adminUser.phone}</div>` : '';
    const adminAddress = adminUser ? (adminUser.address || 'Mumbai, Maharashtra, India') : 'Mumbai, Maharashtra, India';
    const adminLogoText = adminUser ? (adminUser.logoText || 'Strategic Brand') : 'Strategic Brand';

    const brandLogoPath = adminUser && adminUser.logoUrl
      ? (adminUser.logoUrl.startsWith('http') ? adminUser.logoUrl : `${backendUrl}${adminUser.logoUrl}`)
      : '';

    const logoInitials = adminLogoText
      .split(/\s+/)
      .map(w => w[0])
      .join('')
      .slice(0, 3)
      .toUpperCase() || 'S';

    // Render the uploaded company logo image if configured, otherwise fallback to initials
    const brandLogoHtml = brandLogoPath
      ? `<img src="${brandLogoPath}" alt="Logo" class="brand-logo-img shrink-0 object-cover" style="border-radius: 50%;" />`
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

    let statusClass = 'status-pending';
    let statusLabel = 'Pending';
    if (payment.status === 'verified') {
      statusClass = 'status-verified';
      statusLabel = 'Paid';
    } else if (payment.status === 'submitted') {
      statusClass = 'status-submitted';
      statusLabel = 'Submitted';
    } else if (payment.status === 'first_verified') {
      statusClass = 'status-submitted';
      statusLabel = 'First Verified';
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

module.exports = {
  generateInvoiceFile
};
