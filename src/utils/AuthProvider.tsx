import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the user type
export type User = {
  id?: string;
  email: string;
  name: string;
  profilePicture?: string | null; // Allow null values
  role?: string; // customer, repairman, shop_owner
  phoneNumber: string;
  has_shop: boolean;
  is_repairman: boolean;
};

// Define the repairman type
export type Repairman = {
  id: number;
  userId: string;
  name: string;
  skills: string[];
  servicesProvided: string[];
  profilePicture?: string | null; // Allow null values
  isAvailable: boolean;
  currentLocation?: string;
  phoneNumber: string;
};

export type Shop = {
  id: number;
  ownerId: string;
  name: string;
  location: string;
  services: string[];
  photos: string[];
  phoneNumber?: string;
};

export type AuthContextType = {
  userToken: string | null;
  verifyOtp: (phoneNumber: string, otp: string) => Promise<boolean>;
  user: User | null;
  repairman: Repairman | null;
  shop: Shop | null;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: User) => Promise<void>;
  editRepairman: (repairmanData: {
    name: string;
    skills: string[];
    servicesProvided: string[];
    profilePicture?: string | null;
    phoneNumber: string
  }) => Promise<void>; 
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  isLoading: boolean;
  becomeRepairman: (repairmanData: {
    name: string;
    skills: string[];
    servicesProvided: string[];
    profilePicture?: string | null;
  }) => Promise<void>;
  checkRepairmanStatus: () => Promise<void>;
  resignAsRepairman: () => Promise<void>;
  createShop: (shopData: {
    shopName: string;
    shopLocation: string;
    shopServices: string[];
    phoneNumber?: string | null;
    photos: string[];
  }) => Promise<void>;
  editShop: (shopData: {
    shopName: string;
    shopLocation: string;
    shopServices: string[];
    phoneNumber?: string | null;
    photos: string[];
  }) => Promise<void>;
  closeShop: () => Promise<void>;
};

// Create the AuthContext
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component
export const AuthProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [repairman, setRepairman] = useState<Repairman | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkTokenAndUser = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('user');
        const repairmanData = await AsyncStorage.getItem('repairman');
        const shopData = await AsyncStorage.getItem('shop');
        
        if (token && userData) {
          const parsedUser: User = JSON.parse(userData);
          setUserToken(token);
          setUser(parsedUser);
          
          // Directly set repairman from storage first
          if (repairmanData) {
            setRepairman(JSON.parse(repairmanData));
          }
          
          // Then refresh from API if needed
          if (parsedUser.is_repairman) {
            await checkRepairmanStatus();
          }
          
          if (shopData) {
            setShop(JSON.parse(shopData));
          }
          
          if (parsedUser.has_shop) {
            await checkShopStatus();
          }
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

    if (user.is_repairman) {
      await checkRepairmanStatus();
    }
    if (user.has_shop) {
      await checkShopStatus();
    } 
  };

  // Logout function
  const logout = async () => {
    setUserToken(null);
    setUser(null);
    setRepairman(null); 
    setShop(null)
    await AsyncStorage.clear();
  };

  const verifyOtp = async (phoneNumber: string, otp: string): Promise<boolean> => {
    try {
      const response = await fetch('http://10.0.2.2:3000/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }

      if (data.token && data.user) {
        await login(data.token, data.user);
      }

      return true;
    } catch (error) {
      console.error('OTP verification failed:', error);
      return false;
    }
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
  
      const newUser = data.user; // ✅ Use updated user from backend response
  
      // ✅ Update the user in the AuthProvider state and storage
      setUser(newUser);
      await AsyncStorage.setItem('user', JSON.stringify(newUser));
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

   // Check repairman status function
   const checkRepairmanStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log('Retrieved Token:', token);
  
      if (!token) {
        console.error('User token is missing.');
        return;
      }
  
      const response = await fetch('http://10.0.2.2:3000/api/check-repairman', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      const text = await response.text();
      console.log('Raw API Response:', text);
  
      const data = JSON.parse(text);
  
      if (data.repairman) {
        // Changed from setShop to setRepairman
        setRepairman(data.repairman);
        await AsyncStorage.setItem('repairman', JSON.stringify(data.repairman));
      } else {
        setRepairman(null);
        await AsyncStorage.removeItem('repairman');
      }
    } catch (error) {
      console.error('Error checking repairman status:', error);
    }
  };

  const editRepairman = async (repairmanData: {
    name: string;
    skills: string[];
    servicesProvided: string[];
    profilePicture?: string | null;
    phoneNumber: string; 
}) => {
    try {
      const token = await AsyncStorage.getItem('userToken'); // Retrieve token dynamically
      if (!token) {
          console.error('No token found. User might be logged out.');
          throw new Error('Authentication error: Token missing');
      }

      const response = await fetch('http://10.0.2.2:3000/api/edit-repairman', {
          method: 'PUT',
          headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`, // Use retrieved token
          },
          body: JSON.stringify(repairmanData),
      });

      const data = await response.json();

      if (!response.ok) {
          throw new Error(data.error || 'Failed to update repairman.');
      }

      await checkRepairmanStatus();

      // Update the repairman state
      setRepairman(data.repairman);
      await AsyncStorage.setItem('repairman', JSON.stringify(data.repairman));
  } catch (error) {
      console.error('Error updating repairman:', error);
      throw error;
  }
};


  // Change password function
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
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
    skills: string[];
    servicesProvided: string[];
    profilePicture?: string | null;
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
        is_repairman: true,
      }));

      // Update the repairman state
      setRepairman(data.repairman);

      await AsyncStorage.setItem('user', JSON.stringify({ ...user!, role: 'repairman', is_repairman: true }));
      await AsyncStorage.setItem('repairman', JSON.stringify(data.repairman));
    } catch (error) {
      console.error('Error becoming a repairman:', error);
      throw error;
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
        is_repairman: false,
      }));

      // Clear the repairman state
      setRepairman(null);

      await AsyncStorage.setItem('user', JSON.stringify({ ...user!, role: 'customer', is_repairman: false }));
      await AsyncStorage.removeItem('repairman');
    } catch (error) {
      console.error('Error resigning as repairman:', error);
      throw error;
    }
  };

  const checkShopStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken'); // Fetch token dynamically
      console.log('Retrieved Token:', token); // Debugging
  
      if (!token) {
        console.error('User token is missing.');
        return;
      }
  
      const response = await fetch('http://10.0.2.2:3000/api/check-shop', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      const text = await response.text(); // Read response as text first
      console.log('Raw API Response:', text); // Log the raw response
  
      const data = JSON.parse(text);
  
      if (data.shop) {
        setShop(data.shop);
        await AsyncStorage.setItem('shop', JSON.stringify(data.shop));
      } else {
        setShop(null);
        await AsyncStorage.removeItem('shop');
      }
    } catch (error) {
      console.error('Error checking shop status:', error);
    }
  };
  

  const createShop = async (shopData: {
    shopName: string;
    shopLocation: string;
    shopServices: string[];
    phoneNumber?: string | null;
    photos: string[];
  }) => {
    try {
      const response = await fetch('http://10.0.2.2:3000/api/create-shop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify(shopData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create shop.');
      }

      // Update the user's has_shop field
      const updatedUser = { ...user!, has_shop: true };
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

      // Update the shop state
      setShop(data.shop);
      await AsyncStorage.setItem('shop', JSON.stringify(data.shop));
    } catch (error) {
      console.error('Error creating shop:', error);
      throw error;
    }
  };

  const editShop = async (shopData: {
    shopName: string;
    shopLocation: string;
    shopServices: string[];
    phoneNumber?: string | null;
    photos: string[];
}) => {
    try {
        const token = await AsyncStorage.getItem('userToken'); // Retrieve token dynamically
        if (!token) {
            console.error('No token found. User might be logged out.');
            throw new Error('Authentication error: Token missing');
        }

        const response = await fetch('http://10.0.2.2:3000/api/edit-shop', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`, // Use retrieved token
            },
            body: JSON.stringify(shopData),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update shop.');
        }

        await checkShopStatus();

        // Update the shop state
        setShop(data.shop);
        await AsyncStorage.setItem('shop', JSON.stringify(data.shop));
    } catch (error) {
        console.error('Error updating shop:', error);
        throw error;
    }
};


  // Close shop function
  const closeShop = async () => {
    try {
      const response = await fetch('http://10.0.2.2:3000/api/close-shop', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to close shop.');
      }

      // Update the user's has_shop field
      const updatedUser = { ...user!, has_shop: false };
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

      // Clear the shop state
      setShop(null);
      await AsyncStorage.removeItem('shop');
    } catch (error) {
      console.error('Error closing shop:', error);
      throw error;
    }
  };

  return (
      <AuthContext.Provider
          value={{
            userToken,
            verifyOtp,
            user,
            repairman,
            shop,
            login,
            logout,
            updateUser,
            editRepairman,
            changePassword,
            isLoading,
            becomeRepairman,
            checkRepairmanStatus,
            resignAsRepairman,
            createShop,
            editShop,
            closeShop,
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