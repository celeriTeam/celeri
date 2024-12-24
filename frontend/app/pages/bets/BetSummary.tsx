import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Button, ActivityIndicator, FlatList, Modal, ScrollView, Alert } from 'react-native';
import { app } from "@firebaseConfig";
import { getFirestore, doc, collection, query, where, onSnapshot, Timestamp, getDoc } from "firebase/firestore";
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useUser } from '../../UserProvider';
import BetRecapPage from './Recap';
import StorePage from './Store';
import BetHistoryPage from './BetHistory';
import Svg, { Circle, G } from 'react-native-svg';
import { getProfilePic, getSteps, getUserGroups, getUserName, getWeeklySteps } from '@/backend/src/users';
import { addGroupImage, getCurrentPlayersInGame, getCycleCount, getCycleDay, getGroupIDFromGroupName, getGroupIsFirstDay, getGroupName, getGroupProfilePic, getGroupType, getTodaysBetTokens, getTotalCycles, getUserDiamonds, getUsersInGroup, getUserTokens } from '@/backend/src/groups';
import { getTodaysDuelsSummary } from '@/backend/src/bets';
import { getPowerups } from '@/backend/src/store';
import HorizontalBarGraph from '@chartiful/react-native-horizontal-bar-graph';
import { Dimensions } from 'react-native';
import useHealthData from '@/backend/src/hooks/useHealthData';

const db = getFirestore(app);

type headToHeadPageNavigationProp = StackNavigationProp<RootStackParamList, 'HeadToHeadPage'>;
type betSummaryPageRouteProp = RouteProp<RootStackParamList, 'BetSummaryPage'>;

type Props = {
    navigation: headToHeadPageNavigationProp;
};

type CircularIconProps = {
    value: number; // Value from 0 to 1, where 1 is 100%
    size?: number; // Diameter of the circle
    strokeWidth?: number; // Width of the border
};

const BetSummaryPage: React.FC<Props> = ({ navigation }) => {
    const route = useRoute<betSummaryPageRouteProp>();
    const { groupID } = route.params;
    const { steps, weeklySteps, distance, flights } = useHealthData();
    const { userID, loading } = useUser();
    const [isStepsModalVisible, setStepsModalVisible] = useState(false);
    const [isBetHistoryModalVisible, setBetHistoryModalVisible] = useState(false);
    const [isStoreModalVisible, setStoreModalVisible] = useState(false);
    const [isTokensModalVisible, setTokensModalVisible] = useState(false);
    const [isTokensUsedModalVisible, setTokensUsedModalVisible] = useState(false);
    const [isDiamondsModalVisible, setDiamondsModalVisible] = useState(false);
    const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});
    const [groups, setGroups] = useState<{ [groupID: string]: any }>({});
    const [currentBets, setCurrentBets] = useState<{ duelID: string, player1: string, player2: string, player1Pfp: string, player2Pfp: string, player1Bets: { user: string, wager: number }[], player2Bets: { user: string, wager: number }[], player1Steps: number, player2Steps: number }[]>([]);
    const [currentGroupUsersArray, setCurrentGroupUsersArray] = useState<{ id: string; name: string | undefined; pfp: string | undefined; tokens: number | undefined; steps: number | undefined }[]>([]);
    const [NODaysLeft, setNODaysLeft] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [powerups, setPowerups] = useState<Array<Array<string>>>([]);

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
    }, [userID, isStoreModalVisible]);

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
            return dailySteps + weeklySteps;
        } else {
            return dailySteps;
        }
    };

    const fetchGroupData = async (uid: string) => {
        const currentGroups: { [groupID: string]: any } = {};
        const groupsRef = collection(db, "groups");
        const groupDocRef = doc(groupsRef, groupID);
        let unsubscribeDuels: () => void = () => { };
        let unsubscribeUsers: () => void = () => { };
        // Set up listener iff modal is not visible
        if (!isStoreModalVisible) {
            const unsubscribeGroup = onSnapshot(groupDocRef, async (docSnapshot) => {
                setIsLoading(true);
                if (docSnapshot.exists() && groupID) {
                    const [groupImageUrl, groupName, isFirstDay, userTokens, todaysBetTokens, userDiamonds, currentPlayersInGame, cycleDay, cycleCount, totalCycles, groupType] = await Promise.all([
                        getGroupProfilePic(groupID),
                        getGroupName(groupID),
                        getGroupIsFirstDay(groupID),
                        getUserTokens(uid, groupID),
                        getTodaysBetTokens(uid, groupID),
                        getUserDiamonds(uid, groupID),
                        getCurrentPlayersInGame(groupID),
                        getCycleDay(groupID),
                        getCycleCount(groupID),
                        getTotalCycles(groupID),
                        getGroupType(groupID)
                    ]);

                    const userList = await getUsersInGroup(groupID); // userIDs
                    const users: { [userID: string]: any } = {};
                    let groupUsersArray: { id: string; name: string | undefined; pfp: string | undefined; tokens: number | undefined; steps: number | undefined }[] = [];
                    if (userList) {
                        await Promise.all(userList.map(async (selectedUserID) => {
                            const [profilePic, username, steps, weeklySteps, tokens] = await Promise.all([
                                getProfilePic(selectedUserID),
                                getUserName(selectedUserID),
                                getSteps(selectedUserID),
                                getWeeklySteps(selectedUserID),
                                getUserTokens(selectedUserID, groupID)
                            ]);

                            const newSteps = gameTypeSteps(groupType || "daily", steps, weeklySteps);

                            users[selectedUserID] = {
                                profilePic,
                                username,
                                newSteps,
                                tokens
                            };
                            groupUsersArray.push({ id: selectedUserID, name: username, pfp: profilePic, tokens: tokens, steps: newSteps });
                        }));
                        // Sort users by tokens in descending order
                        groupUsersArray.sort((a, b) => (b.tokens ?? 0) - (a.tokens ?? 0));
                    }
                    setCurrentGroupUsersArray(groupUsersArray);

                    // Set up a listener for today's duels
                    const groupCycleCount = docSnapshot.data()?.cycleCount;
                    const groupCycleDay = docSnapshot.data()?.cycleDay;

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const todayStart = Timestamp.fromDate(today);
                    const todayEnd = Timestamp.fromDate(tomorrow);

                    const duelsCollection = collection(groupDocRef, 'duels');
                    const duelsQuery = query(duelsCollection,
                        where('cycleCount', '==', groupCycleCount),
                        where('cycleDay', '==', groupCycleDay),
                        where('createdAt', '>=', todayStart),
                        where('createdAt', '<', todayEnd)
                    );
                    unsubscribeDuels = onSnapshot(duelsQuery, (duelsSnapshot) => {
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
                            const player1Steps = users[bet.player1]?.steps;
                            const player2Steps = users[bet.player2]?.steps;
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

                    currentGroups[groupID] = {
                        groupImageUrl,
                        groupName,
                        isFirstDay,
                        userTokens,
                        userList,
                        todaysBetTokens,
                        userDiamonds,
                        currentPlayersInGame,
                        cycleDay,
                        cycleCount,
                        totalCycles,
                        groupType
                    };
                }
                setIsLoading(false);

                // Set # of days left in the game
                const daysLeft = currentGroups[groupID]?.currentPlayersInGame - 1 - currentGroups[groupID]?.cycleDay + ((currentGroups[groupID]?.totalCycles - currentGroups[groupID]?.cycleCount) * (Object.keys(currentGroups[groupID]?.userList).length - 1));
                setNODaysLeft(daysLeft);
            });
            setGroups(currentGroups);

            return () => {
                unsubscribeGroup();
                if (typeof unsubscribeDuels === 'function') {
                    unsubscribeDuels();
                }
            };
        }
        return () => {};
    };

    const createMemberButtonHandle = (id: string) => {
        navigation.navigate('ProfilePage', { selectedUserID: id ?? '', groupID: groupID });
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
                return ["secondWind \n(+200 steps)", targetID, userID, duelID];
            }
            return [type, targetID, userID, duelID];
        });

        const modifiedPlayer2Powerups = player2Powerups.map(([type, targetID, userID, duelID]) => {
            if (type === "secondWind") {
                player2AddedSteps += 200;
                return ["secondWind \n(+200 steps)", targetID, userID, duelID];
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
                            <View style={styles.betsListLeft}>
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
                            <View style={styles.betsListRight}>
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
                            <View style={styles.betsListLeft}>
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
                            <View style={styles.betsListRight}>
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

    type StepsModalProps = {
        groupUsersArray: { id: string; name: string | undefined; pfp: string | undefined; tokens: number | undefined; steps: number | undefined }[];
    };

    const StepsModal: React.FC<StepsModalProps> = ({ groupUsersArray }) => {
        const screenWidth = Dimensions.get('window').width;
        const screenHeight = Dimensions.get('window').height;
        
        // Sort users by steps in descending order
        const sortedUsers = [...groupUsersArray].sort((a, b) => (a.steps || 0) - (b.steps || 0));

        const truncateUsername = (username: string, maxLength: number = 9) => {
            return username.length > maxLength ? username.slice(0, maxLength - 4) + '...' : username;
        };
        
        return (
            <View style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: 'white', padding: 20, borderRadius: 10 }}>
                <Text style={{ fontSize: 18, fontFamily: 'Lexend-Bold', marginBottom: 50 }}>Player Steps</Text>
                <View>
                    <HorizontalBarGraph
                        data={sortedUsers.map(user => user.steps || 0)}
                        labels={sortedUsers.map(user => truncateUsername(user.name || ''))}
                        width={screenWidth - 500 / sortedUsers.length}
                        height={screenHeight * 0.05 * sortedUsers.length}
                        barRadius={3}
                        barColor="#6366f1"
                        baseConfig={{
                            xAxisLabelStyle: {
                                rotation: 0,
                                fontSize: 12,
                                width: 80,
                                yOffset: 4,
                                xOffset: -25
                            },
                            yAxisLabelStyle: {
                                rotation: -30,
                                fontSize: 13,
                                position: 'bottom',
                                // xOffset: 10,
                                height: 40,
                            },
                        }}
                    />
                    {/* Overlay Text components for values */}
                    {sortedUsers.reverse().map((user, index) => (
                        <Text
                            key={user.name}
                            style={{
                                position: 'absolute',
                                right: 20 + 15 * (sortedUsers.length - 8),
                                top: (index * (screenHeight * 0.36 / 8)) + 10,
                                fontSize: 12
                            }}
                        >
                            {user.steps || 0}
                        </Text>
                    ))}
                </View>
            </View>
        );
    };
    
    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Image
                    source={require('@components/back-icon.png')}
                    style={styles.backImage}
                />
            </TouchableOpacity>
            <TouchableOpacity style={styles.groupTitleContainer} onPress={() => navigation.navigate('EditGroupPage', { groupID: groupID })}>
                {groups[groupID]?.groupImageUrl ? (
                    <Image source={{ uri: groups[groupID]?.groupImageUrl }} style={styles.groupImage} />
                ) : (
                    <Image
                        source={require('@components/blank-profile-picture.png')}
                        style={styles.groupImage}
                    />
                )}
                <View style={styles.groupTitleView}>
                    <Text style={styles.groupTitle}>{groups[groupID]?.groupName}</Text>
                </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.recapButton} onPress={() => setBetHistoryModalVisible(true)}>
                <Image
                    source={require('../../../assets/images/recap.png')}
                    style={styles.backImage}
                />
            </TouchableOpacity>

            <TouchableOpacity style={styles.storeButton} onPress={() => setStoreModalVisible(true)}>
                <Image
                    source={require('../../../assets/images/store.png')}
                    style={styles.backImage}
                />
            </TouchableOpacity>
            <Text style={styles.daysLeft}>{NODaysLeft} days left!</Text>
            <TouchableOpacity style={[styles.moneyContainer, { top: 100, }]} onPress={() => setTokensModalVisible(true)}>
                <View style={styles.tokenTextView}>
                    <Text style={styles.tokenText}>{groups[groupID]?.userTokens}</Text>
                </View>
                <Image
                    source={require('../../../assets/images/gold_coin.png')}
                    style={styles.moneyIcons}
                />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.moneyContainer, { top: 130, }]} onPress={() => setTokensUsedModalVisible(true)}>
                <View style={styles.tokenTextView}>
                    <Text style={styles.tokenText}>{groups[groupID]?.todaysBetTokens}</Text>
                </View>
                <Image
                    source={require('../../../assets/images/coin_spent.png')}
                    style={styles.moneyIcons}
                />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.moneyContainer, { top: 160, }]} onPress={() => setDiamondsModalVisible(true)}>
                <View style={styles.tokenTextView}>
                    <Text style={styles.tokenText}>{groups[groupID]?.userDiamonds}</Text>
                </View>
                <Image
                    source={require('../../../assets/images/diamond.png')}
                    style={styles.diamondIcon}
                />
            </TouchableOpacity>
            <TouchableOpacity style={styles.RaceButtonContainer} onPress={() => setStepsModalVisible(true)}>
                <Text style={styles.buttonText}>See Race</Text>
            </TouchableOpacity>
            <View style={styles.playerContainer}>
                <Text style={styles.secondHeader}>Players:</Text>
                {currentGroupUsersArray ? (
                    <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.userRow}>
                        {currentGroupUsersArray.map((user, index) => (
                            <TouchableOpacity
                                key={user.id}
                                style={styles.userContainer}
                                onPress={() => createMemberButtonHandle(user.id)}
                            >
                                <View style={styles.imageContainer}>
                                    <Image source={{ uri: user.pfp }} style={styles.profileImage} />
                                    {/* Conditionally render the placement images for the first three users */}
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
                                </View>
                                <Text style={styles.username}>{user.name}</Text>
                                <View style={styles.betsContainer}>
                                    <Text style={styles.username}>{user.tokens}</Text>
                                    <Image
                                        source={require('../../../assets/images/gold_coin.png')}
                                        style={styles.coinIcon}
                                    />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                ) : (
                    <Text>No users found.</Text>
                )}
            </View>
            <View style={styles.betContainer}>
                <FlatList
                    data={currentBets}
                    keyExtractor={(item) => item.duelID}
                    renderItem={renderBetItem}
                />
            </View>


            {/* Modal */}
            <Modal
                transparent={true}
                visible={isStepsModalVisible}
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        {/* Close button */}
                        <TouchableOpacity style={styles.closeButton} onPress={() => setStepsModalVisible(false)}>
                            <Text style={styles.closeButtonText}>X</Text>
                        </TouchableOpacity>

                        {/* StorePageas the modal content */}
                        <StepsModal
                            groupUsersArray={currentGroupUsersArray}
                        />
                    </View>
                </View>
            </Modal>
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

                        {/* StorePageas the modal content */}
                        <StorePage
                            navigation={navigation}
                            userDiamonds={groups[groupID]?.userDiamonds}
                            currentGroupUsersArray={currentGroupUsersArray}
                        />
                    </View>
                </View>
            </Modal>
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
        </View>
    );
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
    container: {
        flex: 1,
        backgroundColor: "white",
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
    buttonText: {
        fontFamily: "Lexend",
        textAlign: 'center',
        color: 'blue',
    },
    daysLeft: {
        position: 'absolute',
        right: 10,
        top: 75,
        paddingHorizontal: 10,
        paddingVertical: 5,
        flexDirection: 'row',
        alignItems: 'center',
        color: 'red',
    },
    moneyContainer: {
        position: 'absolute',
        right: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
        flexDirection: 'row',
        alignItems: 'center',
    },
    tokenTextView: {
        backgroundColor: "#f0f0f0",
        borderRadius: 5,
        padding: 4,
        paddingRight: 20,
    },
    tokenText: {
        fontFamily: "Lexend",
        fontSize: 15
    },
    secondHeader: {
        fontFamily: "Lexend",
        fontSize: 18,
        paddingLeft: 20,
        paddingBottom: 10,
    },
    RaceButtonContainer: {
        position: 'absolute',
        top: '30%',
        alignSelf: 'center',
    },
    playerContainer: {
        position: 'absolute',
        top: '37%',
        height: '26%',
        width: '95%',
        paddingVertical: 10,
        backgroundColor: "#f0f0f0",
        borderRadius: 30,
        justifyContent: "center",
        alignSelf: "center",
    },
    betContainer: {
        position: 'absolute',
        top: '63%',
        height: '35%',
        width: '95%',
        marginTop: 10,
        backgroundColor: "#f0f0f0",
        borderRadius: 30,
        justifyContent: "center",
        alignSelf: "center",
    },
    titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    groupTitleView: {
        backgroundColor: "#eaeaea",
        borderRadius: 5,
        padding: 8,
        paddingLeft: 33,
    },
    groupTitle: {
        fontSize: 25,
        fontFamily: 'Lexend-Bold',
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    userContainer: {
        marginRight: 20,
        alignItems: 'center',
    },
    profileImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: "#D3D3D3",
    },
    imageContainer: {
        position: 'relative',
        width: 60,
        height: 60,
    },
    placementImage: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 15, // Adjust width based on your image size
        height: 15, // Adjust height based on your image size
    },
    username: {
        marginTop: 5,
        fontSize: 14,
        textAlign: 'center',
        fontFamily: 'Lexend',
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
    betsListLeft: {
        marginTop: 10,
        paddingRight: 20,
    },
    betsListRight: {
        marginTop: 10,
        paddingLeft: 20,
    },
    // MODAL
    button: {
        marginTop: 20,
        paddingBottom: 20,
        width: '100%',
        alignSelf: 'center',
    },
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
    groupImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: -20,
        zIndex: 10,
    },
    groupTitleContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        width: '30%',
        alignSelf: 'center',
        marginVertical: 30,
    },
    groupImageWrapper: {
        width: 120, // Match the size of the profileImage
        height: 120, // Match the size of the profileImage
        borderRadius: 60, // Half of the width/height
        overflow: 'visible',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ccc', // Default gray background
        position: 'relative', // Enable absolute positioning for the plus icon
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
    tokenContainer: {
        flexDirection: 'row',
        alignItems: 'center',
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
        //marginRight: 5, // Optional: Add some space between the number and the coin
        textAlign: 'center',
        fontFamily: 'Lexend-Bold'

    },
    betsColonText: {
        //marginRight: 5, // Optional: Add some space between the number and the coin
        textAlign: 'center',
        fontFamily: 'Lexend-Bold',
        paddingHorizontal: 10,

    },
});

export default BetSummaryPage;