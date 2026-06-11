const mongoose = require('mongoose');
const User = require('./models/User');
const Project = require('./models/Project');

async function checkDb() {
  try {
    await mongoose.connect('mongodb://localhost:27017/strategic-brand-solutions');
    console.log("Connected to MongoDB.");
    const users = await User.find({});
    console.log("--- USERS ---");
    console.log(JSON.stringify(users.map(u => ({ id: u._id, name: u.name, role: u.role, email: u.email })), null, 2));
    
    const projects = await Project.find({});
    console.log("--- PROJECTS ---");
    console.log(JSON.stringify(projects.map(p => ({ id: p._id, name: p.name, client: p.client, status: p.status, progress: p.progress })), null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkDb();
