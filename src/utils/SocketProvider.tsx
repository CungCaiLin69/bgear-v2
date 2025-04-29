import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthProvider';

const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : 'http://192.168.1.4:3000';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  reconnect: () => void;
  lastError: string | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  reconnect: () => {},
  lastError: null,
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { userToken } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const setupSocket = () => {
    if (!userToken) {
      console.warn('Socket connection skipped: no token');
      return null;
    }

    // Add debug output
    console.log('[SOCKET] Setting up socket with token:', userToken.substring(0, 10) + '...');
    
    const newSocket = io(API_URL, {
      auth: { token: userToken },
      transports: ['websocket', 'polling'], // Add polling as fallback transport
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      timeout: 20000, // Increase timeout
      forceNew: true, // Force a new connection
    });

    newSocket.on('connect', () => {
      console.log('[SOCKET] Connected ✅ with ID:', newSocket.id);
      setIsConnected(true);
      setLastError(null);
      reconnectAttempts.current = 0;
    });

    newSocket.on('connect_error', (err) => {
      console.error('[SOCKET] Connect Error Details ❌:', err.message); 
      console.error('[SOCKET] Connect Error Stack:', err.stack);
      setLastError(err.message || 'Connection error');
      setIsConnected(false);
      reconnectAttempts.current += 1;

      // Try to switch to polling if websocket fails
      if (reconnectAttempts.current === 2) {
        console.log('[SOCKET] Trying polling transport instead');
        newSocket.io.opts.transports = ['polling', 'websocket'];
      }

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        Alert.alert(
          'Connection Error',
          `Unable to connect to the service. Check your internet connection or restart the app. Last error: ${err.message || 'Unknown error'}`,
          [{ text: 'OK' }]
        );
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('error', (err) => {
      console.error('[SOCKET] Socket.IO Error 🛑:', err);
      setLastError(typeof err === 'string' ? err : (err.message || 'Socket.IO error'));
      setIsConnected(false);
    });

    newSocket.io.on('reconnect', (attempt) => {
      console.log(`[SOCKET] Reconnected after ${attempt} attempts`);
    });

    newSocket.io.on('reconnect_attempt', (attempt) => {
      console.log(`[SOCKET] Reconnect attempt: ${attempt}`);
    });

    newSocket.io.on('reconnect_error', (err) => {
      console.log('[SOCKET] Reconnect error:', err);
    });

    newSocket.onAny((event, ...args) => {
      console.log(`[SOCKET] Event: ${event}`, args);
    });

    setSocket(newSocket);
    return newSocket;
  };

  const reconnect = () => {
    console.log('[SOCKET] Manually reconnecting...');
    if (socket) {
      console.log('[SOCKET] Disconnecting existing socket');
      socket.disconnect();
    }
    reconnectAttempts.current = 0;
    const newSocket = setupSocket();
    if (newSocket) {
      setSocket(newSocket);
    }
  };

  useEffect(() => {
    const newSocket = setupSocket();
    return () => {
      if (newSocket) {
        newSocket.disconnect();
        console.log('[SOCKET] Disconnected on unmount');
      }
    };
  }, [userToken]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, reconnect, lastError }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);