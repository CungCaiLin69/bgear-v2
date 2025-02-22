import React, { useState } from 'react';
import { Alert, StyleSheet, View, Text } from 'react-native';
import { Button, Input } from '@rneui/themed';
import { Link, useRouter } from 'expo-router';

const API_URL = 'http://10.0.2.2:3000/api/register'; // For Android emulator
// OR
// const API_URL = 'http://192.168.1.100:3000/api/register'; // For physical device

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRegister() {
    // Validate input fields
    if (!name || !email || !password) {
      Alert.alert('Validation Error', 'Please fill in all fields.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      // Send registration request to the backend
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      // Handle backend errors
      if (!response.ok) {
        Alert.alert('Registration Failed', data.error || 'An error occurred during registration.');
        return;
      }

      // Registration successful
      Alert.alert('Registration Successful', 'You can now login.');
      router.replace('/(auth)/login'); // Redirect to the login screen
    } catch (error) {
      console.error('Error during registration:', error);
      Alert.alert('Registration Error', 'Network error, please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register for BGear</Text>

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Your Name"
          autoCapitalize="none"
        />
      </View>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="email@address.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          autoCapitalize="none"
          secureTextEntry
        />
      </View>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          title="Register"
          disabled={loading}
          onPress={handleRegister}
          loading={loading}
        />
      </View>

      <Text style={styles.footerText}>
        Already have an account?{' '}
        <Link href="/(auth)/login" style={styles.link}>
          Login
        </Link>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  verticallySpaced: { paddingVertical: 4, alignSelf: 'stretch' },
  mt20: { marginTop: 20 },
  footerText: { textAlign: 'center', marginTop: 20 },
  link: { color: '#1E90FF', fontWeight: 'bold' },
});