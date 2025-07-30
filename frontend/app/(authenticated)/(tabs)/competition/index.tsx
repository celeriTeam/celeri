import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert } from 'react-native';
import { Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet as ScaledStyleSheet } from 'react-native-size-scaling';
import RaceRulesPager from './rules';
import { addUser, fetchCurrentCompetition } from '@backend/src/api'; 
import { useUser } from '@/app/UserProvider';
import { useRouter } from 'expo-router';
import { isUserInCompetition, setUserInCompetition, hasUserConsented } from '@backend/src/competition';

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
    const [timeLeft, setTimeLeft] = useState<string | null>(null);
    const { userID } = useUser();
    const router = useRouter();

    // Check inCompetition before page loads
    useEffect(() => {
        const checkInCompetition = async () => {
            if (userID) {
                const inComp = await isUserInCompetition(userID);
                if (inComp) {
                    router.replace('/(authenticated)/(tabs)/competition/inGame');
                }
            }
        };
        checkInCompetition();
    }, [userID]);

    // Check consent before page loads
    useEffect(() => {
        const checkConsent = async () => {
            if (userID) {
                const consented = await hasUserConsented(userID);
                setHasConsented(consented);
            }
        };
        checkConsent();
    }, [userID]);

    // Fetch current game and set up timer
    useEffect(() => {
        const getCurrentGame = async () => {
            setLoading(true);
            try {
                const game = await fetchCurrentCompetition();
                setCurrentGame(game && game.is_active ? game : null);

                // Set up timer if end_time exists
                if (game && game.end_time) {
                    updateTimer(game.end_time);
                    const interval = setInterval(() => updateTimer(game.end_time), 1000);
                    return () => clearInterval(interval);
                } else {
                    setTimeLeft(null);
                }
            } catch (e) {
                setCurrentGame(null);
                setTimeLeft(null);
            }
            setLoading(false);
        };

        // Helper to update timer
        const updateTimer = (endTimeStr: string) => {
            const endTime = new Date(endTimeStr).getTime();
            const now = Date.now();
            const diff = endTime - now;
            if (diff <= 0) {
                setTimeLeft("00:00:00");
                return;
            }
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft(
                `${hours.toString().padStart(2, '0')}:` +
                `${minutes.toString().padStart(2, '0')}:` +
                `${seconds.toString().padStart(2, '0')}`
            );
        };

        getCurrentGame();
    }, []);

    // Join Game handler
    const handleJoinGame = async () => {
        if (!userID) return;
        if (!hasConsented) {
            Alert.alert(
                "Consent Required",
                "You need to agree to our Consent form before joining the game."
            );
            return;
        }
        await addUser(userID);
        await setUserInCompetition(userID);
        router.replace('/(authenticated)/(tabs)/competition/inGame');
    };

    return (
        <LinearGradient
            colors={['#000000', '#024405']}
            style={styles.container}
        >
            <View style={styles.content}>
                {timeLeft && (
                    <Text style={{ color: '#fff', fontSize: 28, marginBottom: 20 }}>
                        Time left: {timeLeft}
                    </Text>
                )}
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

const joinButtonText = (currentGame: any): TextStyle => ({
    fontSize: 24,
    fontFamily: 'Lexend',
    color: currentGame ? '#000' : '#444',
    fontWeight: 'bold',
});

export default CompetitionLandingPage;
