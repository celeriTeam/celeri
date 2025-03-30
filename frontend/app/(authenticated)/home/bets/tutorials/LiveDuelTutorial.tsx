import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, TouchableHighlight, Modal, PanResponder, Animated, TouchableWithoutFeedback, Image, Keyboard, KeyboardAvoidingView, Platform, StyleProp, ViewStyle, Dimensions } from 'react-native';
import { useUser } from '../../../../UserProvider';
import { addToFinishedTutorial } from '@/backend/src/bets';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native-size-scaling';
import { setUserFinishedTutorial } from '@/backend/src/users';
import { addDiamonds, setTutorialStatus } from '@/backend/src/groups';

const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const LiveDuelTutorial: React.FC<{
    tutorialStep: number,
    setTutorialStep: (step: number) => void;
    setLiveDuelModalVisible: (visible: boolean) => void;
}> = ({ tutorialStep, setTutorialStep, setLiveDuelModalVisible }) => {
    const { userID, groups, loading } = useUser();
    const router = useRouter();
    const { groupIDTemp } = useLocalSearchParams();
    const groupID = groupIDTemp ? String(groupIDTemp) : '';
    const [addedDiamond, setAddedDiamond] = useState(false);

    const handleNextStep = async () => {
        if (tutorialStep === 3) {
            setLiveDuelModalVisible(false);
            setTutorialStep(tutorialStep + 1);
        } else if (tutorialStep === 4) {
            await addDiamonds(groupID, userID, 1);
            await setTutorialStatus(groupID, userID, 'liveDuels');
            setTutorialStep(1);
            setLiveDuelModalVisible(false);
        } else {
            setTutorialStep(tutorialStep + 1);
        }
    };

    const handlePrevStep = () => {
        if (tutorialStep === 4) {
            setLiveDuelModalVisible(true);
            setTutorialStep(tutorialStep - 1);
        } else if (tutorialStep > 1) {
            setTutorialStep(tutorialStep - 1);
        }
    };
        
    const addDiamond = async () => {
        try {
            setAddedDiamond(true);
        } catch (error) {
            console.error('Error adding diamond:', error);
        }
    };

    const getModalStyle = (): StyleProp<ViewStyle> => {
        switch (tutorialStep) {
            case 1: // "see each player"
                return { top: verticalScale(10), width: scale(guidelineBaseWidth * 0.9), height: verticalScale(200) };
            case 2: // bets placed
                return { top: verticalScale(10), width: scale(guidelineBaseWidth * 0.9), height: verticalScale(140) };
            case 3: // powerups used
                return { bottom: verticalScale(10), width: scale(guidelineBaseWidth * 0.9), height: verticalScale(150) };
            case 4: // steps leaderboard
                return { bottom: verticalScale(10), width: scale(guidelineBaseWidth * 0.9), height: verticalScale(160) };
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
                {tutorialStep === 1 && (
                    <Text style={styles.tutorialText}>
                        Welcome to the live duel pop-up! Up here, you'll be able to find the two players going head-to-head, their steps so far, and the amount of tokens that people have bet on them.
                    </Text>
                )}
                {tutorialStep === 2 && (
                    <Text style={styles.tutorialText}>
                       Under Bets Placed, you'll be able to see who made those bets, and how much they wagered.
                    </Text>
                )}
                {tutorialStep === 3 && (
                    <Text style={styles.tutorialText}>
                       Under Powerups Used, you can see if anyone has bought powerups to boost a player. You can buy powerups in the store!
                    </Text>
                )}
                {tutorialStep === 4 && (
                    <>
                        <Text style={styles.tutorialText}>
                            Now, swipe through to see who's up against who!
                        </Text>
                        <View style={{ alignItems: 'center', marginTop: -20, }}>
                            <TouchableOpacity onPress={addDiamond} style={[styles.diamondsButton, addedDiamond && { borderColor: '#ffffff80' }]} disabled={addedDiamond}>
                                <Text style={[{ fontFamily: 'Lexend', color: '#fff', }, addedDiamond && { color: '#ffffff80' }]}>+1</Text>
                                <Image
                                    source={require('@assets/icons/diamonds.png')}
                                    style={[styles.diamondsIcon, addedDiamond && { tintColor: '#74FF6D80' }]}
                                />
                            </TouchableOpacity>
                        </View>
                    </>
                )}
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
        fontFamily: 'Lexend'
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
    diamondsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderRadius: 10,
        marginTop: 25,
        borderWidth: 1,
        borderColor: '#fff',
        gap: 5,
    },
    diamondsIcon: {
        width: 14,
        height: 12,
    },
});

export default LiveDuelTutorial;