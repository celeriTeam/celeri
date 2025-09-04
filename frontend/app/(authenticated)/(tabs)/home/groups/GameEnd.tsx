import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { StyleSheet } from 'react-native-size-scaling';
import { getGameResults } from '../../../../../backend/src/groups';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Dimensions } from 'react-native';
import { useUser } from '../../../../UserProvider';


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

type GameEndPageProps = {
    currentGroupUsersArray: User[];
    groups: { [groupID: string]: any };
};

const GameEndPage: React.FC<GameEndPageProps> = ({ currentGroupUsersArray, groups }) => {
    const { groupID } = useLocalSearchParams();
    const resolvedGroupID = Array.isArray(groupID) ? groupID[0] : groupID;
    const [results, setResults] = useState<Record<string, any> | null>(null);
    const [sortedUsers, setSortedUsers] = useState<(User & { tokens?: number })[]>([]);
    const { userID, loading } = useUser();
    const [userRank, setUserRank] = useState<number | null>(null);

    const router = useRouter();

    useEffect(() => {
        const fetchResults = async () => {
            if (resolvedGroupID) {
                const data = await getGameResults(resolvedGroupID);
                const latestGame = data[0] || null;
                setResults(latestGame);

                // merge tokens into each user object in-place
                if (data && currentGroupUsersArray.length > 0) {
                    const enrichedUsers = currentGroupUsersArray.map((user) => ({
                        ...user,
                        tokens: latestGame?.results[user.id] ?? 0,
                    }));

                    const sorted = enrichedUsers.sort((a, b) => (b.tokens ?? 0) - (a.tokens ?? 0));
                    setSortedUsers(sorted);

                    if (userID) {
                        const rankIndex = sorted.findIndex((user) => user.id === userID);
                        if (rankIndex !== -1) {
                            setUserRank(rankIndex + 1);
                        } else {
                            setUserRank(null);
                        }
                    }
                }

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



    const createMemberButtonHandle = (id: string) => {
        router.push({
            pathname: '/(authenticated)/(tabs)/home/bets/publicProfile',
            params: {
                selectedUserIDTemp: id ?? '',
                groupIDTemp: groupID,
                averageStepsTemp: groups[resolvedGroupID]?.users[id]?.averageSteps ?? [],
                stepsTemp: groups[resolvedGroupID]?.users[id]?.steps ?? 0,
            },
        });
    };

    const truncateString = (str: string, maxLength: number) => {
        return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Game Results</Text>

            {results ? (
                userRank ? (
                    <Text style={styles.resultText}>
                        You placed {userRank}
                        {getOrdinalSuffix(userRank)}!
                    </Text>
                ) : (
                    <Text style={styles.resultText}>Could not determine your rank.</Text>
                )
            ) : (
                <Text style={styles.resultText}>Loading or no results available.</Text>
            )}

            <View style={[styles.leaderboardStepsContainer, { paddingVertical: moderateScale(5), paddingBottom: moderateScale(10), }]}>
                <View>
                    <View style={styles.leaderboardTop}>
                        <TouchableOpacity style={styles.leaderboardTopStyles} onPress={() => createMemberButtonHandle(sortedUsers[1]?.id)} activeOpacity={0.8}>
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
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.leaderboardTopStyles, { marginTop: verticalScale(15), }]} onPress={() => createMemberButtonHandle(sortedUsers[0]?.id)} activeOpacity={0.8}>
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
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.leaderboardTopStyles} onPress={() => createMemberButtonHandle(sortedUsers[2]?.id)} activeOpacity={0.8}>
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
                        </TouchableOpacity>
                    </View>
                    {sortedUsers.slice(3).map((user, index) => (
                        <TouchableOpacity key={user.id} onPress={() => createMemberButtonHandle(user.id)} activeOpacity={0.8}>
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
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 20,
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

export default GameEndPage;
