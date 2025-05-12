import { useAuth } from "@/src/utils/AuthProvider";
import { useSocket } from "@/src/utils/SocketProvider";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";


export default function BookingTrackingScreen(){
    const { user, userToken } = useAuth();
    const { socket } = useSocket();
    const params = useLocalSearchParams();
    const bookingId = Number(params.bookingId);
    const [isLoading, setIsLoading] = useState(true);
    const [bookingInfo, setBookingInfo] = useState<any>(null);

    useEffect(() => {
        if(!bookingId){
            Alert.alert("Error", "Booking ID is missing");
        }
        fetchBookingInfo();
    }, [bookingId])
      
    const fetchBookingInfo = async() => {
        setIsLoading(true);
        try{
            const response = await fetch(`http://10.0.2.2:3000/api/booking/${bookingId}`, {
                headers: { Authorization: `Bearer ${userToken}` },
            });
            const data = await response.json();
            
            setBookingInfo(data);
            setIsLoading(false);
        }catch(error){
            console.error("Fetch booking info error", error);
            setIsLoading(false);
            Alert.alert("Error", "Failed to load booking information");
        }
    }
      
    return(
        <View>
            <Text></Text>
        </View>
    )
}