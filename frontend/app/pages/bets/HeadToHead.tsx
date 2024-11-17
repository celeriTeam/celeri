import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, TouchableHighlight, Modal, PanResponder, Animated } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useUser } from '../../UserProvider';
import { addToFinishedBetting, addToFinishedRecap, createBet, getUnbetDuels } from '@/backend/src/bets';
import { getUserName } from '@/backend/src/users';
import BetRecapPage from './Recap';
import { getDefaultBetOnSelf, getGroupIsFirstDay, getTodaysBetTokens, getUserTokens, setTodaysBetTokens } from '@/backend/src/groups';
import { RadialControl } from './BettingDial/CircularDial';
// import { addBet } from '@/backend/src/bets';

type headToHeadPageNavigationProp = StackNavigationProp<RootStackParamList, 'HeadToHeadPage'>;
type headToHeadPageRouteProp = RouteProp<RootStackParamList, 'HeadToHeadPage'>;

type Props = {
    navigation: headToHeadPageNavigationProp;
};

const HeadToHeadPage: React.FC<Props> = ({ navigation }) => {
    const { userID, groups, loading } = useUser();
    const route = useRoute<headToHeadPageRouteProp>();
    const { groupID, isTutorial } = route.params;
    const [matchups, setMatchups] = useState<{ duelID: string, player1: string, player2: string }[]>([]);
    const [currentUserTokens, setCurrentUserTokens] = useState<number | undefined>(undefined);
    const [selectedPlayer, setSelectedPlayer] = useState<null | string>(null);
    const [betAmount1, setBetAmount1] = useState('');
    const [betAmount2, setBetAmount2] = useState('');
    const [player1ID, setPlayer1ID] = useState('');
    const [player2ID, setPlayer2ID] = useState('');
    const [player1, setPlayer1] = useState('');
    const [player2, setPlayer2] = useState('');
    const [totalBetTokens, setTotalBetTokens] = useState(0);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [currentMatchupIndex, setCurrentMatchupIndex] = useState(0);
    const [changePageForUserName, setChangePageForUserName] = useState(false);
    const [isFirstDay, setIsFirstDay] = useState(false);
    const [isModalVisible, setModalVisible] = useState(true);
    const [infoModalVisible, setInfoModalVisible] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const increments = [25, 100, 250, 500];
  
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
            // Get user's tokens
            const userTokens = groups[groupID]?.userTokens;
            setCurrentUserTokens(userTokens);

            const currentPlayers = matchups[currentMatchupIndex];
            const player1ID = currentPlayers.player1;
            setPlayer1ID(player1ID);
            const player2ID = currentPlayers.player2;
            setPlayer2ID(player2ID);
            const player1 = groups[groupID]?.users[player1ID]?.username;
            setPlayer1(player1);
            const player2 = groups[groupID]?.users[player2ID]?.username;
            setPlayer2(player2);

            const betOnSelfAmount = groups[groupID]?.defaultBetOnSelf;
            if (player1ID === userID) {
                setSelectedPlayer(player1ID);
                setBetAmount1(betOnSelfAmount ? betOnSelfAmount.toString() : '100');
            } else if (player2ID === userID) {
                setSelectedPlayer(player2ID);
                setBetAmount2(betOnSelfAmount ? betOnSelfAmount.toString() : '100');
            } else {
                // Reset the selection and bet amounts if the current user isn't involved
                setSelectedPlayer(null);
                setBetAmount1('');
                setBetAmount2('');
            }
        } catch(error) {
            console.error("Error fetching user data:", error);
        }
    };

    const fetchData = async () => {
        try {
            const isItFirstDay = groups[groupID]?.isFirstDay;
            setIsFirstDay(isItFirstDay);
            const isFinishedRecap = groups[groupID]?.isFinishedRecap;
            if (isFinishedRecap || isItFirstDay) {
                setModalVisible(false);
            }

            let dailyDuel = groups[groupID]?.unbetDuels;
            if (isItFirstDay && Object.keys(dailyDuel).length === 0) {
                await addToFinishedBetting(groupID, userID);
                navigation.reset({
                    index: 1,
                    routes: [
                        { name: 'HomeTab' }, // the first route in the stack
                        { name: 'BetSummaryPage', params: { groupID: groupID } } // the top route in the stack
                    ],
                });
            }
            const flattenDuels = (duels: { [key: string]: { duelID: string, player1: string, player2: string } }) => {
                return Object.values(duels);
            };
        
            const matchups = dailyDuel ? flattenDuels(dailyDuel) : [];
            setMatchups(matchups);
            
            fetchUserName(matchups);
            const todaysBetTokens = groups[groupID]?.todaysBetTokens;
            setTotalBetTokens(todaysBetTokens);
        } catch(error) {
            console.error("Error fetching user data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (changePageForUserName) {
            fetchUserName(matchups);
            setChangePageForUserName(false);
        }
    }, [changePageForUserName]);

    // if it hits 12:00 am, navigate to hometab
    useEffect(() => {
        const interval = setInterval(() => {
            const date = new Date();
            if (date.getHours() === 0 && date.getMinutes() === 0) {
                navigation.reset({
                    index: 0,  // Index of the screen to be focused on
                    routes: [{ name: 'AppPage' }],  // Define only the desired route
                });
            }
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleSelectPlayer = (player: string) => {
        setSelectedPlayer(player);
    };

    const isSelected = (player: string) => selectedPlayer === player;

    const isCurrentUser = (playerID: string) => playerID === userID;

    const isValidBet = (tokens: number, bet: number) => tokens >= bet && bet > 0;

    const shouldShowTutorial = () => isTutorial || isFirstDay;

    const handleNext = async () => {
        if (currentMatchupIndex < matchups.length - 1) {
            setIsProcessing(true);
            const duelnumber: any = `duel${matchups.length}`;
            const submittedPlayer = selectedPlayer;
            const submittedBet = +(selectedPlayer === matchups[currentMatchupIndex].player1 ? betAmount1 : betAmount2);
            const duelID = matchups[currentMatchupIndex].duelID;
            console.log('you bet on: ', submittedPlayer);
            console.log('you bet: ', submittedBet);
            console.log('duelid: ', duelID);
            await createBet(userID, groupID, duelID, submittedBet, submittedPlayer ?? '');

            await setTodaysBetTokens(userID, groupID, submittedBet);
            setCurrentUserTokens(currentUserTokens ? currentUserTokens - submittedBet : 0);
            setTotalBetTokens(totalBetTokens + submittedBet);
            
            setCurrentMatchupIndex(currentMatchupIndex + 1);
            setChangePageForUserName(true);
            setIsProcessing(false);
        }
    };

    const increaseBetAmount = (player: string, amount: number) => {
        if (player === 'player1') {
            setBetAmount1(((+betAmount1 || 0) + amount).toString());
        } else if (player === 'player2') {
            setBetAmount2(((+betAmount2 || 0) + amount).toString());
        }
    }

    const handleOpenModal = () => {
        Keyboard.dismiss();
        setKeyboardVisible(false);
        setInfoModalVisible(true);
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

    useEffect(() => {
        // Add listeners to track the keyboard state
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardVisible(true);
        });
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardVisible(false);
        });

        // Cleanup listeners
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    const shouldShowSubmit = () => {
        if ((selectedPlayer === player1ID && isValidBet(currentUserTokens ?? 0, +betAmount1)) || (selectedPlayer === player2ID && isValidBet(currentUserTokens ?? 0, +betAmount2))) {
            return true;
        }
        return false;
    };

    const handleSubmit = async () => {
        setIsProcessing(true);
        const submittedPlayer = selectedPlayer;
        const submittedBet = +(selectedPlayer === matchups[currentMatchupIndex].player1 ? betAmount1 : betAmount2);
        const duelID = matchups[currentMatchupIndex].duelID;
        console.log('you bet on: ', submittedPlayer);
        console.log('you bet: ', submittedBet);
        console.log('duelid: ', duelID);
        await createBet(userID, groupID, duelID, submittedBet, submittedPlayer ?? '');
        await addToFinishedBetting(groupID, userID);

        await setTodaysBetTokens(userID, groupID, submittedBet);
        setTotalBetTokens(totalBetTokens + submittedBet);

        // navigation.navigate('BetSummaryPage', { groupID: groupID });
        navigation.reset({
            index: 1,
            routes: [
                { name: 'HomeTab' }, // the first route in the stack
                { name: 'BetSummaryPage', params: { groupID: groupID } } // the top route in the stack
            ],
        });
    };

    if (isLoading) {
        return (
            <View>
                <Text>Loading...</Text>
            </View>
        );
    }

    if (!groups[groupID]?.isGameActive) {
        navigation.reset({
            index: 0,  // Index of the screen to be focused on
            routes: [{ name: 'AppPage' }],  // Define only the desired route
        });
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Overlay to dismiss the keyboard */}
            {keyboardVisible && (
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.dismissOverlay} />
                </TouchableWithoutFeedback>
            )}
            <TouchableOpacity 
                style={styles.infoButton}
                onPress={handleOpenModal}
            >
                <Ionicons name="information-circle" size={24} color="#666" />
            </TouchableOpacity>
            <View style={styles.tokens}>
                <Text style={{fontFamily: "Lexend"}}>Your Tokens: {currentUserTokens}</Text>
            </View>
            <View style={styles.betTokens}>
                <Text style={{fontFamily: "Lexend"}}>Bet Tokens: {totalBetTokens}</Text>
            </View>

            {/* Top-left (Player 1) */}
            <TouchableOpacity
                style={[
                    styles.player1Container,
                    isSelected(player1ID) && styles.selectedPlayer1,
                ]}
                onPress={() => !isCurrentUser(player1ID) && handleSelectPlayer(player1ID)}
                activeOpacity={1}
            >
                <Text style={styles.playerText}>{player1}</Text>
                {isSelected(player1ID) && (
                    <>
                        <Text style={styles.betNumber}>{betAmount1 || 0}</Text>
                        {!isValidBet(currentUserTokens ?? 0, +betAmount1) && (betAmount1 != '') && (
                            <Text style={styles.errorText}>Invalid bet</Text>
                        )}
                        <View style={styles.bettingRow}>
                            {increments.map((amount) => (
                            <TouchableOpacity
                                style={styles.incrementButton}
                                onPress={() => increaseBetAmount('player1', amount)}
                            >
                                <Text style={styles.incrementText}>+{amount}</Text>
                            </TouchableOpacity>
                            ))}
                            <TextInput
                                style={styles.input}
                                value={betAmount1}
                                onChangeText={setBetAmount1}
                                keyboardType="numeric"
                                editable={!isCurrentUser(player1ID)}
                            />
                            <TouchableOpacity
                                onPress={() => setBetAmount1('')}
                            >
                                <Text style={styles.incrementText}>Clear bet</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </TouchableOpacity>

            {/* Bottom-right (Player 2) */}
            <TouchableOpacity
                style={[
                    styles.player2Container,
                    isSelected(player2ID) && styles.selectedPlayer2,
                ]}
                onPress={() => !isCurrentUser(player2ID) && handleSelectPlayer(player2ID)}
                activeOpacity={1}
            >
                <Text style={[
                    styles.playerText,
                    isSelected(player2ID) && keyboardVisible && styles.usernameWithKeyboard
                ]}>{player2}</Text>
                {isSelected(player2ID) && (
                    <>
                        <Text style={styles.betNumber}>{betAmount2 || 0}</Text>
                        {!isValidBet(currentUserTokens ?? 0, +betAmount2) && (betAmount2 != '') && (
                            <Text style={styles.errorText}>Invalid bet</Text>
                        )}
                        <View style={styles.bettingRow}>
                            {increments.map((amount) => (
                            <TouchableOpacity
                                style={styles.incrementButton}
                                onPress={() => increaseBetAmount('player2', amount)}
                            >
                                <Text style={styles.incrementText}>+{amount}</Text>
                            </TouchableOpacity>
                            ))}
                            <TextInput
                                style={styles.input}
                                value={betAmount2}
                                onChangeText={setBetAmount2}
                                keyboardType="numeric"
                                editable={!isCurrentUser(player2ID)}
                            />
                            <TouchableOpacity
                                onPress={() => setBetAmount2('')}
                            >
                                <Text style={styles.incrementText}>Clear bet</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </TouchableOpacity>

            {/* Diagonal line */}
            <View style={styles.dividingLine} />

            {/* Button: Next or Submit */}
            {shouldShowSubmit() && (
                <TouchableHighlight
                    style={[styles.submitButton, keyboardVisible && styles.submitButtonWithKeyboard]}
                    underlayColor="#ff7043"
                    onPress={currentMatchupIndex === matchups.length - 1 ? () => handleSubmit() : handleNext}
                    disabled={isProcessing}
                >
                    <Text style={styles.submitButtonText}>
                        {currentMatchupIndex === matchups.length - 1 ? 'Submit' : 'Next'}
                    </Text>
                </TouchableHighlight>
            )}

            {/* Modal */}
            {shouldShowTutorial() &&
                <InfoModal />
            }
            <InfoModal />
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
                    <BetRecapPage navigation={navigation} />
                </View>
                </View>
            </Modal>

        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
        backgroundColor: '#F5F5F5',
    },
    dismissOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    infoButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 1000,
    },
    tokens: {
        position: 'absolute',
        top: 10,
        right: 20,
        backgroundColor: '#FFD700',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderColor: '#FF8C00',
        borderWidth: 2,
        zIndex: 100,
    },
    betTokens: {
        position: 'absolute',
        top: 40,
        right: 20,
        backgroundColor: '#FFD700',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderColor: '#FF8C00',
        borderWidth: 2,
        zIndex: 100,
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
    bettingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'absolute',
        bottom: 60,
        width: '100%',
        padding: 20,
    },
    betNumber: {
        fontFamily: "Lexend-Bold",
        fontSize: 36,
    },
    incrementButton: {
        padding: 10,
        backgroundColor: '#FF5722',
        borderRadius: 5,
    },
    incrementText: {
        fontFamily: "Lexend-Bold",
        color: '#FFF',
    },
    input: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#AAA',
        borderRadius: 5,
        padding: 10,
        width: 50,
        textAlign: 'center',
    },
    usernameWithKeyboard: {
        position: 'absolute',
        fontFamily: 'Lexend-Bold',
        bottom: 250,
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
    dividingLine: {
        position: 'absolute',
        top: '50%',
        left: 0,
        width: '100%',
        height: '1%',
        backgroundColor: '#888',
    },
    submitButton: {
        position: 'absolute',
        bottom: 20, // Default position when the keyboard is not visible
        right: 20,
        backgroundColor: '#FF5722', // Custom color for the button
        borderColor: '#FF7043', // Border color
        borderWidth: 2,
        borderRadius: 5,
        paddingVertical: 10,
        paddingHorizontal: 20,
        zIndex: 2,
    },
    submitButtonWithKeyboard: {
        bottom: 200,
    },
    submitButtonText: {
        fontFamily: "Lexend-Bold",
        color: '#FFF',
        fontSize: 18,
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

export default HeadToHeadPage;