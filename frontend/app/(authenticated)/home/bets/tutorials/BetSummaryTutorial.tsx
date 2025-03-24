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

const BetSummaryTutorial: React.FC<{
    tutorialStep: number,
    setTutorialStep: (step: number) => void;
    setShowTutorial: (show: boolean) => void;
}> = ({ tutorialStep, setTutorialStep, setShowTutorial }) => {
    const { userID, groups, loading } = useUser();
    const router = useRouter();
    const { groupIDTemp } = useLocalSearchParams();
    const groupID = groupIDTemp ? String(groupIDTemp) : '';

    const shouldShowNext = [3, 4, 5];

    const handleNextStep = async () => {
        if (tutorialStep < 4) {
            setTutorialStep(tutorialStep + 1);
        } else {
            setTutorialStep(1);
            setShowTutorial(false);
        }
    };

    const handlePrevStep = () => {
        if (tutorialStep > 1) {
            setTutorialStep(tutorialStep - 1);
        }
    };

    const getModalStyle = (): StyleProp<ViewStyle> => {
        switch (tutorialStep) {
            case 1: // "nice job making those bets"
                return { width: scale(guidelineBaseWidth * 0.9), height: verticalScale(200) };
            case 2: // about weekly races
                return { width: scale(guidelineBaseWidth * 0.9), height: verticalScale(150) };
            case 3: // tokens leaderboard
                return { bottom: verticalScale(10), width: scale(guidelineBaseWidth * 0.9), height: verticalScale(150) };
            case 4: // steps leaderboard
                return { bottom: verticalScale(10), width: scale(guidelineBaseWidth * 0.9), height: verticalScale(150) };
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
                    <TouchableOpacity style={styles.circle} onPress={handleNextStep}>
                        <Image
                            source={
                                tutorialStep === 4 ?
                                require('@assets/icons/x.png') :
                                require('@assets/icons/rightArrow.png')
                            }
                            style={styles.arrow}
                        />
                    </TouchableOpacity>
                </View>
                <Text style={styles.tutorialText}>
                    {tutorialStep === 1 && (
                        <Text style={styles.tutorialText}>
                            Welcome to your group's home page! Here, you can track bets, steps, tokens, and much more.
                        </Text>
                    )}
                    {tutorialStep === 2 && (
                        <Text style={styles.tutorialText}>
                            At the top, you can check how much longer the game will run, as well as how long until new head-to-head bets drop.
                        </Text>
                    )}
                    {tutorialStep === 3 && (
                        <Text style={styles.tutorialText}>
                            Below, you can see who has the most tokens. If it's not you, you should act fast!
                        </Text>
                    )}
                    {tutorialStep === 4 && (
                        <Text style={styles.tutorialText}>
                            On the steps side of the leaderboard, you can see who has the most steps. Keep in mind -- this resets with every new head to head bet!
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
        // center
        justifyContent: 'center',
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
        fontSize: 16,
        marginBottom: 10,
        color: '#fff',
        fontFamily: 'Lexend',
    },
    nextButton: {
        backgroundColor: '#007bff',
        padding: 10,
        borderRadius: 5,
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 16,
    },
});

export default BetSummaryTutorial;