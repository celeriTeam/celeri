import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, TouchableHighlight, Modal, PanResponder, Animated, TouchableWithoutFeedback, Image, Keyboard, KeyboardAvoidingView, Platform, StyleProp, ViewStyle, Dimensions } from 'react-native';
import { useUser } from '../../../UserProvider';
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

    const shouldShowNext = [3, 4, 5];

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
            case 1:
                return { top: verticalScale(100), width: scale(200), height: verticalScale(100) };
            case 2:
                return { top: verticalScale(0), right: scale(170), width: scale(200), height: verticalScale(100) };
            case 3:
                return { top: verticalScale(0), width: scale(200), height: verticalScale(90) };
            case 4:
                return { top: verticalScale(90), left: scale(170), width: scale(200), height: verticalScale(90) };
            case 5:
                return { top: verticalScale(0), width: scale(200), height: verticalScale(100) };
            case 6:
                return { bottom: verticalScale(64), width: scale(200), height: verticalScale(100) };
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
                <Text style={styles.tutorialText}>Tutorial Step {tutorialStep}</Text>
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
        fontSize: 16,
        marginBottom: 10,
        color: '#fff',
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

export default NewHeadToHeadTutorial;