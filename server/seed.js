import 'dotenv/config';
import mongoose from 'mongoose';

// Edit this object to change your site, then run: npm run seed
const data = {
  name: 'Mohsin Naqvi',
  title: 'MERN Stack Developer',
  tagline: 'I build responsive, database-driven web apps with MongoDB, Express, React and Node.js.',
  about: 'I’m a Computer Science graduate from UMT Lahore with a strong base in data structures, object-oriented programming and databases. I build full-stack web apps with the MERN stack, from clean React interfaces to REST APIs and CRUD-driven backends. I’m looking for an entry-level MERN or full-stack role where I can work on real projects and keep growing.',
  email: 'notmohsinnaqvi@gmail.com',
  location: 'Lahore, Pakistan',
  cv: '/Mohsin_Naqvi_Resume.pdf',
  availableText: 'Open to entry-level roles', // shown as the badge at the top; empty hides it
  whatsapp: '923359291472', // international format: country code 92, no leading 0
  socials: [
    { label: 'GitHub', url: 'https://github.com/mocho-naqvi' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/mohsin-naqvi-879828440' },
    { label: 'Facebook', url: 'https://www.facebook.com/mohsin.hassan.naqvi' },
    { label: 'Email', url: 'mailto:notmohsinnaqvi@gmail.com' },
  ],
  skills: [
    { group: 'MERN stack', items: ['MongoDB', 'Express.js', 'React.js', 'Node.js', 'REST APIs', 'CRUD'] },
    { group: 'Frontend', items: ['HTML5', 'CSS3', 'JavaScript', 'React.js', 'Responsive design', 'Reusable components'] },
    { group: 'Backend', items: ['Node.js', 'Express.js', 'RESTful APIs', 'Database connectivity'] },
    { group: 'Databases', items: ['MongoDB', 'SQL', 'Data modeling', 'Database design'] },
    { group: 'Languages', items: ['JavaScript', 'Python', 'Java', 'C++', 'PHP', 'SQL'] },
    { group: 'Computer science', items: ['Data structures & algorithms', 'OOP', 'Problem solving'] },
    { group: 'AI, ML & data', items: ['Basic AI', 'Basic machine learning', 'Data analysis'] },
    { group: 'Working style', items: ['Teamwork', 'Communication', 'Quick learner', 'Time management'] },
  ],
  experience: [
    { role: 'Entry-level MERN Stack Developer', company: 'Hands-on projects', period: 'Present',
      points: [
        'Build responsive web apps with React.js, JavaScript, HTML and CSS.',
        'Develop backend features with Node.js and Express.js, backed by MongoDB and SQL databases.',
        'Create and consume REST APIs and implement CRUD operations.',
        'Keep improving full-stack skills through practical projects and self-learning.',
      ] },
  ],
  projects: [
    { title: 'E-commerce web application', description: 'A responsive store with product browsing, product details, categories and an interactive interface, built around API integration and CRUD operations.', tech: ['React', 'JavaScript', 'REST APIs', 'CRUD'], link: '', repo: '' },
    { title: 'MERN stack web apps', description: 'Full-stack apps where React front ends talk to Express REST APIs and MongoDB, with dynamic data and complete CRUD functionality.', tech: ['MongoDB', 'Express', 'React', 'Node.js'], link: '', repo: '' },
    { title: 'Critical Path Method calculator', description: 'A web tool for project scheduling. It calculates critical path, project duration, ES, EF, LS, LF and slack from task durations and dependencies, and stores and visualizes the results.', tech: ['PHP', 'SQL', 'Data visualization'], link: '', repo: '' },
    { title: 'API-based web apps', description: 'Interfaces that fetch, send and manage data through REST APIs, rendering JSON responses dynamically.', tech: ['JavaScript', 'REST APIs', 'JSON'], link: '', repo: '' },
    { title: 'Frontend web apps', description: 'Responsive interfaces with reusable components, dynamic content and API-driven data.', tech: ['HTML', 'CSS', 'JavaScript', 'React'], link: '', repo: '' },
  ],
  education: [
    { degree: 'BS Computer Science', school: 'University of Management and Technology (UMT), Lahore', period: '2022 – 2026' },
    { degree: 'F.Sc.', school: 'BISE Lahore', period: '2020 – 2021' },
  ],
  certifications: [
    { title: 'Website Frontend Development (3-month course)', org: 'Hello World, Bhakkar' },
  ],
  posts: [], // add blog / learning notes from /admin
  testimonials: [], // add later from /admin
  languages: [
    { name: 'Urdu', level: 'Native' },
    { name: 'English', level: 'Professional working' },
    { name: 'German', level: 'Basic' },
  ],
};

await mongoose.connect(process.env.MONGO_URI);
const Profile = mongoose.model('Profile', new mongoose.Schema({}, { strict: false }));
await Profile.deleteMany({});
await Profile.create(data);
console.log('Profile seeded.');
process.exit(0);
