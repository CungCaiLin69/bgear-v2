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

    // Create the user with default role "customer"
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'customer', // Default role
      },
    });

    // Generate a JWT token immediately after registration
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
    );

    res.status(201).json({ 
      message: 'User created successfully', 
      token, 
      user 
    });

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
      console.error(`Login failed: Invalid password for ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate a JWT token with expiration
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, has_shop: user.has_shop, is_repairman: user.is_repairman },
      JWT_SECRET,
    );

    // Return the token and necessary user details
    res.json({ 
      message: 'Login successful', 
      token, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        has_shop: user.has_shop,
        is_repairman: user.is_repairman,
      }
    });
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

    // Update the user's is_repairman field
    await prisma.user.update({
      where: { id: userId },
      data: { is_repairman: true },
    });

    res.json({ message: 'You are now a repairman!', repairman: newRepairman });
  } catch (error) {
    console.error('Error in become-repairman endpoint:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

// Check repairman status endpoint
app.get('/api/check-repairman', verifyToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    const repairman = await prisma.repairman.findFirst({ where: { userId: req.user.id } });

    console.log('Repairman Data:', repairman);
    
    if (!repairman) {
      return res.json({ repairman: null });
    }

    res.json({ repairman });
  } catch (error) {
    console.error('Check repairman error:', error);
    res.status(500).json({ error: 'Failed to check repairman status' });
  }
});

// Edit repairman profile
app.put('/api/edit-repairman', verifyToken, async (req, res) => {
  const { skills, servicesProvided, profilePicture, phoneNumber } = req.body;
  const userId = req.user.id;

  try {
    console.log(`Editing repairman for user: ${userId}`); // Debug log ✅

    const repairman = await prisma.repairman.findUnique({ where: { userId } });

    if (!repairman) {
      return res.status(400).json({ error: 'User is not a repairman' });
    }

    console.log('Existing repairman:', repairman);

    let isVerified = repairman.isVerified;

    if (phoneNumber && phoneNumber !== repairman.phoneNumber) {
      isVerified = false;
      await sendVerificationCode(phoneNumber);
    }

    // 🔹 Ensure proper data format for skills & services
    const updatedSkills = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim());
    const updatedServices = Array.isArray(servicesProvided) ? servicesProvided : servicesProvided.split(',').map(s => s.trim());

    const updatedRepairman = await prisma.repairman.update({
      where: { userId },
      data: {
        skills: updatedSkills,
        servicesProvided: updatedServices,
        profilePicture: profilePicture || repairman.profilePicture,
        phoneNumber: phoneNumber || repairman.phoneNumber,
        isVerified,
      },
    });

    console.log('Updated repairman:', updatedRepairman);

    res.json({ message: 'Repairman profile updated successfully', repairman: updatedRepairman });
  } catch (error) {
    console.error('Error updating repairman profile:', error);
    res.status(500).json({ error: 'An error occurred while updating the repairman profile' });
  }
});


// Resign as repairman endpoint
app.post('/api/resign-repairman', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
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

    // Update the user's is_repairman field
    await prisma.user.update({
      where: { id: userId },
      data: { is_repairman: false },
    });

    res.json({ message: 'Resignation successful' });
  } catch (error) {
    console.error('Error resigning as repairman:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

app.get('/api/check-shop', verifyToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    const shop = await prisma.shop.findFirst({ where: { ownerId: req.user.id } });

    console.log('Shop Data:', shop);
    
    if (!shop) {
      return res.json({ shop: null });
    }

    res.json({ shop });
  } catch (error) {
    console.error('Check shop error:', error);
    res.status(500).json({ error: 'Failed to check shop status' });
  }
});


app.post('/api/create-shop', verifyToken, async (req, res) => {
  const { shopName, shopLocation, shopServices } = req.body;
  const userId = req.user.id;

  try {
    // Create the shop
    const shop = await prisma.shop.create({
      data: {
        ownerId: userId,
        name: shopName,
        location: shopLocation,
        services: shopServices,
      },
    });

    // Update the user's has_shop field
    await prisma.user.update({
      where: { id: userId },
      data: { has_shop: true },
    });

    res.json({ message: 'You now have a shop!', shop });
  } catch (error) {
    console.error('Error creating shop:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

app.put('/api/edit-shop', verifyToken, async (req, res) => {
  const { shopName, shopLocation, shopServices, phoneNumber, photos } = req.body;
  const userId = req.user.id;

  try {
    // Update the shop
    const shop = await prisma.shop.update({
      where: { ownerId: userId },
      data: {
        name: shopName,
        location: shopLocation,
        services: shopServices,
        phoneNumber,
        photos,
      },
    });

    res.json({ message: 'Shop updated successfully', shop });
  } catch (error) {
    console.error('Error updating shop:', error);
    res.status(500).json({ error: 'An error occurred while updating the shop.' });
  }
});

app.post('/api/close-shop', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // Delete the shop
    await prisma.shop.delete({
      where: { ownerId: userId },
    });

    // Update the user's has_shop field
    await prisma.user.update({
      where: { id: userId },
      data: { has_shop: false },
    });

    res.json({ message: 'Shop closed successfully.' });
  } catch (error) {
    console.error('Error closing shop:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

app.get('/api/get-all-shop', verifyToken, async (req, res) => {
  try{
    const shops = await prisma.shop.findMany();
    console.log("This is req: ", req);
    res.json(shops);
  }catch(error){
    console.error('Error getting all shops:', error);
    res.status(500).json({ error: 'An error occured while processing your request.'})
  }
})

// Example of a protected endpoint
app.get('/api/protected', verifyToken, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});