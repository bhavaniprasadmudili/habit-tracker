const bcrypt = require('bcrypt');
const User = require('../models/User');

async function initAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    console.warn('ADMIN_EMAIL and ADMIN_PASSWORD not configured. Skipping admin initialization.');
    return;
  }

  const existing = await User.findOne({ email: adminEmail, role: 'admin' });
  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await User.create({ name: 'Trackkar Admin', email: adminEmail, passwordHash, verified: true, role: 'admin' });
  console.log('Admin user created:', adminEmail);
}

module.exports = { initAdmin };
