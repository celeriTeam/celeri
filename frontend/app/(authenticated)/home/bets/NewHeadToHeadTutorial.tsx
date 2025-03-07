import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, TouchableHighlight, Modal, PanResponder, Animated, TouchableWithoutFeedback, Image, Keyboard, KeyboardAvoidingView, Platform, StyleProp, ViewStyle, StyleSheet as RNStyleSheet } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUser } from '../../../UserProvider';
import { addToFinishedTutorial } from '@/backend/src/bets';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native-size-scaling';
import NewHeadToHeadPage from './NewHeadToHead';

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
        if (tutorialStep < 5) {
            setTutorialStep(tutorialStep + 1);
        } else {
            setShowTutorial(false);
        }
    };

    const getOverlayStyle = () => {
        switch (tutorialStep) {
            case 1:
                return { top: 100, width: 200, height: 100 };
            case 2:
                return { top: 200, width: 200, height: 100 };
            case 3:
                return { top: 300, width: 200, height: 100 };
            case 4:
                return { top: 400, width: 200, height: 100 };
            case 5:
                return { top: 500, width: 200, height: 100 };
            default:
                return {};
        }
    };

    return (
        <View style={styles.overlayContainer}>
            <View style={[styles.overlay, getOverlayStyle()]}>
                <Text style={styles.tutorialText}>Tutorial Step {tutorialStep}</Text>
                <TouchableOpacity onPress={handleNextStep} style={styles.nextButton}>
                    <Text style={styles.nextButtonText}>Next</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlayContainer: {
        flex: 1,
        // backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
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