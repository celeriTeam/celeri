import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Button, ActivityIndicator, FlatList, Modal, ScrollView, Alert } from 'react-native';
import { app } from "@firebaseConfig";
import { getFirestore, doc, collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { Image } from 'expo-image';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useUser } from '../../UserProvider';
import { LinearGradient } from 'expo-linear-gradient';
import StorePage from './Store';
import BetHistoryPage from './BetHistory';
import Svg, { Circle, G } from 'react-native-svg';
import { getAverageSteps, getProfilePic, getSteps, getUserName, getWeeklySteps } from '@/backend/src/users';
import { getCurrentPlayersInGame, getCycleCount, getCycle, getGroupIsFirstDay, getGroupName, getGroupProfilePic, getGameType, getTodaysBetTokens, getTotalCycles, getUserDiamonds, getUsersInGroup, getUserTokens, addPropBet, getPropBet, getResetDay } from '@/backend/src/groups';
import { getPowerups } from '@/backend/src/store';
import { Dimensions } from 'react-native';
import useHealthData from '@/backend/src/hooks/useHealthData';
import { addToFinishedPropBet, checkFinishedPropBet } from '@/backend/src/bets';
import { ClientRequest } from 'http';

const db = getFirestore(app);

type headToHeadPageNavigationProp = StackNavigationProp<RootStackParamList, 'HeadToHeadPage'>;
type betSummaryPageRouteProp = RouteProp<RootStackParamList, 'BetSummaryPage'>;

type Props = {
    navigation: headToHeadPageNavigationProp;
};

const BetSummaryPage: React.FC<Props> = ({ navigation }) => {
    const { userID, loading } = useUser();
    const route = useRoute<betSummaryPageRouteProp>();
    const { groupID } = route.params;
    const { steps, weeklySteps, averageSteps, distance, flights } = useHealthData();
    const [isStepsModalVisible, setStepsModalVisible] = useState(false);
    const [isPropBetModalVisible, setPropBetModalVisible] = useState(false);
    const [isBetHistoryModalVisible, setBetHistoryModalVisible] = useState(false);
    const [isStoreModalVisible, setStoreModalVisible] = useState(false);
    const [isTokensModalVisible, setTokensModalVisible] = useState(false);
    const [isTokensUsedModalVisible, setTokensUsedModalVisible] = useState(false);
    const [isDiamondsModalVisible, setDiamondsModalVisible] = useState(false);
    const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});
    const [groups, setGroups] = useState<{ [groupID: string]: any }>({});
    const [currentBets, setCurrentBets] = useState<{ duelID: string, player1: string, player2: string, player1Pfp: string, player2Pfp: string, player1Bets: { user: string, wager: number }[], player2Bets: { user: string, wager: number }[], player1Steps: number, player2Steps: number }[]>([]);
    const [currentGroupUsersArray, setCurrentGroupUsersArray] = useState<{ id: string; name: string | undefined; pfp: string | undefined; tokens: number | undefined; steps: number | undefined, averageSteps: number | undefined }[]>([]);
    const [gameTimeLeft, setGameTimeLeft] = useState("");
    const [betTimeLeft, setBetTimeLeft] = useState("");
    const [propBetPlayer, setPropBetPlayer] = useState<{ id: string; name: string; averageSteps: number; }[]>([]);
    const [selectedPropBet, setSelectedPropBet] = useState<'over' | 'under' | null>(null);
    const [finishedPropBet, setFinishedPropBet] = useState<boolean>(false);
    const [currentPropBet, setCurrentPropBet] = useState<{ betOnUserID: string; averageSteps: number; overUnder: string; } | undefined>(undefined);
    const [currentBetIndex, setCurrentBetIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [powerups, setPowerups] = useState<Array<Array<string>>>([]);
    const [selectedTab, setSelectedTab] = useState('Tokens');
    const [isDuelExpanded, setIsDuelExpanded] = useState(false);

    useEffect(() => {
        let cleanup: () => void;
    
        const initialize = async () => {
            try {
                cleanup = await fetchGroupData(userID);
                await fetchPowerups();
            } catch (error) {
                console.error('Error fetching user groups:', error);
            } finally {
                setIsLoading(false);
            }
        };
    
        initialize();
    
        return () => {
            if (cleanup) {
                cleanup();
            }
        };
    }, [userID, isStoreModalVisible, isPropBetModalVisible]);

    const fetchPowerups = async () => {
        try {
            const powerupsData = await getPowerups(groupID);
            setPowerups(powerupsData);
            console.log("powerups received", powerups);
        } catch (error) {
            console.error("Failed to fetch powerups:", error);
        }
    };

    const gameTypeSteps = (gameType: string, dailySteps: number, weeklySteps: number) => {
        if (gameType === "weekly") {
            return Math.round(dailySteps + weeklySteps);
        } else {
            return Math.round(dailySteps);
        }
    };

    const setPropBetPlayerLogic = (userList: string[], cycle: number, cycleCount: number) => {
        // Find current user's index
        const currentUserIndex = userList.indexOf(userID);
        
        // Calculate initial chosen index with wraparound
        let chosenIndex = (currentUserIndex + cycle + cycleCount) % userList.length;
        
        // If chosen player is current user, increment index
        if (userList[chosenIndex] === userID) {
            chosenIndex = (chosenIndex + 1) % userList.length;
        }
        
        // Set the prop bet player
        return userList[chosenIndex];
    };

    const fetchGroupData = async (uid: string) => {
        const currentGroups: { [groupID: string]: any } = {};
        const groupsRef = collection(db, "groups");
        const groupDocRef = doc(groupsRef, groupID);

        // Unsubscribe firebase listener functions
        const unsubscribeFunctions: (() => void)[] = [];
        // Set up listener iff modal is not visible
        if (!isStoreModalVisible && !isPropBetModalVisible) {
            const unsubscribeGroup = onSnapshot(groupDocRef, async (docSnapshot) => {
                setIsLoading(true);
                if (docSnapshot.exists() && groupID) {
                    const [groupImageUrl, groupName, isFirstDay, userTokens, todaysBetTokens, userDiamonds, currentPlayersInGame, cycle, cycleCount, totalCycles, resetDay, gameType, isFinishedPropBet] = await Promise.all([
                        getGroupProfilePic(groupID),
                        getGroupName(groupID),
                        getGroupIsFirstDay(groupID),
                        getUserTokens(uid, groupID),
                        getTodaysBetTokens(uid, groupID),
                        getUserDiamonds(uid, groupID),
                        getCurrentPlayersInGame(groupID),
                        getCycle(groupID),
                        getCycleCount(groupID),
                        getTotalCycles(groupID),
                        getResetDay(groupID),
                        getGameType(groupID),
                        checkFinishedPropBet(groupID, uid)
                    ]);

                    const userList = await getUsersInGroup(groupID); // userIDs
                    const users: { [userID: string]: any } = {};
                    let groupUsersArray: { id: string; name: string | undefined; pfp: string | undefined; tokens: number | undefined; steps: number | undefined, averageSteps: number | undefined }[] = [];
                    if (userList) {
                        await Promise.all(userList.map(async (selectedUserID) => {
                            const [profilePic, username, steps, weeklySteps, averageSteps, tokens] = await Promise.all([
                                getProfilePic(selectedUserID),
                                getUserName(selectedUserID),
                                getSteps(selectedUserID),
                                getWeeklySteps(groupID, selectedUserID),
                                getAverageSteps(selectedUserID),
                                getUserTokens(selectedUserID, groupID)
                            ]);
                            
                            const newSteps = gameTypeSteps(gameType || "daily", steps, weeklySteps);

                            users[selectedUserID] = {
                                profilePic,
                                username,
                                newSteps,
                                tokens
                            };
                            groupUsersArray.push({ id: selectedUserID, name: username, pfp: profilePic, tokens: tokens, steps: newSteps, averageSteps: averageSteps });
                        }));
                        // Sort users by tokens in descending order
                        groupUsersArray.sort((a, b) => (b.tokens ?? 0) - (a.tokens ?? 0));
                        setCurrentGroupUsersArray(groupUsersArray);
                    }
                    currentGroups[groupID] = {
                        groupImageUrl,
                        groupName,
                        isFirstDay,
                        userTokens,
                        userList,
                        todaysBetTokens,
                        userDiamonds,
                        currentPlayersInGame,
                        gameType
                    };
                    setGroups(currentGroups);

                    // Set # of days/weeks left in the game
                    const timeLeft = (currentPlayersInGame ?? 0) - 1 - (cycle ?? 0) + ((totalCycles ?? 0) - (cycleCount ?? 0)) * (Object.keys(userList ?? []).length - 1);
                    if(gameType == "weekly"){
                        console.log("weeksLeft -- ", timeLeft);
                        if(timeLeft == 1){
                            setGameTimeLeft(`${timeLeft} week left in the game!`)
                        } else {
                            setGameTimeLeft(`${timeLeft} weeks left in the game!`)
                        }
                    } else {
                        if(timeLeft == 1){
                            setGameTimeLeft(`${timeLeft} day left!`)
                        } else {
                            setGameTimeLeft(`${timeLeft} days left!`)
                        }
                    }

                    // If weekly, get # of days left in the week
                    if (resetDay !== undefined) {
                        const today = new Date();
                        const currentDay = today.getDay();
                        if (currentDay === resetDay) {
                            setBetTimeLeft("7 days left to bet!");
                        } else if (currentDay > resetDay) {
                            setBetTimeLeft(`${7 - (currentDay - resetDay)} days left to bet!`);
                        } else {
                            setBetTimeLeft(`${resetDay - currentDay} days left to bet!`);
                        }
                    }

                    // Set the prop bet player
                    setFinishedPropBet(isFinishedPropBet);
                    if (isFinishedPropBet) {
                        const propBetInfo = await getPropBet(groupID, uid);
                        setCurrentPropBet(propBetInfo);
                    }
                    const propBetPlayerID = setPropBetPlayerLogic(userList ?? [], cycle ?? 0, cycleCount ?? 0);
                    const propBetPlayerInfo = groupUsersArray.find(user => user.id === propBetPlayerID);
                    setPropBetPlayer([{id: propBetPlayerID, name: propBetPlayerInfo?.name ?? '', averageSteps: propBetPlayerInfo?.averageSteps ?? 0}]);

                    // So it opens up immediately if you haven't made a prop bet yet
                    if (!isFinishedPropBet && gameType === 'weekly') {
                        setPropBetModalVisible(true);
                    }

                    // Set up a listener for today's duels
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const startDate = new Date(today);
                    const endDate = new Date(today);

                    if (gameType === 'weekly') {
                        // Start date is 7 days ago
                        startDate.setDate(startDate.getDate() - 7);
                        endDate.setDate(endDate.getDate() + 1);
                    } else {
                        // Start date is today, end date is tomorrow
                        endDate.setDate(endDate.getDate() + 1);
                    }

                    const duelsCollection = collection(groupDocRef, 'duels');
                    const duelsQuery = query(duelsCollection,
                        where('cycleCount', '==', cycleCount),
                        where(gameType === 'weekly' ? 'cycleWeek' : 'cycleDay', '==', cycle),
                        where('createdAt', '>=', Timestamp.fromDate(startDate)),
                        where('createdAt', '<', Timestamp.fromDate(endDate))
                    );

                    // Clean up previous duels listener if exists
                    if (unsubscribeFunctions.length > 0) {
                        unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
                        unsubscribeFunctions.length = 0;
                    }

                    // New duels listener
                    const unsubscribeDuels = onSnapshot(duelsQuery, (duelsSnapshot) => {
                        setIsLoading(true);
                        const todaysDuels: { [key: string]: any } = {};
                        duelsSnapshot.forEach((duelDoc) => {
                            const duelData = duelDoc.data();
                            todaysDuels[duelDoc.id] = {
                                duelID: duelDoc.id,
                                player1: duelData.player1,
                                player2: duelData.player2,
                                bets: duelData.bets || []
                            };
                        });

                        const flattenDuels = (duels: { [key: string]: { duelID: string, player1: string, player2: string, bets: { userID: string, wager: number, betOnUserID: string }[] } }) => {
                            return Object.values(duels);
                        };

                        const flattenedBets = flattenDuels(todaysDuels);

                        const currBets = flattenedBets.map((bet) => {
                            const player1 = users[bet.player1]?.username;
                            const player2 = users[bet.player2]?.username;
                            const player1Steps = users[bet.player1]?.newSteps;
                            const player2Steps = users[bet.player2]?.newSteps;
                            const player1Pfp = users[bet.player1]?.profilePic ?? 'default_image_url';
                            const player2Pfp = users[bet.player2]?.profilePic ?? 'default_image_url';

                            if (bet.bets[0]?.wager == null || (bet.bets.length === 0)) {
                                console.log("thisis running!!");
                                console.log(bet.bets.length);
                                return {
                                    duelID: bet.duelID,
                                    player1,
                                    player2,
                                    player1Pfp,
                                    player2Pfp,
                                    player1Bets: [],
                                    player2Bets: [],
                                    player1Steps,
                                    player2Steps,
                                };
                            } else {
                                const player1Bets = bet.bets
                                    .filter((b) => b.betOnUserID === bet.player1 && b.wager !== 0)
                                    .map((b) => ({
                                        user: users[b.userID]?.username,
                                        wager: b.wager,
                                    }));
                                const player2Bets = bet.bets
                                    .filter((b) => b.betOnUserID === bet.player2 && b.wager !== 0)
                                    .map((b) => ({
                                        user: users[b.userID]?.username,
                                        wager: b.wager,
                                    }));

                                return {
                                    duelID: bet.duelID,
                                    player1,
                                    player2,
                                    player1Pfp,
                                    player2Pfp,
                                    player1Bets,
                                    player2Bets,
                                    player1Steps,
                                    player2Steps,
                                };
                            }
                        });

                        // Update the currentGroups with the latest duels data
                        currentGroups[groupID] = {
                            ...currentGroups[groupID],
                            todaysDuels
                        };

                        console.log(`Duels for group ${groupID} updated`);
                        console.log('Updated currentGroups: ', currentGroups);
                        console.log('current Bets', currBets);
                        setCurrentBets(currBets);
                        setIsLoading(false);
                    });

                    unsubscribeFunctions.push(unsubscribeGroup, unsubscribeDuels);
                }
                setIsLoading(false);
            });
        }
        return () => {
            unsubscribeFunctions.forEach(unsubscribe => {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            });
        };
    };

    const createMemberButtonHandle = (id: string) => {
        navigation.navigate('ProfilePage', { selectedUserID: id ?? '', groupID: groupID });
    };

    const handleDuelPress = () => {
        setIsDuelExpanded(!isDuelExpanded);
    };

    const handleRightArrowPress = () => {
        setIsDuelExpanded(false);
        if (currentBetIndex > 0) setCurrentBetIndex(currentBetIndex - 1);
    };

    const handleLeftArrowPress = () => {
        setIsDuelExpanded(false);
        if (currentBetIndex < (currentBets.length - 1)) setCurrentBetIndex(currentBetIndex + 1);
    };

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

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text>Loading...</Text>
            </View>
        );
    }

    const getBetPlayerInfo = () => {
        const totalPlayer1Bets = currentBets[currentBetIndex]?.player1Bets.reduce((sum, bet) => sum + bet.wager, 0);
        const totalPlayer2Bets = currentBets[currentBetIndex]?.player2Bets.reduce((sum, bet) => sum + bet.wager, 0);

        // Calculate the sum of all bets
        const totalBets = totalPlayer1Bets + totalPlayer2Bets;

        const player2Ratio = totalBets === 0 ? 0.5 : totalPlayer2Bets / totalBets;

        // Filter powerups for player1 and player2
        const player1Powerups = powerups.filter(([type, targetID, targetUserName, userID, duelID]) => {
            console.log(`Checking: ${duelID} === ${currentBets[currentBetIndex]?.duelID} && ${targetUserName} === ${currentBets[currentBetIndex]?.player1}`);
            return duelID === currentBets[currentBetIndex]?.duelID && targetUserName === currentBets[currentBetIndex]?.player1;
        });

        const player2Powerups = powerups.filter(([type, targetID, targetUserName, userID, duelID]) => {
            console.log(`Checking: ${duelID} === ${currentBets[currentBetIndex]?.duelID} && ${targetUserName} === ${currentBets[currentBetIndex]?.player2}`);
            return duelID === currentBets[currentBetIndex]?.duelID && targetUserName === currentBets[currentBetIndex]?.player2;
        });

        // Calculate added steps for secondWind powerups
        let player1AddedSteps = 0;
        let player2AddedSteps = 0;

        // Create modified versions of the powerups for display
        const modifiedPlayer1Powerups = player1Powerups.map(([type, targetID, userID, duelID]) => {
            if (type === "secondWind") {
                player1AddedSteps += 200;
                return ["Second Wind \n(+200 steps)", targetID, userID, duelID];
            }
            else if (type === "brickWall") {
                player1AddedSteps -= 200;
                return ["Brick Wall \n(-200 steps)", targetID, userID, duelID];
            }
            return [type, targetID, userID, duelID];
        });

        const modifiedPlayer2Powerups = player2Powerups.map(([type, targetID, userID, duelID]) => {
            if (type === "secondWind") {
                player2AddedSteps += 200;
                return ["secondWind \n(+200 steps)", targetID, userID, duelID];
            }
            else if (type === "brickWall") {
                player2AddedSteps -= 200;
                return ["Brick Wall \n(-200 steps)", targetID, userID, duelID];
            }
            return [type, targetID, userID, duelID];
        });

        // Updated step counts
        const player1TotalSteps = currentBets[currentBetIndex]?.player1Steps + player1AddedSteps;
        const player2TotalSteps = currentBets[currentBetIndex]?.player2Steps + player2AddedSteps;

        return {player1Steps: player1TotalSteps, player2Steps: player2TotalSteps, player2Ratio: player2Ratio, player1Powerups: modifiedPlayer1Powerups, player2Powerups: modifiedPlayer2Powerups};
    };

    const renderBetItem = ({ item }: { item: { duelID: string, player1: string, player2: string, player1Pfp: string, player2Pfp: string, player1Bets: { user: string, wager: number }[], player2Bets: { user: string, wager: number }[], player1Steps: number, player2Steps: number } }) => {

        const isExpanded = expandedItems[item.duelID] || false; // check if the current duel is expanded

        const totalPlayer1Bets = item.player1Bets.reduce((sum, bet) => sum + bet.wager, 0);
        const totalPlayer2Bets = item.player2Bets.reduce((sum, bet) => sum + bet.wager, 0);

        // Calculate the sum of all bets
        const totalBets = totalPlayer1Bets + totalPlayer2Bets;

        // Calculate the ratios for the circular value
        const player1Ratio = totalBets === 0 ? 0.5 : totalPlayer1Bets / totalBets;
        const player2Ratio = totalBets === 0 ? 0.5 : totalPlayer2Bets / totalBets;

        // Filter powerups for player1 and player2
        const player1Powerups = powerups.filter(([type, targetID, targetUserName, userID, duelID]) => {
            console.log(`Checking: ${duelID} === ${item.duelID} && ${targetUserName} === ${item.player1}`);
            return duelID === item.duelID && targetUserName === item.player1;
        });

        const player2Powerups = powerups.filter(([type, targetID, targetUserName, userID, duelID]) => {
            console.log(`Checking: ${duelID} === ${item.duelID} && ${targetUserName} === ${item.player2}`);
            return duelID === item.duelID && targetUserName === item.player2;
        });

        // Calculate added steps for secondWind powerups
        let player1AddedSteps = 0;
        let player2AddedSteps = 0;

        // Create modified versions of the powerups for display
        const modifiedPlayer1Powerups = player1Powerups.map(([type, targetID, userID, duelID]) => {
            if (type === "secondWind") {
                player1AddedSteps += 200;
                return ["Second Wind \n(+200 steps)", targetID, userID, duelID];
            }
            else if (type === "brickWall") {
                player1AddedSteps -= 200;
                return ["Brick Wall \n(-200 steps)", targetID, userID, duelID];
            }
            return [type, targetID, userID, duelID];
        });

        const modifiedPlayer2Powerups = player2Powerups.map(([type, targetID, userID, duelID]) => {
            if (type === "secondWind") {
                player2AddedSteps += 200;
                return ["secondWind \n(+200 steps)", targetID, userID, duelID];
            }
            else if (type === "brickWall") {
                player2AddedSteps -= 200;
                return ["Brick Wall \n(-200 steps)", targetID, userID, duelID];
            }
            return [type, targetID, userID, duelID];
        });

        // Updated step counts
        const player1TotalSteps = item.player1Steps + player1AddedSteps;
        const player2TotalSteps = item.player2Steps + player2AddedSteps;

        // change secondWind name to be more descriptive 

        console.log("renderBetItem: ", "player1Powerups: ", modifiedPlayer1Powerups);
        console.log("renderBetItem: ", "player2Powerups: ", modifiedPlayer2Powerups);
        return (
            <View style={styles.flatList}>
                <TouchableOpacity onPress={() => toggleItemExpansion(item.duelID)}>
                    {/* Players and Pictures */}
                    <View style={styles.row}>
                        {/* Column 1 - Player 1 */}
                        <View style={styles.centeredColumn}>
                            <Text style={styles.player1text}>{item.player1}</Text>
                            <Image source={{ uri: item.player1Pfp }} style={styles.profileImage} />
                            <Text style={styles.stepTitle}>{player1TotalSteps} Steps</Text>
                        </View>

                        {/* Column 2 - Circular Icon */}
                        <View style={styles.centeredColumn}>
                            <CircularIcon value={player2Ratio} size={65} strokeWidth={10} />
                            <Text></Text>
                        </View>

                        {/* Column 3 - Player 2 */}
                        <View style={styles.centeredColumn}>
                            <Text style={styles.player2text}>{item.player2}</Text>
                            <Image source={{ uri: item.player2Pfp }} style={styles.profileImage} />
                            <Text style={styles.stepTitle}>{player2TotalSteps} Steps</Text>
                        </View>
                    </View>


                    <View style={styles.rowBets}>
                        {/* Player 1 Bets and Coin */}
                        <View style={styles.betsContainer}>
                            <Text style={styles.betsText}>{totalPlayer1Bets}</Text>
                            <Image
                                source={require('../../../assets/images/gold_coin.png')}
                                style={styles.coinIcon}
                            />
                        </View>
                        <Text style={styles.betsColonText}> : </Text>
                        {/* Player 2 Bets and Coin */}
                        <View style={styles.betsContainer}>
                            <Text style={styles.betsText}>{totalPlayer2Bets}</Text>
                            <Image
                                source={require('../../../assets/images/gold_coin.png')}
                                style={styles.coinIcon}
                            />
                        </View>
                    </View>
                </TouchableOpacity>

                {isExpanded && (
                    <>
                        <View style={styles.row}>
                            {/* Player1's Bets */}
                            <View style={styles.betsList}>
                                <Text style={[styles.stepTitle, styles.betsText]}>Bets:</Text>
                                {item.player1Bets.length === 0 ? (
                                    <View>
                                        <Text>(No bets placed)</Text>
                                    </View>
                                ) : (
                                    <View>
                                        {item.player1Bets.map((bet, index) => (
                                            <Text key={index} style={{ textAlign: 'left' }}> {bet.user}: {bet.wager}</Text>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* Player2's Bets */}
                            <View style={styles.betsList}>
                                {/* Player2's Steps */}
                                <Text style={[styles.stepTitle, styles.betsText]}>Bets:</Text>
                                {item.player2Bets.length === 0 ? (
                                    <View>
                                        <Text>(No bets placed)</Text>
                                    </View>
                                ) : (
                                    <View>
                                        {item.player2Bets.map((bet, index) => (
                                            <Text key={index} style={{ textAlign: 'right' }}> {bet.user}: {bet.wager}</Text>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>
                        {/*where the powerups go*/}
                        <View style={styles.row}>
                            {/* Player1's Powerups */}
                            <View style={styles.betsList}>
                                <Text style={[styles.stepTitle, styles.betsText]}>Powerups:</Text>
                                {modifiedPlayer1Powerups.length === 0 ? (
                                    <Text>(No powerups used)</Text>
                                ) : (
                                    modifiedPlayer1Powerups.map(([type, targetID, userID], index) => (
                                        <Text key={index} style={{ textAlign: 'left' }}>{`${type}`}</Text>
                                    ))
                                )}
                            </View>

                            {/* Player2's Powerups */}
                            <View style={styles.betsList}>
                                <Text style={[styles.stepTitle, styles.betsText]}>Powerups:</Text>
                                {modifiedPlayer2Powerups.length === 0 ? (
                                    <Text>(No powerups used)</Text>
                                ) : (
                                    modifiedPlayer2Powerups.map(([type, targetID, userID], index) => (
                                        <Text key={index} style={{ textAlign: 'right' }}>{`${type}`}</Text>
                                    ))
                                )}
                            </View>
                        </View>
                    </>
                )}
            </View>
        );
    };

    const toggleItemExpansion = (duelID: string) => {
        setExpandedItems((prevExpandedItems) => ({
            ...prevExpandedItems,
            [duelID]: !prevExpandedItems[duelID], // toggle the current duelID
        }));
    };

    return (
        <>
            <LinearGradient
                colors={['#000000', '#024405']}
                style={{
                    flex: 1,
                    width: '100%',
                }}
            >
                <View style={styles.container}>
                    {/* Header Section */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Image
                                source={require('../../../assets/icons/back.png')}
                                style={styles.backIcon}
                            />
                        </TouchableOpacity>
                        <View style={styles.rightIcons}>
                            <TouchableOpacity onPress={() => setBetHistoryModalVisible(true)}>
                                <Image
                                    source={require('../../../assets/icons/history.png')}
                                    style={styles.historyIcon}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setStoreModalVisible(true)}>
                                <Image
                                    source={require('../../../assets/icons/store.png')}
                                    style={styles.storeIcon}
                                />
                            </TouchableOpacity>
                            {groups[groupID]?.gameType === 'weekly' && (
                                <TouchableOpacity onPress={() => setPropBetModalVisible(true)}>
                                    <Text style={styles.propBetButton}>Prop Bet</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                    <View style={styles.groupInfo}>
                        <TouchableOpacity onPress={() => navigation.navigate('EditGroupPage', { groupID: groupID })} activeOpacity={0.8}>
                            <Image 
                                source={groups[groupID]?.groupImageUrl ? 
                                    { uri: groups[groupID]?.groupImageUrl } : 
                                    require('@components/blank-profile-picture.png')
                                }
                                style={styles.groupImage}
                            />
                        </TouchableOpacity>
                        <View style={styles.groupNameContainer}>
                            <TouchableOpacity onPress={() => navigation.navigate('EditGroupPage', { groupID: groupID })} activeOpacity={0.8}>
                                <Text style={styles.groupName}>{groups[groupID]?.groupName || 'Group Name'}</Text>
                            </TouchableOpacity>
                            <View style={{  flexDirection: 'row', alignItems: 'center', }}>
                                <Image 
                                    source={require('../../../assets/icons/timeLeft.png')}
                                    style={styles.timeLeftIcon}
                                />
                                <View style={{  flexDirection: 'column', marginLeft: 5, }}>
                                    <Text style={styles.timeLeft}>{gameTimeLeft}</Text>
                                    {groups[groupID]?.gameType === 'weekly' && (
                                        <Text style={styles.timeLeft}>{betTimeLeft}</Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Stats Container */}
                    <View style={styles.statsContainer}>
                        <TouchableOpacity style={styles.statItem} onPress={() => setTokensModalVisible(true)} activeOpacity={0.8}>
                            <Image
                                source={require('../../../assets/icons/tokens.png')}
                                style={styles.tokensIcon}
                            />
                            <Text style={styles.statValue}> {groups[groupID]?.userTokens}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.statItem} onPress={() => setTokensUsedModalVisible(true)} activeOpacity={0.8}>
                            <Image
                                source={require('../../../assets/icons/betTokens.png')}
                                style={styles.betTokensIcon}
                            />
                            <Text style={styles.statValue}> {groups[groupID]?.todaysBetTokens}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.statItem} onPress={() => setDiamondsModalVisible(true)} activeOpacity={0.8}>
                            <Image
                                source={require('../../../assets/icons/diamonds.png')}
                                style={styles.diamondsIcon}
                            />
                            <Text style={styles.statValue}> {groups[groupID]?.userDiamonds}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Live Duel Section */}
                    <View>
                        <Text style={[styles.sectionTitle, { paddingHorizontal: 25, }]}>Live Duel</Text>
                        <View style={styles.duelRow}>
                            <TouchableOpacity onPress={handleRightArrowPress}>
                                <Text style={styles.duelIterate}>{"<"}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                onPress={handleDuelPress}
                                activeOpacity={1}
                                style={styles.duelCardTouchable}
                            >
                                <LinearGradient
                                    colors={['#74ff6db3', '#2fffe3b3']}
                                    style={styles.duelCard}
                                >
                                    {/* player 1 */}
                                    <View style={styles.playerInfo}>
                                        <Image 
                                            source={currentBets[currentBetIndex]?.player1Pfp ? 
                                                { uri: currentBets[currentBetIndex]?.player1Pfp } : 
                                                require('@components/blank-profile-picture.png')
                                            }
                                            style={styles.playerImage}
                                        />
                                        <Text style={styles.playerName}>{currentBets[currentBetIndex]?.player1}</Text>
                                        <Text style={styles.playerSteps}>{getBetPlayerInfo().player1Steps} steps</Text>
                                        <View style={{  flexDirection: 'row', alignItems: 'center', }}>
                                            <Image
                                                source={require('../../../assets/icons/tokensWhite.png')}
                                                style={styles.tokensWhiteIcon}
                                            />
                                            <Text style={styles.playerTokens}> {currentBets[currentBetIndex]?.player1Bets.reduce((sum, bet) => sum + bet.wager, 0)}</Text>
                                        </View>
                                        {isDuelExpanded && (
                                            <>
                                                <View style={styles.betsList}>
                                                    <Text style={styles.betMoreInfoTitle}>Bets:</Text>
                                                    {currentBets[currentBetIndex]?.player1Bets.length !== 0 && (
                                                        <View>
                                                            {currentBets[currentBetIndex]?.player1Bets.map((bet, index) => (
                                                                <Text key={index} style={[styles.betMoreInfo, { textAlign: 'left', }]}> {bet.user}: {bet.wager}</Text>
                                                            ))}
                                                        </View>
                                                    )}
                                                </View>
                                                <View style={styles.betsList}>
                                                    <Text style={styles.betMoreInfoTitle}>Powerups:</Text>
                                                    {getBetPlayerInfo().player1Powerups.length !== 0 && (
                                                        getBetPlayerInfo().player1Powerups.map(([type, targetID, userID], index) => (
                                                            <Text key={index} style={[styles.betMoreInfo, { textAlign: 'left', }]}>{`${type}`}</Text>
                                                        ))
                                                    )}
                                                </View>
                                            </>
                                        )}
                                    </View>
                                    <View style={styles.duelInfo}>
                                        <View style={styles.liveContainer}>
                                            <Text style={styles.liveTag}><Text style={{ color: 'green', }}>•</Text> LIVE</Text>
                                        </View>
                                        <CircularIcon value={getBetPlayerInfo().player2Ratio} size={65} strokeWidth={10} />
                                        <Text></Text>
                                    </View>
                                    <View style={styles.playerInfo}>
                                        <Image 
                                            source={currentBets[currentBetIndex]?.player2Pfp ? 
                                                { uri: currentBets[currentBetIndex]?.player2Pfp } : 
                                                require('@components/blank-profile-picture.png')
                                            }
                                            style={styles.playerImage}
                                        />
                                        <Text style={styles.playerName}>{currentBets[currentBetIndex]?.player2}</Text>
                                        <Text style={styles.playerSteps}>{getBetPlayerInfo().player2Steps} steps</Text>
                                        <View style={{  flexDirection: 'row', alignItems: 'center', }}>
                                            <Image
                                                source={require('../../../assets/icons/tokensWhite.png')}
                                                style={styles.tokensWhiteIcon}
                                            />
                                            <Text style={styles.playerTokens}> {currentBets[currentBetIndex]?.player2Bets.reduce((sum, bet) => sum + bet.wager, 0)}</Text>
                                        </View>
                                        {isDuelExpanded && (
                                            <>
                                                <View style={styles.betsList}>
                                                    {/* Player2's Steps */}
                                                    <Text style={styles.betMoreInfoTitle}>Bets:</Text>
                                                    {currentBets[currentBetIndex]?.player2Bets.length !== 0 && (
                                                        <View>
                                                            {currentBets[currentBetIndex]?.player2Bets.map((bet, index) => (
                                                                <Text key={index} style={[styles.betMoreInfo, { textAlign: 'right', }]}> {bet.user}: {bet.wager}</Text>
                                                            ))}
                                                        </View>
                                                    )}
                                                </View>
                                                <View style={styles.betsList}>
                                                    <Text style={styles.betMoreInfoTitle}>Powerups:</Text>
                                                    {getBetPlayerInfo().player2Powerups.length !== 0 && (
                                                        getBetPlayerInfo().player2Powerups.map(([type, targetID, userID], index) => (
                                                            <Text key={index} style={[styles.betMoreInfo, { textAlign: 'right', }]}>{`${type}`}</Text>
                                                        ))
                                                    )}
                                                </View>
                                            </>
                                        )}
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleLeftArrowPress}>
                                <Text style={styles.duelIterate}>{">"}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.betAmount}>
                            <Image
                                source={require('../../../assets/icons/tokensBlack.png')}
                                style={styles.tokensBlackIcon}
                            />
                            <Text style={styles.betText}> {currentBets[currentBetIndex]?.player1Bets?.find(bet => bet.user === (currentGroupUsersArray?.find(usr => usr.id === userID)?.name || ""))?.wager || 0}</Text>
                        </View>
                    </View>

                    {/* Leaderboard Section */}
                    <View style={styles.leaderboardContainer}>
                    <Text style={[styles.sectionTitle, { paddingHorizontal: 10, }]}>Leaderboards</Text>
                        <View style={styles.tabContainer}>
                            {selectedTab === 'Tokens' ? (
                                <>
                                    <LinearGradient
                                        colors={['#74ff6db3', '#2fffe3b3']}
                                        style={styles.tab}
                                    >
                                    <Text style={styles.tabText}>Tokens</Text>
                                </LinearGradient>
                                    <TouchableOpacity 
                                        style={styles.tab}
                                        onPress={() => setSelectedTab('Steps')}
                                    >
                                        <Text style={styles.tabText}>Steps</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <TouchableOpacity 
                                        style={styles.tab}
                                        onPress={() => setSelectedTab('Tokens')}
                                    >
                                        <Text style={styles.tabText}>Tokens</Text>
                                    </TouchableOpacity>
                                    <LinearGradient
                                        colors={['#74ff6db3', '#2fffe3b3']}
                                        style={styles.tab}
                                    >
                                        <Text style={styles.tabText}>Steps</Text>
                                    </LinearGradient>
                                </>
                            )}
                        </View>
                        <View style={styles.leaderboard}>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.grayLine} />
                                {selectedTab === 'Tokens' ? (
                                    <>
                                        {currentGroupUsersArray.map((user, index) => (
                                            <View key={user.id} style={styles.leaderboardRow}>
                                                <TouchableOpacity onPress={() => createMemberButtonHandle(user.id)}>
                                                    <Image
                                                        source={user.pfp ? 
                                                            { uri: user.pfp } : 
                                                            require('@components/blank-profile-picture.png')
                                                        }
                                                        style={styles.leaderboardImage}
                                                    />
                                                    {index === 0 && (
                                                        <Image
                                                            source={require('../../../assets/images/first_place.png')}
                                                            style={styles.placementImage}
                                                        />
                                                    )}
                                                    {index === 1 && (
                                                        <Image
                                                            source={require('../../../assets/images/second_place.png')}
                                                            style={styles.placementImage}
                                                        />
                                                    )}
                                                    {index === 2 && (
                                                        <Image
                                                            source={require('../../../assets/images/third_place.png')}
                                                            style={styles.placementImage}
                                                        />
                                                    )}
                                                </TouchableOpacity>
                                                <View style={{
                                                    flex: 1,
                                                    flexDirection: 'row',
                                                    alignItems: 'center'
                                                }}>
                                                    <LinearGradient
                                                        colors={['#74ff6db3', '#2fffe3b3']}
                                                        style={{
                                                            width: `${((user.tokens || 0) / Math.max(...currentGroupUsersArray.map(user => user.tokens || 0))) * 80}%`,
                                                            height: 30,
                                                            backgroundColor: '#4C7BF4',
                                                            borderTopRightRadius: 5,
                                                            borderBottomRightRadius: 5,
                                                        }}
                                                    />
                                                    <Text style={styles.leaderboardSteps}>
                                                        {user.tokens}
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        {[...currentGroupUsersArray].sort((a, b) => (b.steps || 0) - (a.steps || 0)).map((user, index) => (
                                            <View key={user.id} style={styles.leaderboardRow}>
                                                <TouchableOpacity onPress={() => createMemberButtonHandle(user.id)}>
                                                    <Image
                                                        source={user.pfp ? 
                                                            { uri: user.pfp } : 
                                                            require('@components/blank-profile-picture.png')
                                                        }
                                                        style={styles.leaderboardImage}
                                                    />
                                                    {index === 0 && (
                                                        <Image
                                                            source={require('../../../assets/images/first_place.png')}
                                                            style={styles.placementImage}
                                                        />
                                                    )}
                                                    {index === 1 && (
                                                        <Image
                                                            source={require('../../../assets/images/second_place.png')}
                                                            style={styles.placementImage}
                                                        />
                                                    )}
                                                    {index === 2 && (
                                                        <Image
                                                            source={require('../../../assets/images/third_place.png')}
                                                            style={styles.placementImage}
                                                        />
                                                    )}
                                                </TouchableOpacity>
                                                <View style={{
                                                    flex: 1,
                                                    flexDirection: 'row',
                                                    alignItems: 'center'
                                                }}>
                                                    <LinearGradient
                                                        colors={['#51ba51', '#18c4a6']}
                                                        style={{
                                                            width: `${((user.steps || 0) / Math.max(...currentGroupUsersArray.map(user => user.steps || 0))) * 80}%`,
                                                            height: 30,
                                                            backgroundColor: '#4C7BF4',
                                                            borderTopRightRadius: 5,
                                                            borderBottomRightRadius: 5,
                                                        }}
                                                    />
                                                    <Text style={styles.leaderboardSteps}>
                                                        {user.steps}
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}
                                    </>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </View>
            </LinearGradient>
            
            {/* Bet History Modal */}
            <Modal
                transparent={true}
                visible={isBetHistoryModalVisible}
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        {/* Close button */}
                        <TouchableOpacity style={styles.closeButton} onPress={() => setBetHistoryModalVisible(false)}>
                            <Text style={styles.closeButtonText}>X</Text>
                        </TouchableOpacity>

                        {/* BetRecapPage as the modal content */}
                        <BetHistoryPage navigation={navigation} />
                    </View>
                </View>
            </Modal>

            {/* Store Modal */}
            <Modal
                transparent={true}
                visible={isStoreModalVisible}
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        {/* Close button */}
                        <TouchableOpacity style={styles.closeButton} onPress={() => setStoreModalVisible(false)}>
                            <Text style={styles.closeButtonText}>X</Text>
                        </TouchableOpacity>

                        {/* StorePage as the modal content */}
                        <StorePage
                            navigation={navigation}
                            userDiamonds={groups[groupID]?.userDiamonds}
                            gameType = {groups[groupID]?.gameType}
                            currentGroupUsersArray={currentGroupUsersArray}
                            setStoreModalVisible={setStoreModalVisible}
                        />
                    </View>
                </View>
            </Modal>

            {/* Prop Bet Modal */}
            <Modal
                transparent={true}
                visible={isPropBetModalVisible}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.moneyModalContainer}>
                        {/* Close button */}
                        {finishedPropBet && (
                            <TouchableOpacity style={styles.closeButton} onPress={() => {setPropBetModalVisible(false); setSelectedPropBet(null);}}>
                                <Text style={styles.closeButtonText}>X</Text>
                            </TouchableOpacity>
                        )}
                        <Text style={[styles.tokenText, { textAlign: 'center', marginBottom: 15 }]}>How many steps will the following player walk today? If you win the prop bet, you'll get +1 diamond. </Text>
                        {propBetPlayer.map(player => (
                            <View>
                                <Text key={player.id} style={{ fontFamily: "Lexend-bold", fontSize: 20, textAlign: 'center' }}>
                                    {player.name}
                                </Text>
                                {finishedPropBet ? (
                                    <View>
                                        <Text style={{ fontFamily: "Lexend", textAlign: 'center', marginTop: 20  }}>You have entered:</Text>
                                        <View style={{ backgroundColor: currentPropBet?.overUnder === 'over' ? "#90EE90" : "#ff817e", padding: 10, borderRadius: 10, alignSelf: 'center', marginTop: 10 }}>
                                            <Text style={{ fontFamily: "Lexend", fontSize: 20 }}>
                                                <Text style={{ fontFamily: "Lexend-bold", textAlign: 'center' }}>{currentPropBet?.overUnder === 'over' ? 'Over' : 'Under'} </Text>
                                                {currentPropBet?.averageSteps}
                                            </Text>
                                        </View>
                                    </View>
                                ) : (
                                    <View>
                                        <View style={{
                                                marginTop: 20, 
                                                flexDirection: 'row',
                                                justifyContent: 'center',
                                                width: '70%',
                                                alignSelf: 'center',
                                                gap: 20,
                                            }}
                                        >
                                            <TouchableOpacity
                                                style={{
                                                    backgroundColor: selectedPropBet === 'over' ? "#50C850" : "#90EE90",
                                                    padding: 10, 
                                                    borderRadius: 10, 
                                                    transform: [{ scale: selectedPropBet === 'over' ? 1.1 : 1 }] 
                                                }}
                                                onPress={() => setSelectedPropBet('over')}
                                            >
                                                <Text style={{ fontFamily: "Lexend", fontSize: 20 }}><Text style={{ fontFamily: "Lexend-bold" }}>Over</Text> {(player.averageSteps < 100) ? 100 : player.averageSteps}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={{ 
                                                    backgroundColor: selectedPropBet === 'under' ? "#ff4d4d" : "#ff817e", 
                                                    padding: 10, 
                                                    borderRadius: 10, 
                                                    transform: [{ scale: selectedPropBet === 'under' ? 1.1 : 1 }] 
                                                }}
                                                onPress={() => setSelectedPropBet('under')}
                                            >
                                                <Text style={{ fontFamily: "Lexend", fontSize: 20 }}><Text style={{ fontFamily: "Lexend-bold" }}>Under</Text> {(player.averageSteps < 100) ? 100 : player.averageSteps}</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <TouchableOpacity
                                            style={{ backgroundColor: selectedPropBet === null ? "#9abddc" : "#1E90FF", padding: 10, borderRadius: 10, marginTop: 30, alignSelf: 'center' }}
                                            disabled={selectedPropBet === null}
                                        >
                                            <Text 
                                                style={{ fontFamily: "Lexend-bold" }} 
                                                onPress={() => {
                                                    addToFinishedPropBet(groupID, userID);
                                                    addPropBet(groupID, userID, player.id, player.averageSteps, selectedPropBet === 'over' ? 'over' : 'under');
                                                    setFinishedPropBet(true);
                                                }}
                                            >
                                                Submit
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                </View>
            </Modal>

            {/* Info Modals */}
            <Modal
                transparent={true}
                visible={isTokensModalVisible}
                // animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.moneyModalContainer}>
                        {/* Close button */}
                        <TouchableOpacity style={styles.closeButton} onPress={() => setTokensModalVisible(false)}>
                            <Text style={styles.closeButtonText}>X</Text>
                        </TouchableOpacity>
                            <Text style={styles.tokenText}>Here are your tokens earned from winning bets. The person with the most tokens wins!</Text>
                    </View>
                </View>
            </Modal>
            <Modal
                transparent={true}
                visible={isTokensUsedModalVisible}
                // animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.moneyModalContainer}>
                        {/* Close button */}
                        <TouchableOpacity style={styles.closeButton} onPress={() => setTokensUsedModalVisible(false)}>
                            <Text style={styles.closeButtonText}>X</Text>
                        </TouchableOpacity>
                            <Text style={styles.tokenText}>Here are the tokens you bet.</Text>
                    </View>
                </View>
            </Modal>
            <Modal
                transparent={true}
                visible={isDiamondsModalVisible}
                // animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.moneyModalContainer}>
                        {/* Close button */}
                        <TouchableOpacity style={styles.closeButton} onPress={() => setDiamondsModalVisible(false)}>
                            <Text style={styles.closeButtonText}>X</Text>
                        </TouchableOpacity>
                            <Text style={styles.tokenText}>Here are your diamonds. Diamonds are won when you win your head-to-head. Use them in the power-ups store.</Text>
                    </View>
                </View>
            </Modal>
        </>
    );
};


type CircularIconProps = {
    value: number; // Value from 0 to 1, where 1 is 100%
    size?: number; // Diameter of the circle
    strokeWidth?: number; // Width of the border
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

const styles = StyleSheet.create({
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
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        //marginHorizontal: 20, // Adjust margin to fit the back button and tokens in the same row
    },
    backImage: {
        width: 40,
        height: 40,
    },
    backButton: {
        position: 'absolute',
        top: 22,
        left: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    recapButton: {
        position: 'absolute',
        top: 22,
        right: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    storeButton: {
        position: 'absolute',
        top: 90,
        left: 20,
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        zIndex: 10,
    },
    tokenText: {
        fontFamily: "Lexend",
        fontSize: 15
    },
    profileImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: "#D3D3D3",
    },
    flatList: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        marginTop: 20,
    },
    player1text: {
        fontFamily: 'Lexend',
        fontWeight: 'bold',
        fontSize: 16,
        color: '#ff3535',
        marginBottom: 5,
        textAlign: "center",
    },
    player2text: {
        fontFamily: 'Lexend',
        fontWeight: 'bold',
        fontSize: 16,
        color: '#1E90FF',
        marginBottom: 5,
        textAlign: "center",
    },
    stepTitle: {
        fontFamily: "Lexend",
    },
    betsList: {
        marginTop: 10,
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
    moneyModalContainer: {
        width: '80%',
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
    moneyIcons: {
        width: 35,
        height: 35,
        marginLeft: -17,
        zIndex: 10,
    },
    diamondIcon: {
        width: 30,
        height: 30,
        margin: 5,
        marginLeft: -17,
        zIndex: 10,
    },
    coinIcon: {
        width: 30,
        height: 30,
    },
    centeredColumn: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    rowBets: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center', // Center the entire row
        alignItems: 'center', // Align vertically in the center
    },
    betsContainer: {
        flexDirection: 'row',
        alignItems: 'center', // Align the number and coin vertically
        marginHorizontal: 10,
    },
    betsText: {
        color: '#BEFFBB',
        textAlign: 'center',
        fontFamily: 'Lexend',
        fontSize: 12,
    },
    betsColonText: {
        textAlign: 'center',
        fontFamily: 'Lexend-Bold',
        paddingHorizontal: 10,

    },

    // NEW STUFF
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    rightIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    backIcon: {
        width: 19,
        height: 19,
    },
    historyIcon: {
        width: 24,
        height: 24,
    },
    storeIcon: {
        width: 18.29,
        height: 18.29,
    },
    propBetButton: {
        fontFamily: 'Lexend',
        fontSize: 16,
        color: '#fff',
    },
    groupInfo: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    groupImage: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: '#74FF6D',
    },
    groupNameContainer: {
        marginLeft: 20,
        justifyContent: 'center',
    },
    groupName: {
        color: '#fff',
        fontFamily: 'Lexend',
        fontSize: 28,
    },
    timeLeftIcon: {
        width: 16,
        height: 16,
    },
    timeLeft: {
        color: '#74FF6D',
        fontFamily: 'Lexend',
        fontSize: 14,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#65656580',
        paddingHorizontal: 20,
        borderRadius: 20,
        padding: 10,
        margin: 20,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#00000080',
        borderRadius: 30,
        padding: 10,
        width: '30%',
    },
    statValue: {
        color: '#fff',
        fontFamily: 'Lexend',
        fontSize: 13,
    },
    tokensIcon: {
        width: 16,
        height: 16,
    },
    betTokensIcon: {
        width: 15,
        height: 15,
    },
    diamondsIcon: {
        width: 14,
        height: 12,
    },
    duelContainer: {
        paddingHorizontal: 20,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Lexend',
        marginBottom: 10,
    },
    duelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    duelIterate: {
        color: '#BEFFBB',
        fontFamily: 'Lexend',
        paddingHorizontal: 10,
    },
    duelCardTouchable: {
        flex: 1,
        flexDirection: 'row',
    },
    duelCard: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderRadius: 15,
        padding: 20,
    },
    betMoreInfoTitle:  {
        color: '#BEFFBB',
        textAlign: 'center',
        fontFamily: 'Lexend',
        fontSize: 12,
    },
    betMoreInfo: {
        color: '#BEFFBB',
        fontFamily: 'Lexend',
        fontSize: 11,
    },
    playerInfo: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    playerImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#fff',
    },
    playerName: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Lexend',
        marginVertical: 5,
    },
    playerSteps: {
        color: '#BEFFBB',
        fontSize: 11,
        fontFamily: 'Lexend',
    },
    tokensWhiteIcon: {
        width: 10,
        height: 10,
    },
    playerTokens: {
        color: '#BEFFBB',
        fontSize: 11,
    },
    duelInfo: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    liveContainer: {
        position: 'absolute',
        top: -5,
        padding: 5,
        backgroundColor: '#fff',
        borderRadius: 20,
    },
    liveTag: {
        color: '#000',
        fontSize: 12,
        fontWeight: 'bold',
        alignSelf: 'center',
        justifyContent: 'center',
    },
    versus: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
        alignSelf: 'center',
    },
    betAmount: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        bottom: -20,
        alignSelf: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    tokensBlackIcon: {
        width: 15,
        height: 14.3,
    },
    betText: {
        color: '#000',
        fontSize: 15,
        fontFamily: 'Lexend',
    },
    leaderboardContainer: {
        flex: 1,
        padding: 20,
        marginTop: 10,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#65656580',
        borderRadius: 15,
        marginBottom: 10,
    },
    tab: {
        flex: 1,
        padding: 10,
        alignItems: 'center',
        borderRadius: 15,
    },
    tabText: {
        color: '#fff',
        fontSize: 13,
        fontFamily: 'Lexend',
    },
    leaderboard: {
        flex: 1,
        backgroundColor: '#65656580',
        borderRadius: 20,
        padding: 15,
    },
    grayLine: { 
        position: 'absolute',
        left: 40,
        width: 1.5,
        height: '95%',
        backgroundColor: '#fff',
        zIndex: 1,
    },
    leaderboardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    leaderboardImage: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 10,
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    placementImage: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 15, // Adjust width based on your image size
        height: 15, // Adjust height based on your image size
    },
    leaderboardSteps: {
        color: '#fff',
        fontSize: 11,
        fontFamily: 'Lexend',
        marginLeft: 10,
    },
});

export default BetSummaryPage;