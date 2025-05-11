import { useAuth } from "@/src/utils/AuthProvider";
import { useSocket } from "@/src/utils/SocketProvider";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Button } from "react-native";
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
    const { socket } = useSocket();
    const [pendingBooking, setPendingBooking] = useState<PendingBooking[]>([])
    const [acceptingBookingId, setAcceptingBookingId] = useState<number | null>(null);
    const [shopId, setShopId] = useState(null)
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if(!socket) return;

        //Listen to new incoming bookings
        socket.on('newBookingRequest', (newBooking) => {
            console.log("new incoming booking:", newBooking);

            setPendingBooking(prev => [
                ...prev,
                {...newBooking}
            ]);
        });

        return() => {
            socket.off('newBookingRequest');
        }
    }, [socket])

    useEffect(() => {
        fetchBookings();
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
        }
        catch(error){
            console.error("Failed to fetch shop bookings:", error)
        }
    }

    const acceptBooking = (bookingId: number) => {
        setAcceptingBookingId(bookingId);

        socket?.emit('acceptBooking', { bookingId })

        setPendingBooking(prev => prev.filter(booking => booking.bookingId !== bookingId));

        navigation.navigate('HomePage');

        setAcceptingBookingId(null);
    }

    const rejectBooking = (bookingId: number) => {
        socket?.emit('rejectBooking', {bookingId});
        setPendingBooking(prev => prev.filter(booking => booking.bookingId !== bookingId));
    }

    const renderItem = ({ item }: {item: PendingBooking}) => (
        <View style={styles.bookingCard}>
            <Text style={styles.bookingTitle}>New Bookings</Text>
            <Text>Issue: {item.issue}</Text>
            <Text>Booking Date: {(item.datetime).toString()}</Text>

            <View style={styles.buttonRow}>
                <View style={styles.buttonWrapper}>
                    <Button
                        title="Accept"
                        onPress={() => acceptBooking(item.bookingId)}
                        color="green"
                        disabled={acceptingBookingId !== null && acceptingBookingId !== item.bookingId}
                    />
                </View>
                <View style={styles.buttonWrapper}>
                    <Button title="Reject" onPress={() => rejectBooking(item.bookingId)} color="red" />
                </View>
            </View>
        </View>
    );

    return (
    <View style={styles.container}>
        <TouchableOpacity
        onPress={() => router.replace("/(home)/home")}
        style={{
            position: "absolute",
            top: 50,
            left: 20,
            zIndex: 10,
            backgroundColor: "#EEE",
            padding: 8,
            borderRadius: 20,
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 5,
        }}
        >
        <Icon name="arrow-back" size={24} color="black" />
        </TouchableOpacity>

        
        <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('/(home)/edit-shop')}
        >
            <Text style={styles.editButtonText}>Edit Shop Kontol</Text>
        </TouchableOpacity>
        
        {pendingBooking.length === 0 ? (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No incoming shop bookings.</Text>
            </View>    
        ) : (
            <FlatList
                data={pendingBooking}
                keyExtractor={(item) => item.bookingId.toString()}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: 20 }}
            />
        )}
    </View>
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
});
