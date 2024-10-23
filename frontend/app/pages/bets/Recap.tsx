import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Button, ActivityIndicator, TouchableHighlight, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';  // Import the icon package
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useUser } from '../../UserProvider';
import Svg, { Circle, G } from 'react-native-svg';

type betRecapPageNavigationProp = StackNavigationProp<RootStackParamList, 'HeadToHeadPage'>;
type betRecapPageRouteProp = RouteProp<RootStackParamList, 'BetRecapPage'>;


type Props = {
    navigation: betRecapPageNavigationProp;
};

type CircularIconProps = {
    value: number; // Value from 0 to 1, where 1 is 100%
    size?: number; // Diameter of the circle
    strokeWidth?: number; // Width of the border
};

const BetRecapPage: React.FC<Props> = ({ navigation }) => {
    const { userID, groups, loading } = useUser();
    const route = useRoute<betRecapPageRouteProp>();
    const { groupID } = route.params;
    const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});

    const yesterdaysBets = groups[groupID]?.yesterdaysDuels;

    const flattenDuels = (duels: { [key: string]: { duelID: string, player1: string, player2: string, bets: { userID: string, wager: number, betOnUserID: string }[], winner: string, playerOneSteps: number,  playerTwoSteps: number } }) => {
        return Object.values(duels);
    };

    const flattenedBets = yesterdaysBets ? flattenDuels(yesterdaysBets) : [];

    const currentRecapBets = flattenedBets.map((bet) => {
        const player1 = groups[groupID]?.users[bet.player1]?.username;
        const player2 = groups[groupID]?.users[bet.player2]?.username;
        const player1pfp = groups[groupID]?.users[bet.player1]?.profilePic;
        const player2pfp = groups[groupID]?.users[bet.player2]?.profilePic;
        let winner = 'draw';
        if (bet.winner != 'draw') {
            winner = groups[groupID]?.users[bet.winner]?.username;
        }

        // if there are no bets, return the duel with the player names
        if (!bet.bets[0]?.wager || (bet.bets.length === 0)) {
            return {
                duelID: bet.duelID,
                player1,
                player2,
                player1pfp,
                player2pfp,
                player1Bets: [],
                player2Bets: [],
                winner,
                playerOneSteps: bet.playerOneSteps,
                playerTwoSteps: bet.playerTwoSteps,
            };
        }

        else {
            // Separate bets for player1 and player2
            const player1Bets = bet.bets
                .filter((b) => b.betOnUserID === bet.player1)
                .map((b) => ({
                    user: groups[groupID]?.users[b.userID]?.username,
                    wager: b.wager,
                }));
            const player2Bets = bet.bets
                .filter((b) => b.betOnUserID === bet.player2)
                .map((b) => ({
                    user: groups[groupID]?.users[b.userID]?.username,
                    wager: b.wager,
                }));

            return {
                duelID: bet.duelID,
                player1,
                player2,
                player1pfp,
                player2pfp,
                player1Bets,
                player2Bets,
                winner,
                playerOneSteps: bet.playerOneSteps,
                playerTwoSteps: bet.playerTwoSteps,
            };
        }
    });

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text>Loading...</Text>
            </View>
        );
    }

    const toggleItemExpansion = (duelID: string) => {
        setExpandedItems((prevExpandedItems) => ({
            ...prevExpandedItems,
            [duelID]: !prevExpandedItems[duelID], // toggle the current duelID
        }));
    };

    const CircularIcon: React.FC<CircularIconProps> = ({ value, size = 100, strokeWidth = 10 }) => {
        const radius = (size - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        const blueStrokeLength = value * circumference;
        const redStrokeLength = (1 - value) * circumference;
    
        return (
            <View style={[styles.circleContainer, { width: size, height: size }]}>
                <Svg width={size} height={size}>
                    <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
                        {/* Blue portion of the border */}
                        <Circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            stroke="#1E90FF"
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${blueStrokeLength} ${circumference}`}
                            strokeLinecap="round"
                            fill="transparent"
                        />
                        {/* Red portion of the border */}
                        <Circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            stroke="#ff3535"
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${redStrokeLength} ${circumference}`}
                            strokeDashoffset={-blueStrokeLength}
                            strokeLinecap="round"
                            fill="transparent"
                        />
                    </G>
                </Svg>
                {/* Center text */}
                <View style={styles.VStextContainer}>
                    <Text style={styles.VStext}>VS</Text>
                </View>
            </View>
        );
    };

    const renderBetItem = ({ item }: { item: { duelID: string, player1: string, player2: string, player1pfp: string, player2pfp: string, player1Bets: { user: string, wager: number }[], player2Bets: { user: string, wager: number }[], winner: string, playerOneSteps: number,  playerTwoSteps: number } }) => {
        const isExpanded = expandedItems[item.duelID] || false; // check if the current duel is expanded

        const totalPlayer1Bets = item.player1Bets.reduce((sum, bet) => sum + bet.wager, 0);
        const totalPlayer2Bets = item.player2Bets.reduce((sum, bet) => sum + bet.wager, 0);

        // Calculate the sum of all bets
        const totalBets = totalPlayer1Bets + totalPlayer2Bets;
        
        // Calculate the ratios for the circular value
        const player1Ratio = totalBets === 0 ? 0.5 : totalPlayer1Bets / totalBets;
        const player2Ratio = totalBets === 0 ? 0.5 : totalPlayer2Bets / totalBets;

    
        return (
            <View style={styles.flatList}>
                {/* Players */}
                <TouchableOpacity onPress={() => toggleItemExpansion(item.duelID)}>
                    {/* player 1 */}
                    <View style={styles.playerContainer}>
                        <View style={styles.row}>
                            <View style={styles.spacer} />
                            <View style={[
                                styles.statusBar,
                                item.winner === item.player1 && styles.winStatus,
                                item.winner === item.player2 && styles.loseStatus,
                                item.winner === 'draw' && styles.drawStatus,
                            ]}>
                                <Text style={styles.statusText}>
                                    {item.winner === item.player1 ? 'Win' : 
                                    item.winner === item.player2 ? 'Lose' : 'Draw'}
                                </Text>
                            </View>
                            {/* Carrot Icon */}
                            <View style={styles.spacer}>
                                {(item.player2Bets.length > 1 || item.player1Bets.length > 1) && (
                                    <MaterialIcons
                                        name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                                        size={24}
                                        style={styles.carrotIcon}
                                    />
                                )}
                            </View>
                        </View>
                        <View style={[styles.row, { marginTop: 10 }]}>
                            <Image
                                source={{ uri: item.player1pfp }}
                                style={styles.profileImage}
                            />
                            <Text style={[
                                styles.player,
                                item.winner === item.player2 && styles.loserText,
                            ]}>{item.player1}</Text>
                            {item.winner === item.player1 && (
                                <Text style={styles.triangleText}>▶</Text>
                            )}
                            <Text style={styles.steps}>{item.playerOneSteps}</Text>
                        </View>
                        {isExpanded && (
                            <View>
                                {item.player1Bets.map((bet, index) => (
                                    (bet.user !== item.player1) && (
                                        <Text key={index}> {'\t'}{bet.user}: {bet.wager}</Text>
                                    )
                                ))}
                            </View>
                        )}
                    </View>
                    {/* player 2 */}
                    <View style={styles.playerContainer}>
                        <View style={[styles.row, { marginTop: 10 }]}>
                            <Image
                                source={{ uri: item.player2pfp }}
                                style={[
                                    styles.profileImage,
                                    item.winner === item.player1 && styles.loserImage,
                                ]}
                            />
                            <Text style={[
                                styles.player,
                                item.winner === item.player1 && styles.loserText,
                            ]}>{item.player2}</Text>
                            {item.winner === item.player2 && (
                                <Text style={styles.triangleText}>▶</Text>
                            )}
                            <Text style={[
                                styles.steps,
                                item.winner === item.player1 && styles.loserText,
                            ]}>{item.playerTwoSteps}</Text>
                        </View>
                        {isExpanded && (
                            <View>
                                {item.player2Bets.map((bet, index) => (
                                    (bet.user !== item.player2) && (
                                        <Text key={index}> {'\t'}{bet.user}: {bet.wager}</Text>
                                    )
                                ))}
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Recap</Text>
            <Text style={styles.header}>Here are the results of yesterday's bets:</Text>
            <FlatList
                data={currentRecapBets}
                keyExtractor={(item) => item.duelID}
                renderItem={renderBetItem}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 20,
    },
    spacer: {
        flex: 1,
    },
    statusBar: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        alignItems: 'center',
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
    },
    statusText: {
        color: 'white',
        fontWeight: '500',
        fontSize: 14,
    },
    winStatus: {
        backgroundColor: '#4CAF50', // Green color
    },
    loseStatus: {
        backgroundColor: '#f44336', // Red color
    },
    drawStatus: {
        backgroundColor: '#9e9e9e', // Gray color
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    header: {
        fontSize: 15,
        marginBottom: 20,
        textAlign: 'center',
    },
    flatList: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        marginTop: 10,
        paddingBottom: 25,
    },
    stepTitle: {
        fontWeight: 'bold',
    },
	spacedText: {
		marginTop: 10,
	},
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    carrotIcon: {
        textAlign: 'right',
        color: '#888',
    },
    triangleText: {
        marginHorizontal: 8,
        fontSize: 12,
        color: '#000000',
        opacity: 0.7, // Makes it slightly faded like in the image
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#D3D3D3",
        marginRight: 10,
    },
    playerContainer: {
        paddingLeft: 25,
        paddingRight: 25,
    },
    player: {
        fontWeight: 'bold',
        fontSize: 18,
        flex: 1,
        textAlign: 'left',
    },
    steps: {
        marginRight: 30,
        textAlign: 'right',
        fontSize: 28,
    },
    loserText: {
        color: '#808080',
        opacity: 0.7,
    },
    loserImage: {
        opacity: 0.5,
    },
    winner: {
        fontWeight: 'bold',
        fontSize: 20,
        color: 'green',
    },
    noWinner: {
        textAlign: 'center',
        marginTop: 10,
    },
    betsListLeft: {
        marginTop: 10,
        paddingRight: 20,
    },
    betsListRight: {
        marginTop: 10,
        paddingLeft: 20,
    },
    circleContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 25,
    },
    VStextContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 25,
    },
    VStext: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'black',
    },
    centeredColumn: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
});

export default BetRecapPage;