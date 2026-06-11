const mongoose = require('mongoose');
require('dotenv').config();

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  showcase: { type: Boolean, default: false },
  status: { type: String }
});

const Project = mongoose.model('Project', ProjectSchema);

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/frelance');
    console.log('Connected to MongoDB.');
    const projects = await Project.find({});
    console.log(`Total projects in database: ${projects.length}`);
    projects.forEach(p => {
      console.log(`- Project ID: ${p._id}, Name: "${p.name}", Showcase: ${p.showcase}, Status: "${p.status}"`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
