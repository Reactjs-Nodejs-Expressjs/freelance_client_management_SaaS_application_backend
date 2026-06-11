const mongoose = require('mongoose');
require('dotenv').config();

// Define schema with all fields
const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  showcase: { type: Boolean, default: false },
  status: { type: String },
  progress: { type: Number, default: 0 },
  color: { type: String },
  liveUrl: { type: String },
  imageUrl: { type: String }
});

const Project = mongoose.model('Project', ProjectSchema);

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/frelance');
    console.log('Connected to MongoDB.');
    const projects = await Project.find({ showcase: true })
      .populate('client', 'name company')
      .sort({ progress: -1 });
    
    console.log(`Query returned ${projects.length} projects.`);
    projects.forEach(p => {
      console.log(`- ${p.name} (client: ${p.client})`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
