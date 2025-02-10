import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, TouchableHighlight, Modal, PanResponder, Animated, SafeAreaView } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useUser } from '../../../UserProvider';
import { addToFinishedBetting, addToFinishedRecap, createBet, getUnbetDuels } from '@/backend/src/bets';
import BetRecapPage from './Recap';
import WeeklyBetRecapPage from './WeeklyRecap';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getDefaultBetOnSelf, getGroupIsFirstDay, getTodaysBetTokens, getUserTokens, setTodaysBetTokens } from '@/backend/src/groups';
import { LinearGradient } from 'expo-linear-gradient';

const NewHeadToHeadPage: React.FC = () => {
    const { userID, groups, loading } = useUser();
    const route = useRouter();
    const { groupIDTemp } = useLocalSearchParams();
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
    const [currentUserTokens, setCurrentUserTokens] = useState<number>(0);
    const [selectedPlayer, setSelectedPlayer] = useState<null | string>(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [currentMatchupIndex, setCurrentMatchupIndex] = useState(0);
    const [changePageForUserName, setChangePageForUserName] = useState(false);
    const [gameTimeLeft, setGameTimeLeft] = useState("");
    const [errorText, setErrorText] = useState('');
    const [isModalVisible, setModalVisible] = useState(true);
    const [infoModalVisible, setInfoModalVisible] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const increments = [10, 25, 50, 100];
  
    const router = useRouter();

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
            {matchups.map((matchup) => {
                const player1ID = matchup.player1;
                const player1Name = groups[groupID]?.users[player1ID]?.username;
                const player1Pic = groups[groupID]?.users[player1ID]?.profilePic;
                
                const player2ID = matchup.player2;
                const player2Name = groups[groupID]?.users[player2ID]?.username;
                const player2Pic = groups[groupID]?.users[player2ID]?.profilePic;

                newMatchups.push({
                    duelID: matchup.duelID,
                    player1: {
                        id: player1ID,
                        username: player1Name,
                        profilePic: player1Pic,
                        duelsWon: 0,
                        prevSteps: Math.floor(groups[groupID]?.users[player1ID]?.weeklySteps),
                        stepChange: 0,
                    },
                    player2: {
                        id: player2ID,
                        username: player2Name,
                        profilePic: player2Pic,
                        duelsWon: 0,
                        prevSteps: Math.floor(groups[groupID]?.users[player2ID]?.weeklySteps),
                        stepChange: 0,
                    }
                })
            })};
            
            return newMatchups;
        } catch(error) {
            console.error("Error fetching user data:", error);
            return [];
        }
    };

    const fetchData = async () => {
        try {
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
            const timeLeft = (currentPlayersInGame ?? 0) - 1 - (cycle ?? 0) + ((totalCycles ?? 0) - (cycleCount ?? 0)) * (Object.keys(userList ?? []).length - 1);
            if(gameType == "weekly"){
                console.log("weeksLeft -- ", timeLeft);
                if(timeLeft == 1){
                    setGameTimeLeft(`${timeLeft} week`)
                } else {
                    setGameTimeLeft(`${timeLeft} weeks`)
                }
            } else {
                if(timeLeft == 1){
                    setGameTimeLeft(`${timeLeft} day`)
                } else {
                    setGameTimeLeft(`${timeLeft} days`)
                }
            }

            let dailyDuel = groups[groupID]?.unbetDuels;
            console.log('this is dailyduel length: ', Object.keys(dailyDuel).length);
            if (Object.keys(dailyDuel).length === 0 || groups[groupID]?.userTokens === 0) {
                await addToFinishedBetting(groupID, userID);
                router.replace('/(authenticated)/home'); // Navigate to HomeTab
                setTimeout(() => {
                    router.push({
                        pathname: '/(authenticated)/home/bets/BetSummary',
                        params: { groupIDTemp: groupID },
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
            
            const todaysBetTokens = groups[groupID]?.todaysBetTokens ?? 0;
            // setTotalBetTokens(todaysBetTokens);
        } catch(error) {
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

    const handleSelectPlayer = (player: string) => {
        setSelectedPlayer(player);
    };

    const isSelected = (player: string) => selectedPlayer === player;

    const isCurrentUser = (playerID: string) => playerID === userID;

    // const isValidBet = (tokens: number, bet: number) => (tokens - totalBetTokens) >= bet && bet > 0;

    const updateChosenPlayer = (index: number, playerID: string) => {
        setChosenPlayer((prev) => {
            const newArray = [...prev];
            newArray[index] = playerID;
            return newArray;
        });
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
    }

    const handleInfoButton = () => {
        router.replace({
            pathname: '/(authenticated)/home/bets/HeadToHeadTutorial',
            params: { groupIDTemp: groupID },
        });
    };

    const InfoModal = () => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={infoModalVisible}
            onRequestClose={() => setInfoModalVisible(false)}
        >
            <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setInfoModalVisible(false)}
            >
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>How to Place a Bet</Text>
                    <View style={styles.instructionContainer}>
                        <Text style={styles.instructionText}>1. Click on which friend you want to bet on!</Text>
                        <Text style={styles.instructionText}>2. Type in your desired bet into the box, and continue.</Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.closeButton}
                        onPress={() => setInfoModalVisible(false)}
                    >
                        <Text style={styles.closeButtonText}>Got it!</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const playerCard = (player: { id: string, username: string, profilePic: string, duelsWon: number, prevSteps: number, stepChange: number }, color: string) => (
        <TouchableOpacity style={styles.playerContainer} onPress={() => updateChosenPlayer(currentMatchupIndex, player.id)} activeOpacity={1}>
            <LinearGradient
                colors={isChosen(player.id) ? 
                    ['#fff', '#fff'] : 
                    ['#5BE35C', '#14B582']}
                style={{
                    // flex: 1,
                    width: '100%',
                    borderRadius: 20,
                    alignItems: 'center',
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
                    <Text style={[styles.playerUsername, { color: isChosen(player.id) ? '#024405' : '#fff' }]}>{player?.username}</Text>
                </View>
                <View style={styles.playerInfoContainerRow}>
                    <View style={[styles.playerInfoContainer, { borderColor: isChosen(player.id) ? '#024405' : '#fff' }]}>
                        <View style={styles.playerInfoRow}>
                            <Image
                                source={isChosen(player.id) ? 
                                    require('@assets/icons/trophyGreen.png') : 
                                    require('@assets/icons/trophy.png')
                                }
                                style={styles.trophyIcon}
                            />
                            <Text style={[styles.playerInfoNumber, { color: isChosen(player.id) ? '#024405' : '#fff' }]}>{player?.duelsWon}</Text>
                        </View>
                        <Text style={[styles.playerInfoText, { color: isChosen(player.id) ? '#024405' : '#fff' }]}>Weekly duels won</Text>
                    </View>
                    <View style={[styles.playerInfoContainer, { borderColor: isChosen(player.id) ? '#024405' : '#fff' }]}>
                        <View style={styles.playerInfoRow}>
                            <Image
                                source={isChosen(player.id) ? 
                                    require('@assets/icons/shoeGreen.png') : 
                                    require('@assets/icons/shoe.png')
                                }
                                style={styles.trophyIcon}
                            />
                            <Text style={[styles.playerInfoNumber, { color: isChosen(player.id) ? '#024405' : '#fff' }]}>{player?.prevSteps}</Text>
                        </View>
                        <Text style={[styles.playerInfoText, { color: isChosen(player.id) ? '#024405' : '#fff' }]}>Steps last week</Text>
                    </View>
                    <View style={[styles.playerInfoContainer, { borderColor: isChosen(player.id) ? '#024405' : '#fff' }]}>
                        <View style={styles.playerInfoRow}>
                            <Image
                                source={player?.stepChange >= 0 ? 
                                    isChosen(player.id) ? 
                                        require('@assets/icons/upArrowGreen.png') : 
                                        require('@assets/icons/upArrow.png') : 
                                    isChosen(player.id) ?
                                        require('@assets/icons/downArrow.png') : 
                                        require('@assets/icons/downArrow.png')
                                }
                                style={styles.upArrowIcon}
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
            setKeyboardHeight(e.endCoordinates.height/3);
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
        return {isValid: isBettingComplete && isBetsValid && isBetsNotZero, errorText: errorText};
    };

    const handleSubmit = async () => {
        setIsProcessing(true);
        
        {matchups.map( async (matchup, index) => {
            const submittedPlayer = chosenPlayer[index];
            const submittedBet = +(betAmount[index]);
            console.log('you bet on: ', submittedPlayer);
            console.log('you bet: ', submittedBet);
            console.log('duelid: ', matchup.duelID);
            await createBet(userID, groupID, matchup.duelID, submittedBet, submittedPlayer);

        })};
        await addToFinishedBetting(groupID, userID);

        await setTodaysBetTokens(userID, groupID, totalBetTokens());
        // navigation.navigate('BetSummaryPage', { groupID: groupID });

        router.replace('/(authenticated)/home'); // Navigate to HomeTab
        setTimeout(() => {
            router.push({
                pathname: '/(authenticated)/home/bets/BetSummary',
                params: { groupIDTemp: groupID },
            });
        }, 0); // Ensures the route updates in order
    };

    if (isLoading) {
        return (
            <View>
                <Text>Loading...</Text>
            </View>
        );
    }

    if (!groups[groupID]?.isGameActive) {
        router.replace('/(authenticated)/home')
    }

    return (
        <SafeAreaView style={styles.safeView}>
            <TouchableWithoutFeedback
                onPress={Keyboard.dismiss}
                style={styles.safeView}
            >
                <LinearGradient
                    colors={['#000000', '#024405']}
                    style={{
                        flex: 1,
                        width: '100%',
                    }}
                >
                    <View style={styles.container}>
                        <View style={{  flexDirection: 'row', alignItems: 'center', }}>
                            <Image 
                                source={require('@assets/icons/timeLeft.png')}
                                style={styles.timeLeftIcon}
                            />
                            <Text style={styles.timeLeft}> {gameTimeLeft} left in game</Text>
                        </View>

                        <Text style={styles.question}>Who will walk more steps{'\n'}this week?</Text>

                        {/* dividing line */}
                        <View style={styles.dividingLine} />

                        {/* swipeable cards */}
                        <View>
                            <View style={styles.row}>
                                <Text style={styles.betTitle}>Place Your Bet</Text>
                                <Text style={styles.tokenInfo}><Text style={{ color: (totalBetTokens() > currentUserTokens) ? 'red' : '#74FF6D' }}>{totalBetTokens()}</Text> bet so far (of {currentUserTokens} total)</Text>
                            </View>
                            {/* bet container */}
                            <View style={styles.betContainer}>
                                <Image
                                    source={require('@assets/icons/tokens.png')}
                                    style={styles.tokensIcon}
                                />
                                {increments.map((amount) => (
                                    <TouchableOpacity
                                        style={[styles.betItem, { backgroundColor: containsBet(amount) ? '#fff' : 'transparent' }]}
                                        onPress={() => updateBetAmount(currentMatchupIndex, amount)}
                                        activeOpacity={1}
                                    >
                                        <Text style={[styles.betNumber, { color: containsBet(amount) ? '#000' : '#fff' }]}>{amount}</Text>
                                    </TouchableOpacity>
                                ))}
                                <TextInput
                                    style={styles.input}
                                    value={betAmount[currentMatchupIndex]}
                                    onChangeText={(text) => updateBetAmount(currentMatchupIndex, +text)}
                                    keyboardType="numeric"
                                    placeholder='Custom'
                                    placeholderTextColor="#fff"
                                />
                            </View>

                            {/* player 1 */}
                            {matchups[currentMatchupIndex]?.player1 && playerCard(matchups[currentMatchupIndex]?.player1, '#FF6060')}
                            <View style={styles.row}>
                                <TouchableOpacity onPress={() => {if (currentMatchupIndex > 0) setCurrentMatchupIndex(currentMatchupIndex - 1)}}>
                                    <Image
                                        source={require('@assets/icons/leftArrow.png')}
                                        style={{ width: 20, height: 20 }}
                                    />
                                </TouchableOpacity>
                                <Text style={{ color: 'red', }}>{shouldShowSubmit().errorText}</Text>
                                <TouchableOpacity onPress={() => {if (currentMatchupIndex < matchups.length - 1) setCurrentMatchupIndex(currentMatchupIndex + 1)}}>
                                    <Image
                                        source={require('@assets/icons/rightArrow.png')}
                                        style={{ width: 20, height: 20 }}
                                    />
                                </TouchableOpacity>
                            </View>
                            {matchups[currentMatchupIndex]?.player2 && playerCard(matchups[currentMatchupIndex]?.player2, '#7464FF')}
                            
                            {/* dots for completion indication */}
                            <View style={styles.dotRow}>
                                {matchups.map((_, index) => (
                                    <TouchableOpacity
                                        style={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: 5,
                                            borderColor: '#fff',
                                            borderWidth: 1,
                                            backgroundColor: (chosenPlayer[index] === '' || betAmount[index] === '') ? 'transparent' : '#fff',
                                            marginHorizontal: 3,
                                        }}
                                        onPress={() => setCurrentMatchupIndex(index)}
                                        activeOpacity={1}
                                    />
                                ))}
                            </View>
                            <TouchableOpacity style={[styles.submitButton, { backgroundColor: shouldShowSubmit().isValid ? '#fff' : '#656565' }]} onPress={handleSubmit} disabled={!shouldShowSubmit().isValid || isProcessing}>
                                <Text style={[styles.submitButtonText, { color: shouldShowSubmit().isValid ? '#000' : '#fff' }]}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </LinearGradient>
            </TouchableWithoutFeedback>
                
            {/* Modal */}
            {/* <InfoModal /> */}
            <Modal
                transparent={true}
                visible={isModalVisible}
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        {/* Close button */}
                        <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                            <Text style={styles.closeButtonText}>X</Text>
                        </TouchableOpacity>

                        {/* BetRecapPage as the modal content */}
                        {
                            groups?.[groupID]?.gameType === "weekly" ? (
                                <WeeklyBetRecapPage />
                            ) : (
                                <BetRecapPage />
                            )
                        }
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeView: {
        flex: 1,
    },
    container: {
        flex: 1,
        marginTop: 60,
        alignItems: 'center',
    },
    dismissOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    timeLeftIcon: {
        width: 13,
        height: 13,
    },
    timeLeft: {
        color: '#74FF6D',
        fontFamily: 'Lexend',
        fontSize: 11,
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
        paddingHorizontal: 15,
        borderRadius: 20,
        padding: 10,
        margin: 5,
        alignItems: 'center',
    },
    tokensIcon: {
        width: 20,
        height: 20,
        marginRight: 10,
    },
    betItem: {
        padding: 10,
        borderColor: '#fff',
        borderWidth: 1,
        borderRadius: 10,
        width: 44,
        height: 34,
    },
    betNumber: {
        fontFamily: "Lexend",
        fontSize: 12,
        textAlign: 'center',
    },
    input: {
        backgroundColor: '#00000080',
        borderRadius: 10,
        padding: 10,
		width: 82,
        height: 34,
        textAlign: 'center',
        color: '#FFF',
    },
    dotRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoButton: {
        position: 'absolute',
        top: 70,
        left: 20,
        zIndex: 1000,
    },
    playerContainer: {
        width: '90%',
        marginVertical: 10,
        padding: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    userRow: {
        position: 'absolute',
        left: 0,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        marginTop: 10,
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
        padding: 10,
        gap: 10,
        marginTop: 85,
    },
    playerInfoContainer: {
        width: '30%',
        height: 80,
        justifyContent: 'flex-end', // move to bottom
        paddingBottom: 5,
        paddingLeft: 10,
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
        fontFamily: "Lexend",
        fontSize: 13,
    },
    player1Container: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '50%',
        backgroundColor: '#D3E9FF', // Default background color for player 1
        justifyContent: 'center',
        alignItems: 'center',
    },
    player2Container: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: '100%',
        height: '50%',
        backgroundColor: '#FFE9D6', // Default background color for player 2
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedPlayer1: {
        backgroundColor: '#B0C4DE', // Highlight color for player 1
    },
    selectedPlayer2: {
        backgroundColor: '#FFDAB9', // Highlight color for player 2
    },
    playerText: {
        fontFamily: "Lexend-Bold",
        fontSize: 24,
        color: '#333',
    },
    usernameWithKeyboard: {
        position: 'absolute',
        fontFamily: 'Lexend-Bold',
        bottom: 250,
        left: 20,
    },
    inputWithKeyboard: {
        position: 'absolute',
        fontFamily: 'Lexend-Bold',
        left: 20,
    },
    valueTextWithKeyboard: {
        position: 'absolute',
        fontFamily: 'Lexend',
        bottom: 200,
        left: 20,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#AAA',
        padding: 10,
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    errorText: {
        color: 'red',
        fontSize: 14,
        fontFamily: 'Lexend',
    },
    // INFO MODAL
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        width: '80%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        fontFamily: 'Lexend',
    },
    instructionContainer: {
        width: '100%',
        paddingHorizontal: 10,
    },
    instructionText: {
        fontSize: 16,
        marginBottom: 10,
        lineHeight: 22,
        fontFamily: 'Lexend',
    },
    // MODAL
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // semi-transparent background
      },
      modalContainer: {
        width: '90%',
        height: '90%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        position: 'relative',
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
        color: 'black',
      },
});

export default NewHeadToHeadPage;