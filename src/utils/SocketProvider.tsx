import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthProvider';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : 'http://192.168.1.4:3000';

// Storage keys
const UNREAD_MESSAGES_KEY = 'unread_messages';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  reconnect: () => void;
  lastError: string | null;
  showChatNotification: (message: string, orderId: number, senderId: string) => void;
  pendingOrders: any[];
  markMessagesAsRead: (orderId: number) => void;
  getUnreadMessageCount: (orderId: number) => Promise<number>;
  allUnreadMessages: Record<string, any[]>;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  reconnect: () => { },
  lastError: null,
  showChatNotification: () => {},
  pendingOrders: [],
  markMessagesAsRead: () => {},
  getUnreadMessageCount: async () => 0,
  allUnreadMessages: {}
});

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,  
    shouldShowList: true     
  }),
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { userToken, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [pendingBooking, setPendingBooking] = useState<any[]>([]);
  const [allUnreadMessages, setAllUnreadMessages] = useState<Record<string, any[]>>({});
  
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const socketRef = useRef<Socket | null>(null);
  const activeOrderRooms = useRef<Set<number>>(new Set());
  const currentScreen = useRef<string | null>(null);
  
  // Load unread messages from storage on startup
  useEffect(() => {
    const loadUnreadMessages = async () => {
      try {
        const stored = await AsyncStorage.getItem(UNREAD_MESSAGES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setAllUnreadMessages(parsed);
        }
      } catch (error) {
        console.error('Failed to load unread messages:', error);
      }
    };
    
    loadUnreadMessages();
  }, []);
  
  // Save unread messages to storage when they change
  useEffect(() => {
    const saveUnreadMessages = async () => {
      try {
        await AsyncStorage.setItem(UNREAD_MESSAGES_KEY, JSON.stringify(allUnreadMessages));
      } catch (error) {
        console.error('Failed to save unread messages:', error);
      }
    };
    
    saveUnreadMessages();
  }, [allUnreadMessages]);

  // Handle notifications
  const registerForPushNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for notifications');
        return;
      }
      
      // Listen for notifications
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data.orderId) {
          // Navigate to chat screen when notification is tapped
          router.navigate(`/(repairman)/chat-repairman?orderId=${data.orderId}`)
        }
      });
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  useEffect(() => {
    registerForPushNotifications();
  }, [user]);

  // Track active screen for better notification handling
  const setCurrentScreenTracker = (screen: string | null) => {
    currentScreen.current = screen;
  };

  // Show in-app notification
  const showChatNotification = useCallback((message: string, orderId: number, senderId: string) => {
    // Check if the message is in a room the user is currently viewing
    if ((currentScreen.current?.includes('chat') && 
      activeOrderRooms.current.has(orderId)) ||
      (user && senderId === user.id)) {
    return;
  }
    
    // Also show a system notification if app is in background
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'New Message',
        body: message,
        data: { orderId },
      },
      trigger: null, // Send immediately
    });
  }, [user]);

  // Store unread message
  const storeUnreadMessage = useCallback((message: any) => {
    const orderId = message.orderId.toString();
    
    setAllUnreadMessages(prev => {
      const updatedMessages = { ...prev };
      if (!updatedMessages[orderId]) {
        updatedMessages[orderId] = [];
      }
      updatedMessages[orderId] = [...updatedMessages[orderId], message];
      return updatedMessages;
    });
  }, []);

  // Mark messages as read for a specific order
  const markMessagesAsRead = useCallback((orderId: number) => {
    const orderIdStr = orderId.toString();
    
    setAllUnreadMessages(prev => {
      const updated = { ...prev };
      delete updated[orderIdStr];
      return updated;
    });
  }, []);

  // Get unread message count for specific order
  const getUnreadMessageCount = useCallback(async (orderId: number) => {
    const orderIdStr = orderId.toString();
    return allUnreadMessages[orderIdStr]?.length || 0;
  }, [allUnreadMessages]);

  // Setup socket connection
  const setupSocket = () => {
    if (!userToken) {
      console.warn('Socket connection skipped: no token');
      return null;
    }

    // Disconnect existing socket if there is one
    if (socketRef.current) {
      console.log('Closing existing socket connection');
      socketRef.current.disconnect();
    }

    console.log('Setting up new socket connection');
    
    const newSocket = io(API_URL, {
      auth: { token: userToken },
      transports: ['websocket'],
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      timeout: 10000,
      forceNew: true,
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('[SOCKET] Connected ✅', newSocket.id);
      setIsConnected(true);
      setLastError(null);
      reconnectAttempts.current = 0;

      // Join channels based on user role
      if (user?.is_repairman) {
        console.log('Joining repairman channel');
        newSocket.emit('joinRepairmanChannel');
      }
      
      // Auto-join all active order rooms for this user
      if (user?.id) {
        newSocket.emit('joinUserOrders', { userId: user.id });
      }
    });

    newSocket.on('connect_error', (err) => {
      console.error('[SOCKET] Connect Error Details ❌:', err);
      setLastError(err.message || 'Connection error');
      setIsConnected(false);
      reconnectAttempts.current += 1;

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        Alert.alert(
          'Connection Error',
          `Unable to connect to the service. Check your internet connection or restart the app. Last error: ${err.message || 'Unknown error'}`,
          [{ text: 'OK' }]
        );
      }
    });

    // Handle new message event
    newSocket.on('newMessage', (msg) => {
      console.log('Received new message:', msg);
      
      // Only store messages from other users
      if (user && msg.senderId !== user.id) {
        // Check if user is currently viewing the chat room for this order
        const isViewingChat = currentScreen.current?.includes('chat') && 
                              activeOrderRooms.current.has(msg.orderId);
        
        if (!isViewingChat) {
          // Store unread message
          storeUnreadMessage(msg);
          
          // Show notification
          const senderRole = msg.senderRole === 'repairman' ? 'Repairman' : 'Customer';
          showChatNotification(`${senderRole}: ${msg.message}`, msg.orderId, msg.senderId);
        }
      }
    });

    newSocket.on('newOrderRequest', (newOrderPayload) => {
      // Handle new orders
      const orders = Array.isArray(newOrderPayload) ? newOrderPayload : [newOrderPayload];
      const enriched = orders.map(order => ({
        ...order,
        timeout: 180
      }));
      
      // Store in context for dashboard
      setPendingOrders(prev => [...prev, ...enriched]);
    });

    newSocket.on('newBookingRequest', (newBooking) => {
      const booking = Array.isArray(newBooking) ? newBooking : [newBooking];
      const enriched = booking.map(booking => ({
          ...booking,
      }));

      setPendingBooking(prev => [
          ...prev,
          ...enriched
      ]);      
    });

    // Handle order accepted
    newSocket.on('orderAccepted', (orderData) => {
      // Auto-join the order chat room
      if (user?.id && (orderData.userId === user.id || orderData.repairmanId === user.id)) {
        newSocket.emit('joinOrderRoom', { orderId: orderData.id });
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('error', (err) => {
      console.error('[SOCKET] Socket.IO Error 🛑:', err);
      setLastError(err.message || 'Socket.IO error');
      setIsConnected(false);
    });

    // Debug all events
    newSocket.onAny((event, ...args) => {
      console.log(`[SOCKET] Event: ${event}`, args);
    });

    setSocket(newSocket);
    return newSocket;
  };

  // Manual reconnect function
  const reconnect = () => {
    console.log('Manually triggering socket reconnection');
    reconnectAttempts.current = 0;
    const newSocket = setupSocket();
    if (newSocket) {
      setSocket(newSocket);
    }
  };

  // Join a specific order room
  const joinOrderRoom = useCallback((orderId: number) => {
    if (socketRef.current && orderId) {
      console.log(`Joining order room: ${orderId}`);
      socketRef.current.emit('joinOrderRoom', { orderId });
      activeOrderRooms.current.add(orderId);
      
      // Mark messages as read when joining a room
      markMessagesAsRead(orderId);
    }
  }, [markMessagesAsRead]);

  // Leave a specific order room
  const leaveOrderRoom = useCallback((orderId: number) => {
    if (socketRef.current && orderId) {
      console.log(`Leaving order room: ${orderId}`);
      socketRef.current.emit('leaveOrderRoom', { orderId });
      activeOrderRooms.current.delete(orderId);
    }
  }, []);

  // Set up socket connection when auth token changes
  useEffect(() => {
    console.log('Auth token changed, setting up socket');
    const newSocket = setupSocket();
    
    return () => {
      if (socketRef.current) {
        console.log('[SOCKET] Disconnecting on unmount or token change');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userToken]);

  // Set up reconnection logic
  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;  // Works in both Node and browser
    
    if (!isConnected && userToken) {
      console.log('Not connected but have token, scheduling reconnection');
      reconnectTimer = setTimeout(() => {
        console.log('Attempting scheduled reconnection');
        reconnect();
      }, 5000); 
    }
    
    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
}, [isConnected, userToken, reconnect]);

  return (
    <SocketContext.Provider 
      value={{ 
        socket, 
        isConnected, 
        reconnect, 
        lastError, 
        showChatNotification,
        pendingOrders,
        markMessagesAsRead,
        getUnreadMessageCount,
        allUnreadMessages
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

export const useChatRoom = (orderId: number | null) => {
  const { socket, markMessagesAsRead } = useSocket();
  
  useEffect(() => {
    if (!socket || !orderId) return;
    
    // Join the room when component mounts
    socket.emit('joinOrderRoom', { orderId });
    
    // Mark messages as read
    markMessagesAsRead(orderId);
    
    // Leave the room when component unmounts
    return () => {
      socket.emit('leaveOrderRoom', { orderId });
    };
  }, [socket, orderId, markMessagesAsRead]);
};

// Helper hook to track screen focus for notifications
export const useScreenTracker = (screenName: string) => {
  const { socket } = useSocket();
  
  useEffect(() => {
    if (socket) {
      socket.emit('screenFocus', { screen: screenName });
    }
    
    return () => {
      if (socket) {
        socket.emit('screenBlur', { screen: screenName });
      }
    };
  }, [socket, screenName]);
};