import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, TouchableHighlight, Modal, PanResponder, Animated, TouchableWithoutFeedback, Image, Keyboard, KeyboardAvoidingView, Platform, StyleProp, ViewStyle, Dimensions } from 'react-native';
import { useUser } from '../../../../UserProvider';
import { addToFinishedTutorial } from '@/backend/src/bets';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native-size-scaling';
import { setUserFinishedTutorial } from '@/backend/src/users';

const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const NewHeadToHeadTutorial: React.FC<{
    tutorialStep: number,
    setTutorialStep: (step: number) => void;
    setShowTutorial: (show: boolean) => void;
    showNext: boolean;
    setShowNext: (show: boolean) => void;
}> = ({ tutorialStep, setTutorialStep, setShowTutorial, showNext, setShowNext }) => {
    const { userID, groups, loading } = useUser();
    const router = useRouter();
    const { groupIDTemp } = useLocalSearchParams();
    const groupID = groupIDTemp ? String(groupIDTemp) : '';
    const [gameType, setGameType] = useState<string | undefined>("");
    const [resetDay, setResetDay] = useState<number>(0);

    const shouldShowNext = [3, 4, 5];

    const resetDayItems = [
        { label: 'Sunday', value: 0},
        { label: 'Monday', value: 1},
        { label: 'Tuesday', value: 2},
        { label: 'Wednesday', value: 3},
        { label: 'Thursday', value: 4},
        { label: 'Friday', value: 5},
        { label: 'Saturday', value: 6},
    ]

    useEffect(() => {    
        const initialize = async () => {
            try {
                fetchData();
            } catch (error) {
                console.error('Error fetching user groups:', error);
            }
        };
    
        initialize();
    }, []);

    const fetchData = () => {
        console.log("NewHeadToHeadTutorial -- fetching data");
        setGameType(groups[groupID]?.gameType);
        setResetDay(groups[groupID]?.resetDay);
    }

    const handleNextStep = async () => {
        if (tutorialStep < 6) {
            if (shouldShowNext.includes(tutorialStep + 1)) {
                setShowNext(false);
            }
            setTutorialStep(tutorialStep + 1);
        } else {
            setShowTutorial(false);
            await setUserFinishedTutorial(userID);
            await addToFinishedTutorial(groupID, userID);
        }
    };

    const handlePrevStep = () => {
        if (tutorialStep > 1) {
            if (shouldShowNext.includes(tutorialStep)) {
                setShowNext(true);
            }
            setTutorialStep(tutorialStep - 1);
        }
    };

    const getModalStyle = (): StyleProp<ViewStyle> => {
        switch (tutorialStep) {
            case 1: // about weekly bets
                return { top: verticalScale(100), width: scale(guidelineBaseWidth * 0.9), height: verticalScale(230) };
            case 2: // bets + number of tokens
                return { top: verticalScale(0), right: scale(170), width: scale(200), height: verticalScale(270) };
            case 3: // choose desired player
                return { top: verticalScale(0), width: scale(guidelineBaseWidth * 0.9), height: verticalScale(90) };
            case 4: // choose desired bet amount
                return { top: verticalScale(90), width: scale(guidelineBaseWidth * 0.9), height: verticalScale(120) };
            case 5: // wait for all bets to be placed
                return { top: verticalScale(0), width: scale(guidelineBaseWidth * 0.9), height: verticalScale(100) };
            case 6: // submit
                return { bottom: verticalScale(64), width: scale(guidelineBaseWidth * 0.9), height: verticalScale(100) };
            default:
                return {};
        }
    };

    return (
        <View style={styles.overlayContainer}>
            <View style={[styles.overlay, getModalStyle()]}>
                <View style={styles.arrowContainer}>
                    <TouchableOpacity style={[styles.circle, tutorialStep === 1 && { borderColor: '#656565' }]} onPress={handlePrevStep} disabled={tutorialStep === 1}>
                        <Image
                            source={require('@assets/icons/leftArrow.png')}
                            style={[styles.arrow, tutorialStep === 1 && { tintColor: '#656565' } ]}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.circle, (!showNext || tutorialStep >= 6) && { borderColor: '#656565' }]} onPress={handleNextStep} disabled={!showNext || tutorialStep >= 6}>
                        <Image
                            source={require('@assets/icons/rightArrow.png')}
                            style={[styles.arrow, (!showNext || tutorialStep >= 6) && { tintColor: '#656565' }]}
                        />
                    </TouchableOpacity>
                </View>
                <Text style={styles.tutorialText}>
                    {tutorialStep === 1 && (
                        <Text style={styles.tutorialText}>
                            <Text style={styles.highlight}>1. Head-to-head bets{'\n\n'}</Text>
                            {gameType === 'biweekly' && (
                                <Text>
                                    In this game, you will receive new head-to-head bets twice a week.{'\n\n'}
                                    They will drop on<Text style={styles.highlight}> {resetDayItems[resetDay].label}s at 12:00 AM </Text>
                                    and<Text style={styles.highlight}> {resetDayItems[(resetDay + 3) % 7].label}s at 12:00 PM. </Text>
                                </Text>
                            )}
                            {gameType === 'weekly' && (
                                <Text>
                                    In this game, you will receive new head-to-head bets oncea week.{'\n\n'}
                                    They will drop on<Text style={styles.highlight}> {resetDayItems[resetDay].label}s at 12:00 AM </Text>
                                </Text>
                            )}
                        </Text>
                    )}
                    {tutorialStep === 2 && (
                        <Text style={styles.tutorialText}>
                            Over here, you can keep track of how many tokens you have and how many you've bet so far.
                            {'\n\n'}
                            Be careful! You can't bet more than you have, so try to conserve your tokens in case you lose everything! 
                        </Text>
                    )}

                    {tutorialStep === 3 && (
                        <Text style={styles.tutorialText}>
                            Let's start betting! Choose a player.
                        </Text>
                    )}

                    {tutorialStep === 4 && (
                        <Text style={styles.tutorialText}>
                            Solid choice. Now, how much will you wager? <Text style={styles.highlight}>If you lose your bet, you lose everything you wager.</Text>
                        </Text>
                    )}

                    {tutorialStep === 5 && (
                        <Text style={styles.tutorialText}>
                            Now, if there are more bets to be made, swipe through!
                        </Text>
                    )}

                    {tutorialStep === 6 && (
                        <Text style={styles.tutorialText}>
                            Confident? Submit your bets below!
                        </Text>
                    )}

                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlayContainer: {
        flex: 1,
        alignItems: 'center',
    },
    overlay: {
        position: 'absolute',
        backgroundColor: '#000',
        borderWidth: 1,
        borderColor: '#fff',
        padding: 20,
        borderRadius: 10,
    },
    arrowContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 10,
    },
    circle: {
        width: 21,
        height: 21,
        borderRadius: 15,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 5,
    },
    arrow: {
        width: 11,
        height: 11,
        tintColor: '#fff',
    },
    tutorialText: {
        fontSize: 14,
        marginBottom: 10,
        color: '#fff',
        fontFamily: 'Lexend',
    },
    highlight: {
        fontSize: 14,
        fontFamily: 'Lexend',
        color: '#74FF6D', // Light green color for highlighted text
    },
    nextButton: {
        backgroundColor: '#007bff',
        padding: 10,
        borderRadius: 5,
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 14,
    },
});

export default NewHeadToHeadTutorial;