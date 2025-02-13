import React, { useEffect, useState } from 'react';
import { Timestamp } from "firebase/firestore";
import { getMoreWeeklyDuelsSummary, getWeeklyGainsSummary, getRacesSummary } from '@/backend/src/bets';

import { View, Text, TouchableOpacity, StyleSheet, Button, ActivityIndicator, TouchableHighlight, FlatList } from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';  // Import the icon package
import { useUser } from '../../../UserProvider';
import Svg, { Circle, G } from 'react-native-svg';
import { useLocalSearchParams } from 'expo-router';


const GainsHistoryPage: React.FC = () => {
    const { userID, groups, loading } = useUser();
    const { groupIDTemp } = useLocalSearchParams();
    const groupID = groupIDTemp ? String(groupIDTemp) : '';
    const [gainHistory, setGainHistory] = useState<any[]>([]); // Holds all fetched gains
    const [weeksAgo, setWeeksAgo] = useState(2); // Initial daysAgo for yesterday's duels
    const [gainsWeeksAgo, setGainsWeeksAgo] = useState(1); // Initial weeksAgo 

    interface GainItem {
        userID: string;
        gain: number;
        username: string;
        profilePic: string;
        weeksAgo: number;
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

    useEffect(() => {
        loadMoreGains();
    }, [groupID, groups]);

    useEffect(() => {
        console.log("gainHistory updated:", gainHistory);
    }, [gainHistory])

    // Function to fetch duels based on daysAgo
    const loadMoreDuels = async () => {
        console.log("WeeklyBethistory - Loading more duels");
        const moreDuels = await getMoreWeeklyDuelsSummary(groupID, weeksAgo);
        console.log('WeeklyBetHistory - loadMoreDuels: moreDuels', moreDuels)
        if (moreDuels) {
            setWeeksAgo((prevWeeksAgo) => prevWeeksAgo + 1); // Increment daysAgo for the next load
        }
    };

    // Function to fetch gains based on gainsDaysAgo
    const loadMoreGains = async () => {
        console.log("WeeklyBetHistory - Loading more gains");
        let moreGains;
        moreGains = await getWeeklyGainsSummary(groupID, gainsWeeksAgo, groups);
        console.log('WeeklyBetHistory - loadMoreGains: moreGains', moreGains)
        console.log('WeeklyBetHistory - loadMoreGains: moreGains.gains', moreGains?.gains)
        if (moreGains) {
            // Transform the `gains` map to an array of objects with `userID` and `gain` properties
            const newGains = Object.entries(moreGains.gains).map(([userID, gainData]) => ({
                userID,
                ...gainData,
                dayIdentifier: gainsWeeksAgo, // Unique identifier for each day
            }));
            console.log('loadMoreGains: newGains', newGains)
            setGainHistory((prevGainHistory) => {
                const updatedGainHistory = [...prevGainHistory, ...newGains];
                console.log("Updated gainHistory after set:", updatedGainHistory);
                return updatedGainHistory;
            });

            setGainsWeeksAgo((prevGainsWeeksAgo) => prevGainsWeeksAgo + 1);
            console.log("gains Weeks ago", gainsWeeksAgo);

        }
    };

    // Helper function to group gains by `daysAgo`
    const groupByDaysAgo = (gainHistory: GainItem[]) => {
        return gainHistory.reduce<{ [key: number]: GainItem[] }>((acc, item) => {
            if (!acc[item.weeksAgo]) {
                acc[item.weeksAgo] = [];
            }
            acc[item.weeksAgo].push(item);
            return acc;
        }, {});
    };;

    const groupedGains = groupByDaysAgo(gainHistory); // Group gains by `daysAgo`
    const groupedGainsArray = Object.entries(groupedGains).map(([weeksAgo, gains]) => ({
        weeksAgo: parseInt(weeksAgo, 10),
        gains,
    }));

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text>Loading...</Text>
            </View>
        );
    }

    // Component to render grouped gain items in one box
    const GroupedGainItem = ({ gains, weeksAgo }: { gains: GainItem[]; weeksAgo: number }) => (
        <View style={styles.gainsFlatList}>
            <View style={{ flex: 1, alignItems: 'flex-start', paddingTop: 3, paddingBottom: 8 }}>
                <Text style={styles.createdAtText}>{`${weeksAgo}w ago`}</Text>
            </View>
           
            {gains.map((item) => (
                <View key={`${item.userID}_${item.weeksAgo}`} style={styles.row}>
                    <Image source={{ uri: item.profilePic }} style={styles.profileImage} />
                    <Text style={styles.playerGain}>{item.username}</Text>
                    <Text
                        style={[
                            item.gain > 0 
                                ? styles.wonGainEarningsText 
                                : item.gain < 0 
                                ? styles.lostGainEarningsText 
                                : styles.zeroGainEarningsText,
                        ]}
                    >
                        {item.gain > 0 ? `+${item.gain}` : item.gain}
                    </Text>
                </View>
            ))}
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Gains History</Text>
            <FlatList
                data={groupedGainsArray}
                keyExtractor={(item) => item.weeksAgo.toString()}
                renderItem={({ item }) => (
                    <GroupedGainItem gains={item.gains} weeksAgo={item.weeksAgo} />
                )}
                onEndReached={loadMoreGains} // Load more duels when reaching the end
                onEndReachedThreshold={0.5} // Trigger when scrolled 50% from the bottom
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
    title: {
        textAlign: "center",
        fontSize: 30,
        fontWeight: "200",
        fontFamily: 'Lexend-Bold',
        paddingTop: 20,
        marginBottom: 20,
    },
    gainsFlatList: {
        borderWidth: 3,
        borderColor: '#ccc',
        borderRadius: 5,
        marginTop: 10,
        paddingBottom: 25,
        padding: 10,
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
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#D3D3D3",
        marginRight: 10,
    },
    playerGain: {
        fontFamily: "Lexend-Bold",
        fontSize: 15,
        flex: 1,
        textAlign: 'left',
    },
    createdAtText: {
        color: '#808080',
    },
    centered: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
});

export default GainsHistoryPage;