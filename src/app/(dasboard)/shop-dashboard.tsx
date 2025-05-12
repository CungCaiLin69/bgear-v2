import { useAuth } from "@/src/utils/AuthProvider";
import { useSocket } from "@/src/utils/SocketProvider";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Button, Alert, SafeAreaView, StatusBar, ActivityIndicator } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

type PendingBooking = {
    bookingId: number,
    userId: number,
    datetime: Date,
    issue: string
}

export type Shop = {
    id: number;
    ownerId: string;
    name: string;
    location: string;
    services: string[];
    photos: string[];
    phoneNumber?: string;
  };

export default function ShopDashboardScreen( { navigation }: any) {
    const { userToken } = useAuth();
    const { socket, isConnected } = useSocket();
    const [pendingBooking, setPendingBooking] = useState<PendingBooking[]>([])
    const [acceptingBookingId, setAcceptingBookingId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<"ongoing" | "history">("ongoing");
    const [shopId, setShopId] = useState(null)
    const [isLoading, setisLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [ongoingBookings, setOngoingBookings] = useState<any[]>([]);
    const [completedBookings, setCompletedBookings] = useState<any[]>([]);

    useEffect(() => {
        if(!socket){
            console.log("No socket available");
            return;
        }

        //Listen to new incoming bookings
        socket.on('newBookingRequest', (newBooking) => {
            console.log("new incoming booking:", newBooking);

            const booking = Array.isArray(newBooking) ? newBooking : [newBooking];
            const enriched = booking.map(booking => ({
                ...booking,
            }));

            setPendingBooking(prev => [
                ...prev,
                ...enriched
            ]);
        });

        //listen for rejected bookings
        socket.on("bookingRejected", ({bookingId}) => {
            setPendingBooking(prev => prev.filter(booking => booking.bookingId !== bookingId));
        });

        //listen for accepted bookings
        socket.on("bookingAccepted", ({bookingId}) => {
            setPendingBooking(prev => prev.filter(booking => booking.bookingId !== bookingId));
        })

        return() => {
            socket.off('newBookingRequest');
            socket.off("bookingRejected");
            socket.off("bookingAccepted");
        }
    }, [socket, isConnected])

    useEffect(() => {
        fetchBookings();
        const refreshInterval = setInterval(fetchBookings, 30000);
        return () => clearInterval(refreshInterval);
    }, []);


    const fetchBookings = async () => {
        try{
            const response = await fetch('http://10.0.2.2:3000/api/shop/bookings', {
                headers: {
                    Authorization: `Bearer ${userToken}`,
                },
            })
            const data = await response.json();
            console.log("this is the bookings: ", data);

            const ongoing = data.booking.filter((booking:any) => 
            booking.status ==="accepted");

            const completed = data.booking.filter((booking: any) => 
            ['completed', 'finished', 'rejected', 'canceled'].includes(booking.status));

            setOngoingBookings(ongoing);
            setCompletedBookings(completed);
        }
        catch(error){
            console.error("Failed to fetch shop bookings:", error)
        }finally{
            setisLoading(false);
            setIsRefreshing(false);
        }
    }

    const acceptBooking = async (bookingId: number) => {
        if(acceptingBookingId !== null){
            return;
        }
        setAcceptingBookingId(bookingId);

        try{
            const response = await fetch(`http://10.0.2.2:3000/order/accept/${bookingId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if(!response.ok){
                throw new Error(data.error || "Failed to accept order");
            }

            socket?.emit('acceptBooking', {bookingId});

            setPendingBooking(prev => prev.filter(booking => booking.bookingId !== bookingId));

            await fetchBookings();

            router.push({pathname: "/(home)/home"})
        }catch(error){
            console.error("Failed to accept booking:", error);
            Alert.alert("Error", "Failed to accept booking. Please try again");
        }finally{
            setAcceptingBookingId(null);
        }
    }

    const rejectBooking = async (bookingId: number) => {
        try{
            const response = await fetch(`http://10.0.2.2:3000/booking/reject/${bookingId}`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if(!response.ok){
                throw new Error(data.error || "Failed to reject booking");
            }

            socket?.emit("rejectBooking", {bookingId});

            setPendingBooking(prev => prev.filter(booking => booking.bookingId != bookingId));
        }catch(error){
            console.error("Failed to reject booking:", error);
            Alert.alert("Error", "Failed to reject booking. Please try again");
        }
    }

    const renderPendingItem = ({ item }: {item: PendingBooking}) => (
        <View style={styles.bookingCard}>
            <Text style={styles.bookingTitle}>New Bookings</Text>
            <Text>Issue: {item.issue}</Text>
            <Text>Booking Date: {(item.datetime).toString()}</Text>

            <View style={styles.buttonRow}>
                <TouchableOpacity 
                style={[styles.actionButton, styles.rejectButton]} 
                onPress={() => rejectBooking(item.bookingId)}
                >
                <Icon name="close" size={20} color="#fff" />
                <Text style={styles.buttonText}>Decline</Text>
                </TouchableOpacity> 

                <TouchableOpacity 
                    style={[
                    styles.actionButton, 
                    styles.acceptButton,
                    acceptingBookingId !== null && styles.disabledButton
                    ]} 
                    onPress={() => acceptBooking(item.bookingId)}
                    disabled={acceptingBookingId !== null}
                >
                    <Icon name="checkmark" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Accept</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderOngoingHistoryItem = ({item}: {item: any}) => (
        <TouchableOpacity 
            style={styles.historyCard}
            onPress={() => {
                if(activeTab === "ongoing"){
                    router.push({
                    pathname: "/(shop)/booking-tracking",
                    params: {bookingId: item.id}
                })
                }
            }}
            >
            <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{item.status}</Text>
            </View>

            <View style={styles.historyDetails}>
                <View style={styles.detailRow}>
                    <Text style={styles.historyDetailText}>{item.issue}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.historyDetailText}>{item.datetime}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    if(!isLoading && isRefreshing){
        return(
            <SafeAreaView style={styles.loadingContainer}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
            </SafeAreaView>
        )
    }

    return (
    <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

        <LinearGradient
        colors={['#f8f9fa', '#ffffff']}
        style={styles.headerGradient}
        >
            <TouchableOpacity
                onPress={() => router.replace('/(home)/home')}
                style={styles.backButton}
            >
                <Icon name="arrow-back" size={22} color="#333" />
            </TouchableOpacity>

            <Text style={styles.header}>Dashboard</Text>
            
            <View style={styles.headerButtons}>
                <TouchableOpacity 
                style={styles.editButton}
                onPress={() => router.push({ pathname: '/edit-shop' })} 
                >
                <Icon name="settings-outline" size={22} color="#333" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                style={styles.refreshButton}
                onPress={fetchBookings}
                >
                <Icon name={isRefreshing ? 'sync-circle' : 'refresh'} size={22} color="#333" />
                </TouchableOpacity>
            </View>
        </LinearGradient>

        {!isConnected && (
        <View style={styles.connectionWarning}>
            <Icon name="warning-outline" size={16} color="#FFA000" />
            <Text style={styles.connectionWarningText}>
            Not connected to service. Bookings may not appear.
            </Text>
        </View>
        )}

        <View style={styles.content}>
            {pendingBooking.length > 0 && (
                <>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Incoming Booking</Text>
                        <View style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>{pendingBooking.length}</Text>
                        </View>
                    </View>
                    
                    <FlatList
                        data={pendingBooking}
                        keyExtractor={(item) => `pending-order-${item.bookingId}-${Date.now()}`}
                        renderItem={renderPendingItem}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.pendingBookingContainer}
                    />
                </>
            )}

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>My Bookings</Text>
            </View>

            <View style={styles.tabRow}>
                <TouchableOpacity
                style={[styles.tabButton, activeTab === 'ongoing' && styles.activeTab]}
                onPress={() => setActiveTab('ongoing')}
                >
                <Text style={[styles.tabText, activeTab === 'ongoing' && styles.activeTabText]}>
                    Ongoing
                </Text>
                </TouchableOpacity>
    
                <TouchableOpacity
                style={[styles.tabButton, activeTab === 'history' && styles.activeTab]}
                onPress={() => setActiveTab('history')}
                >
                <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
                    History
                </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={activeTab === 'ongoing' ? ongoingBookings : completedBookings}
                keyExtractor={(item) => `${activeTab}-order-${item.id}-${Date.now()}`}
                renderItem={renderOngoingHistoryItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                    {activeTab === 'ongoing'}
                    </Text>
                </View>
                }
            />
        </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: 'gray'
  },
  bookingCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  },
  bookingTitle: {
    fontSize: 18, 
    fontWeight: 'bold',
    marginBottom: 5
  },
  buttonWrapper: {
    flex: 1,
    marginHorizontal: 5
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 15
  },
  editButton: {
    backgroundColor: '#FFA500',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
    actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  acceptButton: {
    backgroundColor: '#2ecc71',
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
    historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  historyDetails: {
    marginBottom: 6,
  },
  historyDetailText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#777',
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
    loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7f8c8d',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
    headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eaecef',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
    connectionWarningText: {
    color: '#E65100',
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  connectionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000'
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  pendingBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  pendingBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pendingBookingContainer: {
    paddingBottom: 16,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#eaecef',
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabText: {
    color: '#7f8c8d',
    fontWeight: '500',
  },
  listContainer: {
    paddingBottom: 24,
  },
 activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  activeTabText: {
    color: '#2c3e50',
    fontWeight: '600',
  },
});
