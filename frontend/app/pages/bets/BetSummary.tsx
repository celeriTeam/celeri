import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Button, Image, ActivityIndicator, FlatList } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useUser } from '../../UserProvider';
import { getTodaysDuelsSummary } from '@/backend/src/bets';
import { getUserName } from '@/backend/src/users';

type headToHeadPageNavigationProp = StackNavigationProp<RootStackParamList, 'BetSummaryPage'>;
type headToHeadPageRouteProp = RouteProp<RootStackParamList, 'BetSummaryPage'>;

type Props = {
    navigation: headToHeadPageNavigationProp;
};

const BetSummaryPage: React.FC<Props> = ({ navigation }) => {
    const { userID } = useUser();
    const route = useRoute<headToHeadPageRouteProp>();
    const { groupID } = route.params;
    const [isLoading, setIsLoading] = useState(true);
    const [currentBets, setCurrentBets] = useState<{ duelID: string, player1: string, player2: string, player1Bets: { user: string, wager: number}[], player2Bets: { user: string, wager: number}[] }[]>([]);

    const fetchGroupData = async () => {
        try {
            const todaysBets = await getTodaysDuelsSummary(groupID);

            const flattenDuels = (duels: { [key: string]: { duelID: string, player1: string, player2: string, bets: { userID: string, wager: number, betOnUserID: string }[] } }) => {
                return Object.values(duels);
            };
        
            const flattenedBets = todaysBets ? flattenDuels(todaysBets) : [];

            const betsWithUsernames = await Promise.all(
                flattenedBets.map(async (bet) => {
                    const player1 = await getUserName(bet.player1);
                    const player2 = await getUserName(bet.player2);

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
                        player1Bets,
                        player2Bets,
                    };
                })
            );
            
            setCurrentBets(betsWithUsernames);
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

    const renderBetItem = ({ item }: { item: { duelID: string, player1: string, player2: string, player1Bets: { user: string, wager: number}[], player2Bets: { user: string, wager: number}[] } }) => (
        <View style={styles.flatList}>
            {/* Players */}
            <View style={styles.row}>
                <Text style={styles.player}>{item.player1}</Text>
                <Text style={styles.player}>{item.player2}</Text>
            </View>

            
            <View style={styles.row}>
                {/* Player1's Bets */}
                <View style={styles.betsListLeft}>
                    {item.player1Bets.map((bet, index) => (
                        <Text key={index} style={{ textAlign: 'left' }}> {bet.user}: {bet.wager}</Text>
                    ))}
                </View>

                {/* Player2's Bets */}
                <View style={styles.betsListRight}>
                    {item.player2Bets.map((bet, index) => (
                        <Text key={index} style={{ textAlign: 'right' }}> {bet.user}: {bet.wager}</Text>
                    ))}
                </View>
            </View>
        </View>
    );

    return (
        <View>
            <FlatList
                data={currentBets}
                keyExtractor={(item) => item.duelID}
                renderItem={renderBetItem}
            />
        </View>
    );
};


const styles = StyleSheet.create({
    flatList: {
        padding: 25,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    player: {
        fontWeight: 'bold',
        fontSize: 18,
    },
    betsListLeft: {
        marginTop: 10,
        paddingRight: 20,
    },
    betsListRight: {
        marginTop: 10,
        paddingLeft: 20,
    },
});

export default BetSummaryPage;