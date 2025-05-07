import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../utils/AuthProvider'; 
import { useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSocket } from '../../utils/SocketProvider';

interface User {
  id: string;
  name: string;
  is_repairman?: boolean;
  has_shop?: boolean;
}

interface Repairman {
  user: {
    name: string;
    profilePicture?: string;
  };
}

interface Order {
  id: number;
  status: string;
  vehicleType: string;
  repairman?: Repairman;
}

export default function HomePage() {
  const { userToken, user } = useAuth(); 
  const { socket } = useSocket();
  const router = useRouter();
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchActiveOrder = async () => {
    try {
      const response = await fetch('http://10.0.2.2:3000/api/active-order', {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch order status');
      
      const data = await response.json();
      
      if (data.order && !['completed', 'canceled', 'rejected'].includes(data.order.status)) {
        setActiveOrder(data.order);
      } else {
        setActiveOrder(null);
      }
    } catch (error) {
      console.error('Error checking active order:', error);
      setActiveOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userToken || !user || user.is_repairman) {
      setLoading(false);
      return;
    }

    fetchActiveOrder();

    // Set up socket listeners
    if (socket) {
      const handleOrderUpdate = () => {
        console.log('Order status changed - refreshing data');
        fetchActiveOrder();
      };

      socket.on('orderCompleted', handleOrderUpdate);
      socket.on('orderCanceled', handleOrderUpdate);
      socket.on('orderCancelled', handleOrderUpdate);

      return () => {
        socket.off('orderCompleted', handleOrderUpdate);
        socket.off('orderCanceled', handleOrderUpdate);
        socket.off('orderCancelled', handleOrderUpdate);
      };
    }
  }, [userToken, user, socket]);

  // Redirect to login if not logged in
  if (!userToken) {
    router.replace('/(auth)/login');
    return null;
  }

  if (!user || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Profile Button */}
      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => router.push({ pathname: '/(home)/profile' })} 
      >
        <Text style={styles.profileButtonText}>Profile</Text>
      </TouchableOpacity>

      {/* Greeting Card */}
      <View style={styles.greetingCard}>
        <Text style={styles.greetingText}>Welcome, {user.name}!</Text>

        <View style={styles.cardButtons}>
          {/* Repairman Button */}
          {user.is_repairman ? (
            <TouchableOpacity
              style={styles.becomeRepairmanButton}
              onPress={() => router.push('../(dasboard)/repairman-dashboard')}
            >
              <Text style={styles.becomeRepairmanButtonText}>Repairman Dashboard</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.becomeRepairmanButton}
              onPress={() => router.push('/(home)/create-repairman')}
            >
              <Text style={styles.becomeRepairmanButtonText}>Become Repairman</Text>
            </TouchableOpacity>
          )}
          
          {/* Shop Button */}
          {user.has_shop ? (
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => router.push('/(home)/edit-shop')}
            >
              <Text style={styles.shopButtonText}>Shop Dashboard</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => router.push('/(home)/create-shop')}
            >
              <Text style={styles.shopButtonText}>Open a Shop</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {activeOrder && !user.is_repairman ? (
          <TouchableOpacity
            style={styles.trackButton}
            onPress={() => router.push({
              pathname: '/(repairman)/order-tracking',
              params: { orderId: activeOrder.id.toString() }
            })}
          >
            <View style={styles.trackButtonContent}>
              <View style={styles.trackerIcon}>
                <Icon name="navigate" size={24} color="white" />
              </View>
              <View style={styles.trackButtonText}>
                <Text style={styles.trackButtonTitle}>Track Repairman</Text>
                <Text style={styles.trackButtonSubtitle}>
                  {activeOrder.repairman?.user.name || 'Repairman'} is coming
                </Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} color="white" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => router.replace('../(repairman)/order-repairman')} 
          >
            <Text style={styles.optionButtonText}>Order a Repairman</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => router.push('/')} 
        >
          <Text style={styles.optionButtonText}>Book a Shop</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButton: {
    alignSelf: 'flex-end',
    padding: 10,
  },
  profileButtonText: {
    fontSize: 16,
    color: '#007BFF',
    fontWeight: 'bold',
  },
  greetingCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  cardButtons: {
    flexDirection: 'row',
    gap: 12, 
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20
  },
  optionsContainer: {
    marginTop: 40,
  },
  optionButton: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  optionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  becomeRepairmanButton: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  becomeRepairmanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shopButton: {
    backgroundColor: '#FFA500',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  trackButton: {
    backgroundColor: '#34A853',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  trackButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  trackerIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trackButtonText: {
    flex: 1,
  },
  trackButtonTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  trackButtonSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
});