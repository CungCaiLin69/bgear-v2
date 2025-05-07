import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  ActivityIndicator, 
  StyleSheet, 
  Alert,
  Animated,
  Image,
  TouchableOpacity 
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useAuth } from '../../utils/AuthProvider';
import { useSocket } from '../../utils/SocketProvider';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import Icon from 'react-native-vector-icons/Ionicons';
import Icons from 'react-native-vector-icons/Entypo';

type LocationType = {
  latitude: number;
  longitude: number;
};

type RouteCoordinate = {
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

// Function to fetch route coordinates from OSRM
async function getRouteFromOSRM(startLat: number, startLng: number, endLat: number, endLng: number): Promise<RouteCoordinate[]> {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
    );
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      // OSRM returns coordinates as [longitude, latitude], so we need to swap them
      return data.routes[0].geometry.coordinates.map((coord: [number, number]) => ({
        latitude: coord[1],
        longitude: coord[0]
      }));
    }
    console.log('No routes found or empty routes array returned');
    return [];
  } catch (error) {
    console.error('Error fetching route from OSRM:', error);
    return [];
  }
}

export default function TrackingScreen() {
  const { user, userToken } = useAuth();
  const { socket } = useSocket();
  const params = useLocalSearchParams();
  const orderId = Number(params.orderId);

  const [repairmanLatitude] = useState(new Animated.Value(0));
  const [repairmanLongitude] = useState(new Animated.Value(0));
  const [hasStarted, setHasStarted] = useState(false);

  const [userLocation, setUserLocation] = useState<LocationType | null>(null);
  const [repairmanLocation, setRepairmanLocation] = useState<LocationType | null>(null);
  const [isOrderCompleted, setIsOrderCompleted] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [markerRotation, setMarkerRotation] = useState(0);
  const [previousLocation, setPreviousLocation] = useState<LocationType | null>(null);
  const [repairmanInfo, setRepairmanInfo] = useState<any>(null);
  const [repairmanSkills, setRepairmanSkills] = useState<string[]>([]);
  const [repairmanServices, setRepairmanServices] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinate[]>([]);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  
  const ARRIVAL_DISTANCE_THRESHOLD = 0.02; // 20 meters (in km)
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!orderId) {
      Alert.alert('Error', 'Order ID is missing');
      return;
    }
    
    fetchOrderInfo();
    if (user?.is_repairman) {
      startTrackingRepairman();
    }
  }, [orderId, user?.is_repairman]);

  const fetchOrderInfo = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`http://10.0.2.2:3000/api/order/${orderId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();
      setOrderInfo(data.order);
      
      // Set locations based on user role
      if (user?.is_repairman) {
        // Repairman sees customer's input location
        setUserLocation({
          latitude: data.order.locationLat,
          longitude: data.order.locationLng,
        });
      } else {
        // Customer sees repairman's current location
        setUserLocation({
          latitude: data.order.locationLat,
          longitude: data.order.locationLng,
        });
        if (data.order.repairmanId) {
          await fetchRepairmanInfo(data.order.repairmanId);
        }
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Fetch order info error:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to load order information');
    }
  };

  const fetchRepairmanInfo = async (repairmanId: string) => {
    try {
      console.log('Fetching repairman info for:', repairmanId);
      const res = await fetch(`http://10.0.2.2:3000/api/users/${repairmanId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Server responded with:', errorText);
        throw new Error(`Server error: ${res.status}`);
      }
  
      const data = await res.json();
      console.log('Repairman data received:', data.user);
      setRepairmanInfo(data.user);
      
      if (data.user.Repairman) {
        setRepairmanSkills(data.user.Repairman.skills || []);
        setRepairmanServices(data.user.Repairman.servicesProvided || []);
      }
    } catch (error) {
      console.error('Fetch repairman info error:', error);
      Alert.alert('Error', 'Failed to load repairman information');
    }
  };

  // Function to update route based on current locations
  const updateRoute = async () => {
    if (!userLocation || !repairmanLocation) return;
    
    setIsRouteLoading(true);
    try {
      const coordinates = await getRouteFromOSRM(
        repairmanLocation.latitude,
        repairmanLocation.longitude,
        userLocation.latitude,
        userLocation.longitude
      );
      
      if (coordinates.length > 0) {
        setRouteCoordinates(coordinates);
        
        // Automatically adjust map to show the entire route
        if (mapRef.current && coordinates.length > 1) {
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 100, right: 100, bottom: 200, left: 100 },
            animated: true,
          });
        }
      } else {
        // Fallback to direct line if route cannot be calculated
        setRouteCoordinates([repairmanLocation, userLocation]);
      }
    } catch (error) {
      console.error('Error updating route:', error);
      // Fallback to direct line
      setRouteCoordinates([repairmanLocation, userLocation]);
    } finally {
      setIsRouteLoading(false);
    }
  };

  // Update route when locations change
  useEffect(() => {
    if (userLocation && repairmanLocation) {
      updateRoute();
    }
  }, [userLocation, repairmanLocation]);

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
        socket?.emit('repairmanLocationUpdate', { 
          orderId, 
          latitude, 
          longitude 
        });
    
        if (userLocation) {
          const distance = getDistanceFromLatLonInKm(
            latitude,
            longitude,
            userLocation.latitude,
            userLocation.longitude
          );
          setDistanceKm(distance);
          if (distance <= ARRIVAL_DISTANCE_THRESHOLD) {
            setHasArrived(true);
          }
        }
      }
    );    
  };

  useEffect(() => {
    if (!socket || !orderId) return;

    // Join the order-specific room for real-time updates
    socket.emit('joinOrderRoom', { orderId });

    const locationHandler = (data: { orderId: number, lat: number, lng: number }) => {
      if (data.orderId === orderId && !user?.is_repairman) {
        // Customer receives repairman location updates
        const newLocation = { latitude: data.lat, longitude: data.lng };
        
        if (!hasStarted) {
          repairmanLatitude.setValue(data.lat);
          repairmanLongitude.setValue(data.lng);
          setPreviousLocation(newLocation);
          setRepairmanLocation(newLocation);
          setHasStarted(true);
        } else {
          if (previousLocation) {
            const bearing = calculateBearing(
              previousLocation.latitude,
              previousLocation.longitude,
              data.lat,
              data.lng
            );
            setMarkerRotation(bearing);
            setPreviousLocation(newLocation);
          }
        
          // Animate marker movement
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
          
          // Update actual location state
          setRepairmanLocation(newLocation);
        }
      }
    };

    socket.on('locationUpdate', locationHandler);

    // Handle order cancellation
    const orderCancelledHandler = (data: { orderId: number }) => {
      if (data.orderId === orderId) {
        Alert.alert('Order Cancelled', 'This order has been cancelled.', [
          {
            text: 'OK',
            onPress: () => router.replace(user?.is_repairman ? '/order-repairman' : '/'),
          },
        ]);
      }
    };

    // Handle order completion
    const orderCompletedHandler = (data: { orderId: number }) => {
      if (data.orderId === orderId) {
        setIsOrderCompleted(true);
        Alert.alert('Order Completed', 'Thank you for using our service!', [
          {
            text: 'OK',
            onPress: () => router.replace(user?.is_repairman ? '/order-repairman' : '/'),
          },
        ]);
      }
    };

    socket.on('orderCancelled', orderCancelledHandler);
    socket.on('orderCanceled', orderCancelledHandler); 
    socket.on('orderCompleted', orderCompletedHandler);

    return () => {
      socket.off('locationUpdate', locationHandler);
      socket.off('orderCancelled', orderCancelledHandler);
      socket.off('orderCanceled', orderCancelledHandler);
      socket.off('orderCompleted', orderCompletedHandler);
    };
  }, [socket, orderId, hasStarted, previousLocation, user?.is_repairman]);

  // Update distance calculation when location changes
  useEffect(() => {
    if (userLocation && repairmanLocation) {
      const distance = getDistanceFromLatLonInKm(
        userLocation.latitude,
        userLocation.longitude,
        repairmanLocation.latitude,
        repairmanLocation.longitude
      );
          
      setDistanceKm(distance);
  
      if (distance <= ARRIVAL_DISTANCE_THRESHOLD) {
        setHasArrived(true);
      }
    }
  }, [userLocation, repairmanLocation]);

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

    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes', 
          style: 'destructive',
          onPress: async () => {
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

              setTimeout(() => {
                router.replace('/');
              }, 1000);
            } catch (error) {
              console.error('Cancel error:', error);
              Alert.alert('Error', 'Something went wrong.');
            }
          }
        }
      ]
    );
  };

  const finishOrder = async () => {
    if (!userToken) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }
  
    Alert.alert(
      'Finish Order',
      'Are you sure the service is complete?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
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
          
              setIsOrderCompleted(true);
              // Socket will handle navigation, but as a fallback:
              setTimeout(() => {
                router.replace(user?.is_repairman ? '/' : '/order-repairman');
              }, 1000);
            } catch (error) {
              console.error('Finish error:', error);
              Alert.alert('Error', 'Something went wrong.');
            }
          }
        }
      ]
    );
  };  

  const recenterMap = () => {
    if (mapRef.current && routeCoordinates.length > 0) {
      mapRef.current.fitToCoordinates(routeCoordinates, {
        edgePadding: { top: 100, right: 100, bottom: 200, left: 100 },
        animated: true,
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="blue" />
        <Text style={styles.text}>Loading tracking information...</Text>
      </View>
    );
  }

  // Check if necessary data is loaded
  if (!userLocation || (user?.is_repairman ? false : !hasStarted && !repairmanInfo)) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="blue" />
        <Text style={styles.text}>Waiting for location updates...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView 
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {/* Customer Marker (shown for repairman) */}
        {user?.is_repairman && userLocation && (
          <Marker
            coordinate={userLocation}
            title="Customer Location"
            description={orderInfo?.address || "Customer's location"}
          >
            <View style={styles.customerMarker}>
              <Icon name="person" size={24} color="white" />
            </View>
          </Marker>
        )}

        {/* Repairman Marker (animated for customer) */}
        {!user?.is_repairman && hasStarted && (
          <Marker.Animated
            coordinate={{
              latitude: repairmanLatitude as any,
              longitude: repairmanLongitude as any,
            }}
            title={repairmanInfo?.name || "Repairman"}
            description={repairmanSkills.join(', ')}
          >
            <View style={[styles.repairmanMarker, { transform: [{ rotate: `${markerRotation}deg` }]}]}>
              <Icons name="tools" size={24} color="white" />
            </View>
          </Marker.Animated>
        )}

        {/* Repairman Marker (static for repairman's own view) */}
        {user?.is_repairman && repairmanLocation && (
          <Marker
            coordinate={repairmanLocation}
            title="Your Location"
          >
            <View style={styles.repairmanMarker}>
              <Icon name="mechanic" size={24} color="white" />
            </View>
          </Marker>
        )}

        {/* Route Polyline - using OSRM data */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#4285F4"
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        )}
      </MapView>

      {/* Recenter Button */}
      <TouchableOpacity 
        style={styles.recenterButton}
        onPress={recenterMap}
      >
        <Icon name="locate" size={24} color="white" />
      </TouchableOpacity>

      {/* Route Loading Indicator */}
      {isRouteLoading && (
        <View style={styles.routeLoadingContainer}>
          <ActivityIndicator size="small" color="blue" />
          <Text style={styles.routeLoadingText}>Calculating route...</Text>
        </View>
      )}

      {/* Distance Indicator */}
      {distanceKm !== null && (
        <View style={styles.distanceContainer}>
          <Text style={styles.distanceText}>
            {distanceKm < 1
              ? `${Math.round(distanceKm * 1000)} meters away`
              : `${distanceKm.toFixed(2)} km away`}
          </Text>
          {!isRouteLoading && routeCoordinates.length > 0 && (
            <Text style={styles.etaText}>
              ETA: ~{Math.ceil(distanceKm * 2)} min
            </Text>
          )}
        </View>
      )}

      {/* User Details Panel */}
      <View style={styles.userDetailsContainer}>
        <View style={styles.userInfo}>
          {/* Profile Picture */}
          {user?.is_repairman ? (
            <View style={[styles.profileImage, styles.profilePlaceholder]}>
              <Icon name="person" size={24} color="white" />
            </View>
          ) : repairmanInfo?.profilePicture ? (
            <Image 
              source={{ uri: repairmanInfo.profilePicture }} 
              style={styles.profileImage}
            />
          ) : (
            <View style={[styles.profileImage, styles.profilePlaceholder]}>
              <Icon name="build" size={24} color="white" />
            </View>
          )}
          
          <View style={styles.userText}>
            {/* Name */}
            <Text style={styles.userName}>
              {user?.is_repairman ? 
                `Customer: ${orderInfo?.user?.name || 'Unknown'}` : 
                `Repairman: ${repairmanInfo?.name || 'Loading...'}`
              }
            </Text>
            
            {/* Details */}
            <Text style={styles.userDetail}>
              {user?.is_repairman 
                ? `Address: ${orderInfo?.address || 'Unknown'}`
                : `Vehicle: ${orderInfo?.vehicleType || 'Unknown'}`}
            </Text>
            
            {/* Show repairman skills to customer */}
            {!user?.is_repairman && repairmanSkills.length > 0 && (
              <Text style={styles.userDetail}>
                Skills: {repairmanSkills.join(', ')}
              </Text>
            )}
            
            {/* Show repairman services to customer */}
            {!user?.is_repairman && repairmanServices.length > 0 && (
              <Text style={styles.userDetail}>
                Services: {repairmanServices.join(', ')}
              </Text>
            )}
            
            {/* Show phone number to both parties */}
            {!user?.is_repairman && repairmanInfo?.phoneNumber && (
              <Text style={styles.userDetail}>
                Phone: {repairmanInfo.phoneNumber}
              </Text>
            )}
            
            {/* Issue description */}
            <Text style={styles.userDetail}>
              Issue: {orderInfo?.complaint || 'Not specified'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => router.push(`/chat-repairman?orderId=${orderId}`)}
          >
            <Icon name="chatbubble" size={24} color="white" />
            <Text style={styles.chatButtonText}>Chat</Text>
          </TouchableOpacity>
          
          {!hasArrived && !isOrderCompleted ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                user?.is_repairman ? styles.arrivedButton : styles.cancelButton
              ]}
              onPress={user?.is_repairman ? () => setHasArrived(true) : cancelOrder}
            >
              <Text style={styles.actionButtonText}>
                {user?.is_repairman ? "I've Arrived" : "Cancel Order"}
              </Text>
            </TouchableOpacity>
          ) : !isOrderCompleted ? (
            <TouchableOpacity
              style={styles.finishButton}
              onPress={finishOrder}
            >
              <Text style={styles.actionButtonText}>Finish Order</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.completedContainer}>
              <Icon name="checkmark-circle" size={24} color="green" />
              <Text style={styles.completedText}>Order Completed!</Text>
            </View>
          )}
        </View>
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
  customerMarker: {
    backgroundColor: '#4285F4',
    padding: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repairmanMarker: {
    backgroundColor: '#EA4335',
    padding: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  distanceContainer: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  distanceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  etaText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  userDetailsContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  profilePlaceholder: {
    backgroundColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userText: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  chatButton: {
    flexDirection: 'row',
    backgroundColor: '#34A853',
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 10,
  },
  chatButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  actionButton: {
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  arrivedButton: {
    backgroundColor: '#FBBC05',
  },
  cancelButton: {
    backgroundColor: '#EA4335',
  },
  finishButton: {
    backgroundColor: '#34A853',
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  completedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  completedText: {
    fontSize: 18,
    color: 'green',
    marginLeft: 8,
  },
  recenterButton: {
    position: 'absolute',
    top: 85,
    right: 20,
    backgroundColor: '#4285F4',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  routeLoadingContainer: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeLoadingText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#333',
  },
})