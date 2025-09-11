import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, NativeEventEmitter, Linking } from 'react-native';
import { Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet as ScaledStyleSheet } from 'react-native-size-scaling';
import RaceRulesPager from './rules';
import { fetchCurrentCompetition, fetchCompetition } from '@backend/src/api/competitions';
import { addCompetitionUser, getCompetitionData, getCompetitionHasSeenResults, getCompetitionTallyingResults, getReferralsData, setCompetitionHasSeenResults } from '@backend/src/api/competition_steps';
import { useUser } from '@/app/UserProvider';
import { useRouter } from 'expo-router';
import { isUserInCompetition, setUserInCompetition, hasUserConsented, getReferral, fetchDefaultTitleMessage } from '@backend/src/competition';
import messaging from '@react-native-firebase/messaging';
import { NativeModules, AppState, Platform } from 'react-native';
import { EventEmitter, requireNativeModule } from 'expo-modules-core';
import AsyncStorage from '@react-native-async-storage/async-storage';

// import LiveHealthkit from '@/modules/live-healthkit';
// const native = requireNativeModule('LiveHealthkit');
// const { StepSession } = NativeModules;

const { width, height } = Dimensions.get('window');

const guidelineBaseWidth = 393;
const guidelineBaseHeight = 852;

const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const CompetitionLandingPage: React.FC = () => {
    const { userID } = useUser();
    const router = useRouter();
    const { hasPermissions } = useHealthData();
    const [modalVisible, setModalVisible] = useState(false);
    const [currentGame, setCurrentGame] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [hasConsented, setHasConsented] = useState<boolean | null>(null);
    const [showResults, setShowResults] = useState<any | false>(false);
    const [prevData, setPrevData] = useState<any>({});
    const [stepCount, setStepCount] = useState(0);
    const [referralResults, setReferralResults] = useState<any | false>(false);
    const [titleMessage, setTitleMessage] = useState<string>("The next competition will be in one week!");

    const getCurrentGame = useCallback(async () => {
        setLoading(true);
        try {
            const game = await fetchCurrentCompetition();
            console.log('Fetched game:', game);
            if (game?.is_active) {
                setTitleMessage("Competition is active! Join NOW")
                setCurrentGame(game); // Enable "Join Game" button
            } else {
                setCurrentGame(null); // Disable button
            }
            const isResults = await getCompetitionHasSeenResults(userID);
            if (isResults?.competition_id) {
                console.log('isResults: ', isResults?.competition_id);
                const prevCompetitionData = await getCompetitionData(isResults.competition_id);
                const prevCompetition = await fetchCompetition(isResults.competition_id);
                const referralsData = await getReferralsData(isResults.competition_id);
                console.log('prevcomp: ', prevCompetitionData);
                console.log('prevdata: ', prevCompetition[0]);
                console.log('referralsdata: ', referralsData);
                setShowResults(prevCompetitionData);
                setPrevData(prevCompetition[0]);
                setReferralResults(referralsData);
            } else {
                console.log('showing tally text');
                setShowResults(false);

                // tallying results
                const isTallying = await getCompetitionTallyingResults();
                if (isTallying) {
                    setTitleMessage('Tallying results...');
                }
            }
        } catch {
            setCurrentGame(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // 2) initial load + redirect if already in comp
    useEffect(() => {
        if (!userID) return;

        // Check if user is already in the competition
        isUserInCompetition(userID).then(inComp => {
            console.log('...', inComp);
            if (inComp) {
                router.replace('/competition/Game');
            } else {
                getCurrentGame();
            }
        });
    }, [userID, router, getCurrentGame]);


    // 3. Check consent before page loads
    useEffect(() => {
        const checkConsent = async () => {
            if (userID) {
                const consented = await hasUserConsented(userID);
                setHasConsented(consented);
            }
        };
        checkConsent();
    }, [userID]);

    // 4) silent‐push listener in foreground
    useEffect(() => {

        // listen while in foreground
        const unsubscribe = messaging().onMessage(async remoteMsg => {
            console.log('Received foreground message:', remoteMsg);
            if (remoteMsg.data?.type === 'TOGGLE_COMPETITION') {
                console.log('Competition started notification received');
                getCurrentGame();
            } 
            
            // Add handling for WAITING_MESSAGE
            if (remoteMsg.data?.type === 'WAITING_MESSAGE' && remoteMsg.data?.message) {
                console.log('Waiting message received:', remoteMsg.data.message);
                if (typeof remoteMsg.data.message === 'string') {
                    setTitleMessage(remoteMsg.data.message);
                } else {
                    console.log("remoteMsg.data.message is not a string")
                }
            }
        });

        return unsubscribe; // cleans up the listener on unmount
    }, [getCurrentGame]);


    // 5. Join Game handler
    const handleJoinGame = async () => {
        if (loading) return; // Prevent multiple clicks while loading
        if (!userID) return;
        if (!hasConsented) {
            Alert.alert(
                "Consent Required",
                "You need to agree to our Consent form before joining the game."
            );
            return;
        }
        console.log("testing two");

        // 2) Permissions

        const joinAt = Date.now(); 

        const referralId: string | null = await getReferral(userID);


        await addCompetitionUser(userID, referralId);
        await AsyncStorage.setItem(`competition:joinAt:${currentGame.id}`, String(joinAt));

        await setUserInCompetition(userID);
        router.replace({
            pathname: '/competition/Game',
            params: { joinAt: String(joinAt) }
        });
    };

    const handleResultsClose = async () => {
        const competition_id = prevData.id;
        setShowResults(false);
        // console.log('competition id: ', competition_id);
        setCompetitionHasSeenResults(userID, competition_id);
    };

    // Load default title message on component mount
    // useEffect(() => {
    //     const loadTitleMessage = async () => {
    //         try {
    //             console.log("loading title message");
    //             const message = await fetchDefaultTitleMessage();
    //             setTitleMessage(message);
    //         } catch (error) {
    //             console.error("Error loading title message:", error);
    //             // Keep default message on error
    //         }
    //     };
        
    //     loadTitleMessage();
    // }, []);

    if (hasPermissions === false) {
        if (Platform.OS === 'android' && Platform.Version < 34) {
            Linking.openURL('market://details?id=com.google.android.apps.healthdata');
        }
        return (
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <View style={styles.safeArea}>
                    <Text>Health data permissions are required to use this app.</Text>
                    <Text>Go to Settings to enable this.</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Add a callback function to refresh the consent status
    const refreshConsentStatus = useCallback(async () => {
      if (userID) {
        const consented = await hasUserConsented(userID);
        setHasConsented(consented);
      }
    }, [userID]);

    return (
        <LinearGradient
            colors={['#000000', '#024405']}
            style={styles.container}
        >
            
            {/* Existing content */}
            <View style={styles.content}>
                {/* Waiting Message */}
                {titleMessage && (
                    <Text style={waitingMessageText}>
                        {titleMessage}
                    </Text>
                )}
                {/* Join Game Button */}
                <TouchableOpacity
                    style={joinButton(currentGame)}
                    onPress={handleJoinGame}
                    disabled={!currentGame || loading}
                >
                    <Text style={joinButtonText(currentGame)}>
                        {loading ? "Loading..." : "Join Game"}
                    </Text>
                </TouchableOpacity>
                {/* Rules & Consent Button */}
                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={() => setModalVisible(true)}
                >
                    <Text style={styles.submitButtonText}>Rules & Consent</Text>
                </TouchableOpacity>
            </View>

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { height: '75%' }]}>
                        <LinearGradient
                            colors={['#000000', '#024405']}
                            style={styles.insideContainer}
                        >
                            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
                                <Text style={{ color: '#fff', fontSize: 24 }}>✕</Text>
                            </TouchableOpacity>
                            <RaceRulesPager 
                              closeModal={() => setModalVisible(false)} 
                              onConsentSubmitted={refreshConsentStatus} 
                            />
                        </LinearGradient>
                    </View>
                </View>
            </Modal>
            
            <Modal
                visible={!!showResults}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowResults(false)}
            >
                <View style={styles.modalOverlay} >
                    <View style={[styles.modalContainer, { height: '75%' }]}>
                        <LinearGradient
                            colors={['#000000', '#024405']}
                            style={styles.insideContainer}
                        >
                            <TouchableOpacity style={styles.modalCloseButton} onPress={handleResultsClose}>
                                <Text style={{ color: '#fff', fontSize: 24 }}>✕</Text>
                            </TouchableOpacity>
                            <View style={{ marginTop: 50, paddingHorizontal: 10, }} >
                                <ResultsModal
                                    results={showResults}
                                    prevData={prevData}
                                    referralResults={referralResults}
                                />
                                {/* <Text style={{ color: '#fff' }}>{JSON.stringify(showResults, null, 2)}</Text> */}
                            </View>
                        </LinearGradient>
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
};

const styles = ScaledStyleSheet.create({
    safeArea: {
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginTop: 10,
        height: '100%',
        width: '90%',
        alignSelf: 'center',
    },
    container: {
        flex: 1,
        width: '100%',
    },
    insideContainer: {
        flex: 1,
        width: '100%',
        borderWidth: moderateScale(1),
        borderRadius: moderateScale(15),
    },
    content: {
        padding: moderateScale(50),
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButton: {
        borderRadius: 20,
        width: 220,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        alignSelf: 'center',
        backgroundColor: '#fff',
    },
    submitButtonText: {
        fontSize: 20,
        fontFamily: 'Lexend',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        width: '90%',
        backgroundColor: 'black',
        position: 'relative',
        borderColor: '#4A4A4A',
        borderWidth: moderateScale(1),
        borderRadius: moderateScale(15),
    },
    modalCloseButton: {
        position: 'absolute',
        top: verticalScale(10),
        right: scale(10),
        zIndex: 1,
    },
    stepCount: {
        color: '#fff',
        fontSize: 18,
        position: 'absolute',
        bottom: 50,
        left: '50%',
    },
    titleContainer: {
        width: '100%',
        paddingVertical: moderateScale(15),
        paddingHorizontal: moderateScale(20),
        alignItems: 'center',
        marginTop: moderateScale(50),
    },
    titleMessage: {
        color: '#FFFFFF',
        fontSize: moderateScale(18),
        fontFamily: 'Lexend',
        textAlign: 'center',
        fontWeight: '500',
    },
});

// Move these outside of ScaledStyleSheet.create
import type { ViewStyle } from 'react-native';

const joinButton = (currentGame: any): ViewStyle => ({
    borderRadius: 30,
    width: 260,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    alignSelf: 'center',
    backgroundColor: currentGame ? '#fff' : '#888',
    marginBottom: 30,
    opacity: currentGame ? 1 : 0.6,
});

import type { TextStyle } from 'react-native';
import ResultsModal from './Results';
import useHealthData from '@/backend/src/hooks/useHealthData';
import { SafeAreaView } from 'react-native-safe-area-context';

const joinButtonText = (currentGame: any): TextStyle => ({
    fontSize: 24,
    fontFamily: 'Lexend',
    color: currentGame ? '#000' : '#444',
    fontWeight: 'bold',
});

// Add this outside your component
const waitingMessageText: TextStyle = {
    fontSize: 24,
    fontFamily: 'Lexend',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
};

export default CompetitionLandingPage;