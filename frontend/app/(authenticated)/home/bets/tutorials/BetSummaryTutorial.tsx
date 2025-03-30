import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, TouchableHighlight, Modal, PanResponder, Animated, TouchableWithoutFeedback, Image, Keyboard, KeyboardAvoidingView, Platform, StyleProp, ViewStyle, Dimensions } from 'react-native';
import { useUser } from '../../../../UserProvider';
import { addToFinishedTutorial } from '@/backend/src/bets';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native-size-scaling';
import { setUserFinishedTutorial } from '@/backend/src/users';
import { addDiamonds } from '@/backend/src/groups';

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
    const [addedDiamond, setAddedDiamond] = useState(false);

    const handleNextStep = async () => {
        if (tutorialStep < 5) {
            setTutorialStep(tutorialStep + 1);
        } else {
            await addDiamonds(groupID, userID, 1);
            setTutorialStep(1);
            setShowTutorial(false);
        }
    };

    const handlePrevStep = () => {
        if (tutorialStep > 1) {
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

    const resetDay = () => {
        // groups[groupID]?.resetDay is a number; change that into the day, aka Sunday, Monday, ..
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayIndex = groups[groupID]?.resetDay;
        return days[dayIndex];
    }

    const getModalStyle = (): StyleProp<ViewStyle> => {
        switch (tutorialStep) {
            case 1: // "nice job making those bets"
                return { width: scale(guidelineBaseWidth * 0.9), height: verticalScale(150) };
            case 2: // about weekly races
                return { width: scale(guidelineBaseWidth * 0.9), height: verticalScale(250) };
            case 3: // talking about prop bets
                return { width: scale(guidelineBaseWidth * 0.9), height: verticalScale(guidelineBaseHeight * 0.6) };
            case 4: // steps leaderboard
                return { bottom: verticalScale(10), width: scale(guidelineBaseWidth * 0.9), height: verticalScale(320) };
            case 5: // final
                return { width: scale(guidelineBaseWidth * 0.9), height: verticalScale(280) };
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
                                tutorialStep === 5 ?
                                require('@assets/icons/x.png') :
                                require('@assets/icons/rightArrow.png')
                            }
                            style={styles.arrow}
                        />
                    </TouchableOpacity>
                </View>
                <View>
                    {tutorialStep === 1 && (
                        <Text style={styles.tutorialText}>
                            Welcome to your group's home page! Here, you can track bets, steps, tokens, and much more.
                        </Text>
                    )}
                    {tutorialStep === 2 && (
                        <>
                            <Text style={styles.tutorialText}>
                                Some final important information before we throw you to the sharks -
                            </Text>
                            <Text style={styles.tutorialText}>
                                Remember how there are three ways to gain tokens? Let's run through the <Text style={{ color: '#74FF6D' }}>other two</Text>. 
                            </Text>
                            <Text style={styles.tutorialText}>
                                1. <Text style={{ textDecorationLine: 'line-through',  }}>Head to head bets</Text>
                                {'\n'}2. <Text style={{ color: '#74FF6D' }}>Daily prop bets</Text>
                                {'\n'}3. <Text style={{ color: '#74FF6D' }}>Weekly races</Text>
                            </Text>
                        </>
                    )}
                    {tutorialStep === 3 && (
                        <>
                            <Text style={styles.tutorialText}>
                                1. <Text style={{ textDecorationLine: 'line-through',  }}>Head to head bets</Text>
                                {'\n'}2. <Text style={{ color: '#74FF6D' }}>Daily prop bets</Text>
                                {'\n'}3. Weekly races
                            </Text>

                            <Text style={styles.tutorialText}>
                                <Text style={{ color: '#74FF6D' }}>{groups[groupID]?.gameType === 'weekly' ? 'Six' : 'Five'} days </Text>
                                 a week, (non head-to-head bet reset days), 
                                you will receive a prop bet. If you win your prop bet, you will gain
                                <Text style={{ color: '#74FF6D' }}> one diamond</Text>. If you lose, nothing happens!
                            </Text>
                            <Text style={styles.tutorialText}>
                                Diamonds can be used to buy <Text style={{ color: '#74FF6D' }}>power ups</Text> in the store, 
                                which can 
                                influence your head-to-head bets, and by extension, your token count
                            </Text>
                            <Text style={styles.tutorialText}>
                                Here's an example of what a prop bet might look like.
                            </Text>
                        </>
                    )}
                    {tutorialStep === 4 && (
                        <>
                            <Text style={styles.tutorialText}>
                                1. <Text style={{ textDecorationLine: 'line-through',  }}>Head to head bets</Text>
                                {'\n'}2. <Text style={{ textDecorationLine: 'line-through',  }}>Daily prop bets</Text>
                                {'\n'}3. <Text style={{ color: '#74FF6D' }}>Weekly races</Text>
                            </Text>
                            <Text style={styles.tutorialText}>
                                The final way to earn tokens is through the weekly race, which ends
                                 and resets every <Text style={{ color: '#74FF6D' }}>{resetDay()}</Text>.
                            </Text>
                            <Text style={styles.tutorialText}>
                                On <Text style={{ color: '#74FF6D' }}>{resetDay()}</Text>, the person with the most 
                                steps will win the “weekly race” and collect 
                                a <Text style={{ color: '#74FF6D' }}>5% tax</Text> from all other players - that
                                 means that every player would lose <Text style={{ color: '#74FF6D' }}>5%</Text> of 
                                their total tokens and you could gain all of that for yourself!
                            </Text>
                            {/* <Text style={styles.tutorialText}>
                                I'm a nerd and want to understand the point of this
                            </Text> */}
                        </>
                    )}
                    {tutorialStep === 5 && (
                        <>
                            <Text style={styles.tutorialText}>
                                1. <Text style={{ textDecorationLine: 'line-through',  }}>Head to head bets</Text>
                                {'\n'}2. <Text style={{ textDecorationLine: 'line-through',  }}>Daily prop bets</Text>
                                {'\n'}3. <Text style={{ textDecorationLine: 'line-through',  }}>Weekly races</Text>
                            </Text>
                            <Text style={styles.tutorialText}>
                            <Text style={{ color: '#74FF6D' }}>Looks like you're all good </Text>
                            to start exploring the rest of the home page! Every time you 
                            enter a new page, there'll be a short tutorial explaining how it works. 
                            <Text style={{ color: '#74FF6D' }}> Have fun!</Text>
                            </Text>
                            <View style={{ alignItems: 'center' }}>
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
        fontSize: 15,
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

export default BetSummaryTutorial;