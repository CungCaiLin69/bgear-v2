import React, { useEffect, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { useAuth } from "@/src/utils/AuthProvider";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  StatusBar,
  SafeAreaView,
  Dimensions,
  Share,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type Shop = {
  id: number;
  ownerId: string;
  name: string;
  location: string;
  services: string[];
  photos: string[];
  phoneNumber?: string;
};

export default function ShopDetailScreen() {
  const { userToken } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { shopId } = useLocalSearchParams();
  
  const windowWidth = Dimensions.get("window").width;

  useEffect(() => {
    getShop();
  }, [shopId, userToken]);

  const getShop = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://10.0.2.2:3000/api/get-shop-by-id/${shopId}`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      setShop(data);
    } catch (error) {
      console.error("Error fetching shop", error);
      Alert.alert(
        "Connection Error",
        "Unable to load shop details. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (shop?.phoneNumber) {
      Linking.openURL(`tel:${shop.phoneNumber}`);
    } else {
      Alert.alert("No Phone Number", "This shop doesn't have a phone number listed.");
    }
  };

  const handleShare = async () => {
    if (shop) {
      try {
        await Share.share({
          message: `Check out ${shop.name} at ${shop.location}. They offer ${shop.services.join(", ")}.`,
          title: `${shop.name} - Shop Details`,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    }
  };

  const renderImagePagination = () => {
    if (!shop?.photos || shop.photos.length <= 1) return null;
    
    return (
      <View style={styles.paginationContainer}>
        {shop.photos.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentImageIndex && styles.activePaginationDot,
            ]}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading shop details...</Text>
      </View>
    );
  }

  if (!shop) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ff6b6b" />
          <Text style={styles.errorTitle}>Shop Not Found</Text>
          <Text style={styles.errorMessage}>
            The shop you're looking for doesn't exist or has been removed.
          </Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Back to Shops</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header with back button and share */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {shop.name}
        </Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareIcon}>
          <Ionicons name="share-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Shop Images */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(
                event.nativeEvent.contentOffset.x / windowWidth
              );
              setCurrentImageIndex(newIndex);
            }}
          >
            {shop.photos && shop.photos.length > 0 ? (
              shop.photos.map((photo, index) => (
                <Image
                  key={index}
                  source={{ uri: photo }}
                  style={[styles.shopImage, { width: windowWidth }]}
                />
              ))
            ) : (
              <Image
                source={require("@/assets/images/mechanic-potrait.jpg")}
                style={[styles.shopImage, { width: windowWidth }]}
              />
            )}
          </ScrollView>
          {renderImagePagination()}
        </View>

        <View style={styles.contentContainer}>
          {/* Shop Name and Location */}
          <View style={styles.shopInfoContainer}>
            <Text style={styles.shopName}>{shop.name}</Text>
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={18} color="#666" />
              <Text style={styles.locationText}>{shop.location}</Text>
            </View>
            
            {shop.phoneNumber && (
              <TouchableOpacity style={styles.phoneContainer} onPress={handleCall}>
                <Ionicons name="call-outline" size={18} color="#0066CC" />
                <Text style={styles.phoneText}>{shop.phoneNumber}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Services Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Services</Text>
            <View style={styles.servicesContainer}>
              {shop.services.map((service, index) => (
                <View key={index} style={styles.serviceTag}>
                  <Text style={styles.serviceText}>{service}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* About Section - Placeholder since it's not in the data model */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.aboutText}>
              This is {shop.name}, a professional shop located in {shop.location}.
              We specialize in {shop.services.join(", ")}.
              Contact us to learn more about our services and offerings.
            </Text>
          </View>

          {/* Hours Section - Placeholder since it's not in the data model */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Hours</Text>
            <View style={styles.hoursContainer}>
              <View style={styles.hourRow}>
                <Text style={styles.dayText}>Monday - Friday</Text>
                <Text style={styles.timeText}>9:00 AM - 6:00 PM</Text>
              </View>
              <View style={styles.hourRow}>
                <Text style={styles.dayText}>Saturday</Text>
                <Text style={styles.timeText}>10:00 AM - 4:00 PM</Text>
              </View>
              <View style={styles.hourRow}>
                <Text style={styles.dayText}>Sunday</Text>
                <Text style={styles.timeText}>Closed</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Book Button Fixed at Bottom */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => {
            router.push({
              pathname: '/(shop)/book-page',
              params: {
                shopId: shop.id
              }
            });
          }}
        >
          <Text style={styles.bookButtonText}>Book Appointment</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e4e8",
  },
  backIcon: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  shareIcon: {
    padding: 8,
  },
  imageContainer: {
    position: "relative",
    height: 250,
  },
  shopImage: {
    height: 250,
    resizeMode: "cover",
  },
  paginationContainer: {
    flexDirection: "row",
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    marginHorizontal: 4,
  },
  activePaginationDot: {
    backgroundColor: "#fff",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  contentContainer: {
    padding: 16,
  },
  shopInfoContainer: {
    marginBottom: 24,
  },
  shopName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationText: {
    fontSize: 16,
    color: "#666",
    marginLeft: 6,
  },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  phoneText: {
    fontSize: 16,
    color: "#0066CC",
    marginLeft: 6,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  servicesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  serviceTag: {
    backgroundColor: "#e1f5fe",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 10,
    marginBottom: 10,
  },
  serviceText: {
    fontSize: 14,
    color: "#0277bd",
  },
  aboutText: {
    fontSize: 16,
    color: "#555",
    lineHeight: 24,
  },
  hoursContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  hourRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  dayText: {
    fontSize: 15,
    color: "#333",
  },
  timeText: {
    fontSize: 15,
    color: "#666",
  },
  bottomContainer: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#e1e4e8",
  },
  bookButton: {
    backgroundColor: "#0066CC",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
  },
  bookButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: "#0066CC",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});