import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

//@desc Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

//@desc User Registration (only for new users without jwt)
export const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    
    const hashedPassword = await bcrypt.hash(password, 12);

    
    const user = new User({
      email,
      password: hashedPassword,
      role: 'user' 
    });

    await user.save();

    
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

//@desc User Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


export const createLibrarian = async (req, res) => {
  try {
    const { email, password } = req.body;

    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    
    const hashedPassword = await bcrypt.hash(password, 12);

    
    const librarian = new User({
      email,
      password: hashedPassword,
      role: 'librarian'
    });

    await librarian.save();

    res.status(201).json({
      message: 'Librarian created successfully',
      librarian: {
        id: librarian._id,
        email: librarian.email,
        role: librarian.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteLibrarian = async (req, res) => {
  try {
    const { id } = req.params;
        
    const librarian = await User.findById(id);

    if (!librarian) {
      return res.status(400).json({ message: 'User does not exists' });
    }

    if (librarian.role !== 'librarian') {
      return res.status(400).json({ message: 'User is not a librarian' });
    }

    await User.deleteOne({ _id: id })

    res.status(200).json({
      message: 'Librarian deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};