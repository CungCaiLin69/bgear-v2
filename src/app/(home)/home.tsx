import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../utils/AuthProvider'; // Adjust path if necessary
import { useRouter } from 'expo-router';

export default function HomePage() {
  const { userToken, logout, user } = useAuth(); // Assuming `user` contains the username
  const router = useRouter();

  // Redirect to login if not logged in
  if (!userToken) {
    router.replace('/(auth)/login');
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login'); // Redirect to login after logout
  };

  // If user data is still loading, show a spinner
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Profile Button */}
      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => router.push('/profile')} // Navigate to the profile page
      >
        <Text style={styles.profileButtonText}>Profile</Text>
      </TouchableOpacity>

      {/* Greeting Card */}
      <View style={styles.greetingCard}>
        <Text style={styles.greetingText}>Welcome, {user?.name}!</Text>
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => router.push('/')} // Navigate to the order repairman page
        >
          <Text style={styles.optionButtonText}>Order a Repairman</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => router.push('/')} // Navigate to the book shop page
        >
          <Text style={styles.optionButtonText}>Book a Shop</Text>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButton: {
    alignSelf: 'flex-end',
    padding: 10,
  },
  profileButtonText: {
    fontSize: 16,
    color: '#007BFF',
    fontWeight: 'bold',
  },
  greetingCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  optionsContainer: {
    marginTop: 40,
  },
  optionButton: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  optionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#dc3545',
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});