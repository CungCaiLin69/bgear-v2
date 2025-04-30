import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Button, StyleSheet, Alert, Animated } from 'react-native';
import MapView, { Marker, Polyline, AnimatedRegion } from 'react-native-maps';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../utils/AuthProvider';
import { useSocket } from '../../utils/SocketProvider';
import * as Location from 'expo-location';
import { router } from 'expo-router';

type RootStackParamList = {
  TrackingScreen: { orderId: number };
  OrderRepairmanScreen: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TrackingScreen'>;
  route: {
    params: {
      orderId: number;
    };
  };
};

type LocationType = {
  latitude: number;
  longitude: number;
};

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}
  
function deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
}  

export default function TrackingScreen({ navigation, route }: Props) {
  const { userToken } = useAuth();
  const { socket } = useSocket();
  const AnimatedMarker = Animated.createAnimatedComponent(Marker);
  const { orderId } = route.params;

  const [repairmanLatitude] = useState(new Animated.Value(0));
  const [repairmanLongitude] = useState(new Animated.Value(0));
  const [hasStarted, setHasStarted] = useState(false);

  const [userLocation, setUserLocation] = useState<LocationType | null>(null);
  const [repairmanLocation, setRepairmanLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [isOrderCompleted, setIsOrderCompleted] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [markerRotation, setMarkerRotation] = useState(0);
  const [previousLocation, setPreviousLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  
  const ARRIVAL_DISTANCE_THRESHOLD = 0.02; // 20 meters (in km)

  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    fetchOrderInfo();
    startTrackingRepairman();
  }, []);

  const fetchOrderInfo = async () => {
    try {
      const res = await fetch(`http://10.0.2.2:3000/api/order/${orderId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();
      setOrderInfo(data.order);
      setUserLocation({
        latitude: data.order.locationLat,
        longitude: data.order.locationLng,
      });
    } catch (error) {
      console.error('Fetch order info error:', error);
    }
  };

  const startTrackingRepairman = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is needed');
      return;
    }

    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 10 },
      (location) => {
        const { latitude, longitude } = location.coords;
        setRepairmanLocation({ latitude, longitude });
        socket?.emit('repairmanLocationUpdate', { orderId, latitude, longitude });
    
        if (userLocation) {
          const distance = getDistanceFromLatLonInKm(
            latitude,
            longitude,
            userLocation.latitude,
            userLocation.longitude
          );
          if (distance <= ARRIVAL_DISTANCE_THRESHOLD) {
            setHasArrived(true);
          }
        }
      }
    );    
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }
  
      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);  

  useEffect(() => {
    if (!socket) return;

    console.log('Listening for tracking events...');

    // Listen to repairman's location updates
    socket.on('locationUpdate', (data: { orderId: number, lat: number, lng: number }) => {
        if (data.orderId === orderId) {
          console.log('Location update received:', data);
      
          if (!hasStarted) {
            repairmanLatitude.setValue(data.lat);
            repairmanLongitude.setValue(data.lng);
            setPreviousLocation({ latitude: data.lat, longitude: data.lng });
            setHasStarted(true);
          } else {
            // Calculate new bearing before animating
            if (previousLocation) {
              const bearing = calculateBearing(
                previousLocation.latitude,
                previousLocation.longitude,
                data.lat,
                data.lng
              );
              setMarkerRotation(bearing);
              setPreviousLocation({ latitude: data.lat, longitude: data.lng });
            }
          
            Animated.parallel([
              Animated.timing(repairmanLatitude, {
                toValue: data.lat,
                duration: 1000,
                useNativeDriver: false,
              }),
              Animated.timing(repairmanLongitude, {
                toValue: data.lng,
                duration: 1000,
                useNativeDriver: false,
              }),
            ]).start();
          }          
        }
      });

      useEffect(() => {
        if (userLocation && repairmanLatitude && repairmanLongitude && hasStarted) {
            const distance = getDistanceFromLatLonInKm(
                userLocation.latitude,
                userLocation.longitude,
                (repairmanLatitude as any).__getValue(),
                (repairmanLongitude as any).__getValue()
            );
              
          setDistanceKm(distance);
      
          if (distance <= ARRIVAL_DISTANCE_THRESHOLD) {
            setHasArrived(true);
          }
        }
      }, [userLocation, repairmanLatitude, repairmanLongitude, hasStarted]);
      

    // Listen to order finish
    socket.on('orderFinished', (data: { orderId: number }) => {
      console.log('Order finished:', data);
      if (data.orderId === orderId) {
        Alert.alert('Order Completed', 'Thank you for using our service!', [
          {
            text: 'OK',
            onPress: () => navigation.replace('OrderRepairmanScreen'),
          },
        ]);
        setIsOrderCompleted(true);
      }
    });

    return () => {
      socket.off('locationUpdate');
      socket.off('orderFinished');
    };
  }, [socket, orderId, navigation]);

  function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRadian = (deg: number) => (deg * Math.PI) / 180;
    const toDegree = (rad: number) => (rad * 180) / Math.PI;
  
    const dLon = toRadian(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRadian(lat2));
    const x = Math.cos(toRadian(lat1)) * Math.sin(toRadian(lat2)) -
              Math.sin(toRadian(lat1)) * Math.cos(toRadian(lat2)) * Math.cos(dLon);
    const brng = Math.atan2(y, x);
    return (toDegree(brng) + 360) % 360; 
  }  

  const cancelOrder = async () => {
    if (!userToken) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    try {
      const response = await fetch(`http://10.0.2.2:3000/order/cancel/${orderId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Cancel failed:', data.error);
        Alert.alert('Error', data.error || 'Failed to cancel order.');
        return;
      }

      console.log('Order cancelled:', data);
      navigation.replace('OrderRepairmanScreen');
    } catch (error) {
      console.error('Cancel error:', error);
      Alert.alert('Error', 'Something went wrong.');
    }
  };

  const finishOrder = async () => {
    if (!userToken) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }
  
    try {
      const response = await fetch(`http://10.0.2.2:3000/order/finish/${orderId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        console.error('Finish failed:', data.error);
        Alert.alert('Error', data.error || 'Failed to finish order.');
        return;
      }
  
      console.log('Order finished:', data);
      Alert.alert('Order Completed', 'Thank you for using our service!', [
        {
          text: 'OK',
          onPress: () => router.replace('/order-repairman'),
        },
      ]);
      setIsOrderCompleted(true);
    } catch (error) {
      console.error('Finish error:', error);
      Alert.alert('Error', 'Something went wrong.');
    }
  };  

  if (!userLocation || !repairmanLocation) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="blue" />
        <Text style={styles.text}>Tracking your repairman...</Text>
        <Button title="Cancel Order" onPress={cancelOrder} color="red" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
        <MapView style={{ flex: 1 }} initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
            }}
        >
        {userLocation && (
            <Marker
            coordinate={userLocation}
            title="You"
            pinColor="blue"
            />
        )}

        {hasStarted && (
            <Marker.Animated
            coordinate={{
              latitude: repairmanLatitude as any,
              longitude: repairmanLongitude as any,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            title="Repairman"
          >
            <View style={{ width: 50, height: 50, transform: [{ rotate: `${markerRotation}deg` }] }}>
              {/* <Image
                source={repairmanIcon}
                style={{ width: 50, height: 50, resizeMode: 'contain' }}
              /> */}
            </View>
          </Marker.Animated>          
        )}

        {userLocation && hasStarted && (
            <Polyline
            coordinates={[
                { latitude: userLocation.latitude, longitude: userLocation.longitude },
                {
                latitude: (repairmanLatitude as any).__getValue(),
                longitude: (repairmanLongitude as any).__getValue(),
                },
            ]}
            strokeColor="black"
            strokeWidth={4}
            />
        )}
        </MapView>

      {distanceKm !== null && (
        <Text style={styles.distanceText}>
            {distanceKm < 1
            ? `${Math.round(distanceKm * 1000)} meters away`
            : `${distanceKm.toFixed(2)} km away`}
        </Text>
        )}

        <View style={styles.bottomSheet}>
        {distanceKm !== null && (
            <Text style={styles.distanceText}>
            {distanceKm < 1
                ? `${Math.round(distanceKm * 1000)} meters away`
                : `${distanceKm.toFixed(2)} km away`}
            </Text>
        )}

        <Button title="Chat" onPress={() => router.push({ pathname: '/(repairman)/chat-repairman', params: { orderId } })} />

        {!hasArrived && !isOrderCompleted ? (
            <Button title="Cancel Order" onPress={cancelOrder} color="red" />
        ) : !isOrderCompleted ? (
            <Button title="Finish Order" onPress={finishOrder} color="green" />
        ) : (
            <Text style={{ fontSize: 18, color: 'green', textAlign: 'center' }}>
            Order Completed!
            </Text>
        )}
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 20,
  },
  text: {
    marginVertical: 20,
    fontSize: 18,
    textAlign: 'center',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  distanceText: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center',
    color: 'black',
  },  
});
