import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, useWindowDimensions, TouchableOpacity, SafeAreaView, Image, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { signInWithPhoneNumber} from '@react-native-firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from '@react-native-firebase/firestore';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authInstance, db, storage } from '@firebaseConfig';

// Define your onboarding pages content
const onboardingPages = [
  {
    id: '1',
    title: 'What is Celeri?',
    description: `We're a fitness game hosting platform, 
    where you can join our games or create your own.
    
    Our app is split into two major sections: public and private games.`,
    image: '🏃‍♂️',
    type: 'standard'
  },
  {
    id: '2',
    title: 'Public Games',
    type: 'two-column',
    row1: {
      text: 'Every week, we host online weekly step competitions with cash prizes.',
      image: require('@assets/images/step_competition.png')
    },
    row2: {
      image: require('@assets/images/glizzy_contest.png'),
      text: 'Every month, we\'ll host in-person events in NY or DC!'
    }
  },
  {
    id: '3',
    title: 'Private Games',
    type: 'two-column',
    row1: {
      text: 'Host your own games with a group of friends -- bet on each other, race against each other, and win!',
      image: require('@assets/images/weekly_bet_duel.png')
    },
    row2: {
      image: require('@assets/images/1v1_game_duel.png'),
      text: 'Challenge a friend to a 1v1 duel -- who\'s gonna walk more?'
    }
  },
  {
    id: '4',
    title: 'Now, let\'s create your account.',
    type: 'account-creation',
  },
  {
    id: '5',
    title: 'Verify your phone number',
    type: 'phone-verification',
  }
];

const OnboardPrimer = () => {
  const { width } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  
  // Track current page and viewed pages
  const [currentPage, setCurrentPage] = useState(0);
  const [viewedPages, setViewedPages] = useState<boolean[]>(
    Array(onboardingPages.length).fill(false).map((_, index) => index === 0 ? true : false)
  );

  // Account creation state variables
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [newsConsent, setNewsConsent] = useState(true);

  // Phone authentication state variables
  const [phoneNumber, setPhoneNumber] = useState('');
  const [confirmation, setConfirmation] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Mark current page as viewed
  const handlePageChange = (index: number) => {
    setCurrentPage(index);
    setViewedPages(prev => {
      const newViewed = [...prev];
      newViewed[index] = true;
      return newViewed;
    });
  };

  // Handle manual navigation
  const goToNextPage = () => {
    if (currentPage === 3) { // Account creation slide
      if (!name || !username || !email || !profileImage) {
        Alert.alert('Missing Information', 'Please fill out all fields and add a profile picture.');
        return;
      }
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
      }
    }
    
    if (currentPage < onboardingPages.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentPage + 1 });
    } else {
      // Navigate to next screen after onboarding
      registerAndGoToMainFlow();
    }
  };

  const skipOnboarding = () => {
    router.replace('/onboarding');
  };

  // Image picker function
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Please grant media library permissions to select a profile image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedAsset = result.assets[0];
      if (selectedAsset.uri) {
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          selectedAsset.uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        setProfileImage(manipulatedImage.uri);
      }
    }
  };

  // Register and navigate to main flow
  const registerAndGoToMainFlow = async (user = authInstance.currentUser) => {
    try {
      console.log('registerAndGoToMainFlow -- Registering user and navigating to main flow');
      if (!user) {
        Alert.alert('Error', 'No authenticated user found.');
        return;
      }
      
      if (!name || !username || !profileImage) {
        Alert.alert('Missing Information', 'Please complete all required fields.');
        return;
      }
      
      // Upload profile image
      let profileImageUrl = null;
      if (profileImage) {
        const storageRef = storage().ref(`profileImages/${user.uid}`);
        await storageRef.putFile(profileImage);
        profileImageUrl = await storageRef.getDownloadURL();
      }
      
      // Create user document
      await setDoc(doc(db, 'users', user.uid), {
        name,
        username,
        phoneNumber: user.phoneNumber,
        profileImageUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        groups: [],
        receiveNews: newsConsent
      });
      
      console.log('User document created successfully');
      
      // Navigate to the main app
      Alert.alert(
        'Account Created', 
        'Your account has been created successfully!',
        [{ 
          text: 'OK', 
          onPress: async () => {
            await AsyncStorage.removeItem('registrationInProgress');
            router.back();
            router.replace('/(authenticated)/(tabs)/home');
          } 
        }]
      );
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Error', 'Failed to create your account. Please try again.');
    }
  };

  // Add a new function to check if the form is valid
  const isFormValid = () => {
    if (!name || !username || !email || !profileImage) {
      return false;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return false;
    }
    
    return true;
  };

  // Add this function to control swiping behavior
  const handleScroll = (event: any) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    
    // If trying to swipe past the account creation page (index 3) without valid form
    if (currentPage === 3 && newIndex > 3 && !isFormValid()) {
      // Prevent swiping by scrolling back to the current page
      flatListRef.current?.scrollToIndex({ index: 3, animated: true });
      
      // Show alert about missing information
      Alert.alert('Missing Information', 'Please fill out all fields and add a profile picture.');
      return;
    }
    
    // Otherwise, update the current page normally
    handlePageChange(newIndex);
  };

  // Send verification code to the phone number
  const sendVerificationCode = async () => {
    try {
      // SET THIS FLAG FIRST - before any Firebase operations
      await AsyncStorage.setItem('registrationInProgress', 'true');
      console.log('Registration flag explicitly set before verification');
      
      console.log('Sending verification code to:', phoneNumber);
      if (!phoneNumber) {
        Alert.alert('Phone Number Required', 'Please enter your phone number.');
        return;
      }

      // Strip all non-numeric characters except leading +
      const strippedNumber = phoneNumber.replace(/[^\d+]/g, '');
      
      // Basic validation for US numbers
      let formattedNumber = strippedNumber;
      if (!formattedNumber.startsWith('+')) {
        // For US numbers without country code, should have exactly 10 digits
        const digits = formattedNumber.replace(/\D/g, '');
        if (digits.length !== 10) {
          Alert.alert('Invalid Number', 'Please enter a valid 10-digit US phone number.');
          return;
        }
        formattedNumber = `+1${digits}`;
      } else {
        // If it starts with +, ensure it has enough digits after the country code
        // For +1 (US/Canada), should have country code + 10 digits
        if (formattedNumber.startsWith('+1') && formattedNumber.length !== 12) {
          Alert.alert('Invalid Number', 'Please enter a valid phone number with country code.');
          return;
        }
      }

      setVerifyingPhone(true);
      console.log('Formatted phone number:', formattedNumber);
      
      // This is the correct way to call it
      const confirmation = await signInWithPhoneNumber(authInstance, formattedNumber);
      console.log('Phone number sign-in confirmation received');
      
      // Add this listener for automatic verification in simulators
      // const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      //   console.log('onAuthStateChanged triggered during phone verification');
      //   if (user) {
      //     console.log('Auto-verification detected in simulator');
      //     // Check if this user already exists in Firestore
      //     const userDoc = await getDoc(doc(db, 'users', user.uid));
          
      //     if (userDoc.exists) {
      //       // User already exists - show alert and navigate to login
      //       Alert.alert(
      //         'Account Exists',
      //         'An account with this phone number already exists. Please sign in instead.',
      //         [{ text: 'OK', onPress: () => router.replace('/onboarding/Login') }]
      //       );
      //     } else {
      //       // New user - verified automatically, register and go to main flow
      //       console.log('New user verified via auto-verification, proceeding to main flow');
      //       setPhoneVerified(true);
      //       // Register user and go to main app directly
      //       await registerAndGoToMainFlow(user);
      //     }
      //     // Unsubscribe after handling auto-verification
      //     unsubscribe();
      //   }
      // });
      
      // Still set confirmation for devices that need manual verification
      if (confirmation) {
        setConfirmation(confirmation);
      }
      
      Alert.alert(
        'Verification code sent',
        `We've sent a verification code to ${formattedNumber}`
      );
    } catch (error) {
      console.error('Error sending verification code:', error);
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    } finally {
      setVerifyingPhone(false);
    }
  };

  // Confirm the verification code
  const confirmVerificationCode = async () => {
    try {
      if (!verificationCode) {
        Alert.alert('Verification Code Required', 'Please enter the verification code.');
        return;
      }

      setVerifyingPhone(true);
      
      // Use the confirmation object's confirm method
      const userCredential = await confirmation.confirm(verificationCode);
      
      // Check if this user already exists in Firestore
      const userDoc = await getDoc(doc(db,'users',userCredential.user.uid));
      
      if (userDoc.exists) {
        // User already exists
        Alert.alert(
          'Account Exists',
          'An account with this phone number already exists. Please sign in instead.',
          [{ text: 'OK', onPress: () => router.push('/onboarding/Login') }]
        );
        return;
      }
      
      // User verification successful - register and go to main app
      await registerAndGoToMainFlow(userCredential.user);
      
    } catch (error) {
      console.error('Error verifying code:', error);
      Alert.alert('Error', 'Invalid verification code. Please try again.');
    } finally {
      setVerifyingPhone(false);
    }
  };

  // Set registration in progress flag when component mounts
  useEffect(() => {
    const setRegistrationFlag = async () => {
      await AsyncStorage.setItem('registrationInProgress', 'true');
      console.log('Registration in progress flag set');
    };
    
    setRegistrationFlag();
    
    // Clear the flag when component unmounts
    return () => {
      AsyncStorage.removeItem('registrationInProgress')
        .then(() => console.log('Registration flag cleared'));
    };
  }, []);

  // Render each onboarding page
  const renderPage = ({ item, index }: { item: any, index: number }) => {
    // Account creation layout
    if (item.type === 'account-creation') {
      return (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.pageContainer, { width }]}
        >
          <View style={[styles.accountCreationContainer, { width: width - 40 }]}>
            <Text style={styles.pageTitle}>{item.title}</Text>
            
            {/* Profile Image Picker */}
            <View style={styles.profileImageContainer}>
              <TouchableOpacity onPress={pickImage} style={styles.profileImageWrapper}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileImage} />
                ) : (
                  <View style={styles.defaultProfileImage}>
                    <Text style={styles.defaultProfileImageText}>Add Photo</Text>
                  </View>
                )}
                <View style={styles.plusIconContainer}>
                  <Text style={styles.plusIconText}>+</Text>
                </View>
              </TouchableOpacity>
            </View>
            
            {/* Form Fields */}
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#e0e0e0"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              placeholderTextColor="#e0e0e0"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#e0e0e0"
            />
            
            {/* Newsletter Consent - Custom Checkbox */}
            <View style={styles.checkboxContainer}>
              <TouchableOpacity 
                style={[
                  styles.customCheckbox,
                  { backgroundColor: newsConsent ? '#fff' : 'transparent' }
                ]}
                onPress={() => setNewsConsent(!newsConsent)}
              >
                {newsConsent && (
                  <Text style={styles.checkmarkText}>✓</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.checkboxText}>
                I agree to receive news updates on the Celeri Beta.
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      );
    }
    
    // Phone verification layout
    if (item.type === 'phone-verification') {
      return (
        <View style={[styles.pageContainer, { width }]}>
          <View style={[styles.phoneVerificationContainer, { width: width - 40 }]}>
            <Text style={styles.pageTitle}>{item.title}</Text>
            
            <Text style={styles.phoneInstructions}>
              We'll send a verification code to your phone to confirm your identity.
            </Text>
            
            {!confirmation ? (
              // Phone number input
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number (e.g., +1 234 567 8900)"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  placeholderTextColor="#e0e0e0"
                  editable={!verifyingPhone}
                />
                
                <TouchableOpacity 
                  style={[styles.verifyButton, verifyingPhone && styles.disabledButton]}
                  onPress={sendVerificationCode}
                  disabled={verifyingPhone}
                >
                  <Text style={styles.verifyButtonText}>
                    {verifyingPhone ? 'Sending...' : 'Send Verification Code'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              // Verification code input
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Verification Code"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="number-pad"
                  placeholderTextColor="#e0e0e0"
                  editable={!verifyingPhone}
                />
                
                <TouchableOpacity 
                  style={[styles.verifyButton, verifyingPhone && styles.disabledButton]}
                  onPress={confirmVerificationCode}
                  disabled={verifyingPhone}
                >
                  <Text style={styles.verifyButtonText}>
                    {verifyingPhone ? 'Verifying...' : 'Verify Code'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.resendButton}
                  onPress={() => {
                    setConfirmation(null);
                    setVerificationCode('');
                  }}
                >
                  <Text style={styles.resendButtonText}>Change Phone Number</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      );
    }
    
    // Special layout for the second page
    if (item.type === 'two-column') {
      return (
        <View style={[styles.pageContainer, { width }]}>
          <View style={styles.twoColumnContainer}>
            <Text style={styles.pageTitle}>{item.title}</Text>
            
            {/* First row: Text left, Image right */}
            <View style={styles.row}>
              <View style={styles.columnLeft}>
                <Text style={styles.columnText}>{item.row1.text}</Text>
              </View>
              <View style={styles.columnRight}>
                <Image 
                  source={item.row1.image}
                  style={styles.rightColumnImage} // Use new style for right image
                  resizeMode="contain"
                />
              </View>
            </View>
            
            {/* Second row: Image left, Text right */}
            <View style={styles.row}>
              <View style={styles.columnLeft}>
                <Image 
                  source={item.row2.image}
                  style={styles.columnImage} // Keep original style for left image
                  resizeMode="contain"
                />
              </View>
              <View style={styles.columnRight}>
                <Text style={styles.columnText}>{item.row2.text}</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }
    
    // Standard layout for other pages
    return (
      <View style={[styles.pageContainer, { width }]}>
        {/* Add back button only to the first page */}
        {index === 0 && (
          <View style={styles.header}>
            <TouchableOpacity 
              style={{ position: 'absolute', left: 0, padding: 16 }} 
              onPress={() => router.replace('/onboarding')}
            >
              <Image
                source={require('@assets/icons/back.png')}
                style={styles.backImage}
              />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.contentContainer}>
          <Text style={styles.pageImage}>{item.image}</Text>
          <Text style={styles.pageTitle}>{item.title}</Text>
          <Text style={styles.pageDescription}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={['#000000', '#024405']} style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        
        {/* Swipeable pages */}
        <FlatList
          ref={flatListRef}
          data={onboardingPages}
          renderItem={renderPage}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          keyExtractor={(item) => item.id}
          // Add this to ensure we don't interfere with normal swiping for other pages
          scrollEventThrottle={16}
        />
        
        {/* Page indicators */}
        <View style={styles.indicatorContainer}>
          {onboardingPages.map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.indicator, 
                viewedPages[index] && styles.indicatorActive
              ]} 
            />
          ))}
        </View>
        
        {/* Next/Done button */}
        {currentPage !== onboardingPages.length - 1 && (
          <TouchableOpacity style={styles.nextButton} onPress={goToNextPage}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        )}
        <View style={{ marginBottom: 50, }} />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    padding: 40,
  },
  // Two-column layout styles
  twoColumnContainer: {
    flex: 1,
    width: '90%',
    paddingVertical: 60,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    marginVertical: 20,
    width: '100%',
  },
  columnLeft: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 10,
  },
  columnRight: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 10,
  },
  columnText: {
    color: '#e0e0e0',
    fontSize: 16,
    fontFamily: 'Lexend',
    lineHeight: 22,
  },
  columnImage: {
    width: '100%',        // Changed from 120% to 100% to stay within column
    height: 250,
    borderRadius: 10,
    marginRight: 0,       // Removed negative margin
    alignSelf: 'flex-start' // Added to ensure left alignment
  },
  rightColumnImage: {
    width: '120%', // Make it larger than the container
    height: 250,    // Make it taller than the standard image
    borderRadius: 10,
    marginLeft: -10, // Allow right image to overflow to the left
  },
  // Standard layout styles
  pageImage: {
    fontSize: 80,
    marginBottom: 40,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#fff',
    fontFamily: 'Lexend-Bold',
    textAlign: 'center',
    width: '100%',
  },
  pageDescription: {
    fontSize: 16,
    textAlign: 'center',
    color: '#e0e0e0',
    fontFamily: 'Lexend',
    marginBottom: 20,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  indicator: {
    height: 10,
    width: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#fff',
    marginHorizontal: 5,
  },
  indicatorActive: {
    backgroundColor: '#fff',
  },
  nextButton: {
    backgroundColor: 'transparent',
    borderColor: '#fff',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignSelf: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Lexend',
  },
  // Account creation styles
  accountCreationContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignSelf: 'center', // Center the container
  },
  profileImageContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  profileImageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'visible', // Changed from 'hidden' to 'visible'
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative', // Added to ensure proper positioning
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  defaultProfileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultProfileImageText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Lexend',
  },
  plusIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff', // Changed from blue to white
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#024405', // Green border
    elevation: 3, // Add shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  plusIconText: {
    color: '#024405', // Changed to green
    fontSize: 20,
    lineHeight: 20,
    fontWeight: 'bold',
  },
  input: {
    height: 50,
    width: '100%', // Keep at 100% of container
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Lexend',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  customCheckbox: {
    height: 24,
    width: 24,
    borderRadius: 5,
    marginRight: 10,
    borderColor: '#fff',
    borderWidth: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxText: {
    color: '#e0e0e0',
    fontSize: 14,
    fontFamily: 'Lexend',
    flex: 1,
  },
  // Phone verification styles
  phoneVerificationContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  phoneInstructions: {
    fontSize: 16,
    textAlign: 'center',
    color: '#e0e0e0',
    fontFamily: 'Lexend',
    marginBottom: 30,
    lineHeight: 24,
  },
  verifyButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#024405',
    fontSize: 16,
    fontFamily: 'Lexend',
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.7,
  },
  resendButton: {
    marginTop: 15,
    padding: 10,
  },
  resendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Lexend',
    textDecorationLine: 'underline',
  },
  header: {
    position: 'absolute',
    top: 90,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    zIndex: 10,
  },
  backImage: {
    width: 24,
    height: 24,
    tintColor: '#fff',
  },
});

export default OnboardPrimer;