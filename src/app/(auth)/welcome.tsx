import React, { useEffect, useState } from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const image = { uri: 'https://media.istockphoto.com/id/1347150429/photo/...jpg' };

const WelcomeScreen = () => {
  const router = useRouter();
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        // 1. Check if user is already logged in
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          // If token exists, user is logged in -> go directly to Home
          router.replace('/(home)/home');
          return;
        }

        // 2. If no token, check if it's the first time launching the app
        const hasLaunched = await AsyncStorage.getItem('hasLaunched');
        if (!hasLaunched) {
          // First launch
          await AsyncStorage.setItem('hasLaunched', 'true');
          setIsFirstLaunch(true);
        } else {
          // Not the first launch -> skip Welcome, go to Login
          setIsFirstLaunch(false);
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Error checking first launch or token:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Show a loader while we're checking
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00897B" />
      </View>
    );
  }

  // If we already redirected, or if not first launch, we can return null
  if (isFirstLaunch === false) {
    return null;
  }

  // If it's truly the first launch (and user not logged in), show the welcome screen
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <ImageBackground source={image} resizeMode="cover" style={styles.image} />
        <View style={styles.textContainer}>
          <Text style={styles.headerText}>Selamat Datang Di BGear</Text>
          <Text style={styles.subText}>
            Aplikasi yang bikin kamu dan kendaraanmu hidup lebih nyaman...
          </Text>
        </View>
        <View style={styles.buttonContainer}>
          <Link href="/(auth)/login" style={styles.loginBtn}>
            <Text style={styles.loginTxt}>Login</Text>
          </Link>
          <Link href="/(auth)/register" style={styles.regisBtn}>
            <Text style={styles.regisTxt}>Belum punya akun? Daftar</Text>
          </Link>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  image: { flex: 1, justifyContent: 'center', height: '100%' },
  textContainer: { flex: 1 },
  headerText: { fontSize: 20, padding: 20, paddingBottom: 0 },
  subText: { fontSize: 14, padding: 20, lineHeight: 20 },
  buttonContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-evenly',
    padding: 20,
  },
  loginBtn: {
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: 'transparent',
    borderColor: '#00897B',
  },
  loginTxt: { color: '#00897B', fontSize: 16, fontWeight: '600' },
  regisBtn: {
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: '#00897B',
    borderColor: '#00897B',
  },
  regisTxt: { color: 'white', fontSize: 16, fontWeight: '600' },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
