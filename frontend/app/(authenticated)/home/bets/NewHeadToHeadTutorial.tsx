import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, TouchableHighlight, Modal, PanResponder, Animated, TouchableWithoutFeedback, Image, Keyboard, KeyboardAvoidingView, Platform, StyleProp, ViewStyle, StyleSheet as RNStyleSheet, Dimensions } from 'react-native';
import { useUser } from '../../../UserProvider';
import { addToFinishedTutorial } from '@/backend/src/bets';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native-size-scaling';

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
}> = ({ tutorialStep, setTutorialStep, setShowTutorial }) => {
    const { userID, groups, loading } = useUser();
    const router = useRouter();
    const { groupIDTemp } = useLocalSearchParams();
    const groupID = groupIDTemp ? String(groupIDTemp) : '';

    const handleNextStep = () => {
        if (tutorialStep < 11) {
            setTutorialStep(tutorialStep + 1);
        } else {
            setShowTutorial(false);
            addToFinishedTutorial(groupID, userID);
        }
    };

    const getModalStyle = (): StyleProp<ViewStyle> => {
        switch (tutorialStep) {
            case 1:
                return { top: verticalScale(100), width: scale(200), height: verticalScale(100) };
            case 2:
                return { top: verticalScale(0), right: scale(170), width: scale(200), height: verticalScale(100) };
            case 3:
                return { top: verticalScale(300), width: scale(200), height: verticalScale(100) };
            case 4:
                return { top: verticalScale(100), width: scale(200), height: verticalScale(100) };
            case 5:
                return { top: verticalScale(0), right: scale(170), width: scale(200), height: verticalScale(100) };
            case 6:
                return { top: verticalScale(0), width: scale(200), height: verticalScale(90) };
            case 7:
                return { top: verticalScale(90), left: scale(170), width: scale(200), height: verticalScale(90) };
            case 8:
                return { top: verticalScale(0), width: scale(200), height: verticalScale(100) };
            case 9:
                return { top: verticalScale(300), width: scale(200), height: verticalScale(100) };
            case 10:
                return { bottom: verticalScale(90), width: scale(200), height: verticalScale(100) };
            case 11:
                return { bottom: verticalScale(64), width: scale(200), height: verticalScale(100) };
            default:
                return {};
        }
    };

    return (
        <View style={styles.overlayContainer}>
            <View style={[styles.overlay, getModalStyle()]}>
                <Text style={styles.tutorialText}>Tutorial Step {tutorialStep}</Text>
                {![6, 7, 8, 11].includes(tutorialStep) && (
                    <TouchableOpacity onPress={handleNextStep} style={styles.nextButton}>
                        <Text style={styles.nextButtonText}>Next</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlayContainer: {
        flex: 1,
        // backgroundColor: 'rgba(0, 0, 0, 0.5)',
        // justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        position: 'absolute',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
    },
    tutorialText: {
        fontSize: 16,
        marginBottom: 10,
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