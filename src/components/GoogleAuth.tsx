// import React, { useEffect } from 'react';
// import { View, Alert } from 'react-native';
// import {
//     GoogleSignin,
//     GoogleSigninButton,
//     statusCodes,
//   } from '@react-native-google-signin/google-signin';
  
// import { Button } from '@rneui/themed';

// const GOOGLE_WEB_CLIENT_ID = '465090739246-dmt1bh2ff7gdg4k5vhgjn5noqoq07bv9.apps.googleusercontent.com';

// export default function GoogleAuth() {
//   useEffect(() => {
//     GoogleSignin.configure({
//       webClientId: GOOGLE_WEB_CLIENT_ID, // From Google Console
//       offlineAccess: true,
//     });
//   }, []);

//   async function handleGoogleLogin() {
//     try {
//       await GoogleSignin.hasPlayServices();
//       const userInfo = await GoogleSignin.signIn(); // This returns a User object
  
//       console.log('Google User Info:', userInfo); // Debugging line
  
//       const idToken = userInfo.data?.idToken; // Correct way to get the ID token
  
//       if (!idToken) {
//         throw new Error('No ID token received');
//       }
  
//       // Send token to backend for verification & login
//       const response = await fetch('http://10.0.2.2:3000/auth/v1/callback', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ idToken }),
//       });
  
//       const data = await response.json();
  
//       if (response.ok) {
//         Alert.alert('Login successful!');
//         console.log(data);
//       } else {
//         Alert.alert('Login failed', data.message);
//       }
//     } catch (error: any) {
//       if (error.code === statusCodes.SIGN_IN_CANCELLED) {
//         Alert.alert('User cancelled login');
//       } else {
//         console.error('Google Sign-In Error:', error);
//         Alert.alert('Error', error.message);
//       }
//     }
//   }
  

//   return (
//     <View>
//       <GoogleSigninButton onPress={handleGoogleLogin} />
//     </View>
//   );
// }
