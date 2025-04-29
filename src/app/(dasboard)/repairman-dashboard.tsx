import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useSocket } from '../../utils/SocketProvider';
import { useAuth } from '../../utils/AuthProvider';
import Icon from 'react-native-vector-icons/Ionicons';
import { router } from 'expo-router';

type PendingOrder = {
  orderId: number;
  address: string;
  vehicleType: string;
  complaint: string;
  locationLat: number;
  locationLng: number;
  timeout: number; 
};

export default function RepairmanDashboardScreen({ navigation }: any) {
  const { userToken } = useAuth();
  const { socket } = useSocket();

  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [acceptingOrderId, setAcceptingOrderId] = useState<number | null>(null);
  const [ongoingOrders, setOngoingOrders] = useState<any[]>([]);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ongoing' | 'history'>('ongoing');


  useEffect(() => {
    if (!socket) return;

    // Listen to new incoming orders
    socket.on('newOrderRequest', (newOrder) => {
      console.log('New incoming order:', newOrder);

      setPendingOrders(prev => [
        ...prev,
        { ...newOrder, timeout: 60 } 
      ]);
    });

    return () => {
      socket.off('newOrderRequest');
    };
  }, [socket]);

  // Countdown timers for each pending order
  useEffect(() => {
    const interval = setInterval(() => {
      setPendingOrders(prevOrders =>
        prevOrders
          .map(order => ({ ...order, timeout: order.timeout - 1 }))
          .filter(order => order.timeout > 0) // Remove if timeout hits 0
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const acceptOrder = (orderId: number) => {
    if (acceptingOrderId !== null) {
      console.log('Already accepting another order, blocked.');
      return;
    }
  
    setAcceptingOrderId(orderId);
  
    socket?.emit('acceptOrder', { orderId });
  
    setPendingOrders(prev => prev.filter(order => order.orderId !== orderId));
  
    navigation.navigate('TrackingScreen', { orderId });
  
    setAcceptingOrderId(null); 
  };

  useEffect(() => {
    fetchOrders();
  }, []);
  
  const fetchOrders = async () => {
    try {
      const res = await fetch('http://10.0.2.2:3000/api/repairman/orders', {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });
      const data = await res.json();
  
      const ongoing = data.orders.filter((order: any) =>
        order.status === 'accepted' || order.status === 'on_the_way'
      );
      const completed = data.orders.filter((order: any) =>
        order.status === 'completed' || order.status === 'finished'
      );
  
      setOngoingOrders(ongoing);
      setCompletedOrders(completed);
    } catch (error) {
      console.error('Failed to fetch repairman orders:', error);
    }
  };  

  const rejectOrder = (orderId: number) => {
    socket?.emit('rejectOrder', { orderId });
    setPendingOrders(prev => prev.filter(order => order.orderId !== orderId));
  };

  const renderItem = ({ item }: { item: PendingOrder }) => (
    <View style={styles.orderCard}>
      <Text style={styles.orderTitle}>New Order</Text>
      <Text>Address: {item.address}</Text>
      <Text>Vehicle: {item.vehicleType}</Text>
      <Text>Complaint: {item.complaint}</Text>
      <Text style={styles.timeoutText}>⏳ {item.timeout} seconds left</Text>

      <View style={styles.buttonRow}>
        <View style={styles.buttonWrapper}>
        <Button
            title="Accept"
            onPress={() => acceptOrder(item.orderId)}
            color="green"
            disabled={acceptingOrderId !== null && acceptingOrderId !== item.orderId}
        />
        </View>
        <View style={styles.buttonWrapper}>
          <Button title="Reject" onPress={() => rejectOrder(item.orderId)} color="red" />
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>

      <TouchableOpacity
        onPress={() => router.replace('/(home)/home')}
          style={{
              position: 'absolute',
              top: 50, 
              left: 20,
              zIndex: 10,
              backgroundColor: '#EEE' ,
              padding: 8,
              borderRadius: 20,
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 5,
            }}
          >
        <Icon name="arrow-back" size={24} color="black" />
      </TouchableOpacity>

      <Text style={styles.header}>Repairman Dashboard</Text>

      {pendingOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No incoming orders</Text>
        </View>
      ) : (
        <FlatList
          data={pendingOrders}
          keyExtractor={(item) => item.orderId.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'ongoing' && styles.activeTab]}
          onPress={() => setActiveTab('ongoing')}
        >
          <Text style={styles.tabText}>Ongoing</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={styles.tabText}>History</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === 'ongoing' ? ongoingOrders : completedOrders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.orderCard}>
            <Text style={styles.orderTitle}>{item.vehicleType.toUpperCase()}</Text>
            <Text>Address: {item.address}</Text>
            <Text>Complaint: {item.complaint}</Text>
            <Text>Status: {item.status}</Text>

            {activeTab === 'ongoing' && (
              <Button
                title="Go to Tracking"
                onPress={() => navigation.navigate('TrackingScreen', { orderId: item.id })}
              />
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  // orderCard: {
  //   backgroundColor: '#f9f9f9',
  //   padding: 20,
  //   borderRadius: 12,
  //   marginBottom: 15,
  //   elevation: 3,
  // },
  // orderTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  timeoutText: { marginTop: 10, color: 'red', fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', marginTop: 15 },
  buttonWrapper: { flex: 1, marginHorizontal: 5 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, color: 'gray' },
  tabRow: { flexDirection: 'row', marginBottom: 10 },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
    borderRadius: 10,
    marginHorizontal: 5,
  },
  activeTab: {
    backgroundColor: '#4287f5',
  },
  tabText: {
    color: '#000',
    fontWeight: 'bold',
  },
  orderCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  },
  orderTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
});
