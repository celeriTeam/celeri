import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, TouchableHighlight, Modal, PanResponder, Animated, TouchableWithoutFeedback, Image } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useUser } from '../../UserProvider';

type headToHeadTutorialPageNavigationProp = StackNavigationProp<RootStackParamList, 'HeadToHeadTutorialPage'>;
type headToHeadTutorialPageRouteProp = RouteProp<RootStackParamList, 'HeadToHeadTutorialPage'>;

type Props = {
	navigation: headToHeadTutorialPageNavigationProp;
};

const HeadToHeadTutorialPage: React.FC<Props> = ({ navigation }) => {
	const { userID, groups, loading } = useUser();
	const route = useRoute<headToHeadTutorialPageRouteProp>();
	const { groupID } = route.params;
	const [selectedPlayer, setSelectedPlayer] = useState<boolean>(false);
	const [betAmount, setBetAmount] = useState('');
	const [tutorialStep, setTutorialStep] = useState(1);
	const [showTutorialNext, setShowTutorialNext] = useState(true);
	const [showTutorial, setShowTutorial] = useState(true);
	const increments = [25, 100, 250, 500];

	const handleSubmit = async () => {
		// navigate to HeadToHead
		navigation.reset({
			index: 1,
			routes: [
				{ name: 'HomeTab' }, // the first route in the stack
				{ name: 'HeadToHeadPage', params: { groupID: groupID } } // the top route in the stack
			],
		});
	};

	const handleSelectPlayer = () => {
		setSelectedPlayer(true);
		setTutorialStep(5);
	};

	const increaseBetAmount = (amount: number) => {
		setBetAmount(((+betAmount || 0) + amount).toString());
	}

	const isValidBet = (tokens: number, bet: number) => tokens >= bet && bet > 0;

	const TutorialModal = () => {
		const getHighlightedElement = () => {
			switch (tutorialStep) {
				case 2:
					return [styles.tokens, styles.betTokens, {position: 'absolute', top: 10, right: 20,}]; // Highlight tokens display
				case 3:
					return [{
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						height: '50%',
						pointerEvents: 'auto', // Enable interaction
						zIndex: 1000, // Ensure it's above other elements
					}];
				case 4:
					return styles.bettingRow;
				case 5:
					return styles.submitButton;
				default:
					return null;
			}
		};

		const getTutorialMessage = () => {
			switch (tutorialStep) {
				case 1:
					setShowTutorialNext(true);
					return "Welcome! You must be new here. Let me show you the ropes.";
				case 2:
					setShowTutorialNext(true);
					return `This game will have ${groups[groupID].totalCycles} rounds. You will start with ${groups[groupID].users[userID].tokens} tokens, and gain ${groups[groupID].dailyTokens} tokens everyday. You will be competing against your ${(groups[groupID].userList).length - 1} friends to see who can earn the most tokens.`;
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
					return "In addition to tokens, we also have a diamond currency. When you win your head-to-head bets, you will earn a diamond, which can be used to purchase power-ups.";
				case 11:
					setShowTutorialNext(false);
					return "You're almost done! Click here to start the competition with your friends. Happy betting!";
				default:
					setShowTutorialNext(true);
					return "";
			}
		};

		const getModalStyle = () => {
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
						top: 50,
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
					return {
						width: '60%',
						position: 'absolute',
						bottom: 0,
						left: 20,
					};
				default:
					return {width: '80%'};
			}
		};

		return (
			<View style={styles.tutorialOverlay}>
				
				{/* Semi-transparent overlay with holes */}
				{/* <View style={styles.interactiveOverlay}>
					<TouchableWithoutFeedback>
						<View style={[
							styles.nonInteractiveArea,
							getHighlightedElement() && {
								...StyleSheet.absoluteFillObject,
							}
						]} />
					</TouchableWithoutFeedback>
					
				</View> */}
	
				{/* Tutorial content */}
				<View style={[
					styles.tutorialContent,
					getModalStyle()
				]}>
					{/* <TouchableOpacity
						onPress={() => handleSubmit()}
					>
						<Text style={styles.skipButtonText}>{`Skip Tutorial >`}</Text>
					</TouchableOpacity> */}
					<Text style={styles.tutorialText}>{getTutorialMessage()}</Text>
					{tutorialStep === 10 && (
						<Image
							source={require('../../../assets/images/store_tutorial.jpg')}
							style={styles.image}
						/>
					)}
					{showTutorialNext && (
						<TouchableOpacity
							style={styles.tutorialButton}
							onPress={() => {
								if (tutorialStep < 11) {
									setTutorialStep(tutorialStep + 1);
								} else {
									setShowTutorial(false);
								}
							}}
						>
							<Text style={styles.tutorialButtonText}>
								{tutorialStep === 11 ? 'Finish' : 'Next'}
							</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>
		);
	};

	return (
		<View style={styles.container}>

			{/* Modal */}
			<TutorialModal />
			
			<View style={[
				styles.tokens, 
				(tutorialStep === 3) && {zIndex: 200},
				(tutorialStep === 4) && {zIndex: 200},
				(tutorialStep === 5) && {zIndex: 200},
				]}>
				<Text style={{ fontFamily: "Lexend" }}>Your Tokens: {groups[groupID].users[userID].tokens}</Text>
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
					(tutorialStep === 11) && {zIndex: 200},
				]}
				underlayColor="#ff7043"
				onPress={() => handleSubmit()}
			>
				<Text style={styles.submitButtonText}>Next</Text>
			</TouchableHighlight>

		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		position: 'relative',
		backgroundColor: '#F5F5F5',
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
		zIndex: 20,
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
    image: {
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
		marginBottom: 20,
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