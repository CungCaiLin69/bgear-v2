const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { Server } = require('socket.io');
const app = express();
const http = require('http');
const { GoTrueAdminApi } = require('@supabase/supabase-js');
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
  
  // Log socket connection with more info for debugging
  console.log(`Socket connected with ID: ${socket.id}, User: ${socket.user.id}, Role: ${socket.user.role}`);

  // Update the newOrderRequest listener
  socket.on('newOrderRequest', (newOrder) => {
    console.log("Received new order via socket:", newOrder);
    
    // Ensure the payload is properly formatted
    const order = {
      orderId: newOrder.orderId || newOrder.id,
      address: newOrder.address,
      vehicleType: newOrder.vehicleType,
      complaint: newOrder.complaint,
      locationLat: newOrder.locationLat,
      locationLng: newOrder.locationLng,
      timeout: 180
    };
    
    setPendingOrders(prev => [...prev, order]);
  });

  socket.on('newBookingRequest', (newBooking) => {
    console.log("Received new booking via socket:", newBooking);

    const booking = {
      bookingId: newBooking.bookingId,
      shopId: newBooking.shopId,
      userId: newBooking.userId,
      vehicleType: newBooking.vehicleType,
      vehicleBrand: newBooking.vehicleBrand,
      vehicleModel: newBooking.vehicleModel,
      vehicleYear: newBooking.vehicleYear,
      vehicleMileage: newBooking.vehicleMileage,
      issue: newBooking.issue,
      datetime: newBooking.datetime
    }

    setPendingBooking(prev => [...prev, booking]);
  })

  // Handling order acceptance via socket
  socket.on('acceptOrder', async ({ orderId }) => {
    console.log(`Socket event: Repairman ${socket.user.id} accepting order ${orderId}`);
    
    try {
      // Update the order in database
      const order = await prisma.order.update({
        where: { id: parseInt(orderId) },
        data: {
          repairmanId: socket.user.id,
          status: 'accepted'
        }
      });
      
      // Broadcast to all clients that this order was accepted
      io.emit('orderAccepted', { 
        orderId: parseInt(orderId), 
        repairmanId: socket.user.id
      });
      
      console.log(`Order ${orderId} accepted successfully via socket`);
    } catch (error) {
      console.error(`Error accepting order ${orderId} via socket:`, error);
      socket.emit('orderError', {
        orderId: parseInt(orderId),
        error: 'Failed to accept order'
      });
    }
  });

  // Handling booking acceptance via socket
  socket.on("acceptBooking", async ({bookingId}) => {
    console.log(`Socket event: Shop accepting booking ${bookingId}`)

    try{
      // update the booking in db
      const booking = await prisma.booking.update({
        where: {
          id: parseInt(bookingId),
        },
        data: {
          status: "accepted"
        }
      });

      // Broadcast that this booking was accepted
      io.emit("bookingAccepted", {
        bookingId: parseInt(bookingId)
      })

      console.log(`Booking ${bookingId} accepted sucessfully via socket`);
    }catch(error){
      console.error(`Error accepting booking ${bookingId} via socket`, error);
      socket.emit("bookingError", {
        bookingId: parseInt(bookingId),
        error: "Failed to accept booking"
      })
    }
  })
  
  // Handling order rejection via socket
  socket.on('rejectOrder', async ({ orderId }) => {
    console.log(`Socket event: Repairman ${socket.user.id} rejecting order ${orderId}`);
    
    try {
      // You may want to update order status in database to mark as rejected
      // or simply broadcast the rejection to all clients
      
      // Broadcast to all clients that this order was rejected
      io.emit('orderRejected', { 
        orderId: parseInt(orderId)
      });
      
      console.log(`Order ${orderId} rejected successfully via socket`);
    } catch (error) {
      console.error(`Error rejecting order ${orderId} via socket:`, error);
    }
  });

  socket.on("rejectBooking", async ({bookingId}) => {
    console.log(`Socket event: rejecting booking ${bookingId}`);

    try{
      io.emit("bookingRejected", {
        bookingId: parseInt(bookingId)
      });

      console.log(`Booking ${bookingId} rejected successfully via socket`);
    }catch(error){
      console.error(`Error rejecting booking ${bookingId} via socket:`, error);
    }
  })

  // When a repairman joins a specific channel to listen for new orders
  socket.on('joinRepairmanChannel', () => {
    socket.join('repairman_channel');
    console.log(`Repairman ${socket.user.id} joined repairman channel`);
  });

  socket.on('joinOrderRoom', ({ orderId }) => {
    socket.join(`order_${orderId}`);
    console.log(`Socket ${socket.id} joined room order_${orderId}`);
  });

  socket.on('sendMessage', async (payload) => {
    console.log('[SERVER] Raw message payload:', payload);
    
    // More flexible validation
    if (!payload.orderId || !payload.message) {
      return socket.emit('messageError', { 
        error: 'Missing order ID or message content' 
      });
    }
  
    // Allow either senderId or phoneNumber as identifier
    const senderIdentifier = payload.senderId || payload.phoneNumber;
    if (!senderIdentifier || !payload.senderRole) {
      return socket.emit('messageError', { 
        error: 'Missing sender identification' 
      });
    }
  
    try {
      const newMessage = await prisma.message.create({
        data: {
          orderId: parseInt(payload.orderId),
          senderId: senderIdentifier,
          senderRole: payload.senderRole,
          message: payload.message,
        },
      });
  
      io.to(`order_${payload.orderId}`).emit('newMessage', newMessage);
    } catch (error) {
      console.error('Message save error:', error);
      socket.emit('messageError', { 
        error: 'Failed to save message' 
      });
    }
  });

  socket.on('cancelOrder', ({ orderId }) => {
    // Emit with both spellings
    io.to(`order_${orderId}`).emit('orderCancelled', { orderId });
    io.to(`order_${orderId}`).emit('orderCanceled', { orderId });
  });
  
  socket.on('repairmanLocationUpdate', ({ orderId, latitude, longitude }) => {
    // Broadcast location update to the specific order room
    io.to(`order_${orderId}`).emit('locationUpdate', { 
      orderId,
      lat: latitude, 
      lng: longitude 
    });
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}, User: ${socket.user?.id}`);
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

app.get('/api/users/:userId', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        profilePicture: true,
        role: true,
        is_repairman: true,
        Repairman: {
          select: {
            id: true,
            skills: true,
            servicesProvided: true,
            isVerified: true,
            profilePicture: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.get('/api/active-order', verifyToken, async (req, res) => {
  try {
    const activeOrder = await prisma.order.findFirst({
      where: {
        userId: req.user.id,
        status: {
          notIn: ['completed', 'canceled', 'rejected']
        }
      },
      include: {
        repairman: {
          include: {
            user: {
              select: {
                name: true,
                profilePicture: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ order: activeOrder });
  } catch (error) {
    console.error('Error fetching active order:', error);
    res.status(500).json({ error: 'Failed to fetch active order' });
  }
});

// Become a repairman endpoint
app.post('/api/become-repairman', verifyToken, async (req, res) => {
  const { skills, servicesProvided, profilePicture, phoneNumber, servicesWithPrices } = req.body;
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
        servicesWithPrices,
        isVerified: true,
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
  const { skills, servicesProvided, profilePicture, phoneNumber, servicesWithPrices } = req.body;
  const userId = req.user.id;

  try {
    console.log(`Editing repairman for user: ${userId}`); 

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

    const updatedSkills = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim());
    const updatedServices = Array.isArray(servicesProvided) ? servicesProvided : servicesProvided.split(',').map(s => s.trim());

    const updatedRepairman = await prisma.repairman.update({
      where: { userId },
      data: {
        skills: updatedSkills,
        servicesProvided: updatedServices,
        profilePicture: profilePicture || repairman.profilePicture,
        phoneNumber: phoneNumber || repairman.phoneNumber,
        servicesWithPrices,
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
  const repairmanId = req.user.id;

  const orders = await prisma.order.findMany({
    where: { repairmanId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ orders });
});

// Add these new endpoints to your existing API file

// Cancel a booking
app.post("/booking/cancel/:bookingId", verifyToken, async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user.id;

  try {
    // First find the booking to check permissions
    const booking = await prisma.booking.findUnique({
      where: {
        id: parseInt(bookingId)
      },
      include: {
        shop: true
      }
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check if user is authorized (either the customer or shop owner)
    const isShopOwner = booking.shop.ownerId === userId;
    const isCustomer = booking.userId === userId;

    if (!isShopOwner && !isCustomer) {
      return res.status(403).json({ error: "Not authorized to cancel this booking" });
    }

    // Update booking status to canceled
    const updatedBooking = await prisma.booking.update({
      where: {
        id: parseInt(bookingId)
      },
      data: {
        status: "canceled"
      }
    });

    // Emit socket event for real-time updates
    io.emit("bookingCanceled", { bookingId: parseInt(bookingId) });

    return res.status(200).json({
      success: true,
      booking: updatedBooking
    });
  } catch (error) {
    console.error("Cancel booking error:", error);
    return res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// Complete a booking (shop owner only)
app.post("/booking/complete/:bookingId", verifyToken, async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user.id;

  try {
    // First find the booking to check permissions
    const booking = await prisma.booking.findUnique({
      where: {
        id: parseInt(bookingId)
      },
      include: {
        shop: true
      }
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check if user is the shop owner
    if (booking.shop.ownerId !== userId) {
      return res.status(403).json({ error: "Only shop owners can mark bookings as completed" });
    }

    // Check if booking is in an acceptable state to be completed
    if (booking.status !== "accepted") {
      return res.status(400).json({ 
        error: "Only accepted bookings can be marked as completed" 
      });
    }

    // Update booking status to completed
    const updatedBooking = await prisma.booking.update({
      where: {
        id: parseInt(bookingId)
      },
      data: {
        status: "completed"
      }
    });

    // Emit socket event for real-time updates
    io.emit("bookingCompleted", { bookingId: parseInt(bookingId) });

    return res.status(200).json({
      success: true,
      booking: updatedBooking
    });
  } catch (error) {
    console.error("Complete booking error:", error);
    return res.status(500).json({ error: "Failed to complete booking" });
  }
});

// Get all bookings for a shop
app.get("/api/shop/bookings-by-owner", verifyToken, async (req, res) => {
  try {
    // Find the shop associated with the user
    const shop = await prisma.shop.findFirst({
      where: { ownerId: req.user.id }
    });

    if (!shop) {
      return res.status(404).json({ error: "Shop not found for this user" });
    }

    // Get all bookings for this shop
    const bookings = await prisma.booking.findMany({
      where: {
        shopId: shop.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            profilePicture: true
          }
        }
      },
      orderBy: {
        datetime: 'asc'
      }
    });

    res.json({ booking: bookings });
  } catch (error) {
    console.error("Error fetching shop bookings:", error);
    res.status(500).json({ error: "Failed to fetch shop bookings" });
  }
});

// Get user's active bookings
app.get("/api/user/bookings", verifyToken, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        userId: req.user.id,
        NOT: {
          status: {
            in: ["completed", "canceled", "rejected"]
          }
        }
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            location: true,
            phoneNumber: true
          }
        }
      },
      orderBy: {
        datetime: 'asc'
      }
    });

    res.json({ booking: bookings });
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    res.status(500).json({ error: "Failed to fetch user bookings" });
  }
});

// Get user's booking history
app.get("/api/user/booking-history", verifyToken, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        userId: req.user.id,
        status: {
          in: ["completed", "canceled", "rejected"]
        }
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            location: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    res.json({ bookings });
  } catch (error) {
    console.error("Error fetching user booking history:", error);
    res.status(500).json({ error: "Failed to fetch user booking history" });
  }
});

app.post('/order/create', verifyToken, async (req, res) => {
  const {
    address,
    vehicleType,
    complaint,
    locationLat,
    locationLng,
    vehicleBrand,
    vehicleModel,
    vehicleYear,
    vehicleMileage,
    estimatedPrice,
  } = req.body;

  if (!address || !vehicleType || !complaint || !locationLat || !locationLng) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        address,
        vehicleType,
        complaint,
        locationLat,
        locationLng,
        vehicleBrand: vehicleBrand || null,
        vehicleModel: vehicleModel || null,
        vehicleYear: vehicleYear ? parseInt(vehicleYear) : null,
        vehicleMileage: vehicleMileage ? parseInt(vehicleMileage) : null,
        price: estimatedPrice || null,
      }
    });

    console.log('Order created successfully:', order);

    // Create the order data object with all necessary fields
    const orderData = {
      orderId: order.id,
      address: order.address, 
      locationLat: order.locationLat,
      locationLng: order.locationLng,
      vehicleType: order.vehicleType,
      complaint: order.complaint,
      userId: req.user.id,
      createdAt: order.createdAt
    };

    // Emit to all connected clients
    io.emit('newOrderRequest', orderData);
    
    // Also emit specifically to the repairman channel
    io.to('repairman_channel').emit('newOrderRequest', orderData);

    console.log('Emitted newOrderRequest events with data:', orderData);
    
    return res.status(201).json({ success: true, order });
  } catch (error) {
    console.error('Create Order Error:', error);
    return res.status(500).json({ error: 'Failed to create order' });
  }
});

app.post('/book/create', verifyToken, async (req, res) => {
  const {
    shopId,
    datetime,
    vehicleType,
    issue,
    vehicleBrand,
    vehicleModel,
    vehicleYear,
    vehicleMileage,
  } = req.body;

  if (!shopId || !datetime || !vehicleType || !issue) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const booking = await prisma.booking.create({
      data: {
        userId: req.user.id,
        shopId: parseInt(shopId),
        datetime: new Date(datetime),
        issue,
        vehicleBrand: vehicleBrand || null,
        vehicleModel: vehicleModel || null,
        vehicleYear: vehicleYear ? parseInt(vehicleYear) : null,
        vehicleMileage: vehicleMileage ? parseInt(vehicleMileage) : null,
        vehicleType,
      },
    });

    const bookingData = {
      bookingId: booking.id,
      shopId: booking.shopId,
      userId: req.user.id,
      vehicleType: booking.vehicleType,
      vehicleBrand: booking.vehicleBrand,
      vehicleModel: booking.vehicleModel,
      vehicleYear: booking.vehicleYear,
      vehicleMileage: booking.vehicleMileage,
      issue: booking.issue,
      datetime: booking.datetime
    }

    io.emit('newBookingRequest', bookingData);

    console.log("Emitted newBookingRequest events with data: ", bookingData)

    return res.status(201).json({ success: true, booking });
  } catch (error) {
    console.error('Error in booking shop:', error);
    return res.status(500).json({ error: 'Failed to book shop' });
  }
});


app.get('/api/order/:orderId', verifyToken, async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            profilePicture: true
          }
        },
        repairman: {
          include: {
            user: {
              select: {
                name: true,
                profilePicture: true,
                phoneNumber: true
              }
            }
          }
        }
      }
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

app.get("/api/booking/:bookingId", verifyToken, async (req, res) => {
  const bookingId = parseInt(req.params.bookingId);

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { id: true, name: true, phoneNumber: true } },
        shop: { select: { id: true, name: true, phoneNumber: true } },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json(booking);
  } catch (error) {
    console.error("Error fetching booking", error);
    res.status(500).json({ error: "Failed to fetch booking info" });
  }
});


app.post('/order/accept/:orderId', verifyToken, async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: {
        repairmanId: req.user.id, 
        status: 'accepted'
      }
    });
    
    console.log(`Order ${orderId} accepted by repairman ${req.user.id}`);
    
    // Emit event to let everyone know the order is accepted
    io.emit('orderAccepted', { 
      orderId: parseInt(orderId),
      repairmanId: req.user.id 
    });

    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Accept Order Error:', error);
    return res.status(500).json({ error: 'Failed to accept order' });
  }
});

app.post('/booking/accept/:bookingId', verifyToken, async (req, res) => {
  const bookingId = parseInt(req.params.bookingId);

  try {
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'accepted' }
    });

    io.emit('bookingAccepted', { bookingId });
    res.json({ success: true, booking });
  } catch (error) {
    console.error('Error accepting booking:', error);
    res.status(500).json({ error: 'Failed to accept booking' });
  }
});


// In your server code (orderapi.txt or similar)
app.post('/order/reject/:orderId', verifyToken, async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: { 
        status: 'rejected',
        rejectedAt: new Date() 
      }
    });

    io.emit('orderRejected', { orderId: parseInt(orderId) });
    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Reject Order Error:', error);
    return res.status(500).json({ error: 'Failed to reject order' });
  }
});

app.post('/booking/reject/:bookingId', verifyToken, async (req, res) => {
  // const bookingId = parseInt(req.params.bookingId);

  try {
    const booking = await prisma.booking.update({
      where: { id: req.params.bookingId },
      data: { status: 'rejected' }
    });

    io.emit('bookingRejected', { bookingId });
    res.json({ success: true, booking });
  } catch (error) {
    console.error('Error rejecting booking:', error);
    res.status(500).json({ error: 'Failed to reject booking' });
  }
});

app.post('/order/cancel/:orderId', verifyToken, async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: { 
        status: 'canceled',
        canceledAt: new Date() 
      },
      include: {
        user: true,
        repairman: {
          include: {
            user: true
          }
        }
      }
    });

    // Emit with both spellings for backward compatibility
    io.to(`order_${orderId}`).emit('orderCanceled', { 
      orderId: parseInt(orderId),
      userId: order.userId,
      repairmanId: order.repairmanId 
    });
    
    // Also emit with 'cancelled' spelling
    io.to(`order_${orderId}`).emit('orderCancelled', { 
      orderId: parseInt(orderId),
      userId: order.userId,
      repairmanId: order.repairmanId 
    });

    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Cancel Order Error:', error);
    return res.status(500).json({ error: 'Failed to cancel order' });
  }
});

app.post('/booking/cancel/:bookingId', verifyToken, async (req, res) => {
  const bookingId = parseInt(req.params.bookingId);

  try {
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'canceled' }
    });

    io.emit('bookingCancelled', { bookingId });
    res.json({ success: true, booking });
  } catch (error) {
    console.error('Error canceling booking:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

app.post('/order/finish/:orderId', verifyToken, async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: {
        status: 'completed',
      },
      include: {
        user: true,
        repairman: {
          include: {
            user: true
          }
        }
      }
    });

    // Notify both parties
    io.to(`order_${orderId}`).emit('orderCompleted', { 
      orderId: parseInt(orderId),
      userId: order.userId,
      repairmanId: order.repairmanId 
    });

    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Finish Order Error:', error);
    return res.status(500).json({ error: 'Failed to finish order' });
  }
});

app.post('/booking/finish/:bookingId', verifyToken, async (req, res) => {
  const bookingId = parseInt(req.params.bookingId);

  try {
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'finished' }
    });

    io.emit('bookingFinished', { bookingId });
    res.json({ success: true, booking });
  } catch (error) {
    console.error('Error finishing booking:', error);
    res.status(500).json({ error: 'Failed to finish booking' });
  }
});

app.get('/api/messages/:orderId', verifyToken, async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: { orderId: parseInt(req.params.orderId) },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
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

app.get('/api/get-shop-by-id/:shopId', verifyToken, async (req, res) => {
  const {shopId} = req.params
  try{
    if (!shopId) {
      return res.status(400).json({ error: 'Shop ID is required' });
    }
    const shop = await prisma.shop.findUnique({
      where: {
        id: parseInt(shopId)
      }
    })
    if(!shop){
      return res.status(404).json({ error: 'Shop not found' });
    }
    res.json(shop);
  }catch(error){
    console.error('Error getting shop:', error);
    res.status(500).json({ error: 'An error occured while processing your request.'})
  }
})

app.get('/api/get-booking-by-user', verifyToken, async (req, res) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: {
        userId: req.user.id
        // NOT: { status: { in: ['canceled', 'finished', 'rejected'] } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!booking) return res.json(null);

    res.json(booking);
  } catch (error) {
    console.error("Error getting user's booking", error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});


// Example of a protected endpoint
app.get('/api/protected', verifyToken, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Socket.IO server is ready`);
});