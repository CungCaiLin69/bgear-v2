import { useAuth } from "@/src/utils/AuthProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Card, Button } from "@rneui/themed";
import { router, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

const API_URL = 'http://10.0.2.2:3000/api/get-all-shop';

export type Shop = {
  id: number;
  ownerId: string;
  name: string;
  location: string;
  services: string[];
  photos: string[];
  phoneNumber?: string;
};

export default function BookShopScreen() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();
  const { getAllShop } = useAuth();

  useEffect(() => {
    const fetchShops = async () =>{
      try{
        const shopsData = await getAllShop();
        setShops(shopsData);
        console.log("this is shops: ", shops)
      } catch (error){
        console.error("Error fetching shops.")
      } finally{
        setIsLoading(false);
      }
    };
    fetchShops();
  }, [])

  if (isLoading) {
    return <Text>Loading shops...</Text>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        Book a Shop
      </Text>
      {shops.map((shop) => (
        <Card key={shop.id}>
          <Card.Title>{shop.name}</Card.Title>
          <Text>{shop.location}</Text>
          <Button
            title="Book Shop"
            onPress={() => {
              router.push({
                pathname: '/(home)/shop-detail',
                params: {
                  shopId: shop.id,
                  shopName: shop.name
                }
              })
            }}
          />
        </Card>      
      ))}
    </ScrollView>
  );
};


const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
});

