import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';

export default function OTPVerificationScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { userId, phoneNumber } = useLocalSearchParams();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter a 6-digit OTP.');
      return;
    }

    try {
      setLoading(true);
      
      // Verify the OTP
      const res = await fetch('http://10.0.2.2:3000/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otp }), 
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }
      
      Alert.alert('Success', 'Your phone number has been verified!');
      router.replace('/(auth)/login');
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white px-6"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.verifyLayout}
    >
      <View style={styles.innerContainer}>
        <Text style={styles.phoneVerification}>Verify Your Number</Text>
        <Text style={styles.verificationText}>We need to register your phone number before getting started</Text>
        <Text style={styles.verificationNum}>We've sent a 6-digit code to {phoneNumber}</Text>
        <TextInput
          keyboardType="numeric"
          maxLength={6}
          value={otp}
          onChangeText={setOtp}
          placeholder="●●●●●●"
          placeholderTextColor="#ccc"
          style={styles.verificationBox}
        />
      </View>
  
      <View style={styles.footerContainer}>
        <TouchableOpacity
          disabled={loading}
          onPress={handleVerifyOTP}
          style={[styles.verifyButton, loading && { opacity: 0.5 }]}
        >
          <Text style={styles.verifyButtonText}>
            {loading ? 'Verifying...' : 'Verify'}
          </Text>
        </TouchableOpacity>
  
        <View style={styles.subButton}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.backButton}>Resend OTP</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
  
const styles = StyleSheet.create({
    verifyLayout: {
      flex: 1,
      justifyContent: 'space-between',
    },
    innerContainer: {
      paddingTop: 100,
      alignItems: 'center',
    },
    phoneVerification: {
      fontSize: 30,
      fontWeight: 'bold',
      textAlign: 'center',
      marginTop: 120
    },
    verificationText: {
      marginTop: 20,
      textAlign: 'center',
      width: '80%',
    },
    verificationNum: {
      textAlign: 'center',
      marginTop: 30,
      marginBottom: 10,
    },
    verificationBox: {
      backgroundColor: "#EEE",
      borderRadius: 20,
      height: 50,
      paddingHorizontal: 20,
      textAlign: 'center',
      width: '80%',
      marginTop: 20,
    },
    footerContainer: {
      alignItems: 'center',
      paddingBottom: 40,
    },
    verifyButton: {
      borderRadius: 20,
      paddingVertical: 14,
      paddingHorizontal: 24,
      backgroundColor: '#00897B',
      width: '80%',
      alignItems: 'center',
    },
    verifyButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
    },
    subButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '80%',
      marginTop: 12,
    },
    backButton: {
      color: '#00897B',
      fontWeight: '600',
      fontSize: 14,
      marginBottom: 20
    },
});