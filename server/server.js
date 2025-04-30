const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { Server } = require('socket.io');
const app = express();
const http = require('http');
const httpServer = http.createServer(app);

const JWT_SECRET = 'CungCaiLin69';

app.use(cors());
app.use(express.json());

const io = new Server(httpServer, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'], 
  pingTimeout: 30000,                  
  pingInterval: 10000                  
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  console.log("🔒 Socket token received:", token);

  if (!token) return next(new Error('Authentication error'));

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    console.error("JWT error:", err.message);
    return next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.user.id);

  socket.on('joinOrderRoom', ({ orderId }) => {
    socket.join(`order_${orderId}`);
    console.log(`Socket ${socket.id} joined room order_${orderId}`);
  });

  socket.on('sendMessage', ({ orderId, senderId, senderRole, message }) => {
    console.log('New message:', { orderId, senderId, message });
    io.to(`order_${orderId}`).emit('newMessage', {
      senderId,
      senderRole,
      message,
      createdAt: new Date(),
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Registration endpoint
app.post('/api/register', async (req, res) => {
  const { email, password, name, phoneNumber } = req.body;

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phoneNumber }
        ]
      }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user with isVerified = false
    const user = await prisma.user.create({
      data: {
        email,
        phoneNumber,
        password: hashedPassword,
        name,
        role: 'customer',
        isVerified: false,
      },
    });

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP linked to the user
    await prisma.oTP.create({
      data: {
        code: otp,
        userId: user.id,
        expiresAt: new Date(Date.now() + 5 * 60000) // 5 minutes
      }
    });

    console.log(`OTP for ${phoneNumber}: ${otp}`); // Simulated sending

    res.status(200).json({ 
      message: 'Please verify your phone number with the OTP', 
      userId: user.id,
      phoneNumber: phoneNumber
    });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

// Create a new endpoint that creates a user after OTP verification
app.post('/api/complete-registration', async (req, res) => {
  const { userId, name, email, password, phoneNumber } = req.body;
  
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create the user with verified status
    const user = await prisma.user.create({
      data: {
        email,
        phoneNumber,
        password: hashedPassword,
        name,
        role: 'customer',
        isVerified: true,
      },
    });
    
    // Clean up the temporary OTP
    await prisma.oTP.deleteMany({ where: { userId } });
    
    res.status(201).json({ 
      message: 'Registration successful',
      userId: user.id
    });
  } catch (error) {
    console.error('Error completing registration:', error);
    res.status(500).json({ error: 'Failed to complete registration' });
  }
});

app.post('/api/verify-otp', async (req, res) => {
  const { userId, otp } = req.body;

  console.log('OTP verify request body:', req.body);

  // Check if userId is provided
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const record = await prisma.oTP.findFirst({
      where: {
        userId,
        code: otp,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Update the user to verified status
    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true }
    });

    // Clean up the OTP
    await prisma.oTP.deleteMany({ where: { userId } });

    res.status(200).json({ message: 'Phone number verified successfully' });
  } catch (err) {
    console.error('OTP verification error:', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

app.post('/api/login', async (req, res) => {
  const { emailOrPhone, password } = req.body;

  try {
    // Match email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrPhone },
          { phoneNumber: emailOrPhone } 
        ]
      }
    });

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.isVerified) return res.status(401).json({ error: 'Please verify your phone number first.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        has_shop: user.has_shop,
        is_repairman: user.is_repairman,
      },
      JWT_SECRET,
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber, 
        role: user.role,
        has_shop: user.has_shop,
        is_repairman: user.is_repairman,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
});

// Middleware to verify JWT on protected routes
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

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
  const { name, email, phoneNumber } = req.body;
  const userId = req.user.id;

  try {
    // Check if the new email is already taken by another user
    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: 'Email is already in use' });
      }
    }

    // Check if the new phone number is already taken by another user
    if (phoneNumber) {
      const existingUserByPhone = await prisma.user.findUnique({ where: { phoneNumber } });
      if (existingUserByPhone && existingUserByPhone.id !== userId) {
        return res.status(400).json({ error: 'Phone number is already in use' });
      }
    }

    // Update the user's profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name, email, phoneNumber },
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

app.get('/api/repairman/orders', verifyToken, async (req, res) => {
  const repairmanId = parseInt(req.user.id);

  const orders = await prisma.order.findMany({
    where: { repairmanId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ orders });
});

app.post('/order/create', verifyToken, async (req, res) => {
  const { address, vehicleType, complaint, locationLat, locationLng } = req.body;

  if (!address || !vehicleType || !complaint || !locationLat || !locationLng) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        locationLat: parseFloat(locationLat),
        locationLng: parseFloat(locationLng),
        vehicleType,
        complaint,
        status: 'requested',
      }
    });

    io.emit('newOrderRequest', {
      orderId: order.id,
      locationLat: order.locationLat,
      locationLng: order.locationLng,
      address,
      vehicleType: order.vehicleType,
      complaint: order.complaint,
    });

    return res.status(201).json({ success: true, order });
  } catch (error) {
    console.error('Create Order Error:', error);
    return res.status(500).json({ error: 'Failed to create order' });
  }
});

app.get('/api/order/:orderId', verifyToken, async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await prisma.order.findUnique({
      where: {
        id: parseInt(orderId), // Make sure orderId is an integer
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

app.post('/order/accept/:orderId', verifyToken, async (req, res) => {
  const { orderId } = req.params;

  try {
    if (!req.user.is_repairman) {
      return res.status(403).json({ error: 'Only repairmen can accept orders' });
    }

    const order = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: {
        repairmanId: req.user.id,
        status: 'accepted'
      }
    });

    io.emit('orderAccepted', { orderId: parseInt(orderId) });

    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Accept Order Error:', error);
    return res.status(500).json({ error: 'Failed to accept order' });
  }
});

app.post('/order/reject/:orderId', verifyToken, async (req, res) => {
  const { orderId } = req.params;

  try {
    // Reject = delete the order
    await prisma.order.delete({
      where: { id: parseInt(orderId) }
    });

    io.emit('orderRejected', { orderId: parseInt(orderId) });

    return res.status(200).json({ success: true, message: 'Order rejected' });
  } catch (error) {
    console.error('Reject Order Error:', error);
    return res.status(500).json({ error: 'Failed to reject order' });
  }
});

app.post('/order/cancel/:orderId', verifyToken, async (req, res) => {
  const { orderId } = req.params;

  try {
    await prisma.order.delete({
      where: { id: parseInt(orderId) }
    });

    return res.status(200).json({ success: true, message: 'Order cancelled' });
  } catch (error) {
    console.error('Cancel Order Error:', error);
    return res.status(500).json({ error: 'Failed to cancel order' });
  }
});

app.post('/order/finish/:orderId', verifyToken, async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: {
        status: 'completed'
      }
    });

    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Finish Order Error:', error);
    return res.status(500).json({ error: 'Failed to finish order' });
  }
});

app.get('/api/get-all-shop', verifyToken, async (req, res) => {
  try{
    const shops = await prisma.shop.findMany();
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
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Socket.IO server is ready`);
});