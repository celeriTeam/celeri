import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, TouchableHighlight, Modal, PanResponder, Animated, TouchableWithoutFeedback, Image, Keyboard, KeyboardAvoidingView, Platform, StyleProp, ViewStyle } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUser } from '../../../UserProvider';
import { addToFinishedTutorial } from '@/backend/src/bets';
import { useRouter, useLocalSearchParams } from 'expo-router';

type ModalStyle = {
    width: string | number;
    position?: 'absolute' | 'relative';
    top?: string | number;
    left?: number;
    bottom?: number;
};

const HeadToHeadTutorialPage: React.FC = () => {
	const { userID, groups, loading } = useUser();
	const route = useRouter();
	const { groupIDTemp } = useLocalSearchParams();
	const groupID = groupIDTemp ? String(groupIDTemp) : '';
	const [selectedPlayer, setSelectedPlayer] = useState<boolean>(false);
	const [betAmount, setBetAmount] = useState('');
	const [tutorialStep, setTutorialStep] = useState(1);
	const [showTutorialNext, setShowTutorialNext] = useState(true);
	const [showTutorial, setShowTutorial] = useState(true);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
	const increments = [25, 100, 250, 500];
	const router = useRouter();

	const handleSubmit = async () => {
		try {
			addToFinishedTutorial(groupID, userID);
			
			setTimeout(() => {
				router.replace({
					pathname: '/(authenticated)/home/bets/NewHeadToHead',
					params: { groupIDTemp: groupID },
				});
			}, 0); // Ensures the route updates in order
			// navigate to HeadToHead
		} catch (error) {
            console.error("Error going to headToHeadPage: ", error);
        }
	};

	const handleSelectPlayer = () => {
		setSelectedPlayer(true);
		setTutorialStep(5);
	};

	const increaseBetAmount = (amount: number) => {
		setBetAmount(((+betAmount || 0) + amount).toString());
	}

	const isWeekly = groups[groupID]?.gameType == "weekly";

	const calculateTimeLeft = () => {
		const timeLeft = (groups[groupID]?.currentPlayersInGame ?? 0) - 1 - (groups[groupID]?.cycle ?? 0) + ((groups[groupID]?.totalCycles ?? 0) - (groups[groupID]?.cycleCount ?? 0)) * (Object.keys(groups[groupID]?.userList ?? []).length - 1);
		if(isWeekly){
			if(timeLeft == 1){
				return `${timeLeft} week`
			} else {
				return `${timeLeft} weeks`
			}
		} else {
			if(timeLeft == 1){
				return `${timeLeft} day`
			} else {
				return `${timeLeft} days`
			}
		}
	}

	const isValidBet = (tokens: number, bet: number) => tokens >= bet && bet > 0;

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

	const TutorialModal = () => {
		const getTutorialMessage = () => {
			switch (tutorialStep) {
				case 1:
					setShowTutorialNext(true);
					return "Welcome! You must be new here. Let me show you the ropes.";
				case 2:
					setShowTutorialNext(true);
					const timeLeft = calculateTimeLeft();
					const time = isWeekly ? "week" : "day";
					return `This game will last ${timeLeft}. You will start with ${groups[groupID]?.users[userID]?.tokens} tokens. You can bet once every ${time} against your ${(groups[groupID]?.userList).length - 1} friends to see who can earn the most tokens.`;
				case 3:
					setShowTutorialNext(true);
					return "Here you can see all the tokens you have, as well as how many of them you have bet for that day. Use them wisely.";
				case 4:
					setShowTutorialNext(false);
					return "You can see two of your friends' usernames. Choose who you want to bet on, then click anywhere on their half of the screen.";
				case 5:
					if (betAmount === '' || !isValidBet(groups[groupID]?.users[userID]?.tokens || 1000, +betAmount) ) {
						setShowTutorialNext(false);
					} else {
						setShowTutorialNext(true);
					}
					return "Here, you can add numbers to your bet amount by clicking the orange buttons. You can also write in a custom bet amount. If you want to reset your bet, you can always clear it on the right.";
				case 6:
					setShowTutorialNext(true);
					return `Here's how the earnings work:\n If you win your head-to-head and nobody bet on you, you get 100%.`;
				case 7:
					setShowTutorialNext(true);
					return "If you win your head-to-head and people bet on you, you get 50%.";
				case 8:
					setShowTutorialNext(true);
					return "If you are just a regular better, you get 50% of the proportion bet.";
				case 9:
					setShowTutorialNext(true);
					return "If you lose, you lose what you bet.";
				case 10:
					setShowTutorialNext(true);
					if (isWeekly) {
						return "At the end of the week, the person with the most total steps of that week gets 5% of everybody's tokens.";
					} else {
						return "In addition to tokens, we also have a diamond currency. When you win your head-to-head bets, you will earn a diamond, which can be used to purchase power-ups.";
					}
				case 11:
					if (isWeekly) {
						setShowTutorialNext(true);
						return "You'll get a random prop bet every day - if you're right about the over/under, you get a diamond.";
					} else {
						setShowTutorialNext(false);
						return "You're almost done! Click here to start the competition with your friends. Happy betting!";
					}
				case 12:
					if (isWeekly) {
						setShowTutorialNext(true);
						return "You can use your diamonds to then buy powerups to influence the weekly bets.";
					} else {
						return "";
					}
				case 13:
					if (isWeekly) {
						setShowTutorialNext(false);
						return "You're almost done! Click here to start the competition with your friends. Happy betting!";
					} else {
						return "";
					}
				default:
					setShowTutorialNext(true);
					return "";
			}
		};

		const getModalStyle = (): ModalStyle => {
			switch (tutorialStep) {
				case 1:
					return {
						width: '80%',
					};
				case 2:
					return {
						width: '80%',
					};
				case 3:
					return {
						width: '60%',
						position: 'absolute',
						// Position near tokens display
						top: 110,
						left: 20
					};
				case 4:
					return {
						width: '90%',
						position: 'absolute',
						top: '53%',
					};
				case 5:
					return {
						width: '90%',
						position: 'absolute',
						top: '53%',
					};
				case 11:
					if (isWeekly) {
						return {width: '80%'};
					} else {
						return {
							width: '60%',
							position: 'absolute',
							bottom: 0,
							left: 20,
						};
					}
				case 13:
					if (isWeekly) {
						return {
							width: '60%',
							position: 'absolute',
							bottom: 0,
							left: 20,
						};
					}
				default:
					return {width: '80%'};
			}
		};

		return (
			<View style={styles.tutorialOverlay}>
	
				{/* Tutorial content */}
				<View style={[
					styles.tutorialContent,
					getModalStyle() as StyleProp<ViewStyle>
				]}>
					<Text style={styles.tutorialText}>{getTutorialMessage()}</Text>
					{isWeekly && tutorialStep === 10 && (
						<Image
							source={require('@assets/images/steps_race.jpg')}
							style={styles.raceImage}
						/>
					)}
					{isWeekly && tutorialStep === 11 && (
						<Image
							source={require('@assets/images/prop_bet.jpg')}
							style={styles.propBetImage}
						/>
					)}
					{((!isWeekly && tutorialStep === 10) || (isWeekly && tutorialStep === 12)) && (
						<Image
							source={require('@assets/images/store_tutorial.jpg')}
							style={styles.storeImage}
						/>
					)}
					{showTutorialNext && (
						<View style={{ flexDirection: 'row', width: '100%', marginTop: 20 }}>
							{tutorialStep > 6 && ((!isWeekly && tutorialStep < 11) || (isWeekly && tutorialStep < 13)) && (
								<TouchableOpacity
									style={[
										styles.tutorialButton,
										{ flex: 0.5, marginRight: 5 },
									]}
									onPress={() => { setTutorialStep(tutorialStep - 1); }}
								>
									<Text style={styles.tutorialButtonText}>Previous</Text>
								</TouchableOpacity>
							)}
							<TouchableOpacity
								style={[
									styles.tutorialButton,
									{ flex: tutorialStep <= 6 ? 1 : 0.5 },
								]}
								onPress={() => {
									if ((!isWeekly && tutorialStep < 11) || (isWeekly && tutorialStep < 13)) {
										setTutorialStep(tutorialStep + 1);
									} else {
										setShowTutorial(false);
									}
								}}
							>
								<Text style={styles.tutorialButtonText}>
									{(!isWeekly && tutorialStep === 11) || (isWeekly && tutorialStep === 13) ? 'Finish' : 'Next'}
								</Text>
							</TouchableOpacity>
						</View>
					)}
				</View>
			</View>
		);
	};

	return (
		<KeyboardAvoidingView style={styles.container}>
			
            {keyboardVisible && (
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.dismissOverlay} />
                </TouchableWithoutFeedback>
            )}

			{/* Modal */}
			<TutorialModal />
			
			<View style={[
				styles.tokens, 
				(tutorialStep === 3) && {zIndex: 200},
				(tutorialStep === 4) && {zIndex: 200},
				(tutorialStep === 5) && {zIndex: 200},
				]}>
				<Text style={{ fontFamily: "Lexend" }}>Your Tokens: {groups[groupID]?.users[userID]?.tokens}</Text>
			</View>
			<View style={[
				styles.betTokens, 
				(tutorialStep === 3) && {zIndex: 200},
				(tutorialStep === 4) && {zIndex: 200},
				(tutorialStep === 5) && {zIndex: 200},
				]}>
				<Text style={{ fontFamily: "Lexend" }}>Bet Tokens: 0</Text>
			</View>

			{/* Top-left (Player 1) */}
			<TouchableOpacity
				style={[
					styles.player1Container,
					selectedPlayer && styles.selectedPlayer1,
					(tutorialStep === 4) && {zIndex: 199,},
					(tutorialStep === 5) && {zIndex: 199,},
				]}
				onPress={() => handleSelectPlayer()}
				activeOpacity={1}
			>
				<Text style={styles.playerText}>Best Friend</Text>
				{selectedPlayer && (
					<>
						<Text style={styles.betNumber}>{betAmount || 0}</Text>
						{!isValidBet(groups[groupID]?.users[userID]?.tokens || 1000, +betAmount) && (betAmount != '') && (
							<Text style={styles.errorText}>Invalid bet</Text>
						)}
						<View style={styles.bettingRow}>
							{increments.map((amount) => (
								<TouchableOpacity
									style={styles.incrementButton}
									onPress={() => increaseBetAmount(amount)}
								>
									<Text style={styles.incrementText}>+{amount}</Text>
								</TouchableOpacity>
							))}
							<TextInput
								style={styles.input}
								value={betAmount}
								onChangeText={setBetAmount}
								keyboardType="numeric"
							/>
							<TouchableOpacity
								onPress={() => setBetAmount('')}
							>
								<Text style={styles.incrementText}>Clear bet</Text>
							</TouchableOpacity>
						</View>
					</>
				)}
			</TouchableOpacity>

			{/* Bottom-right (Player 2) */}
			<TouchableOpacity
				style={styles.player2Container}
				activeOpacity={1}
			>
				<Text style={styles.playerText}>Arch Nemesis</Text>
			</TouchableOpacity>

			{/* Diagonal line */}
			<View style={styles.dividingLine} />

			{/* Next Button */}
			<TouchableHighlight
				style={[
					styles.submitButton,
					((!isWeekly && tutorialStep === 11) || (isWeekly && tutorialStep === 13)) && {zIndex: 200},
				]}
				underlayColor="#ff7043"
				onPress={() => handleSubmit()}
			>
				<Text style={styles.submitButtonText}>Next</Text>
			</TouchableHighlight>

		</KeyboardAvoidingView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		position: 'relative',
		backgroundColor: '#F5F5F5',
		marginTop: 50,
	},
    dismissOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
    },
	tokens: {
		position: 'absolute',
		top: 70,
		right: 20,
		backgroundColor: '#FFD700',
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderColor: '#FF8C00',
		borderWidth: 2,
		zIndex: 20,
	},
	betTokens: {
		position: 'absolute',
		top: 100,
		right: 20,
		backgroundColor: '#FFD700',
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderColor: '#FF8C00',
		borderWidth: 2,
		zIndex: 20,
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
		minWidth: 50,
		textAlign: 'center',
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
	},
	submitButtonText: {
		fontFamily: "Lexend-Bold",
		color: '#FFF',
		fontSize: 18,
	},
	// TUTORIAL
	skipButton: {
		position: 'absolute',
		top: 60,
		left: 20,
		padding: 10,
		zIndex: 1,
		backgroundColor: 'white',
		borderRadius: 5,
	},
	skipButtonText: {
		color: 'black',
		fontFamily: 'Lexend-Bold',
		fontSize: 16,
		marginBottom: 10,
		textAlign: 'right',
	},
    raceImage: {
		marginTop: 30,
        width: 280,
        height: 200,
		margin: 'auto', // center
    },
    propBetImage: {
		marginTop: 30,
        width: 270,
        height: 160,
		margin: 'auto', // center
    },
    storeImage: {
		marginTop: 30,
        width: 200,
        height: 350,
		margin: 'auto', // center
    },
	interactiveOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'transparent',
	},
	nonInteractiveArea: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
	},
	interactiveArea: {
		position: 'absolute',
		backgroundColor: 'transparent',
		pointerEvents: 'none',
	},
	tutorialOverlay: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 100,
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
	},
	tutorialContent: {
		backgroundColor: 'white',
		padding: 20,
		borderRadius: 10,
	},
	tutorialText: {
		fontSize: 16,
		fontFamily: 'Lexend',
		textAlign: 'center',
	},
	tutorialButtons: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	tutorialButton: {
		backgroundColor: '#FF5722',
		padding: 10,
		borderRadius: 5,
		minWidth: 100,
		alignItems: 'center',
	},
	tutorialButtonText: {
		color: 'white',
		fontFamily: 'Lexend-Bold',
	},
	highlight: {
		position: 'absolute',
		backgroundColor: '#FFD700',
	},
});

export default HeadToHeadTutorialPage;

// x amount of rounds, amt of players...
// explain how betting works
// then go into how earnings work