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

type selectedPropBet = "over" | "under" | null;

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
    const [selectedPropBet, setSelectedPropBet] = useState<selectedPropBet>(null);

    const handleNextStep = async () => {
        if (tutorialStep < 6) {
            if (tutorialStep === 4) {
                setSelectedPropBet(null);
            }
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

    const isNextButtonDisabled = tutorialStep === 4 && selectedPropBet === null;

    const getModalStyle = (): StyleProp<ViewStyle> => {
        switch (tutorialStep) {
            case 1: // "nice job making those bets"
                return { width: scale(guidelineBaseWidth * 0.9), height: verticalScale(150) };
            case 2: // about weekly races
                return { width: scale(guidelineBaseWidth * 0.9), height: verticalScale(250) };
            case 3: // talking about prop bets
                return { width: scale(guidelineBaseWidth * 0.9), height: verticalScale(300) };
            case 4: // prop bet
                return { top: verticalScale(130), width: scale(guidelineBaseWidth * 0.9), height: verticalScale(150) };
            case 5: // steps leaderboard
                return { width: scale(guidelineBaseWidth * 0.9), height: verticalScale(320) };
            case 6: // final
                return { width: scale(guidelineBaseWidth * 0.9), height: verticalScale(240) };
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
                    <TouchableOpacity style={[styles.circle, isNextButtonDisabled && { borderColor: '#656565' }]} onPress={handleNextStep} disabled={isNextButtonDisabled}>
                        <Image
                            source={
                                tutorialStep === 6 ?
                                require('@assets/icons/x.png') :
                                require('@assets/icons/rightArrow.png')
                            }
                            style={[styles.arrow, isNextButtonDisabled && { tintColor: '#656565' } ]}
                        />
                    </TouchableOpacity>
                </View>
                <View>
                    {tutorialStep === 1 && (
                        <Text style={styles.tutorialText}>
                            Welcome to <Text style={styles.greenColor}>your group's home page! </Text>
                            Here, you can track Bets, Steps, Tokens, and much more.
                        </Text>
                    )}
                    {tutorialStep === 2 && (
                        <>
                            <Text style={styles.tutorialText}>
                                Some final important information before we throw you to the sharks -
                            </Text>
                            <Text style={styles.tutorialText}>
                                Remember how there are <Text style={styles.greenColor}>three ways to gain tokens</Text>? 
                                Let's run through the final two. 
                            </Text>
                            <Text style={styles.tutorialText}>
                                1. <Text style={{ textDecorationLine: 'line-through',  }}>Head-To-Head Bets</Text>
                                {'\n'}2. <Text style={styles.greenColor}>Daily Prop Bets</Text>
                                {'\n'}3. <Text style={styles.greenColor}>Weekly Races</Text>
                            </Text>
                        </>
                    )}
                    {tutorialStep === 3 && (
                        <>
                            <Text style={styles.tutorialText}>
                                1. <Text style={{ textDecorationLine: 'line-through',  }}>Head-To-Head Bets</Text>
                                {'\n'}2. <Text style={styles.greenColor}>Daily Prop Bets</Text>
                                {'\n'}3. Weekly Races
                            </Text>

                            <Text style={styles.tutorialText}>
                                <Text style={styles.greenColor}>On days where you've already made 
                                your Head-to-Head bet</Text>, you will receive a <Text style={styles.greenColor}>Daily Prop Bet</Text>.
                            </Text>
                            <Text style={styles.tutorialText}>
                                If you win your Prop Bet, you will <Text style={styles.greenColor}>gain one Diamond. </Text>
                                If you lose, <Text style={styles.greenColor}>nothing happens!</Text>
                            </Text>
                            <Text style={styles.tutorialText}>
                                Diamonds can be used to buy <Text style={styles.greenColor}>Power-Ups</Text> in the store, 
                                which can 
                                influence your Head-To-Head Bets, and by extension, <Text style={styles.greenColor}>your Token count.</Text>
                            </Text>
                        </>
                    )}
                    {tutorialStep === 4 && (
                        <>
                            <Text style={styles.tutorialText}>
                                You will not receive a prop bet today because you just made a Head-to-Head bet.
                            </Text>
                            <Text style={styles.tutorialText}>
                                Here's what your <Text style={styles.greenColor}>Prop Bet</Text> tomorrow might look like:
                            </Text>
                        </>
                    )}
                    {tutorialStep === 5 && (
                        <>
                            <Text style={styles.tutorialText}>
                                1. <Text style={{ textDecorationLine: 'line-through',  }}>Head-To-Head Bets</Text>
                                {'\n'}2. <Text style={{ textDecorationLine: 'line-through',  }}>Daily Prop Bets</Text>
                                {'\n'}3. <Text style={styles.greenColor}>Weekly Races</Text>
                            </Text>
                            <Text style={styles.tutorialText}>
                                The final way to earn tokens is through the <Text style={styles.greenColor}>weekly race</Text>
                                , which <Text style={styles.greenColor}>ends and resets every {resetDay()}</Text>.
                            </Text>
                            <Text style={styles.tutorialText}>
                                On <Text style={styles.greenColor}>{resetDay()}</Text>, the person with the
                                <Text style={styles.greenColor}> most steps</Text> will win the “weekly race” and collect 
                                a 5% tax from all other players - that
                                 means that <Text style={styles.greenColor}>every player would lose 5% of 
                                their total tokens and you could gain all of that for yourself!</Text>
                            </Text>
                            {/* <Text style={styles.tutorialText}>
                                I'm a nerd and want to understand the point of this
                            </Text> */}
                        </>
                    )}
                    {tutorialStep === 6 && (
                        <>
                            <Text style={styles.tutorialText}>
                                Looks like you're all good 
                                to start exploring the rest of the home page!
                            </Text>
                            <Text style={styles.tutorialText}>
                                Every time you 
                                enter a new page, there'll be a <Text style={styles.greenColor}>short tutorial </Text>
                                explaining how it works. Have fun!
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
            {tutorialStep === 4 && (
                <View style={[styles.overlay, { width: scale(guidelineBaseWidth * 0.9), height: verticalScale(360), top: verticalScale(290), }]}>
                    <Text style={styles.title}>Today's Prop Bet</Text>
                    <Text style={styles.text}>How many steps will the following player{'\n'} walk today? If you win the prop bet,{'\n'} you'll earn 
                        <Text style={styles.greenColor}> +1 </Text>
                        <Image
                            source={require('@assets/icons/diamonds.png')}
                            style={{ width: 14, height: 11 }}
                        />
                    </Text>
                    <Text style={styles.name}>{'aidancng'}</Text>
                    <View>
                        <View style={styles.overUnderButtons}>
                            <TouchableOpacity
                                style={selectedPropBet === 'over' ? styles.overUnderButtonTouched : styles.overUnderButtonTouchable}
                                onPress={() => setSelectedPropBet('over')}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.overUnderChooseText}><Text style={{ color: "#74FF6D" }}>Over</Text> {1000}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={selectedPropBet === 'under' ? styles.overUnderButtonTouched : styles.overUnderButtonTouchable}
                                onPress={() => setSelectedPropBet('under')}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.overUnderChooseText}><Text style={{ color: "#74FF6D" }}>Under</Text> {1000}</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={[styles.submitButton, { backgroundColor: selectedPropBet === null ? "#656565" : "#fff", }]}
                            onPress={handleNextStep}
                            disabled={selectedPropBet === null}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.submitButtonText, { color: selectedPropBet === null ? '#fff' : '#000', }]}>Submit</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
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
        borderRadius: 20,
    },
    greenColor: {
        color: '#74FF6D',
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
    
    title: {
        fontFamily: "Lexend",
        color: '#fff',
        fontSize: 22,
        textAlign: 'center',
        margin: 10,
        marginTop: 20,
    },
    text: {
        alignItems: 'center',
        fontFamily: "Lexend",
        color: '#fff',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 15
    },
    name: {
        fontFamily: "Lexend",
        color: '#74FF6D',
        fontSize: 19,
        textAlign: 'center',
        margin: 15,
    },
    overUnderButtons: {
        marginTop: 20, 
        flexDirection: 'row',
        justifyContent: 'center',
        width: '70%',
        alignSelf: 'center',
        gap: 30,
    },
    overUnderButtonTouchable: {
        padding: 10, 
        borderRadius: 25, 
        borderColor: '#fff',
        borderWidth: 1,
    },
    overUnderButtonTouched: {
        padding: 10, 
        borderRadius: 25, 
        // borderColor: '#fff',
        // borderWidth: 1,
        backgroundColor: '#4BFF6C96',
    },
    overUnderChooseText: { 
        fontFamily: "Lexend", 
        fontSize: 15, 
        color: '#fff', 
        paddingHorizontal: 15, 
    },
    submitButton: {
        padding: 10, 
        borderRadius: 25, 
        paddingHorizontal: 25, 
        marginTop: 15, 
        alignSelf: 'center',
    },
    submitButtonText: {
        fontFamily: "Lexend",
        fontSize: 15,
    },
});

export default BetSummaryTutorial;