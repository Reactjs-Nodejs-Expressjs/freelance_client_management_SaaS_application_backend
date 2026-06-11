const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const sendCredentialsEmail = async (clientName, clientEmail, plainPassword) => {
  const loginLink = 'http://localhost:3000/login';
  
  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #6b21a8; font-family: serif;">Welcome to Strategic Brand Solutions!</h2>
      <p>Hello ${clientName},</p>
      <p>We are thrilled to welcome you to Strategic Brand Solutions. Your client portal is ready, where you can view project progress, approve milestones, and upload payment screenshots.</p>
      
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #f1f5f9;">
        <h4 style="margin-top: 0; color: #475569;">Your Login Credentials</h4>
        <p style="margin: 5px 0;"><strong>Email / Username:</strong> <span style="font-family: monospace;">${clientEmail}</span></p>
        <p style="margin: 5px 0;"><strong>Password:</strong> <span style="font-family: monospace;">${plainPassword}</span></p>
      </div>
      
      <p>Please log in to get started and review your project roadmap:</p>
      <p style="margin: 25px 0; text-align: center;">
        <a href="${loginLink}" style="background-color: #6b21a8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Login Portal</a>
      </p>
      
      <p style="color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 30px;">
        This is an automated notification from Strategic Brand Solutions. If you have any questions, please contact akhilthadaka97@gmail.com.
      </p>
    </div>
  `;

  const emailText = `
    Welcome to Strategic Brand Solutions!
    
    Hello ${clientName},
    
    We are thrilled to welcome you to Strategic Brand Solutions. Your client portal is ready.
    
    Your Login Credentials:
    - Email / Username: ${clientEmail}
    - Password: ${plainPassword}
    
    Please log in to get started and review your project roadmap:
    Login Portal: ${loginLink}
    
    Regards,
    Strategic Brand Solutions Team
  `;

  const logLocal = () => {
    const logPath = path.join(__dirname, '../sent_emails.log');
    const logEntry = `
[${new Date().toISOString()}] EMAIL SENT TO: ${clientEmail}
Subject: Welcome to Strategic Brand Solutions!
Body:
${emailText}
------------------------------------------------------------
`;
    fs.appendFileSync(logPath, logEntry, 'utf8');
    console.log(`[Email Logged Local] Credential email saved to backend/sent_emails.log for ${clientEmail}`);
  };

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port) || 587,
        secure: (parseInt(port) === 465),
        auth: { user, pass }
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Strategic Brand Solutions" <${user}>`,
        to: clientEmail,
        subject: 'Welcome to Strategic Brand Solutions! - Your Portal Credentials',
        text: emailText,
        html: emailHtml
      });
      console.log(`[Email Sent SMTP] Welcome credentials successfully emailed to ${clientEmail}`);
    } catch (err) {
      console.error(`[Email Failed SMTP] Failed to send email via SMTP, falling back to local file log:`, err.message);
      logLocal();
    }
  } else {
    logLocal();
  }
};

const sendProjectWelcomeEmail = async (clientName, clientEmail, plainPassword, projectName, totalAmount, currency) => {
  const loginLink = 'http://localhost:5173/login';
  
  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #6b21a8; font-family: serif;">Congratulations on Initiating Your Project! 🎉</h2>
      <p>Hello ${clientName},</p>
      <p>We are absolutely thrilled to work with you on your project, <strong>${projectName}</strong>! We have successfully initiated the setup on your dashboard portal.</p>
      
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #f1f5f9;">
        <h4 style="margin-top: 0; color: #475569; border-b: 1px solid #e2e8f0; padding-bottom: 5px;">Project Details</h4>
        <p style="margin: 5px 0;"><strong>Project Name:</strong> ${projectName}</p>
        <p style="margin: 5px 0;"><strong>Project Budget:</strong> ${currency} ${Number(totalAmount).toLocaleString()}</p>
      </div>

      <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #f1f5f9;">
        <h4 style="margin-top: 0; color: #475569; border-b: 1px solid #e2e8f0; padding-bottom: 5px;">Your Portal Login Credentials</h4>
        <p style="margin: 5px 0;"><strong>Username / Email:</strong> <span style="font-family: monospace;">${clientEmail}</span></p>
        <p style="margin: 5px 0;"><strong>Password:</strong> <span style="font-family: monospace;">${plainPassword}</span></p>
      </div>
      
      <p>Please log in to your dashboard to track real-time progress, review milestones, and complete payments:</p>
      <p style="margin: 25px 0; text-align: center;">
        <a href="${loginLink}" style="background-color: #6b21a8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Access Client Portal</a>
      </p>
      
      <p>If you have any questions or would like to discuss anything, please do not hesitate to reach out to us.</p>
      
      <p style="color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 30px;">
        This is an automated notification from Strategic Brand Solutions. Support: akhilthadaka97@gmail.com.
      </p>
    </div>
  `;

  const emailText = `
    Welcome to Strategic Brand Solutions!
    
    Hello ${clientName},
    
    Congratulations on initiating your new project: "${projectName}"!
    
    Project Summary:
    - Project: ${projectName}
    - Budget: ${currency} ${Number(totalAmount).toLocaleString()}
    
    Your Login Credentials:
    - Email: ${clientEmail}
    - Password: ${plainPassword}
    
    Please log in to your client portal here: ${loginLink}
    
    If you need anything, feel free to contact us.
    
    Regards,
    Strategic Brand Solutions Team
  `;

  const logLocal = () => {
    const logPath = path.join(__dirname, '../sent_emails.log');
    const logEntry = `
[${new Date().toISOString()}] EMAIL SENT TO: ${clientEmail}
Subject: Congratulations on Initiating Your Project! - ${projectName}
Body:
${emailText}
------------------------------------------------------------
`;
    fs.appendFileSync(logPath, logEntry, 'utf8');
    console.log(`[Email Logged Local] Project welcome email saved for ${clientEmail}`);
  };

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port) || 587,
        secure: (parseInt(port) === 465),
        auth: { user, pass }
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Strategic Brand Solutions" <${user}>`,
        to: clientEmail,
        subject: `Congratulations on Initiating Your Project! - ${projectName}`,
        text: emailText,
        html: emailHtml
      });
      console.log(`[Email Sent SMTP] Welcome project email successfully sent to ${clientEmail}`);
    } catch (err) {
      console.error(`[Email Failed SMTP] Welcome project email failed, logging locally:`, err.message);
      logLocal();
    }
  } else {
    logLocal();
  }
};

const sendFeedbackRequestEmail = async (clientName, clientEmail, projectName, projectId) => {
  const feedbackLink = `http://localhost:5173/feedback?projectId=${projectId}`;
  
  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #10b981; font-family: serif;">Your Project is Completed! 🎉</h2>
      <p>Hello ${clientName},</p>
      <p>Congratulations! We are delighted to inform you that your project <strong>${projectName}</strong> has successfully reached 100% completion!</p>
      <p>It has been an absolute pleasure collaborating with you on this journey. To help us improve and celebrate this milestone, we would love to hear your feedback on your experience working with us.</p>
      
      <p style="margin: 30px 0; text-align: center;">
        <a href="${feedbackLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">Share Your Feedback</a>
      </p>
      
      <p>Thank you again for choosing Strategic Brand Solutions. We look forward to partnering with you on future endeavors!</p>
      
      <p style="color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 30px;">
        This is an automated notification from Strategic Brand Solutions. Contact: akhilthadaka97@gmail.com.
      </p>
    </div>
  `;

  const emailText = `
    Your Project is Completed! 🎉
    
    Hello ${clientName},
    
    Congratulations! We are delighted to inform you that your project "${projectName}" has reached 100% completion!
    
    We would love to get your feedback. Please take a moment to submit your review using the link below:
    Feedback Form: ${feedbackLink}
    
    Thank you for choosing Strategic Brand Solutions.
    
    Regards,
    Strategic Brand Solutions Team
  `;

  const logLocal = () => {
    const logPath = path.join(__dirname, '../sent_emails.log');
    const logEntry = `
[${new Date().toISOString()}] EMAIL SENT TO: ${clientEmail}
Subject: Congratulations! Your Project "${projectName}" is Completed!
Body:
${emailText}
------------------------------------------------------------
`;
    fs.appendFileSync(logPath, logEntry, 'utf8');
    console.log(`[Email Logged Local] Project feedback request email saved for ${clientEmail}`);
  };

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port) || 587,
        secure: (parseInt(port) === 465),
        auth: { user, pass }
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Strategic Brand Solutions" <${user}>`,
        to: clientEmail,
        subject: `Congratulations! Your Project "${projectName}" is Completed!`,
        text: emailText,
        html: emailHtml
      });
      console.log(`[Email Sent SMTP] Feedback email successfully sent to ${clientEmail}`);
    } catch (err) {
      console.error(`[Email Failed SMTP] Feedback email failed, logging locally:`, err.message);
      logLocal();
    }
  } else {
    logLocal();
  }
};

const sendAdminContactNotificationEmail = async (contactDetails) => {
  const { name, email, subject, message } = contactDetails;
  const adminEmail = 'akhilthadaka97@gmail.com';
  
  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5; font-family: serif;">New Contact Inquiry Received ✉️</h2>
      <p>Hello Admin,</p>
      <p>A new client has submitted a contact inquiry form from the public Home Page. Here are the submission details:</p>
      
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #f1f5f9;">
        <p style="margin: 5px 0;"><strong>Client Name:</strong> ${name}</p>
        <p style="margin: 5px 0;"><strong>Email Address:</strong> <a href="mailto:${email}">${email}</a></p>
        <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
        <p style="margin: 15px 0 5px 0;"><strong>Message Details:</strong></p>
        <div style="background-color: #ffffff; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0; font-style: italic;">
          "${message}"
        </div>
      </div>
      
      <p style="color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 30px;">
        This is an automated system notification from your Brand Solutions Dashboard.
      </p>
    </div>
  `;

  const emailText = `
    New Contact Inquiry Received!
    
    Hello Admin,
    
    A new client has submitted a contact inquiry form from the public Home Page:
    - Name: ${name}
    - Email: ${email}
    - Subject: ${subject}
    - Message: "${message}"
    
    Regards,
    Strategic Brand Solutions Team
  `;

  const logLocal = () => {
    const logPath = path.join(__dirname, '../sent_emails.log');
    const logEntry = `
[${new Date().toISOString()}] EMAIL SENT TO ADMIN: ${adminEmail}
Subject: New Contact Inquiry: ${subject}
Body:
${emailText}
------------------------------------------------------------
`;
    fs.appendFileSync(logPath, logEntry, 'utf8');
    console.log(`[Email Logged Local] Contact notification to admin saved locally.`);
  };

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port) || 587,
        secure: (parseInt(port) === 465),
        auth: { user, pass }
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Dashboard Notifications" <${user}>`,
        to: adminEmail,
        subject: `[New Inquiry] ${subject} - From ${name}`,
        text: emailText,
        html: emailHtml
      });
      console.log(`[Email Sent SMTP] Admin contact notification email successfully sent.`);
    } catch (err) {
      console.error(`[Email Failed SMTP] Admin notification failed, logging locally:`, err.message);
      logLocal();
    }
  } else {
    logLocal();
  }
};

module.exports = { 
  sendCredentialsEmail, 
  sendProjectWelcomeEmail, 
  sendFeedbackRequestEmail,
  sendAdminContactNotificationEmail
};
