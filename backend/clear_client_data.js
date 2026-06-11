const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Project = require('./models/Project');
const Payment = require('./models/Payment');
const Notification = require('./models/Notification');
const Schedule = require('./models/Schedule');
const DeletedClient = require('./models/DeletedClient');
const Feedback = require('./models/Feedback');
const Message = require('./models/Message');
const Note = require('./models/Note');
const Contact = require('./models/Contact');

async function clearClientData() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/strategic-brand-solutions');
    console.log('Connected to MongoDB...');

    // 1. Delete client users (preserving admin users)
    const clientDeleteResult = await User.deleteMany({ role: 'client' });
    console.log(`Deleted ${clientDeleteResult.deletedCount} client users.`);

    // 2. Delete projects
    const projectDeleteResult = await Project.deleteMany({});
    console.log(`Deleted ${projectDeleteResult.deletedCount} projects.`);

    // 3. Delete payments
    const paymentDeleteResult = await Payment.deleteMany({});
    console.log(`Deleted ${paymentDeleteResult.deletedCount} payments.`);

    // 4. Delete notifications
    const notificationDeleteResult = await Notification.deleteMany({});
    console.log(`Deleted ${notificationDeleteResult.deletedCount} notifications.`);

    // 5. Delete schedules
    const scheduleDeleteResult = await Schedule.deleteMany({});
    console.log(`Deleted ${scheduleDeleteResult.deletedCount} schedules.`);

    // 6. Delete deleted clients logs
    const deletedClientResult = await DeletedClient.deleteMany({});
    console.log(`Deleted ${deletedClientResult.deletedCount} deleted clients logs.`);

    // 7. Delete feedback
    const feedbackDeleteResult = await Feedback.deleteMany({});
    console.log(`Deleted ${feedbackDeleteResult.deletedCount} feedback entries.`);

    // 8. Delete chat messages
    const messageDeleteResult = await Message.deleteMany({});
    console.log(`Deleted ${messageDeleteResult.deletedCount} messages.`);

    // 9. Delete notes
    const noteDeleteResult = await Note.deleteMany({});
    console.log(`Deleted ${noteDeleteResult.deletedCount} notes.`);

    // 10. Delete contacts
    const contactDeleteResult = await Contact.deleteMany({});
    console.log(`Deleted ${contactDeleteResult.deletedCount} contacts.`);

    console.log('All client-related data cleared successfully. Admin users and configurations preserved. 🎉');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing client data:', error);
    process.exit(1);
  }
}

clearClientData();
