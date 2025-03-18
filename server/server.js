const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const app = express();

const JWT_SECRET = 'CungCaiLin69';

app.use(cors());
app.use(express.json());

// Registration endpoint
app.post('/api/register', async (req, res) => {
  const { email, password, name } = req.body;

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'customer',
      },
    });

    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'An error occurred while creating the user' });
  }
});

// Login endpoint that issues a JWT
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Retrieve user from database
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Validate password using bcrypt
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate a JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
    );

    res.json({ message: 'Login successful', token, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'An error occurred during login' });
  }
});

// Middleware to verify JWT on protected routes
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  // Expecting the header to be in the format "Bearer <token>"
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token format invalid' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Failed to authenticate token' });
    }
    req.user = decoded;
    next();
  });
};

// Update user profile endpoint
app.put('/api/update-profile', verifyToken, async (req, res) => {
  const { name, email } = req.body;
  const userId = req.user.id;

  try {
    // Check if the new email is already taken by another user
    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: 'Email is already in use' });
      }
    }

    // Update the user's profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name, email },
    });

    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'An error occurred while updating the profile' });
  }
});

// Change password endpoint
app.put('/api/change-password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    // Retrieve the user from the database
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate the current password
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'An error occurred while changing the password' });
  }
});

// Become a repairman endpoint
app.post('/api/become-repairman', verifyToken, async (req, res) => {
  const { skills, servicesProvided, profilePicture, phoneNumber } = req.body;
  const userId = req.user.id;

  try {
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }
    // Check if the user is already a repairman
    const existingRepairman = await prisma.repairman.findUnique({
      where: { userId },
    });

    if (existingRepairman) {
      return res.status(400).json({ error: 'User is already a repairman' });
    }

    // Create new repairman entry
    const newRepairman = await prisma.repairman.create({
      data: {
        userId,
        skills,
        servicesProvided,
        profilePicture: profilePicture || null,
        phoneNumber,
        isVerified: false,
      },
    });

    // Update the user's role to 'repairman'
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'repairman' },
    });

    res.json({ message: 'You are now a repairman!', repairman: newRepairman });
  } catch (error) {
    console.error('Error in become-repairman endpoint:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

// Check repairman status endpoint
app.get('/api/check-repairman', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const repairman = await prisma.repairman.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (repairman) {
      res.json({ isRepairman: true, repairman });
    } else {
      res.json({ isRepairman: false });
    }
  } catch (error) {
    console.error('Error checking repairman status:', error);
    res.status(500).json({ error: 'An error occurred while checking repairman status.' });
  }
});

// Edit repairman profile
app.put('/api/edit-repairman', verifyToken, async (req, res) => {
  const { skills, servicesProvided, profilePicture, phoneNumber } = req.body;
  const userId = req.user.id;

  try {
    // Check if the user is a repairman
    const repairman = await prisma.repairman.findUnique({
      where: { userId },
    });

    if (!repairman) {
      return res.status(400).json({ error: 'User is not a repairman' });
    }

    let isVerified = repairman.isVerified;
    if (phoneNumber && phoneNumber !== repairman.phoneNumber) {
      isVerified = false;
      await sendVerificationCode(phoneNumber); // Send new verification code
    }

    // Update the repairman profile
    const updatedRepairman = await prisma.repairman.update({
      where: { userId },
      data: {
        skills,
        servicesProvided,
        profilePicture: profilePicture || null,
        phoneNumber: phoneNumber || repairman.phoneNumber,
        isVerified,
      },
    });

    res.json({ message: 'Repairman profile updated successfully', repairman: updatedRepairman });
  } catch (error) {
    console.error('Error updating repairman profile:', error);
    res.status(500).json({ error: 'An error occurred while updating the repairman profile' });
  }
});

// Resign as repairman endpoint
app.post('/api/resign-repairman', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if the user is a repairman
    const repairman = await prisma.repairman.findUnique({
      where: { userId },
    });

    if (!repairman) {
      return res.status(400).json({ error: 'User is not a repairman' });
    }

    // Delete the repairman entry
    await prisma.repairman.delete({
      where: { userId },
    });

    // Update the user's role to 'customer'
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: 'customer' },
    });

    res.status(200).json({ message: 'Resignation successful', user: updatedUser });
  } catch (error) {
    console.error('Error resigning as repairman:', error);

    // Handle specific errors
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Repairman or user not found' });
    }

    // Generic error response
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

// Example of a protected endpoint
app.get('/api/protected', verifyToken, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});