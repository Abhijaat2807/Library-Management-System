import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const createAdminUser = async () => {
  try {
    // @desc Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12);
      
      const adminUser = new User({
        email: process.env.ADMIN_EMAIL || 'admin@library.com',
        password: hashedPassword,
        role: 'admin'
      });
      
      await adminUser.save();
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

export default createAdminUser;