import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the user type
export type User = {
  id?: string;
  email: string;
  name: string;
  role?: string; // customer, repairman, shop_owner
};

// Define the repairman type
export type Repairman = {
  id: number;
  userId: string;
  skills: string[];
  isAvailable: boolean;
  currentLocation: string;
  hasShop: boolean;
  shopName?: string;
  servicesProvided: string[];
};

// Define the AuthContext type
export type AuthContextType = {
  userToken: string | null;
  user: User | null;
  repairman: Repairman | null; 
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: User) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  isLoading: boolean;
  becomeRepairman: (repairmanData: {
    name: string;
    age: number;
    specialties: string[];
    hasShop: boolean;
    shopName?: string;
    servicesProvided: string[];
  }) => Promise<void>;
  checkRepairmanStatus: () => Promise<void>;
  resignAsRepairman: () => Promise<void>;
};

// Create the AuthContext
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component
export const AuthProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [repairman, setRepairman] = useState<Repairman | null>(null); // Initialize repairman state
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
          await checkRepairmanStatus(); // Check repairman status on app startup
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
    await checkRepairmanStatus(); // Check repairman status after login
  };

  // Logout function
  const logout = async () => {
    setUserToken(null);
    setUser(null);
    setRepairman(null); // Clear repairman state on logout
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
          Authorization: `Bearer ${userToken}`,
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

  // Become a repairman function
  const becomeRepairman = async (repairmanData: {
    name: string;
    age: number;
    specialties: string[];
    hasShop: boolean;
    shopName?: string;
    servicesProvided: string[];
  }) => {
    try {
      const response = await fetch('http://10.0.2.2:3000/api/become-repairman', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify(repairmanData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to become a repairman');
      }

      // Update the user's role in the AuthProvider state
      setUser((prevUser) => ({
        ...prevUser!,
        role: 'repairman',
      }));

      // Update the repairman state
      setRepairman(data.repairman);

      await AsyncStorage.setItem('user', JSON.stringify({ ...user!, role: 'repairman' }));
    } catch (error) {
      console.error('Error becoming a repairman:', error);
      throw error;
    }
  };

  // Check repairman status function
  const checkRepairmanStatus = async () => {
    try {
      const response = await fetch('http://10.0.2.2:3000/api/check-repairman', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      const data = await response.json();

      if (data.isRepairman) {
        setRepairman(data.repairman);
      } else {
        setRepairman(null);
      }
    } catch (error) {
      console.error('Error checking repairman status:', error);
    }
  };

  // Resign as repairman function
  const resignAsRepairman = async () => {
    try {
      const response = await fetch('http://10.0.2.2:3000/api/resign-repairman', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resign as a repairman');
      }

      // Update the user's role in the AuthProvider state
      setUser((prevUser) => ({
        ...prevUser!,
        role: 'customer',
      }));

      // Clear the repairman state
      setRepairman(null);

      await AsyncStorage.setItem('user', JSON.stringify({ ...user!, role: 'customer' }));
    } catch (error) {
      console.error('Error resigning as repairman:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        userToken,
        user,
        repairman, // Include repairman in the context value
        login,
        logout,
        updateUser,
        changePassword,
        isLoading,
        becomeRepairman,
        checkRepairmanStatus,
        resignAsRepairman,
      }}
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