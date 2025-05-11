import { useLocalSearchParams, router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "@/src/utils/AuthProvider";
import NetInfo from "@react-native-community/netinfo";
import { useSocket } from "@/src/utils/SocketProvider";

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
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { shopId } = useLocalSearchParams();
  

  useEffect(() => {
    getShop();
    console.log("this is shop id:", shopId);
  }, [shopId, userToken]);

  useEffect(() => {
    console.log("Shop state updated:", shop);
  }, [shop]);

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <Text>Loading...</Text>
      ) : shop ? (
        <>
          <Text style={styles.title}>This is {shop.name}</Text>
          <TouchableOpacity 
          style={styles.submitButton}
          onPress={() => {
            router.push({
              pathname: '/(shop)/book-page',
              params: {
                shopId: shop.id
              }
            })
          }}>
            <Text style={styles.submitButtonText}>Book Shop</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text>No shop data available</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    marginVertical: 20,
    fontSize: 18,
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  submitButton: {
    borderRadius: 25,
    backgroundColor: "#00897B",
    alignItems: "center",
    padding: 16,
    marginTop: 8,
  },
});
