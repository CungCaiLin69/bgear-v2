import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../utils/AuthProvider"; // Adjust path if necessary

const BecomeRepairmanForm = () => {
  const {
    user,
    repairman,
    becomeRepairman,
    checkRepairmanStatus,
    resignAsRepairman,
  } = useAuth();
  const navigation = useNavigation();

  const [name, setName] = useState(user?.name || "");
  const [age, setAge] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [hasShop, setHasShop] = useState(false);
  const [shopName, setShopName] = useState("");
  const [servicesProvided, setServicesProvided] = useState("");

  // Pre-fill the form if the user is already a repairman
  useEffect(() => {
    if (repairman) {
      console.log("I AM REPAIRMAN BITCH!!");
      setName(user?.name || "");
      setSpecialties(repairman.skills.join(", "));
      setServicesProvided(repairman.servicesProvided?.join(", ") || "");
      setHasShop(repairman.hasShop || false);
      setShopName(repairman.shopName || "");
    }
  }, [repairman]);

  const handleSubmit = async () => {
    if (!name || !age || !specialties || !servicesProvided) {
      Alert.alert("Validation Error", "Please fill in all required fields.");
      return;
    }

    try {
      await becomeRepairman({
        name,
        age: parseInt(age, 10),
        specialties: specialties.split(",").map((s) => s.trim()),
        hasShop,
        shopName: hasShop ? shopName : undefined,
        servicesProvided: servicesProvided.split(",").map((s) => s.trim()),
      });

      Alert.alert(
        "Success",
        repairman ? "Repairman profile updated!" : "You are now a repairman!"
      );
      navigation.goBack();
    } catch (error) {
      console.error("Error submitting form:", error);
      Alert.alert("Error", "Failed to submit the form. Please try again.");
    }
  };

  const handleResign = async () => {
    try {
      await resignAsRepairman();
      Alert.alert("Success", "You have resigned as a repairman.");
      navigation.goBack();
    } catch (error) {
      console.error("Error resigning as repairman:", error);
      Alert.alert(
        "Error",
        "Failed to resign as a repairman. Please try again."
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {repairman ? "Edit Repairman Profile" : "Become a Repairman"}
      </Text>

      {repairman && (
        <Text style={styles.subtitle}>You are already a repairman.</Text>
      )}

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>{"Back"}</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Age"
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
      />

      <TextInput
        style={styles.input}
        placeholder="Specialties (comma-separated)"
        value={specialties}
        onChangeText={setSpecialties}
      />

      <TextInput
        style={styles.input}
        placeholder="Services Provided (comma-separated)"
        value={servicesProvided}
        onChangeText={setServicesProvided}
      />

      {/* Checkbox for "Do you have a shop or work in a shop?" */}
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setHasShop(!hasShop)}
      >
        <View style={[styles.checkbox, hasShop && styles.checked]}>
          {hasShop && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkboxText}>
          Do you have a shop or work in a shop?
        </Text>
      </TouchableOpacity>

      {/* Conditional input for shop name */}
      {hasShop && (
        <TextInput
          style={styles.input}
          placeholder="Shop Name"
          value={shopName}
          onChangeText={setShopName}
        />
      )}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>
          {repairman ? "Update Repairman Profile" : "Submit"}
        </Text>
      </TouchableOpacity>

      {repairman && (
        <TouchableOpacity style={styles.resignButton} onPress={handleResign}>
          <Text style={styles.resignButtonText}>Resign as Repairman</Text>
        </TouchableOpacity>
      )}
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
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 10,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#00897B",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  checked: {
    backgroundColor: "#00897B",
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
  },
  checkboxText: {
    fontSize: 16,
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
  resignButton: {
    backgroundColor: "#dc3545",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  resignButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
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
});

export default BecomeRepairmanForm;
