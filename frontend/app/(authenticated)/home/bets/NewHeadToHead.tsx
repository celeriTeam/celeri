import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet as RNStyleSheet, TextInput, Keyboard, TouchableWithoutFeedback, Modal, Dimensions, ScrollView, StyleProp, ViewStyle, KeyboardAvoidingView } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useUser } from '../../../UserProvider';
import { addToFinishedBetting, addToFinishedRecap, addToFinishedTutorial, createBet, getUnbetDuels } from '@/backend/src/bets';
import BetRecapPage from './Recap';
import WeeklyBetRecapPage from './WeeklyRecap';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getGroupIsFirstDay, getTodaysBetTokens, getUserTokens, setLatestBetTime, setTodaysBetTokens } from '@/backend/src/groups';
import { LinearGradient } from 'expo-linear-gradient';
import { match } from 'assert';
import { getLastWeekSteps, getWeeklyDuelsWon } from '@/backend/src/users';
import { useTabBar } from '../../../../hooks/useTabBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-size-scaling';
import NewHeadToHeadTutorial from './tutorials/NewHeadToHeadTutorial';


const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const NewHeadToHeadPage: React.FC = () => {
    const { userID, groups, loading } = useUser();
    const route = useRouter();
    const { groupIDTemp, showTutorialTemp } = useLocalSearchParams();
    const groupID = groupIDTemp ? String(groupIDTemp) : '';
    const [matchups, setMatchups] = useState<{
        duelID: string,
        player1: {
            id: string,
            username: string,
            profilePic: string,
            duelsWon: number,
            prevSteps: number,
            stepChange: number
        },
        player2: {
            id: string,
            username: string,
            profilePic: string,
            duelsWon: number,
            prevSteps: number,
            stepChange: number
        },
    }[]>([]);
    const [betAmount, setBetAmount] = useState<string[]>([]);
    const [chosenPlayer, setChosenPlayer] = useState<string[]>([]);
    const [chosenProfilePic, setChosenProfilePic] = useState<string[]>([]);
    const [currentUserTokens, setCurrentUserTokens] = useState<number>(0);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [currentMatchupIndex, setCurrentMatchupIndex] = useState(0);
    const [changePageForUserName, setChangePageForUserName] = useState(false);
    const [gameTimeLeft, setGameTimeLeft] = useState("");
    const [isModalVisible, setModalVisible] = useState(true);
    // const [infoModalVisible, setInfoModalVisible] = useState(false);
    const [isSubmittedModalVisible, setSubmittedModalVisible] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(1);
    const [showTutorial, setShowTutorial] = useState(showTutorialTemp === 'true' ? true : false);
    const [shouldShowNext, setShouldShowNext] = useState(true);
    const [triggerSubmitCheck, setTriggerSubmitCheck] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const increments = [25, 50, 100, 250];

    const { hideTabBar, showTabBar } = useTabBar();

    useEffect(() => {
        hideTabBar();
        return () => {
            showTabBar();
        };
    }, []);

    const router = useRouter();
    const screenWidth = Dimensions.get('window').width;
    const scrollViewRef = useRef<ScrollView>(null);
    
    const insideScrollTutorialSteps = [2, 3, 4];
    const notInsideScrollTutorialSteps = [1, 5, 6];

    const closeModal = async () => {
        setModalVisible(false);
        await addToFinishedRecap(groupID, userID);
    };

    useEffect(() => {
        // if (!loading) {
        fetchData();
        // }
    }, []);

    const fetchUserName = (matchups: { duelID: string, player1: string; player2: string; }[]) => {
        try {
            const newMatchups: any[] = [];
            // Get user's tokens
            const userTokens = groups[groupID]?.userTokens;
            setCurrentUserTokens(userTokens);
            //map for each matchup
            {
                matchups.map((matchup) => {
                    const player1ID = matchup.player1;
                    const player1Name = groups[groupID]?.users[player1ID]?.username;
                    const player1Pic = groups[groupID]?.users[player1ID]?.profilePic;
                    const player1Steps = groups[groupID]?.users[player1ID]?.lastWeekSteps;
                    const player1WonDuels = groups[groupID]?.users[player1ID]?.weeklyDuelsWon;
                    const player1StepsFromWeekBefore = groups[groupID]?.users[player1ID]?.stepsFromWeekBefore;
                    let player1StepsChangeFromWeekBefore = 0;
                    if (player1StepsFromWeekBefore !== 0 && player1Steps !== 0) {
                        player1StepsChangeFromWeekBefore = Math.round(((player1Steps - player1StepsFromWeekBefore) / player1StepsFromWeekBefore) * 100);
                    }

                    const player2ID = matchup.player2;
                    const player2Name = groups[groupID]?.users[player2ID]?.username;
                    const player2Pic = groups[groupID]?.users[player2ID]?.profilePic;
                    const player2Steps = groups[groupID]?.users[player2ID]?.lastWeekSteps;
                    const player2WonDuels = groups[groupID]?.users[player2ID]?.weeklyDuelsWon;
                    const player2StepsFromWeekBefore = groups[groupID]?.users[player2ID]?.stepsFromWeekBefore;
                    // console.log("player2StepsFromWeekBefore: ", player2StepsFromWeekBefore, player2ID);
                    let player2StepsChangeFromWeekBefore = 0;
                    if (player2StepsFromWeekBefore !== 0 && player2Steps !== 0) {
                        player2StepsChangeFromWeekBefore = Math.round(((player2Steps - player2StepsFromWeekBefore) / player2StepsFromWeekBefore) * 100);
                    }

                    newMatchups.push({
                        duelID: matchup.duelID,
                        player1: {
                            id: player1ID,
                            username: player1Name,
                            profilePic: player1Pic,
                            duelsWon: player1WonDuels,
                            prevSteps: Math.floor(player1Steps),
                            stepChange: player1StepsChangeFromWeekBefore, // in percentage
                        },
                        player2: {
                            id: player2ID,
                            username: player2Name,
                            profilePic: player2Pic,
                            duelsWon: player2WonDuels,
                            prevSteps: Math.floor(player2Steps),
                            stepChange: player2StepsChangeFromWeekBefore, // in percentage
                        }
                    })
                })
            };

            return newMatchups;
        } catch (error) {
            console.error("Error fetching user data:", error);
            return [];
        }
    };

    const fetchData = async () => {
        try {
            // const isFinishedRecap = true;
            const isItFirstDay = groups[groupID]?.isFirstDay;
            const isFinishedRecap = groups[groupID]?.isFinishedRecap;
            if (isFinishedRecap || isItFirstDay) {
                setModalVisible(false);
            }

            // Get amount of time left
            const gameType = groups[groupID]?.gameType;
            const currentPlayersInGame = groups[groupID]?.currentPlayersInGame;
            const cycle = groups[groupID]?.cycle;
            const cycleCount = groups[groupID]?.cycleCount;
            const totalCycles = groups[groupID]?.totalCycles;
            const userList = groups[groupID]?.userList;
            const resetDay = groups[groupID]?.resetDay;
            const currentDay = new Date().getDay();
            const timeLeft = (currentPlayersInGame ?? 0) - 1 - (cycle ?? 0) + ((totalCycles ?? 0) - (cycleCount ?? 0)) * (Object.keys(userList ?? []).length - 1);
            if (gameType === "weekly") {
                // console.log("weeksLeft -- ", timeLeft);
                if (timeLeft === 1) {
                    const daysLeft = (resetDay - currentDay + 6) % 7 + 1;
                    // console.log("daysLeft -- ", daysLeft);
                    if (daysLeft == 1) {
                        const now = new Date();
                        const nextResetDate = new Date();
                        nextResetDate.setDate(now.getDate() + daysLeft);
                        nextResetDate.setHours(0, 0, 0, 0); // Assume reset is at midnight

                        const hoursLeft = Math.max((nextResetDate.getTime() - now.getTime()) / (1000 * 60 * 60), 0);

                        if (hoursLeft < 1) {
                            setGameTimeLeft("<1 hour");
                        } else {
                            setGameTimeLeft(`${Math.floor(hoursLeft)} hours`);
                        }
                    } else {
                        setGameTimeLeft(`${daysLeft} days`);
                    }
                } else {
                    setGameTimeLeft(`${timeLeft} weeks`);
                }
            } else if (gameType === "biweekly") {
                // console.log("weeksLeft -- ", timeLeft / 2);
                if (timeLeft === 1) {
                    const firstResetDay = resetDay; // e.g., Sunday (0)
                    const secondResetDay = (resetDay + 3) % 7; // e.g., Wednesday (3 days after Sunday)
                    const currentHour = new Date().getHours();

                    // Define reset times (in 24-hour format)
                    const firstResetHour = 0;  // 12 AM
                    const secondResetHour = 12; // 12 PM

                    // Determine how far the next reset is
                    let daysUntilReset;
                    let resetHour;

                    if (
                        (currentDay < secondResetDay && currentDay >= firstResetDay) ||
                        (secondResetDay < firstResetDay && (currentDay >= firstResetDay || currentDay < secondResetDay)) // Handles cases where second reset is earlier in the week
                    ) {
                        // The next reset is the second reset
                        daysUntilReset = (secondResetDay - currentDay + 7) % 7;
                        if (daysUntilReset == 1) {
                            setGameTimeLeft(`${daysUntilReset} day`);
                        } else {
                            setGameTimeLeft(`${daysUntilReset} days`);
                        }
                    } else if (currentDay === secondResetDay && currentHour < secondResetHour) {
                        resetHour = secondResetHour
                        const hoursLeft = resetHour - currentHour;
                        if (hoursLeft === 1) {
                            setGameTimeLeft(`${hoursLeft} hour`);
                        } else {
                            setGameTimeLeft(`${hoursLeft} hours`);
                        }
                    } else {
                        // The next reset is the first reset of the next cycle
                        daysUntilReset = (firstResetDay - currentDay + 7) % 7;
                        if (daysUntilReset === 1) {
                            setGameTimeLeft(`${daysUntilReset} day`);
                        } else {
                            setGameTimeLeft(`${daysUntilReset} days`);
                        }
                    }
                } else {
                    setGameTimeLeft(`${timeLeft / 2} weeks`);
                }

            } else {
                if (timeLeft === 1) {
                    setGameTimeLeft(`${timeLeft} day`);
                } else {
                    setGameTimeLeft(`${timeLeft} days`);
                }
            }

            let dailyDuel = groups[groupID]?.unbetDuels;
            // console.log('this is dailyduel length: ', Object.keys(dailyDuel).length);
            if (Object.keys(dailyDuel).length === 0 || groups[groupID]?.userTokens === 0) {
                await addToFinishedBetting(groupID, userID);
                setTimeout(() => {
                    router.replace({
                        pathname: '/(authenticated)/home/bets/BetSummary',
                        params: { groupIDTemp: groupID, showTutorialTemp: showTutorialTemp },
                    });
                }, 0); // Ensures the route updates in order
            }
            const flattenDuels = (duels: { [key: string]: { duelID: string, player1: string, player2: string } }) => {
                return Object.values(duels);
            };

            const matchups = dailyDuel ? flattenDuels(dailyDuel) : [];
            const newmatchups = fetchUserName(matchups);
            setMatchups(newmatchups);
            const emptyList = new Array(newmatchups.length).fill('');
            setBetAmount(emptyList);
            setChosenPlayer(emptyList);
            setChosenProfilePic(emptyList);

            const todaysBetTokens = groups[groupID]?.todaysBetTokens ?? 0;
            // setTotalBetTokens(todaysBetTokens);
            // console.log("H2H Checkpoint one");
        } catch (error) {
            console.error("Error fetching user data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (changePageForUserName) {
            // fetchUserName(matchups);
            setChangePageForUserName(false);
        }
    }, [changePageForUserName]);

    useEffect(() => {
        if (showTutorial && tutorialStep === 5 && shouldShowSubmit().isValid) {
            setTutorialStep(6);
        }
        // Reset the trigger to avoid unnecessary re-runs
        setTriggerSubmitCheck(false);
    }, [triggerSubmitCheck]); 

    // if it hits 12:00 am, navigate to hometab
    useEffect(() => {
        const interval = setInterval(() => {
            const date = new Date();
            if (date.getHours() === 0 && date.getMinutes() === 0) {
                router.replace('/(authenticated)/home')
            }
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleScroll = (event: any) => {
        const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
        setCurrentMatchupIndex(newIndex);
    };

    const scrollToIndex = (index: number) => {
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ x: index * screenWidth, animated: true });
        }
        setCurrentMatchupIndex(index);
    };

    // const isValidBet = (tokens: number, bet: number) => (tokens - totalBetTokens) >= bet && bet > 0;

    const updateChosenPlayer = (index: number, playerID: string, playerPfp: string) => {
        setChosenPlayer((prev) => {
            const newArray = [...prev];
            newArray[index] = playerID;
            return newArray;
        });
        setChosenProfilePic((prev) => {
            const newArray = [...prev];
            newArray[index] = playerPfp;
            return newArray;
        });
        if (showTutorial && tutorialStep === 3) {
            setTutorialStep(4);
        }
        setTriggerSubmitCheck(true);
    };

    const isChosen = (playerID: string) => chosenPlayer[currentMatchupIndex] === playerID;

    const containsBet = (amount: number) => betAmount[currentMatchupIndex] === amount.toString();

    const totalBetTokens = () => {
        // get the sum of betAmount:
        return betAmount.reduce((acc, curr) => {
            return acc + (+curr);
        }, 0);
    };

    const updateBetAmount = (index: number, amount: number) => {
        setBetAmount((prev) => {
            const newArray = [...prev];
            newArray[index] = (+amount).toString();
            return newArray;
        });
        if (showTutorial && tutorialStep === 4) {
            setTutorialStep(5);
        }
        setTriggerSubmitCheck(true);
    };

    const truncateString = (str: string, maxLength: number) => {
        return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
    };

    const shouldShowSubmit = () => {
        let errorText = '';
        // should show submit if neither chosenPlayers nor betAmounts have empty strings
        const isBettingComplete = chosenPlayer.every((player) => player !== '') && betAmount.every((amount) => amount !== '');
        const isBetsNotZero = betAmount.every((amount) => +amount > 0);
        const isBetsValid = totalBetTokens() <= currentUserTokens;
        if (isBettingComplete && !isBetsNotZero) {
            errorText = 'Bets should be greater than 0';
        } else if (!isBetsValid) {
            errorText = 'Bets should not exceed your total tokens';
        }
        return { isValid: isBettingComplete && isBetsValid && isBetsNotZero, errorText: errorText };
    };

    const playerCard = (player: { id: string, username: string, profilePic: string, duelsWon: number, prevSteps: number, stepChange: number }, color: string, playerNum: string) => (
        <TouchableOpacity style={styles.playerContainer} onPress={() => updateChosenPlayer(currentMatchupIndex, player.id, player.profilePic)} activeOpacity={1}>
            <LinearGradient
                colors={isChosen(player.id) ?
                    ['#fff', '#fff'] :
                    ['#5BE35C', '#14B582']}
                style={{
                    // flex: 1,
                    width: '100%',
                    borderRadius: moderateScale(20),
                    // alignItems: 'center',
                    paddingHorizontal: scale(20),
                    paddingTop: playerNum === 'player2' ? scale(20) : scale(10),
                    paddingBottom: playerNum === 'player1' ? scale(30) : scale(10),
                }}
            >
                <View style={styles.userRow}>
                    <Image
                        source={player?.profilePic ?
                            { uri: player?.profilePic } :
                            require('@components/blank-profile-picture.png')
                        }
                        style={[styles.profileImage, { borderColor: color }]}
                    />
                    <Text style={[styles.playerUsername, { color: isChosen(player.id) ? '#024405' : '#fff' }]}>{truncateString(player?.username ?? '', 13)}</Text>
                </View>
                <View style={styles.playerInfoContainerRow}>
                    <View style={[styles.playerInfoContainer, { borderColor: isChosen(player.id) ? '#024405' : '#fff' }]}>
                        <View style={styles.playerInfoRow}>
                            <Image
                                source={require('@assets/icons/trophy.png')}
                                style={[styles.trophyIcon, { tintColor: isChosen(player.id) ? '#024405' : '#fff' }]}
                            />
                            <Text style={[styles.playerInfoNumber, { color: isChosen(player.id) ? '#024405' : '#fff' }]}>{player?.duelsWon}</Text>
                        </View>
                        <Text style={[styles.playerInfoText, { color: isChosen(player.id) ? '#024405' : '#fff' }]}>Weekly duels won</Text>
                    </View>
                    <View style={[styles.playerInfoContainer, { borderColor: isChosen(player.id) ? '#024405' : '#fff' }]}>
                        <View style={styles.playerInfoRow}>
                            <Image
                                source={require('@assets/icons/shoe.png')}
                                style={[styles.trophyIcon, { tintColor: isChosen(player.id) ? '#024405' : '#fff' }]}
                            />
                            <Text style={[styles.playerInfoNumber, { color: isChosen(player.id) ? '#024405' : '#fff' }]}>{player?.prevSteps}</Text>
                        </View>
                        <Text style={[styles.playerInfoText, { color: isChosen(player.id) ? '#024405' : '#fff' }]}>Steps last week</Text>
                    </View>
                    <View style={[styles.playerInfoContainer, { borderColor: isChosen(player.id) ? '#024405' : '#fff' }]}>
                        <View style={styles.playerInfoRow}>
                            <Image
                                source={player?.stepChange >= 0 ?
                                    require('@assets/icons/upArrow.png') :
                                    require('@assets/icons/downArrow.png')
                                }
                                style={[styles.upArrowIcon, { tintColor: isChosen(player.id) ? '#024405' : '#fff' }]}
                            />
                            <Text style={[styles.playerInfoNumber, { color: isChosen(player.id) ? '#024405' : '#fff' }]}>{Math.abs(player?.stepChange)}%</Text>
                        </View>
                        <Text style={[styles.playerInfoText, { color: isChosen(player.id) ? '#024405' : '#fff' }]}>Steps change from {'\n'}the week before</Text>
                    </View>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );

    useEffect(() => {
        // Add listeners to track the keyboard state
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
            setKeyboardVisible(true);
            setKeyboardHeight(e.endCoordinates.height / 3);
        });
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardVisible(false);
            setKeyboardHeight(0);
        });

        // Cleanup listeners
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    useEffect(() => {
        if (tutorialStep === 5 && shouldShowSubmit().isValid) {
            setShouldShowNext(true);
        }
    }, [tutorialStep, chosenPlayer, betAmount, currentUserTokens]);

    const handleSubmit = async () => {
        setIsProcessing(true);

        try {
            // Use Promise.all to wait for all async operations to complete
            await Promise.all(matchups.map(async (matchup, index) => {
                const submittedPlayer = chosenPlayer[index];
                const submittedBet = +(betAmount[index]);
                console.log(`you bet on ${submittedPlayer} with ${submittedBet} tokens.`);
                createBet(groupID, userID, matchup.duelID, submittedBet, submittedPlayer);
            }));

            await addToFinishedBetting(groupID, userID);
            await setLatestBetTime(groupID, userID, new Date());
            await setTodaysBetTokens(groupID, userID, totalBetTokens());

            if (showTutorial) {
                await addToFinishedTutorial(groupID, userID);
                setShowTutorial(false);
            }

            // Use setTimeout to ensure state updates have been processed
            setTimeout(() => {
                setSubmittedModalVisible(true);
            }, 100);
        } catch (error) {
            console.error("Error submitting bets:", error);
            // Handle error appropriately
        }
    };

    const handleSummaryPageNavigation = () => {
        setSubmittedModalVisible(false);
        setTimeout(() => {
            router.replace({
                pathname: '/(authenticated)/home/bets/BetSummary',
                params: { groupIDTemp: groupID, showTutorialTemp: showTutorialTemp },
            });
        }, 0); // Ensures the route updates in order
    };

    if (isLoading) {
        return (
            
            <LinearGradient
                colors={['#000000', '#024405']}
                style={{
                    flex: 1,
                    width: '100%',
                }}
            >
                <View>
                    <Text style={{ color: '#fff' }}>Loading...</Text>
                </View>
            </LinearGradient>
        );
    }

    if (!groups[groupID]?.isGameActive) {
        router.replace('/(authenticated)/home')
    }

    return (
        <LinearGradient
            colors={['#000000', '#024405']}
            style={{
                flex: 1,
                width: '100%',
            }}
        >
            <SafeAreaView style={styles.safeView} edges={['top']}>
                <KeyboardAvoidingView style={styles.container}>
                            
                    {keyboardVisible && (
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={styles.dismissOverlay} />
                        </TouchableWithoutFeedback>
                    )}

                    {/* Tutorial Modal */}
                    {showTutorial && (
                        <View style={styles.tutorialOverlay}>
                            {notInsideScrollTutorialSteps.includes(tutorialStep) && (
                                <NewHeadToHeadTutorial
                                    tutorialStep={tutorialStep}
                                    setTutorialStep={setTutorialStep}
                                    setShowTutorial={setShowTutorial}
                                    showNext={shouldShowNext}
                                    setShowNext={setShouldShowNext}
                                />
                            )}
                        </View>
                    )}

                    <View style={[{ flexDirection: 'row', alignItems: 'center' },
                        (tutorialStep === 1) && { zIndex: 200 }
                    ]}>
                        <Image
                            source={require('@assets/icons/timeLeft.png')}
                            style={styles.timeLeftIcon}
                        />
                        <Text style={styles.timeLeft}> {gameTimeLeft} left in game</Text>
                    </View>

                    <Text style={[styles.question, (tutorialStep === 1) && { zIndex: 200 },]}>Who will walk more steps{'\n'}this week?</Text>

                    {/* dividing line */}
                    <View style={styles.dividingLine} />

                    <View style={[styles.scrollAndDotsContainer, 
                        insideScrollTutorialSteps.includes(tutorialStep) && { zIndex: 200 },
                        tutorialStep === 5 && { zIndex: 400 },
                    ]}>

                        {/* swipeable cards */}
                        {/* <View style={ insideScrollTutorialSteps.includes(tutorialStep) && { zIndex: 200 } }> */}
                        <ScrollView
                            ref={scrollViewRef}
                            horizontal
                            snapToInterval={screenWidth} // Snap to each card
                            decelerationRate="fast"
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContainer}
                            onScroll={handleScroll}
                            scrollEnabled={!showTutorial || tutorialStep === 5}
                        >
                            {matchups.map((matchup, index) => (
                                <View key={matchup.duelID} style={[styles.cardContainer, { width: screenWidth }, 
                                    tutorialStep === 5 && { zIndex: 400, }
                                ]}>
                                    {showTutorial && insideScrollTutorialSteps.includes(tutorialStep) && (
                                        <View style={styles.tutorialOverlay2}>
                                            <NewHeadToHeadTutorial
                                                tutorialStep={tutorialStep}
                                                setTutorialStep={setTutorialStep}
                                                setShowTutorial={setShowTutorial}
                                                showNext={shouldShowNext}
                                                setShowNext={setShouldShowNext}
                                            />
                                        </View>
                                    )}
                                    <View style={[styles.row, (tutorialStep === 2) && { zIndex: 400 }]}>
                                        <Text style={[styles.betTitle, tutorialStep === 2 && { color: '#000' }]}>Place Your Bet</Text>
                                        <Text style={styles.tokenInfo}><Text style={{ color: (totalBetTokens() > currentUserTokens) ? 'red' : '#74FF6D' }}>{totalBetTokens()}</Text> bet so far (of {currentUserTokens} total)</Text>
                                    </View>
                                    {/* bet container */}
                                    <View style={[styles.betContainer, tutorialStep === 4 && { zIndex: 400, }]}>
                                        <Image
                                            source={require('@assets/icons/tokens.png')}
                                            style={styles.tokensIcon}
                                        />
                                        {increments.map((amount) => (
                                            <TouchableOpacity
                                                key={amount}
                                                style={[styles.betItem, { backgroundColor: containsBet(amount) ? '#fff' : 'transparent' }]}
                                                onPress={() => updateBetAmount(index, amount)}
                                                activeOpacity={1}
                                            >
                                                <Text style={[styles.betNumber, { color: containsBet(amount) ? '#000' : '#fff' }]}>{amount}</Text>
                                            </TouchableOpacity>
                                        ))}
                                        <TextInput
                                            style={styles.input}
                                            value={betAmount[index]}
                                            onChangeText={(text) => updateBetAmount(index, +text)}
                                            keyboardType="numeric"
                                            placeholder='Custom'
                                            placeholderTextColor="#fff"
                                        />
                                    </View>

                                    {/* player 1 */}
                                    <View style={[{alignItems: 'center',}, (tutorialStep === 3) && { zIndex: 400 }]}>
                                        {matchup.player1 && playerCard(matchup.player1, '#FF6060', 'player1')}
                                        <View style={styles.versusContainer}>
                                            <Text style={styles.versusText}>VS</Text>
                                        </View>
                                        {matchup.player2 && playerCard(matchup.player2, '#7464FF', 'player2')}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>

                    {/* dots for completion indication */}
                    <View style={styles.dotRow}>
                        {matchups.map((_, index) => (
                            <TouchableOpacity
                                key={index}
                                style={{
                                    width: scale(10),
                                    height: scale(10),
                                    borderRadius: moderateScale(5),
                                    borderColor: (currentMatchupIndex === index) ? '#74FF6D' : '#fff',
                                    borderWidth: 1,
                                    backgroundColor: (chosenPlayer[index] === '' || betAmount[index] === '') ? 'transparent' : '#fff',
                                    marginHorizontal: scale(3),
                                }}
                                onPress={() => scrollToIndex(index)}
                                activeOpacity={1}
                                disabled={showTutorial}
                            />
                        ))}
                    </View>
                    <TouchableOpacity style={[styles.submitButton, 
                        { backgroundColor: shouldShowSubmit().isValid ? '#fff' : '#656565' },
                        tutorialStep === 6 && { zIndex: 400 },
                    ]} onPress={handleSubmit} disabled={!shouldShowSubmit().isValid || isProcessing}>
                        <Text style={[styles.submitButtonText, { color: shouldShowSubmit().isValid ? '#000' : '#fff' }]}>Submit</Text>
                    </TouchableOpacity>
                </KeyboardAvoidingView>

                {/* Modal */}
                {/* <InfoModal /> */}
                <Modal
                    transparent={true}
                    visible={isModalVisible}
                    animationType="slide"
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContainer, { height: '85%', }]}>
                            {/* Close button */}
                            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                                <Text style={styles.closeButtonText}>X</Text>
                            </TouchableOpacity>

                            {/* BetRecapPage as the modal content */}
                            {
                                groups[groupID]?.gameType === "weekly"
                                    || groups[groupID]?.gameType === 'biweekly' ? (
                                    <WeeklyBetRecapPage />
                                ) : (
                                    <BetRecapPage />
                                )
                            }
                        </View>
                    </View>
                </Modal>

                <Modal
                    transparent={true}
                    visible={isSubmittedModalVisible}
                    animationType="slide"
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <TouchableOpacity onPress={handleSummaryPageNavigation} style={styles.summaryOKButton}>
                                <Text style={styles.SummaryOKText}>OK</Text>
                            </TouchableOpacity>
                            <View>
                                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: verticalScale(30), }}>
                                    <Image
                                        source={require('@assets/icons/checkmark.png')}
                                        style={{ width: scale(29), height: scale(29) }}
                                    />
                                    <Text style={styles.modalSubmitted}>Submitted!</Text>
                                </View>
                                <Text style={styles.modalTitle}>Your bets this week:</Text>
                            </View>
                            <View style={styles.submissionContainer}>
                                {chosenPlayer.map((player, index) => (
                                    <View style={styles.submissionRow} key={index}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', }}>
                                            <Image
                                                source={chosenProfilePic[index] ?
                                                    { uri: chosenProfilePic[index] } :
                                                    require('@components/blank-profile-picture.png')
                                                }
                                                style={styles.submissionProfileImage}
                                            />
                                            <Text style={styles.submittedPlayerName}>{groups[groupID]?.users[player]?.username}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', }}>
                                            <Image
                                                source={require('@assets/icons/tokens.png')}
                                                style={{ width: scale(13), height: scale(13), marginRight: scale(5), }}
                                            />
                                            <Text style={styles.submissionTokenNumber}>{betAmount[index]}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                </Modal>

            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    safeView: {
        flex: 1,
    },
    container: {
        flex: 1,
        alignItems: 'center',
        position: 'relative',
    },
    dismissOverlay: {
        ...RNStyleSheet.absoluteFillObject,
        zIndex: 1000,
    },
    timeLeftIcon: {
        width: 13,
        height: 13,
    },
    timeLeft: {
        color: '#74FF6D',
        fontFamily: 'Lexend',
        fontSize: 11,
        // zIndex: 1,
    },
    question: {
        fontFamily: 'Lexend',
        fontSize: 22,
        color: '#fff',
        textAlign: 'center',
        marginTop: 10,
    },
    dividingLine: {
        width: '90%',
        height: 1,
        backgroundColor: '#ffffff80',
        marginVertical: 15,
    },
    scrollContainer: {
        alignItems: 'center',
    },
    cardContainer: {
        alignItems: 'center',
        height: '100%', // this helped move everything up
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '90%',
        paddingHorizontal: 5,
    },
    betTitle: {
        fontFamily: 'Lexend',
        fontSize: 16,
        color: '#fff',
    },
    tokenInfo: {
        fontFamily: 'Lexend',
        fontSize: 11,
        color: '#74FF6D',
    },
    betContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#65656580',
        width: '90%',
        paddingHorizontal: 15,
        borderRadius: 20,
        padding: 10,
        marginVertical: 5,
        marginBottom: 15,
        alignItems: 'center',
    },
    tokensIcon: {
        width: 20,
        height: 20,
        marginRight: 10,
    },
    betItem: {
        justifyContent: 'center',
        alignItems: 'center',
        borderColor: '#fff',
        borderWidth: 1,
        borderRadius: 10,
        width: 44,
        height: 34,
    },
    betNumber: {
        fontFamily: 'Lexend',
        fontSize: 12,
        textAlign: 'center',
    },
    input: {
        backgroundColor: '#00000080',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
        width: 82,
        height: 34,
        textAlign: 'center',
        color: '#FFF',
        fontFamily: 'Lexend',
        fontSize: 12,
    },
    versusContainer: {
        marginVertical: -25,
        paddingHorizontal: 35,
        paddingVertical: 13,
        backgroundColor: '#023404',
        zIndex: 1,
        borderRadius: 30,
    },
    versusText: {
        fontFamily: 'Lexend-Bold',
        fontSize: 25,
        color: '#fff',
    },
    scrollAndDotsContainer: {
        height: '77%',
        justifyContent: 'flex-end',
    },
    dotRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playerContainer: {
        width: '90%',
        // padding: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    userRow: {
        // position: 'absolute',
        // left: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        // marginTop: 10,
    },
    profileImage: {
        width: 51,
        height: 51,
        borderRadius: 30,
        borderWidth: 2,
        marginRight: 10,
    },
    playerUsername: {
        fontFamily: 'Lexend-Bold',
        fontSize: 30,
    },
    playerInfoContainerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        // marginTop: 85,
    },
    playerInfoContainer: {
        width: '31%',
        height: 80,
        justifyContent: 'flex-end', // Move to bottom
        paddingLeft: 8,
        paddingBottom: 8,
        borderWidth: 1,
        borderRadius: 8,
    },
    playerInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    trophyIcon: {
        width: 16,
        height: 16,
        marginRight: 5,
    },
    upArrowIcon: {
        width: 22,
        height: 22,
        margin: -3,
        marginRight: 2,
    },
    playerInfoNumber: {
        fontFamily: 'Lexend-Bold',
        fontSize: 15,
    },
    playerInfoText: {
        fontFamily: 'Lexend',
        fontSize: 9,
        paddingTop: 5,
    },
    submitButton: {
        borderRadius: 20,
        padding: 10,
        width: 100,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        alignSelf: 'center',
    },
    submitButtonText: {
        fontFamily: 'Lexend',
        fontSize: 13,
    },
    // MODAL
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
        zIndex: 100,
    },
    modalContainer: {
        width: '90%',
        backgroundColor: '#000',
        borderWidth: 1,
        borderColor: '#fff',
        borderRadius: 25,
        padding: 20,
        position: 'relative',
    },
    modalTitle: {
        fontFamily: 'Lexend',
        fontSize: 13,
        color: '#fff',
        marginBottom: 15,
        textAlign: 'center',
    },
    summaryOKButton: {
        position: 'absolute',
        top: 18,
        right: 18,
        borderWidth: 1,
        borderColor: '#fff',
        borderRadius: 20,
        padding: 8,
        paddingHorizontal: 18,
        zIndex: 1,
    },
    SummaryOKText: {
        fontFamily: 'Lexend',
        fontSize: 13,
        color: '#fff',
    },
    modalSubmitted: {
        fontFamily: 'Lexend',
        color: '#fff',
        fontSize: 18,
        textAlign: 'center',
        margin: 10,
    },
    submissionContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 15,
        backgroundColor: '#5BE35C32',
        padding: 10,
    },
    submissionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#00000080',
        borderRadius: 10,
        padding: 10,
        margin: 3,
        width: '100%',
    },
    submissionProfileImage: {
        width: 26,
        height: 26,
        borderWidth: 1,
        borderColor: '#fff',
        borderRadius: 20,
        marginRight: 10,
    },
    submittedPlayerName: {
        fontFamily: 'Lexend',
        color: '#fff',
        fontSize: 11,
    },
    submissionTokenNumber: {
        fontFamily: 'Lexend',
        color: '#74FF6D',
        fontSize: 11,
    },
    closeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1,
    },
    closeButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    tutorialOverlay: {
        ...RNStyleSheet.absoluteFillObject,
		zIndex: 100,
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    tutorialOverlay2: {
        ...RNStyleSheet.absoluteFillObject,
		zIndex: 300,
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    tutorialContent: {

    },
});

export default NewHeadToHeadPage;