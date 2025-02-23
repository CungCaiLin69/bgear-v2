import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the user type
export type User = {
  name: string;
  email?: string; // Optional fields can be added as needed
};

// Define the AuthContext type
export type AuthContextType = {
  userToken: string | null;
  user: User | null;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: User) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  isLoading: boolean;
};

// Create the AuthContext
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component
export const AuthProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check if the user is logged in on app startup
  useEffect(() => {
    const checkTokenAndUser = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('user');
        if (token && userData) {
          setUserToken(token);
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Error reading token or user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkTokenAndUser();
  }, []);

  // Login function
  const login = async (token: string, user: User) => {
    setUserToken(token);
    setUser(user);
    await AsyncStorage.setItem('userToken', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
  };

  // Logout function
  const logout = async () => {
    setUserToken(null);
    setUser(null);
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('user');
  };

  // Update user profile function
  const updateUser = async (updatedUser: User) => {
    try {
      const response = await fetch('http://10.0.2.2:3000/api/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify(updatedUser),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }
  
      // Update the user in the AuthProvider state
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  // Change password function
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      // Call your backend API to change the password
      const response = await fetch('http://10.0.2.2:3000/api/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`, // Include the JWT token
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ userToken, user, login, logout, updateUser, changePassword, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};