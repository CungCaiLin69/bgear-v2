import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ActivityIndicator,
  StatusBar,
  ScrollView
} from 'react-native';
import { useAuth } from '../../utils/AuthProvider'; 
import { useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSocket } from '../../utils/SocketProvider';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '@rneui/base';

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
  const { socket, isConnected } = useSocket();
  const router = useRouter();
  const [userHaveBooking, setUserHaveBooking] = useState(false);
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

  const getBookingByUser = async() => {
    try{
      const response = await fetch('http://10.0.2.2:3000/api/get-booking-by-user', {
        headers: {
          Authorization: `Bearer ${userToken}`,
      },
      })
      const data = await response.json();
      setUserHaveBooking(data);
      // console.log("booking by user: ", data);
    }catch(error){
      console.log("Failed to fetch booking by user", error);
    }
  }

  useEffect(() => {
    getBookingByUser();
  }, [])
  
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

  if (!userToken) {
    router.replace('/(auth)/login');
    return null;
  }

  if (!user || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3E64FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.logo}>BGear</Text>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push({ pathname: '/(home)/profile' })} 
          >
            <View style={styles.profileIcon}>
              <Text style={styles.profileInitial}>{user.name.charAt(0)}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>Hello, {user.name}</Text>
          <Text style={styles.subGreeting}>How can we help you today?</Text>
        </View>

        {activeOrder && !user.is_repairman && (
          <TouchableOpacity
            style={styles.trackCard}
            onPress={() => router.push({
              pathname: '/(repairman)/order-tracking',
              params: { orderId: activeOrder.id.toString() }
            })}
          >
            <LinearGradient
              colors={['#3E64FF', '#5E7CE2']}
              style={styles.trackCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.trackButtonContent}>
                <View style={styles.trackerIcon}>
                  <Icon name="navigate" size={24} color="white" />
                </View>
                <View style={styles.trackButtonText}>
                  <Text style={styles.trackButtonTitle}>Track Repairman</Text>
                  <Text style={styles.trackButtonSubtitle}>
                    {activeOrder.repairman?.user.name || 'Repairman'} is on the way
                  </Text>
                </View>
              </View>
              <Icon name="chevron-forward" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.cardsContainer}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.replace('../(repairman)/order-repairman')}
          >
            <View style={[styles.cardIcon, styles.repairmanIcon]}>
              <Icon name="construct" size={24} color="#3E64FF" />
            </View>
            <Text style={styles.cardTitle}>Order a Repairman</Text>
            <Text style={styles.cardDescription}>Get expert help for your vehicle at your location</Text>
            <View style={styles.cardAction}>
              <Text style={styles.cardActionText}>Order Now</Text>
              <Icon name="arrow-forward" size={16} color="#3E64FF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(shop)/book-shop')}
          >
            <View style={[styles.cardIcon, styles.shopIcon]}>
              <Icon name="business" size={24} color="#FF7D3B" />
            </View>
            <Text style={styles.cardTitle}>Book a Shop</Text>
            <Text style={styles.cardDescription}>Schedule a service at a repair shop near you</Text>
            <View style={styles.cardAction}>
              <Text style={styles.cardActionText}>Book Now</Text>
              <Icon name="arrow-forward" size={16} color="#3E64FF" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.professionalSection}>
          <Text style={styles.sectionTitle}>Professional Options</Text>
          <View style={styles.proButtonsContainer}>
            {user.is_repairman ? (
              <TouchableOpacity
                style={[styles.proButton, styles.repairmanButton]}
                onPress={() => router.push('../(dasboard)/repairman-dashboard')}
              >
                <Icon name="briefcase" size={20} color="#fff" />
                <Text style={styles.proButtonText}>Repairman Dashboard</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.proButton, styles.repairmanButton]}
                onPress={() => router.push('/create-repairman')}
              >
                <Icon name="person-add" size={20} color="#fff" />
                <Text style={styles.proButtonText}>Become a Repairman</Text>
              </TouchableOpacity>
            )}
            
            {user.has_shop ? (
              <TouchableOpacity
                style={[styles.proButton, styles.shopButton]}
                onPress={() => router.push('/shop-dashboard')}
              >
                <Icon name="analytics" size={20} color="#fff" />
                <Text style={styles.proButtonText}>Shop Dashboard</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.proButton, styles.shopButton]}
                onPress={() => router.push('/(home)/create-shop')}
              >
                <Icon name="storefront" size={20} color="#fff" />
                <Text style={styles.proButtonText}>Open a Shop</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
          
          {userHaveBooking && (
            <Card>

              <TouchableOpacity
                style={[styles.proButton, styles.shopButton]}
                onPress={() => router.push('/shop-dashboard')}
              >
                <Card.Title>Check your booking</Card.Title>
              </TouchableOpacity>
            </Card>
          )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3E64FF',
  },
  profileButton: {
    padding: 5,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3E64FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileInitial: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  greetingSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
  },
  subGreeting: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  trackCard: {
    marginHorizontal: 20,
    marginVertical: 15,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  trackCardGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  trackerIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
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
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: 4,
  },
  cardsContainer: {
    padding: 20,
  },
  actionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  repairmanIcon: {
    backgroundColor: 'rgba(62, 100, 255, 0.1)',
  },
  shopIcon: {
    backgroundColor: 'rgba(255, 125, 59, 0.1)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActionText: {
    color: '#3E64FF',
    fontWeight: '600',
    marginRight: 5,
  },
  professionalSection: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 15,
  },
  proButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  proButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  repairmanButton: {
    backgroundColor: '#3E64FF',
  },
  shopButton: {
    backgroundColor: '#FF7D3B',
  },
  proButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
});