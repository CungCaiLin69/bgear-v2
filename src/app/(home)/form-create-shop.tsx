import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../utils/AuthProvider";

const CreateShopForm = () => {
  const { user, createShop, shop } = useAuth();
  const [shopName, setShopName] = useState("");
  const [shopLocation, setShopLocation] = useState("");
  const [shopServices, setShopServices] = useState("");
  const [hasRepairman, setHasRepairman] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    if (shop) {
      console.log(shop, "This is shop");
      setShopName(shop?.name || "");
      setShopLocation(shop?.location || "");
      setShopServices(shop.services?.join(", ") || "");
      setHasRepairman(shop.hasRepairman || false);
    }
  }, [shop]);

  const handleSubmit = async () => {
    if (!shopName || !shopLocation || shopServices || hasRepairman) {
      Alert.alert("Validation Error", "Please fill in all required fields.");

      try {
        await createShop({
          shopName,
          shopLocation,
          shopServices: shopServices.split(",").map((s) => s.trim()),
          hasRepairman,
        });

        Alert.alert("Success", "Shop created!");
        navigation.goBack();
      } catch (error) {
        console.error("Error submitting form:", error);
        Alert.alert("Error", "Failed to submit the form. Please try again.");
      }
    }
  };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{shop ? "Edit Shop" : "Create a Shop"}</Text>

      {shop && <Text style={styles.title}>You already have a shop.</Text>}

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>{"Back"}</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Shop Name"
        value={shopName}
        onChangeText={setShopName}
      />

      <TextInput
        style={styles.input}
        placeholder="Location"
        value={shopLocation}
        onChangeText={setShopLocation}
      />

      <TextInput
        style={styles.input}
        placeholder="Services Provided (comma-separated)"
        value={shopServices}
        onChangeText={setShopServices}
      />

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>
          {shop ? "Update Shop" : "Submit"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 10,
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007BFF",
  },
  submitButton: {
    backgroundColor: "#00897B",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default CreateShopForm;
