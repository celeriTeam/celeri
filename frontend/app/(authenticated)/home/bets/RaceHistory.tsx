import React, { useEffect, useState } from 'react';
import { Timestamp } from "firebase/firestore";
import { getMoreWeeklyDuelsSummary, getWeeklyGainsSummary, getRacesSummary } from '@/backend/src/bets';

import { View, Text, TouchableOpacity, StyleSheet, Button, ActivityIndicator, TouchableHighlight, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { useUser } from '../../../UserProvider';
import { useLocalSearchParams } from 'expo-router';


const RaceHistoryPage: React.FC = () => {
    const { userID, groups, loading } = useUser();
    const { groupIDTemp } = useLocalSearchParams();
    const groupID = groupIDTemp ? String(groupIDTemp) : '';
    const [raceHistory, setRaceHistory] = useState<{weeksAgo: number; races: RaceItem[]}[]>([]);
    const [weeksAgo, setWeeksAgo] = useState(2); // Initial daysAgo for yesterday's duels
    const [raceWeeksAgo, setRaceWeeksAgo] = useState(1);
    
    interface RaceItem {
        userID: string;
        gain: number;
        username: string;
        profilePic: string;
        weeksAgo: number;
        steps: number;
    }
    
    // Initial load for yesterday's duels
    useEffect(() => {
        const fetchInitialDuels = async () => {
            const lastWeekBets = groups[groupID]?.lastWeekDuels;
            console.log("lastWeekBets: ", lastWeekBets)
            if (!lastWeekBets) {
                await loadMoreDuels(); // Load if yesterdaysDuels not available
            }
        };
        fetchInitialDuels();
    }, [groupID, groups]);

    // Flatten the duels from the fetched data
    const flattenDuels = (duels: { [key: string]: any }) => Object.values(duels);


    // Function to fetch duels based on daysAgo
    const loadMoreDuels = async () => {
        console.log("WeeklyBethistory - Loading more duels");
        const moreDuels = await getMoreWeeklyDuelsSummary(groupID, weeksAgo);
        console.log('WeeklyBetHistory - loadMoreDuels: moreDuels', moreDuels)
        if (moreDuels) {
            // Flatten and append new duels
            setWeeksAgo((prevWeeksAgo) => prevWeeksAgo + 1); // Increment daysAgo for the next load
        }
    };

    const loadMoreRaces = async () => {
        let moreRaces;
        moreRaces = await getRacesSummary(groupID, raceWeeksAgo, groups);
        if(moreRaces){
            const newRaceWeek = {
                weeksAgo: raceWeeksAgo,
                races: Object.entries(moreRaces.races).map(([userID, raceData]) => ({
                    userID,
                    ...raceData,
                }))
            }

            setRaceHistory(prevRaceHistory => [...prevRaceHistory, newRaceWeek]);
            setRaceWeeksAgo(prevRaceWeeksAgo => prevRaceWeeksAgo + 1);
        }
    }

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text>Loading...</Text>
            </View>
        );
    }

    const renderRaceItem = ({ item }: { item: {weeksAgo: number; races: RaceItem[]} }) => (
        <View style={styles.gainsFlatList}>
            <View style={{ flex: 1, alignItems: 'flex-start', paddingTop: 3, paddingBottom: 8 }}>
                <Text style={styles.createdAtText}>{`${weeksAgo}w ago`}</Text>
            </View>
        
            {item.races.map((race) => (
                <View key={`${race.userID}_${item.weeksAgo}`} style={styles.row}>
                    <Image source={{ uri: race.profilePic }} style={styles.profileImage} />
                    <Text style={styles.playerGain}>{race.username}</Text>
                    <Text style={styles.zeroGainEarningsText}>{`${race.steps} steps`}</Text>
                    <Text
                        style={[
                            race.gain > 0 
                                ? styles.wonGainEarningsText 
                                : race.gain < 0 
                                ? styles.lostGainEarningsText 
                                : styles.zeroGainEarningsText,
                        ]}
                    >
                        {race.gain > 0 ? `+${race.gain}` : race.gain}
                    </Text>
                </View>
            ))}
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Race History</Text>
            <FlatList
                data={raceHistory} // Replace with your actual data source for races
                keyExtractor={(item) => item.weeksAgo.toString()}
                renderItem={renderRaceItem} // Implement this function to render race items
                onEndReached={loadMoreRaces} // Implement if you want pagination
                onEndReachedThreshold={0.5}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 100,
        padding: 20,
    },
    spacer: {
        flex: 1,
        marginRight: 10,
    },
    statusBar: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        alignItems: 'center',
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
    },
    statusText: {
        fontFamily: "Lexend",
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
        textAlign: "center",
        fontSize: 30,
        fontWeight: "200",
        fontFamily: 'Lexend-Bold',
        paddingTop: 20,
        marginBottom: 20,
    },
    header: {
        fontFamily: "Lexend",
        fontSize: 15,
        marginBottom: 20,
        textAlign: 'center',
    },
    flatList: {
        borderWidth: 3,
        borderColor: '#ccc',
        borderRadius: 5,
        marginTop: 10,
        paddingBottom: 25,
    },
    gainsFlatList: {
        borderWidth: 3,
        borderColor: '#ccc',
        borderRadius: 5,
        marginTop: 10,
        paddingBottom: 25,
        padding: 10,
    },
    wonEarningsText: {
        fontFamily: "Lexend",
        marginTop: 10,
        color: 'green',
        fontSize: 30,
    },
    lostEarningsText: {
        fontFamily: "Lexend",
        marginTop: 10,
        color: 'red',
        fontSize: 30,
    },
    wonGainEarningsText: {
        fontFamily: "Lexend",
        color: 'green',
        fontSize: 20,
    },
    lostGainEarningsText: {
        fontFamily: "Lexend",
        color: 'red',
        fontSize: 20,
    },
    zeroGainEarningsText: {
        fontFamily: "Lexend",
        color: '#808080',
        fontSize: 20,
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
        fontSize: 14,
        opacity: 0.8,
    },
    horizontalLine: {
        borderBottomColor: '#ccc',
        borderBottomWidth: 1.5,
        marginVertical: 10,
        width: '90%',
        alignSelf: 'center',
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
        fontFamily: "Lexend-Bold",
        fontSize: 18,
        flex: 1,
        textAlign: 'left',
    },
    playerGain: {
        fontFamily: "Lexend-Bold",
        fontSize: 15,
        flex: 1,
        textAlign: 'left',
    },
    steps: {
        fontFamily: "Lexend",
        marginRight: 30,
        textAlign: 'right',
        fontSize: 28,
    },
    createdAtText: {
        color: '#808080',
    },
    loserText: {
        color: '#808080',
        opacity: 0.7,
    },
    loserImage: {
        opacity: 0.5,
    },
    centeredColumn: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    tabContainer: { 
        flexDirection: 'row', 
        justifyContent: 'space-around', 
        marginBottom: 10 
    },
    button: {
        padding: 10,
        borderRadius: 5,
    },
    buttonText: {
        fontFamily: 'Lexend',
        color: 'gray',
        fontSize: 16,
    },
    activeButtonText: {
        color: 'green',
    },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 18, color: 'gray', fontFamily: 'Lexend_400Regular' },
});

export default RaceHistoryPage;