import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList } from 'react-native';
import { StyleSheet } from 'react-native-size-scaling';
import { getGameResults } from '../../../../../backend/src/groups';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Dimensions } from 'react-native';
import { useUser } from '../../../../UserProvider';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

type User = {
    id: string;
    username?: string;
    pfp?: string;
    name?: string;
};

type GameResultsPageProps = {
    currentGroupUsersArray: User[];
    groups: { [groupID: string]: any };
};

const GameHistoryPage: React.FC<GameResultsPageProps> = ({ currentGroupUsersArray, groups }) => {
    const { groupID } = useLocalSearchParams();
    const { userID, loading } = useUser();
    const resolvedGroupID = Array.isArray(groupID) ? groupID[0] : groupID;
    const [results, setResults] = useState<any[]>([]);
    const [isExpanded, setIsExpanded] = useState(null);

    useEffect(() => {
        const fetchResults = async () => {
            if (resolvedGroupID) {
                const data = await getGameResults(resolvedGroupID);
                if (!data || data.length === 0) {
                    setResults([]);
                    return;
                }

                const allResults = data.map((game: any) => {
                    const enrichedUsers = currentGroupUsersArray.map((user) => ({
                        ...user,
                        tokens: game?.results[user.id] ?? 0,
                    }));

                    const sorted = enrichedUsers.sort((a, b) => (b.tokens ?? 0) - (a.tokens ?? 0));

                    let userRank: number | null = null;
                    if (userID) {
                        const rankIndex = sorted.findIndex((user) => user.id === userID);
                        userRank = rankIndex !== -1 ? rankIndex + 1 : null;
                    }
                    return {
                        ...game,
                        sorted,
                        userRank,
                    }
                });
                setResults(allResults);
            }
        };

        fetchResults();
    }, [resolvedGroupID, currentGroupUsersArray]);

    const getOrdinalSuffix = (n: number) => {
        if (n % 100 >= 11 && n % 100 <= 13) return 'th';
        switch (n % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    };

    // const createMemberButtonHandle = (id: string) => {
    //     router.push({
    //         pathname: '/home/groups/publicProfile',
    //         params: {
    //             selectedUserIDTemp: id ?? '',
    //             groupIDTemp: groupID,
    //             averageStepsTemp: groups[resolvedGroupID]?.users[id]?.averageSteps ?? [],
    //             stepsTemp: groups[resolvedGroupID]?.users[id]?.steps ?? 0,
    //         },
    //     });
    // };

    const truncateString = (str: string, maxLength: number) => {
        return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Game Results</Text>
            {results.length === 0 && (
                <Text style={styles.text}>--No past games--</Text>
            )}
            <FlatList
                data={results}
                keyExtractor={(item) => item.resultsID}
                renderItem={({ item }) => {
                    const sortedUsers: (User & { tokens?: number })[] = item?.sorted;
                    const userRank: number | null = item?.userRank;

                    return (
                        <View key={item.resultsID}>
                            <Text style={styles.date}>
                                {item.startTime && typeof item.startTime.toDate === "function"
                                ? `${dayjs(item.startTime.toDate()).format('MMM D, YYYY')} - ${dayjs(item.endTime.toDate()).format('MMM D, YYYY')}`
                                : dayjs(item.createdAt.toDate()).format('MMM D, YYYY')}
                                
                            </Text>
                            <View style={styles.playerContainer}>
                                <TouchableOpacity
                                    onPress={() => {
                                        if (isExpanded === item.id) {
                                            setIsExpanded(null);
                                        } else {
                                            setIsExpanded(item.id);
                                        }
                                    }}
                                    activeOpacity={0.8}
                                >
                                    {item.id === isExpanded && (
                                        userRank ? (
                                            <Text style={styles.resultText}>
                                                You placed {userRank}
                                                {getOrdinalSuffix(userRank)}!
                                            </Text>
                                        ) : (
                                            <Text style={styles.resultText}>Could not determine your rank.</Text>
                                        )
                                    )}
                                    <View style={[styles.leaderboardStepsContainer, { paddingVertical: moderateScale(5), paddingBottom: moderateScale(10), }]}>
                                        <View style={styles.leaderboardTop}>
                                            <View style={styles.leaderboardTopStyles}>
                                                <Image
                                                    source={sortedUsers[1]?.pfp ?
                                                        { uri: sortedUsers[1]?.pfp } :
                                                        require('@components/blank-profile-picture.png')
                                                    }
                                                    style={{ width: scale(37), height: scale(37), borderRadius: moderateScale(50), borderWidth: moderateScale(1.5), borderColor: '#fff', }}
                                                />
                                                <View style={styles.leaderboardTopCircle} >
                                                    <Text style={{ fontFamily: 'Lexend', color: '#000', fontSize: moderateScale(9), }}>2</Text>
                                                </View>
                                                <Text style={[styles.leaderboardTokensText, { color: '#fff', }]}>{truncateString(sortedUsers[1]?.name ?? '', 7)}</Text>
                                                <View style={styles.leaderboardTopTokens}>
                                                    <Image
                                                        source={require('@assets/icons/tokensWhite.png')}
                                                        style={styles.tokensWhiteIcon}
                                                    />
                                                    <Text style={[styles.leaderboardTokensText, { color: '#BEFFBB', }]}> {sortedUsers[1]?.tokens}</Text>
                                                </View>
                                            </View>
                                            <View style={[styles.leaderboardTopStyles, { marginTop: verticalScale(15), }]}>
                                                <View style={{
                                                    shadowColor: '#51ba51',
                                                    shadowOffset: { width: 0, height: 0 },
                                                    shadowOpacity: 0.7,
                                                    shadowRadius: moderateScale(7),
                                                    elevation: 10,
                                                }}>
                                                    <Image
                                                        source={sortedUsers[0]?.pfp ?
                                                            { uri: sortedUsers[0]?.pfp } :
                                                            require('@components/blank-profile-picture.png')
                                                        }
                                                        style={{ width: scale(51), height: scale(51), borderRadius: moderateScale(50), borderWidth: moderateScale(1.5), borderColor: '#fff', }}
                                                    />
                                                </View>
                                                <View style={styles.leaderboardTopCircle} >
                                                    <Text style={{ fontFamily: 'Lexend', color: '#000', fontSize: moderateScale(9), }}>1</Text>
                                                </View>
                                                <Text style={[styles.leaderboardTokensText, { color: '#fff', }]}>{sortedUsers[0]?.name}</Text>
                                                <View style={styles.leaderboardTopTokens}>
                                                    <Image
                                                        source={require('@assets/icons/tokensWhite.png')}
                                                        style={styles.tokensWhiteIcon}
                                                    />
                                                    <Text style={[styles.leaderboardTokensText, { color: '#BEFFBB', }]}> {sortedUsers[0]?.tokens}</Text>
                                                </View>
                                            </View>
                                            <View style={styles.leaderboardTopStyles}>
                                                <Image
                                                    source={sortedUsers[2]?.pfp ?
                                                        { uri: sortedUsers[2]?.pfp } :
                                                        require('@components/blank-profile-picture.png')
                                                    }
                                                    style={{ width: scale(37), height: scale(37), borderRadius: moderateScale(50), borderWidth: moderateScale(1.5), borderColor: '#fff', }}
                                                />
                                                <View style={styles.leaderboardTopCircle} >
                                                    <Text style={{ fontFamily: 'Lexend', color: '#000', fontSize: moderateScale(9), }}>3</Text>
                                                </View>
                                                <Text style={[styles.leaderboardTokensText, { color: '#fff', }]}>{truncateString(sortedUsers[2]?.name ?? '', 7)}</Text>
                                                <View style={styles.leaderboardTopTokens}>
                                                    <Image
                                                        source={require('@assets/icons/tokensWhite.png')}
                                                        style={styles.tokensWhiteIcon}
                                                    />
                                                    <Text style={[styles.leaderboardTokensText, { color: '#BEFFBB', }]}> {sortedUsers[2]?.tokens}</Text>
                                                </View>
                                            </View>
                                        </View>
                                        {item.id === isExpanded && (
                                            sortedUsers.slice(3).map((user, index) => (
                                                <View key={user.id}>
                                                    <View key={user.id} style={[styles.leaderboardTokensRow, user.id === userID ? { backgroundColor: '#4bff6c99', } : { backgroundColor: '#00000080', }]}>
                                                        <Text style={[styles.leaderboardTokensNumberText, user.id === userID ? { color: '#fff', } : { color: '#a7a7a7', }]}>{index + 4}</Text>
                                                        <Image
                                                            source={user.pfp ?
                                                                { uri: user.pfp } :
                                                                require('@components/blank-profile-picture.png')
                                                            }
                                                            style={[styles.leaderboardImage, { marginRight: scale(10), }]}
                                                        />
                                                        <Text style={[styles.leaderboardTokensText, { color: '#fff', }]}>{user.name}</Text>
                                                        <View style={styles.leaderboardTokensNumTokens}>
                                                            <Image
                                                                source={require('@assets/icons/tokensWhite.png')}
                                                                style={styles.tokensWhiteIcon}
                                                            />
                                                            <Text style={[styles.leaderboardTokensText, user.id === userID ? { color: '#fff', } : { color: '#BEFFBB', }]}> {user.tokens}</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            ))
                                        )}
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 20,
    },
    text: {
        color: '#ffffffbb',
        fontSize: 12,
        fontFamily: 'Lexend',
        textAlign: "center",
    },
    title: {
        textAlign: "center",
        fontSize: 30,
        fontWeight: "200",
        fontFamily: 'Lexend-Bold',
        paddingTop: 20,
        marginBottom: 20,
        color: "#fff"
    },
    date: {
        fontFamily: "Lexend",
        color: '#ffffff80',
        fontSize: 10,
        marginBottom: 5,
    },
    playerContainer: {
        // flexDirection: 'row',
        // justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
        backgroundColor: '#5BE35C32',
        borderRadius: 10,
        padding: 10,
        paddingHorizontal: 20,
    },
    resultText: {
        textAlign: "center",
        fontSize: 20,
        fontWeight: "200",
        fontFamily: 'Lexend-Bold',
        paddingTop: 20,
        marginBottom: 20,
        color: "#fff"
    },
    leaderboardStepsContainer: {
        // flex: 1,
        backgroundColor: '#65656580',
        paddingHorizontal: 10,
        marginTop: 8,
        borderRadius: 20,
        //height: '97%',
    },
    leaderboardTop: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        marginBottom: 15,
    },
    leaderboardTopStyles: {
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 20,
    },
    leaderboardTopCircle: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -7,
        marginBottom: 5,
        width: 17,
        height: 17,
        borderRadius: 9,
        backgroundColor: '#74FF6D',
    },
    leaderboardTopTokens: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    leaderboardTokensRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
        padding: 10,
        borderRadius: 10,
    },
    leaderboardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    leaderboardTokensText: {
        fontFamily: 'Lexend',
        fontSize: 11,
    },
    leaderboardTokensNumberText: {
        fontFamily: 'Lexend',
        fontSize: 11,
        marginHorizontal: 10,
    },
    leaderboardTokensNumTokens: {
        flexDirection: 'row',
        alignItems: 'center',
        // align to right
        position: 'absolute',
        right: 15,
    },
    leaderboardImage: {
        width: 26,
        height: 26,
        borderRadius: 15,
        marginRight: 10,
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    leaderboardSteps: {
        color: '#fff',
        fontSize: 11,
        fontFamily: 'Lexend',
        marginLeft: 10,
    },
    tokenText: {
        fontFamily: 'Lexend',
        fontSize: 15,
        color: 'white',
    },
    tokensWhiteIcon: {
        width: 10,
        height: 10,
    },
});

export default GameHistoryPage;
