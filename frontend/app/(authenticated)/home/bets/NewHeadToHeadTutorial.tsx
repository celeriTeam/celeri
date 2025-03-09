import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, TouchableHighlight, Modal, PanResponder, Animated, TouchableWithoutFeedback, Image, Keyboard, KeyboardAvoidingView, Platform, StyleProp, ViewStyle, StyleSheet as RNStyleSheet } from 'react-native';
import { useUser } from '../../../UserProvider';
import { addToFinishedTutorial } from '@/backend/src/bets';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native-size-scaling';

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
        if (tutorialStep < 10) {
            setTutorialStep(tutorialStep + 1);
        } else {
            setShowTutorial(false);
            addToFinishedTutorial(groupID, userID);
        }
    };

    const getModalStyle = (): StyleProp<ViewStyle> => {
        switch (tutorialStep) {
            case 1:
                return { top: 100, width: 200, height: 100 };
            case 2:
                return { top: 0, right: 170, width: 200, height: 100 };
            case 3:
                return { top: 300, width: 200, height: 100 };
            case 4:
                return { top: 100, width: 200, height: 100 };
            case 5:
                return { top: 0, right: 170, width: 200, height: 100 };
            case 6:
                return { top: 0, width: 200, height: 90 };
            case 7:
                return { top: 90, left: 170, width: 200, height: 90 };
            case 8:
                return { top: 300, width: 200, height: 100 };
            case 9:
                return { bottom: 20, width: 200, height: 100 };
            case 10:
                return { bottom: 100, right: 30, width: 200, height: 100 };
            default:
                return {};
        }
    };

    return (
        <View style={styles.overlayContainer}>
            <View style={[styles.overlay, getModalStyle()]}>
                <Text style={styles.tutorialText}>Tutorial Step {tutorialStep}</Text>
                {![6, 7].includes(tutorialStep) && (
                    <TouchableOpacity onPress={handleNextStep} style={styles.nextButton}>
                        {tutorialStep === 10 ? (
                            <Text style={styles.nextButtonText}>Start Betting</Text>
                        ) : (
                            <Text style={styles.nextButtonText}>Next</Text>
                        )}
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