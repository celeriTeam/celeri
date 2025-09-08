import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  TouchableOpacity,
  SafeAreaView,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Checkbox from 'expo-checkbox';
import { 
  PhoneAuthProvider,
  signInWithCredential,
  RecaptchaVerifier,
  getAuth
} from 'firebase/auth';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { app } from '@firebaseConfig';

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
      image: require('@assets/images/brick_wall.png'),
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
    title: 'Win Rewards',
    description: 'Earn points and rewards for meeting goals.',
    image: '🎁',
    type: 'standard'
  },
  {
    id: '6',
    title: 'Get Started',
    description: 'Ready to begin your health journey?',
    image: '🚀',
    type: 'standard'
  },
];

const OnboardPrimer = () => {
  const { width } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  
  // Track current page and viewed pages
  const [currentPage, setCurrentPage] = useState(0);
  const [viewedPages, setViewedPages] = useState<boolean[]>(Array(onboardingPages.length).fill(false));

  // Account creation state variables
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [newsConsent, setNewsConsent] = useState(true);

  // Phone authentication state variables
  const recaptchaVerifier = useRef(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState('');
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
    router.push('/onboarding');
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
  const registerAndGoToMainFlow = async () => {
    // This would incorporate the logic from Register.tsx
    // For this example, just navigate to the main app
    Alert.alert('Account Created', 'Your account has been created successfully!', [
      { text: 'OK', onPress: () => router.push('/onboarding') }
    ]);
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
        {/* Skip button */}
        <TouchableOpacity style={styles.skipButton} onPress={skipOnboarding}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        
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
        <TouchableOpacity style={styles.nextButton} onPress={goToNextPage}>
          <Text style={styles.nextButtonText}>
            {currentPage === onboardingPages.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
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
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  skipText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Lexend',
  },
  nextButton: {
    backgroundColor: 'transparent',
    borderColor: '#fff',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginBottom: 50,
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
});

export default OnboardPrimer;