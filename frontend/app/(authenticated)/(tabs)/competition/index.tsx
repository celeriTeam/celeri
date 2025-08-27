import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, NativeEventEmitter } from 'react-native';
import { Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet as ScaledStyleSheet } from 'react-native-size-scaling';
import RaceRulesPager from './rules';
import { fetchCurrentCompetition, fetchCompetition } from '@backend/src/api/competitions';
import { addCompetitionUser, getCompetitionData, getCompetitionHasSeenResults, getReferralsData, setCompetitionHasSeenResults } from '@backend/src/api/competition_steps';
import { useUser } from '@/app/UserProvider';
import { useRouter } from 'expo-router';
import { isUserInCompetition, setUserInCompetition, hasUserConsented, getReferral } from '@backend/src/competition';
import messaging from '@react-native-firebase/messaging';
import { NativeModules, AppState, Platform } from 'react-native';
import { EventEmitter, requireNativeModule } from 'expo-modules-core';



import LiveHealthkit from '@/modules/live-healthkit';

const native = requireNativeModule('LiveHealthkit');

// See what's really there
// console.log('LiveHealthkit keys:', Object.getOwnPropertyNames(native));
// console.log('typeof hello:', typeof native.hello);
// console.log('typeof requestAuthorization:', typeof native.requestAuthorization);
// console.log('typeof startWorkoutSession:', typeof native.startWorkoutSession);
// console.log('typeof stopWorkoutSession:', typeof native.stopWorkoutSession);


const { StepSession } = NativeModules;

const { width, height } = Dimensions.get('window');

const guidelineBaseWidth = 393;
const guidelineBaseHeight = 852;

const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const CompetitionLandingPage: React.FC = () => {
    const [modalVisible, setModalVisible] = useState(false);
    const [currentGame, setCurrentGame] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [hasConsented, setHasConsented] = useState<boolean | null>(null);
    const [showResults, setShowResults] = useState<any | false>(false);
    const [prevData, setPrevData] = useState<any>({});
    const [referralResults, setReferralResults] = useState<any[]>([]);
    const [stepCount, setStepCount] = useState(0);
    const { userID } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (Platform.OS !== 'ios') return;

        // 1) Get the module (this throws if not linked — good!)
       const testLiveHealthkit = async () => {
            try {
                const mod = LiveHealthkit ?? requireNativeModule('LiveHealthkit');
                const val = await mod.hello(); // Now properly awaited
                console.log('hello ->', val); // Should show "Hello world! 👋"
            } catch (err) {
                console.warn('LiveHealthkit not available:', err);
            }
        };

        testLiveHealthkit();
    }, []);

    // 1) central fetch + nav logic

    const getCurrentGame = useCallback(async () => {
        setLoading(true);
        try {
            const game = await fetchCurrentCompetition();
            console.log('Fetched game:', game);
            if (game?.is_active) {
                setCurrentGame(game); // Enable "Join Game" button
            } else {
                setCurrentGame(null); // Disable button
            }
            const isResults = await getCompetitionHasSeenResults(userID);
            if (isResults?.competition_id) {
                console.log('isResults: ', isResults?.competition_id);
                const prevCompetitionData = await getCompetitionData(isResults.competition_id);
                const prevCompetition = await fetchCompetition(isResults.competition_id);
                const referralsData = await getReferralsData(isResults.competition_id)
                console.log('prevcomp: ', prevCompetitionData);
                console.log('prevdata: ', prevCompetition[0]);
                console.log('referralsdata: ', referralsData);
                setShowResults(prevCompetitionData);
                setPrevData(prevCompetition[0]);
                setReferralResults(referralsData);
            } else {
                setShowResults(false);
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
                router.replace('/(authenticated)/(tabs)/competition/inGame');
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
        const unsubscribe = messaging().onMessage(remoteMsg => {
            console.log('Received foreground message:', remoteMsg);
            if (remoteMsg.data?.type === 'TOGGLE_COMPETITION') {
                console.log('Competition started notification received');
                getCurrentGame();
            }
        });

        return unsubscribe; // cleans up the listener on unmount
    }, [getCurrentGame]);


    // 5. Join Game handler
    const handleJoinGame = async () => {
        console.log("testing one");
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

        if (Platform.OS === 'ios') {
            // const ok = await StepSession?.ensurePermissions();
            // console.log('ensurePermissions result:', ok);
            // if (!ok) {
            //     Alert.alert('Permissions', 'Health permissions denied');
            //     return;
            // }

            // const startAt = new Date();
            // const endAt = new Date(startAt.getTime() + 60 * 60 * 1000); // +1 hour

            // await StepSession.start({
            //     startAtIso: startAt.toISOString(),
            //     endAtIso: endAt.toISOString(),
            //     uploadUrl: 'https://example.com/steps', // replace with real endpoint or leave placeholder
            //     authHeader: null,
            //     competitionId: currentGame?.id ?? 'temp'
            // });
        }


        const referralId: string | null = await getReferral(userID);
        await addCompetitionUser(userID, referralId);
        await setUserInCompetition(userID);
        router.replace('/(authenticated)/(tabs)/competition/inGame');
    };

    const handleResultsClose = async () => {
        const competition_id = prevData.id;
        setShowResults(false);
        // console.log('competition id: ', competition_id);
        setCompetitionHasSeenResults(userID, competition_id);
    };

    useEffect(() => {
        if (Platform.OS !== 'ios') return;

        try {
            // Test hello function
            const testModule = async () => {
                try {
                    const hello = await LiveHealthkit.hello();
                    console.log('LiveHealthkit says:', hello);
                } catch (err) {
                    console.error('LiveHealthkit test failed:', err);
                }
            };
            testModule();

            // Listen for test events
            const testSub = LiveHealthkit.addListener('onChange', (event) => {
                console.log('TEST EVENT RECEIVED:', event);
            });

            // Listen for step updates
            const stepSub = LiveHealthkit.addListener('onMinuteSteps', (event) => {
                console.log('STEP UPDATE RECEIVED:', event);
                setStepCount(Number(event.value));
            });
            
            // Trigger test events
            LiveHealthkit.emitTest();
            
            // Start workout session
            // const startSession = async () => {
            //   try {
            //     const authorized = await LiveHealthkit.requestAuthorization();
            //     if (authorized) {
            //       await LiveHealthkit.startWorkoutSession();
            //       console.log('Workout session started');
            //     } else {
            //       console.warn('Health permissions denied');
            //     }
            //   } catch (err) {
            //     console.error('Failed to start workout:', err);
            //   }
            // };
            
            // // Start the session
            // startSession();

            // return () => {
            //   testSub.remove();
            //   stepSub.remove();
            //   LiveHealthkit.stopWorkoutSession().catch(console.error);
            // };
        } catch (err) {
            console.error('LiveHealthkit setup failed:', err);
        }
    }, []);

    return (
        <LinearGradient
            colors={['#000000', '#024405']}
            style={styles.container}
        >
            <View style={styles.content}>
                <TouchableOpacity
                    style={joinButton(currentGame)}
                    onPress={handleJoinGame}
                    disabled={!currentGame || loading}
                >
                    <Text style={joinButtonText(currentGame)}>
                        {loading ? "Loading..." : "Join Game"}
                    </Text>
                </TouchableOpacity>
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
                <View style={styles.modalOverlay} >
                    <View style={[styles.modalContainer, { height: '75%' }]}>
                        <LinearGradient
                            colors={['#000000', '#024405']}
                            style={styles.insideContainer}
                        >
                            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
                                <Text style={{ color: '#fff', fontSize: 24 }}>✕</Text>
                            </TouchableOpacity>
                            <RaceRulesPager closeModal={() => setModalVisible(false)} />
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
            <Text style={styles.stepCount}>{stepCount} steps</Text>
        </LinearGradient>
    );
};

const styles = ScaledStyleSheet.create({
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
import ResultsModal from './resultsModal';

const joinButtonText = (currentGame: any): TextStyle => ({
    fontSize: 24,
    fontFamily: 'Lexend',
    color: currentGame ? '#000' : '#444',
    fontWeight: 'bold',
});

export default CompetitionLandingPage;