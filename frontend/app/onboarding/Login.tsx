import React, { useState, useRef, useEffect } from 'react';
import {SafeAreaView, View, Text, TouchableOpacity, TextInput, Alert,Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { signInWithPhoneNumber } from '@react-native-firebase/auth';
import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { doc, getDoc } from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, authInstance } from '@firebaseConfig';

const LoginPage: React.FC = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [confirmation, setConfirmation] = useState<any>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [verifyingPhone, setVerifyingPhone] = useState(false);
    const router = useRouter();

    // Set registration flag to prevent unwanted navigation
    useEffect(() => {
        const setLoginFlag = async () => {
            await AsyncStorage.setItem('loginInProgress', 'true');
        };
        
        setLoginFlag();
        return () => {
            AsyncStorage.removeItem('loginInProgress');
        };
    }, []);

    // Send verification code to the phone number
    const sendVerificationCode = async () => {
        try {
            await AsyncStorage.setItem('loginInProgress', 'true');
            
            if (!phoneNumber) {
                Alert.alert('Phone Number Required', 'Please enter your phone number.');
                return;
            }

            // Format phone number (same logic as in OnboardPrimer)
            let formattedNumber = phoneNumber;
            if (!formattedNumber.startsWith('+')) {
                const digits = formattedNumber.replace(/\D/g, '');
                if (digits.length !== 10) {
                    Alert.alert('Invalid Number', 'Please enter a valid 10-digit US phone number.');
                    return;
                }
                formattedNumber = `+1${digits}`;
            }

            setVerifyingPhone(true);
            console.log('Sending verification code to:', formattedNumber);
            
            // Send verification code
            const confirmation = await signInWithPhoneNumber(authInstance, formattedNumber);
            console.log('Verification code sent');
            
            setConfirmation(confirmation);
            
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

    // Verify code and login
    const confirmVerificationCode = async () => {
        try {
            if (!verificationCode) {
                Alert.alert('Verification Code Required', 'Please enter the verification code.');
                return;
            }

            setVerifyingPhone(true);
            
            // Verify the code
            const userCredential = await confirmation.confirm(verificationCode);
            console.log('Phone number verified successfully');
            
            // Check if user exists in Firestore
            const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
            
            if (!userDoc.exists) {
                Alert.alert(
                    'Account Not Found',
                    'No account found with this phone number. Please create an account first.',
                    [{ text: 'OK', onPress: () => router.push('/onboarding') }]
                );
                return;
            }
            
            // Login successful, navigate to home
            await AsyncStorage.removeItem('loginInProgress');
            router.replace('/(authenticated)/(tabs)/home');
            
        } catch (error) {
            console.error('Error verifying code:', error);
            Alert.alert('Error', 'Invalid verification code. Please try again.');
        } finally {
            setVerifyingPhone(false);
        }
    };

    return (
        <LinearGradient colors={['#000000', '#024405']} style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea}>
                {/* Back button */}
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={{ position: 'absolute', left: 0, padding: 16 }} 
                        onPress={() => router.back()}
                    >
                        <Image
                            source={require('@assets/icons/back.png')}
                            style={styles.backImage}
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.contentContainer}>
                    <Text style={styles.pageTitle}>Sign In</Text>
                    
                    <Text style={styles.phoneInstructions}>
                        Enter your phone number to sign in to your account.
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
                                    {verifyingPhone ? 'Verifying...' : 'Sign In'}
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
                    
                    <TouchableOpacity
                        style={styles.createAccountButton}
                        onPress={() => router.replace('/onboarding')}
                    >
                        <Text style={styles.createAccountText}>
                            Don't have an account? Create one
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        position: 'absolute',
        top: 120,
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
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    pageTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#fff',
        fontFamily: 'Lexend-Bold',
        textAlign: 'center',
    },
    phoneInstructions: {
        fontSize: 16,
        textAlign: 'center',
        color: '#e0e0e0',
        fontFamily: 'Lexend',
        marginBottom: 30,
        lineHeight: 24,
    },
    input: {
        height: 50,
        width: '100%',
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
    createAccountButton: {
        marginTop: 20,
        padding: 10,
    },
    createAccountText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'Lexend',
        textDecorationLine: 'underline',
    },
});

export default LoginPage;
