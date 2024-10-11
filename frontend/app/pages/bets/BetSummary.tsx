import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Button, Image, ActivityIndicator, FlatList, Modal, ScrollView } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useUser } from '../../UserProvider';
import { getTodaysDuelsSummary } from '@/backend/src/bets';
import { getProfilePic, getSteps, getUserName } from '@/backend/src/users';
import BetRecapPage from './Recap';
import { getGroupIsFirstDay, getGroupName, getTodaysBetTokens, getUsersInGroup, getUserTokens } from '@/backend/src/groups';
import Svg, { Circle, G } from 'react-native-svg';

type headToHeadPageNavigationProp = StackNavigationProp<RootStackParamList, 'HeadToHeadPage'>;
type headToHeadPageRouteProp = RouteProp<RootStackParamList, 'BetSummaryPage'>;

type Props = {
    navigation: headToHeadPageNavigationProp;
};

type CircularIconProps = {
    value: number; // Value from 0 to 1, where 1 is 100%
    size?: number; // Diameter of the circle
    strokeWidth?: number; // Width of the border
};

const BetSummaryPage: React.FC<Props> = ({ navigation }) => {
    const { userID } = useUser();
    const route = useRoute<headToHeadPageRouteProp>();
    const { groupID } = route.params;
    const [isLoading, setIsLoading] = useState(true);
    const [currentBets, setCurrentBets] = useState<{ duelID: string, player1: string, player2: string, player1Pfp: string, player2Pfp: string, player1Bets: { user: string, wager: number}[], player2Bets: { user: string, wager: number}[], player1Steps: number, player2Steps: number }[]>([]);
    const [currentUserTokens, setCurrentUserTokens] = useState<number | undefined>(undefined);
    const [totalBetTokens, setTotalBetTokens] = useState(0);
    const [currentGroupUsersArray, setCurrentGroupUsersArray] = useState<{ id: string; name: string | undefined; pfp: string | undefined; }[]>([]);
    const [currentGroupName, setCurrentGroupName] = useState<string | undefined>(undefined);
    const [isFirstDay, setIsFirstDay] = useState(false);
    const [isModalVisible, setModalVisible] = useState(false);

    let groupPic;
  
    const closeModal = async () => {
      setModalVisible(false);
    };
  
    const openModal = async () => {
      setModalVisible(true);
    };

    const createMemberButtonHandle = (id: string) => {
        navigation.navigate('ProfilePage', { selectedUserID: id ?? '', groupID: groupID });
    };

    const fetchGroupData = async () => {
        try {
            const todaysBets = await getTodaysDuelsSummary(groupID);

            const flattenDuels = (duels: { [key: string]: { duelID: string, player1: string, player2: string, bets: { userID: string, wager: number, betOnUserID: string }[] } }) => {
                return Object.values(duels);
            };
            groupPic = await getProfilePic(groupID);
        
            const flattenedBets = todaysBets ? flattenDuels(todaysBets) : [];

            const betsWithUsernames = await Promise.all(
                flattenedBets.map(async (bet) => {
                    const player1 = await getUserName(bet.player1);
                    const player2 = await getUserName(bet.player2);
                    const player1Steps = await getSteps(bet.player1);
                    const player2Steps = await getSteps(bet.player2);
                    const player1Pfp = (await getProfilePic(bet.player1)) ?? 'default_image_url'; // Fetch player1's profile picture
                    const player2Pfp = (await getProfilePic(bet.player1)) ?? 'default_image_url';

                    // if there are no bets, return the duel with the player names
                    console.log('...', bet.bets[0]?.wager);
                    if (!bet.bets[0]?.wager || (bet.bets.length === 0)) {
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
                    }

                    else {
                        // Separate bets for player1 and player2
                        const player1Bets = await Promise.all(
                            bet.bets
                                .filter((b) => b.betOnUserID === bet.player1)
                                .map(async (b) => ({
                                    user: await getUserName(b.userID),
                                    wager: b.wager,
                                }))
                        );

                        const player2Bets = await Promise.all(
                            bet.bets
                                .filter((b) => b.betOnUserID === bet.player2)
                                .map(async (b) => ({
                                    user: await getUserName(b.userID),
                                    wager: b.wager,
                                }))
                        );
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
                })
            );
            
            setCurrentBets(betsWithUsernames);

            // Get total bet tokens
            const todaysBetTokens = await getTodaysBetTokens(userID, groupID);
            setTotalBetTokens(todaysBetTokens);

            // Check if it's the first day
            const firstDay = await getGroupIsFirstDay(groupID);
            setIsFirstDay((firstDay == undefined) ? true : firstDay);

            // Get group name
            const groupName = await getGroupName(groupID);
            setCurrentGroupName(groupName);

            // Get group users
            const groupUsersIdArray = await getUsersInGroup(groupID); // array of user IDs
            let groupUsersArray: { id: string; name: string | undefined; pfp: string | undefined; }[] = [];
            if (groupUsersIdArray) {
                // get user names & pfps from user IDs
                for (let i = 0; i < groupUsersIdArray.length; i++) {
                    const userID = groupUsersIdArray[i];
                    const userName = await getUserName(userID);
                    const profilePic = await getProfilePic(userID);
                    groupUsersArray.push({ id: userID, name: userName, pfp: profilePic });
                }
                setCurrentGroupUsersArray(groupUsersArray);
            }

            // Get user's tokens
            const userTokens = await getUserTokens(userID, groupID);
            setCurrentUserTokens(userTokens);
        } catch (error) {
            console.error("Error fetching user data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGroupData();
    }, []);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text>Loading...</Text>
            </View>
        );
    }

    const renderBetItem = ({ item }: { item: { duelID: string, player1: string, player2: string, player1Pfp: string, player2Pfp: string, player1Bets: { user: string, wager: number}[], player2Bets: { user: string, wager: number}[], player1Steps: number, player2Steps: number } }) => {
        
        const totalPlayer1Bets = item.player1Bets.reduce((sum, bet) => sum + bet.wager, 0);
        const totalPlayer2Bets = item.player2Bets.reduce((sum, bet) => sum + bet.wager, 0);

        // Calculate the sum of all bets
        const totalBets = totalPlayer1Bets + totalPlayer2Bets;
        
        // Calculate the ratios for the circular value
        const player1Ratio = totalBets === 0 ? 0.5 : totalPlayer1Bets / totalBets;
        const player2Ratio = totalBets === 0 ? 0.5 : totalPlayer2Bets / totalBets;

        return (
            <View style={styles.flatList}>
                {/* Players and Pictures */}
                <View style={styles.row}>
                    {/* Column 1 - Player 1 */}
                <View style={styles.centeredColumn}>
                    <Text style={styles.player1text}>{item.player1}</Text>
                    <Image source={{ uri: item.player1Pfp }} style={styles.profileImage} />
                    <Text style={styles.stepTitle}>{item.player1Steps} Steps</Text>
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
                    <Text style={styles.stepTitle}>{item.player2Steps} Steps</Text>
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
                {/* Player1's Bets */}
                {/* <View style={styles.betsListLeft}>
                    <Text style={styles.stepTitle}>Bets:</Text>
                    {item.player1Bets.length === 0 ? (
                        <View>
                            <Text>(No bets placed yet)</Text>
                        </View>
                    ) : (
                        <View>
                            {item.player1Bets.map((bet, index) => (
                                <Text key={index} style={{ textAlign: 'left' }}> {bet.user}: {bet.wager}</Text>
                            ))}
                        </View>
                    )}
                </View> */}

                {/* Player2's Bets */}
                {/* <View style={styles.betsListRight}>
                    <Text style={styles.stepTitle}>Bets:</Text>
                    {item.player2Bets.length === 0 ? (
                        <View>
                            <Text>(No bets placed yet)</Text>
                        </View>
                    ) : (
                        <View>
                            {item.player2Bets.map((bet, index) => (
                                <Text key={index} style={{ textAlign: 'right' }}> {bet.user}: {bet.wager}</Text>
                            ))}
                        </View>
                    )}
                </View> */}
            </View>
        </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.titleContainer}>
                <Text style={styles.groupTitle}>{currentGroupName}</Text>
            </View>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Image
                    source={require('@components/back-icon.png')}
                    style={styles.backImage}
                />
            </TouchableOpacity>
            <View style={styles.tokens}>  
                <Text style={styles.tokenText}>{currentUserTokens}</Text>
                <Image
                    source={require('../../../assets/images/gold_coin.png')}
                    style={styles.coinIcon}
                />
            </View>
            <View style={styles.betTokens}>
                <Text style={styles.tokenText}>{totalBetTokens}</Text>
                <Image
                    source={require('../../../assets/images/coin_spent.png')}
                    style={styles.coinIcon}
                />
            </View>
            <View style={styles.groupImageContainer}>
                {groupPic ? (
                    <Image source={{ uri: groupPic }} style={styles.groupImage} />
                ) : (
                    <Image
                        source={require('@components/blank-profile-picture.png')}
                        style={styles.groupImage}
                    />
                )}
            </View>
            <View style={styles.playerContainer}>
                <Text style={styles.secondHeader}>Players:</Text>
                {currentGroupUsersArray ? (
                    <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.userRow}>
                        {currentGroupUsersArray.map((user) => (
                        <TouchableOpacity
                            key={user.id}
                            style={styles.userContainer}
                            onPress={() => createMemberButtonHandle(user.id)}
                        >
                            <Image source={{ uri: user.pfp }} style={styles.profileImage} />
                            <Text style={styles.username}>{user.name}</Text>
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
            {!isFirstDay && (
                <View style={styles.button}>
                    <Button title="See yesterday's bets" onPress={openModal} />
                </View>
            )}
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
    tokens: {
        position: 'absolute',
        right: 10,
        top: 100,
        paddingHorizontal: 10,
        paddingVertical: 5,
        flexDirection: 'row',
        alignItems: 'center',
        // borderColor: '#FF8C00',
        // borderWidth: 2,
    },
    betTokens: {
        position: 'absolute',
        right: 10,
        top: 130,
        paddingHorizontal: 10,
        paddingVertical: 5,
        flexDirection: 'row',
        alignItems: 'center',
        // borderColor: '#FF8C00',
        // borderWidth: 2,
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
    playerContainer: {
        paddingVertical: 10,
        backgroundColor: "#f0f0f0",
        width: 380,
        borderRadius: 30,
        justifyContent: "center",
        //alignItems: "center",
        alignSelf: "center",
    },
    betContainer: {
        marginTop: 10,
        backgroundColor: "#f0f0f0",
        width: 380,
        height: 320,
        borderRadius: 30,
        justifyContent: "center",
        //alignItems: "center",
        alignSelf: "center",
    },
    titleContainer: {
        justifyContent: "center",
    },
    groupTitle: {
        textAlign: "center",
        fontSize: 30,
        fontWeight: "200",
        fontFamily: 'Lexend-Bold',
        paddingTop: 20,
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
        marginBottom: 20,
        width: '50%',
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
        width: 120,
        height: 120,
        borderRadius: 60,
        marginVertical: 10,
    },
    groupImageContainer: {
        alignItems: 'center',
        //marginBottom: 10,
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
    coinIcon: {
        width: 30,
        height: 30,
        marginRight: 5, // Adds spacing between the icon and the text
    },
    tokenContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    centeredColumn: {
        alignItems: 'center',
        flex: 1,
    },
    rowBets: {
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