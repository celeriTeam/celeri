import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Button, Image, TextInput, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, TouchableHighlight, Modal } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useUser } from '../../UserProvider';
import { addToFinishedBetting, addToFinishedRecap, createBet, getUnbetDuels } from '@/backend/src/bets';
import { getUserName } from '@/backend/src/users';
import BetRecapPage from './Recap';
// import { addBet } from '@/backend/src/bets';

type headToHeadPageNavigationProp = StackNavigationProp<RootStackParamList, 'HeadToHeadPage'>;
type headToHeadPageRouteProp = RouteProp<RootStackParamList, 'HeadToHeadPage'>;

type Props = {
    navigation: headToHeadPageNavigationProp;
};

const HeadToHeadPage: React.FC<Props> = ({ navigation }) => {
    const { userID } = useUser();
    const route = useRoute<headToHeadPageRouteProp>();
    const { groupID, isFinishedRecap } = route.params;
    const [matchups, setMatchups] = useState<{ duelID: string, player1: string, player2: string }[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState<null | string>(null);
    const [betAmount1, setBetAmount1] = useState('');
    const [betAmount2, setBetAmount2] = useState('');
    const [player1ID, setPlayer1ID] = useState('');
    const [player2ID, setPlayer2ID] = useState('');
    const [player1, setPlayer1] = useState('');
    const [player2, setPlayer2] = useState('');
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [currentMatchupIndex, setCurrentMatchupIndex] = useState(0);
    const [changePageForUserName, setChangePageForUserName] = useState(false);
    const [isModalVisible, setModalVisible] = useState(true);
  
    const closeModal = async () => {
      setModalVisible(false);
      await addToFinishedRecap(groupID, userID);
    };

    const fetchData = async () => {
        try {
            if (isFinishedRecap) {
                setModalVisible(false);
            }

            let dailyDuel = await getUnbetDuels(groupID, userID);
            const flattenDuels = (duels: { [key: string]: { duelID: string, player1: string, player2: string } }) => {
                return Object.values(duels);
            };
        
            const matchups = dailyDuel ? flattenDuels(dailyDuel) : [];
            setMatchups(matchups);
            
            fetchUserName(matchups);
        } catch(error) {
            console.error("Error fetching user data:", error);
        }
    };

    const fetchUserName = async (matchups: { duelID: string, player1: string; player2: string; }[]) => {
        try {
            const currentPlayers = matchups[currentMatchupIndex];
            const player1ID = currentPlayers.player1;
            setPlayer1ID(player1ID);
            const player2ID = currentPlayers.player2;
            setPlayer2ID(player2ID);
            const player1 = await getUserName(player1ID);
            setPlayer1(player1);
            const player2 = await getUserName(player2ID);
            setPlayer2(player2);

            if (player1ID === userID) {
                setSelectedPlayer(player1ID);
                setBetAmount1('10'); // Automatically set bet amount to 10 for player1
            } else if (player2ID === userID) {
                setSelectedPlayer(player2ID);
                setBetAmount2('10'); // Automatically set bet amount to 10 for player2
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

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (changePageForUserName) {
            fetchUserName(matchups);
            setChangePageForUserName(false);
        }
    }, [changePageForUserName]);

    if (matchups === undefined) {
        return (
            <View>
                <Text>Loading...</Text>
            </View>
        );
    }

    const handleSelectPlayer = (player: string) => {
        setSelectedPlayer(player);
    };

    const isSelected = (player: string) => selectedPlayer === player;

    const isCurrentUser = (playerID: string) => playerID === userID;

    const handleNext = async () => {
        if (currentMatchupIndex < matchups.length - 1) {
            const duelnumber: any = `duel${matchups.length}`;
            const submittedPlayer = selectedPlayer;
            const submittedBet = +(selectedPlayer === matchups[currentMatchupIndex].player1 ? betAmount1 : betAmount2);
            const duelID = matchups[currentMatchupIndex].duelID;
            console.log('you bet on: ', submittedPlayer);
            console.log('you bet: ', submittedBet);
            console.log('duelid: ', duelID);
            await createBet(userID, groupID, duelID, submittedBet, submittedPlayer ?? '');
            
            setCurrentMatchupIndex(currentMatchupIndex + 1);
            setChangePageForUserName(true);
        }
    };

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
        if ((selectedPlayer === player1ID && betAmount1) || (selectedPlayer === player2ID && betAmount2)) {
            return true;
        }
        return false;
    };

    const handleSubmit = async () => {
        const submittedPlayer = selectedPlayer;
        const submittedBet = +(selectedPlayer === matchups[currentMatchupIndex].player1 ? betAmount1 : betAmount2);
        const duelID = matchups[currentMatchupIndex].duelID;
        console.log('you bet on: ', submittedPlayer);
        console.log('you bet: ', submittedBet);
        console.log('duelid: ', duelID);
        await createBet(userID, groupID, duelID, submittedBet, submittedPlayer ?? '');
        await addToFinishedBetting(groupID, userID);

        // navigation.navigate('BetSummaryPage', { groupID: groupID });
        navigation.reset({
            index: 1,
            routes: [
                { name: 'HomeTab' }, // the first route in the stack
                { name: 'BetSummaryPage', params: { groupID: groupID } } // the top route in the stack
            ],
        });
    };

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
                    <TextInput
                        style={styles.input}
                        placeholder="Enter bet"
                        value={betAmount1}
                        onChangeText={setBetAmount1}
                        keyboardType="numeric"
                        editable={!isCurrentUser(player1ID)}
                    />
                )}
            </TouchableOpacity>

            {/* Bottom-right (Player 2) */}
            <TouchableOpacity
                style={[
                    styles.player2Container,
                    isSelected(player2ID) && styles.selectedPlayer2,
                ]}
                onPress={() => !isCurrentUser(player1ID) && handleSelectPlayer(player2ID)}
                activeOpacity={1}
            >
                <Text style={styles.playerText}>{player2}</Text>
                {isSelected(player2ID) && (
                    <TextInput
                        style={styles.input}
                        placeholder="Enter bet"
                        value={betAmount2}
                        onChangeText={setBetAmount2}
                        keyboardType="numeric"
                        editable={!isCurrentUser(player2ID)}
                    />
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
                >
                    <Text style={styles.submitButtonText}>
                        {currentMatchupIndex === matchups.length - 1 ? 'Submit' : 'Next'}
                    </Text>
                </TouchableHighlight>
            )}

            {/* Modal */}
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
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    input: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#AAA',
        borderRadius: 5,
        padding: 10,
        marginTop: 10,
        width: '50%',
        textAlign: 'center',
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
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 18,
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