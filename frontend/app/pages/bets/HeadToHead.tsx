import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Button, Image, TextInput, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, TouchableHighlight } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useUser } from '../../UserProvider';
import { addBet } from '@/backend/src/bets';

type headToHeadPageNavigationProp = StackNavigationProp<RootStackParamList, 'HeadToHeadPage'>;

type Props = {
    navigation: headToHeadPageNavigationProp;
};

const matchups = [
    ['Player 1', 'Player 2'],
    ['Player 3', 'Player 4'],
];

const HeadToHeadPage: React.FC<Props> = ({ navigation }) => {
    const route = useRoute();
    const { groupID } = route.params as { groupID: string };
    const { userID } = useUser();
    const [selectedPlayer, setSelectedPlayer] = useState<null | string>(null);
    const [betAmount1, setBetAmount1] = useState('');
    const [betAmount2, setBetAmount2] = useState('');
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [currentMatchupIndex, setCurrentMatchupIndex] = useState(0);

    const handleSelectPlayer = (player: string) => {
        setSelectedPlayer(player);
    };

    const isSelected = (player: string) => selectedPlayer === player;

    const handleNext = async () => {
        if (currentMatchupIndex < matchups.length - 1) {
            console.log('you bet on: ', selectedPlayer);
            console.log('you bet: ', selectedPlayer === matchups[currentMatchupIndex][0] ? betAmount1 : betAmount2);
            const submittedPlayer = selectedPlayer;
            const submittedBet = +(selectedPlayer === matchups[currentMatchupIndex][0] ? betAmount1 : betAmount2);
            const duelID = 'tempduelid';
            await addBet(userID, submittedBet, duelID, groupID);
            
            setSelectedPlayer(null);
            setBetAmount1('');
            setBetAmount2('');
            setCurrentMatchupIndex(currentMatchupIndex + 1);
        }
    };

    const currentPlayers = matchups[currentMatchupIndex];
    const player1 = currentPlayers[0];
    const player2 = currentPlayers[1];

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
        if ((selectedPlayer === player1 && betAmount1) || (selectedPlayer === player2 && betAmount2)) {
            return true;
        }
        return false;
    };

    const handleSubmit = async () => {
        console.log('you bet on: ', selectedPlayer);
        console.log('you bet: ', selectedPlayer === matchups[currentMatchupIndex][0] ? betAmount1 : betAmount2);
        const submittedPlayer = selectedPlayer;
        const submittedBet = +(selectedPlayer === matchups[currentMatchupIndex][0] ? betAmount1 : betAmount2);
        const duelID = 'tempduelid';
        await addBet(userID, submittedBet, duelID, groupID);
        
        navigation.navigate('BetSummaryPage');
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
                    isSelected(player1) && styles.selectedPlayer1,
                ]}
                onPress={() => handleSelectPlayer(player1)}
                activeOpacity={1}
            >
                <Text style={styles.playerText}>{player1}</Text>
                {isSelected(player1) && (
                    <TextInput
                        style={styles.input}
                        placeholder="Enter bet"
                        value={betAmount1}
                        onChangeText={setBetAmount1}
                        keyboardType="numeric"
                    />
                )}
            </TouchableOpacity>

            {/* Bottom-right (Player 2) */}
            <TouchableOpacity
                style={[
                    styles.player2Container,
                    isSelected(player2) && styles.selectedPlayer2,
                ]}
                onPress={() => handleSelectPlayer(player2)}
                activeOpacity={1}
            >
                <Text style={styles.playerText}>{player2}</Text>
                {isSelected(player2) && (
                    <TextInput
                        style={styles.input}
                        placeholder="Enter bet"
                        value={betAmount2}
                        onChangeText={setBetAmount2}
                        keyboardType="numeric"
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

});

export default HeadToHeadPage;