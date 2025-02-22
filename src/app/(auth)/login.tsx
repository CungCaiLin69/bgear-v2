import React, { useState } from 'react';
import { Alert, StyleSheet, View, Text } from 'react-native';
import { Button, Input, Icon } from '@rneui/themed';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../utils/AuthProvider'; // Adjust path if necessary

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  // Helper to validate email format
  const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

  async function signInWithEmailHandler() {
    if (!email || !password) {
      Alert.alert('Validation Error', 'Please fill in both email and password.');
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      // Use Supabase auth to sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        Alert.alert('Login Failed', error?.message || 'No session returned');
      } else {
        // Save the token using AuthContext and redirect to home screen
        await login(data.session.access_token);
        router.replace('/(home)/home');
      }
    } catch (err) {
      console.error('Error during login:', err);
      Alert.alert('Login Error', 'Network error, please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login to BGear</Text>

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Input
          label="Email"
          leftIcon={{ type: 'font-awesome', name: 'envelope' }}
          onChangeText={setEmail}
          value={email}
          placeholder="email@address.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Input
          label="Password"
          leftIcon={{ type: 'font-awesome', name: 'lock' }}
          onChangeText={setPassword}
          value={password}
          placeholder="Password"
          autoCapitalize="none"
          secureTextEntry={!showPassword}
          rightIcon={
            <Icon
              type="font-awesome"
              name={showPassword ? 'eye' : 'eye-slash'}
              onPress={() => setShowPassword((prev) => !prev)}
            />
          }
        />
      </View>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button title="Sign in" disabled={loading} onPress={signInWithEmailHandler} loading={loading} />
      </View>

      <Text style={styles.footerText}>
        Don't have an account yet?{' '}
        <Link href="/(auth)/register" style={styles.link}>
          Register
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
