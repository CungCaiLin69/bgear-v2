import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Input, Icon } from '@rneui/themed';
import { Link, useRouter } from 'expo-router';

const API_URL = 'http://10.0.2.2:3000/api/register'; // For Android emulator
// OR
// const API_URL = 'http://192.168.1.100:3000/api/register'; // For physical device

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function handleRegister() {
    // Validate input fields
    if (!name || !email || !password || !phoneNumber) {
      Alert.alert('Validation Error', 'Please fill in all fields.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    //validate phone format
    if (!/^\+?\d{10,15}$/.test(phoneNumber)) {
      Alert.alert('Validation Error', 'Invalid phone number.');
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
        body: JSON.stringify({ name, email, password, phoneNumber }),
      });

      const data = await response.json();

      // Handle backend errors
      if (!response.ok) {
        Alert.alert('Registration Failed', data.error || 'An error occurred during registration.');
        return;
      }

      // Pass the userId and phoneNumber to the OTP screen
      router.push({
        pathname: '/(auth)/otp-verify',
        params: { 
          userId: data.userId, 
          phoneNumber: data.phoneNumber
        }
      });
    } catch (error) {
      console.error('Error during registration:', error);
      Alert.alert('Registration Error', 'Network error, please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerContainer}>
            <Text style={styles.appName}>BGear</Text>
            <Text style={styles.title}>Create Account</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Icon
                  name="user"
                  type="font-awesome"
                  size={18}
                  color="#757575"
                  containerStyle={styles.inputIcon}
                />
                <Input
                  containerStyle={styles.input}
                  inputContainerStyle={{ borderBottomWidth: 0 }}
                  inputStyle={styles.inputText}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your full name"
                  autoCapitalize="words"
                  placeholderTextColor="#9E9E9E"
                  label=""
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputWrapper}>
                <Icon
                  name="envelope"
                  type="font-awesome"
                  size={18}
                  color="#757575"
                  containerStyle={styles.inputIcon}
                />
                <Input
                  containerStyle={styles.input}
                  inputContainerStyle={{ borderBottomWidth: 0 }}
                  inputStyle={styles.inputText}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="email@address.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor="#9E9E9E"
                  label=""
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <Icon
                  name="phone"
                  type="font-awesome"
                  size={18}
                  color="#757575"
                  containerStyle={styles.inputIcon}
                />
                <Input
                  containerStyle={styles.input}
                  inputContainerStyle={{ borderBottomWidth: 0 }}
                  inputStyle={styles.inputText}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="+62123456789"
                  keyboardType="phone-pad"
                  placeholderTextColor="#9E9E9E"
                  label=""
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Icon
                  name="lock"
                  type="font-awesome"
                  size={18}
                  color="#757575"
                  containerStyle={styles.inputIcon}
                />
                <Input
                  containerStyle={styles.input}
                  inputContainerStyle={{ borderBottomWidth: 0 }}
                  inputStyle={styles.inputText}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  autoCapitalize="none"
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#9E9E9E"
                  label=""
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword(prev => !prev)}>
                      <Icon
                        type="font-awesome"
                        name={showPassword ? 'eye' : 'eye-slash'}
                        size={18}
                        color="#757575"
                      />
                    </TouchableOpacity>
                  }
                />
              </View>
            </View>

            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By signing up, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or sign up with</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialsContainer}>
              <TouchableOpacity style={styles.socialButton}>
                <Icon
                  name="google"
                  type="font-awesome"
                  size={18}
                  color="#DB4437"
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Icon
                  name="facebook"
                  type="font-awesome"
                  size={18}
                  color="#4267B2"
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Icon
                  name="apple"
                  type="font-awesome"
                  size={18}
                  color="#000000"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Link href="/(auth)/login" style={styles.link}>
                Sign In
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerContainer: {
    marginTop: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00897B',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    marginVertical: 8,
  },
  inputContainer: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8,
    marginLeft: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    paddingLeft: 8,
    height: 56,
  },
  inputText: {
    fontSize: 16,
    color: '#212121',
  },
  termsContainer: {
    marginVertical: 16,
  },
  termsText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: '#00897B',
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: '#00897B',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#757575',
    fontSize: 14,
  },
  socialsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  footerContainer: {
    marginTop: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#757575',
  },
  link: {
    color: '#00897B',
    fontWeight: 'bold',
  },
});