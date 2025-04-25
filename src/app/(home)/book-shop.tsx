import { useAuth } from "@/src/utils/AuthProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Card } from "@rneui/themed";
import { useNavigation } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

const API_URL = 'http://10.0.2.2:3000/api/get-all-shop';

export default function BookShopScreen() {
  const navigation = useNavigation();
  const { getAllShop } = useAuth();



  useEffect(() => {
    const getAllShopOnInit = async () => {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      console.log(response)
    }
    getAllShopOnInit();
  }, [])

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        Book a Shop
      </Text>
      <Card>
        <Card.Title>
        SHOP 1
        </Card.Title>
      </Card>
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

