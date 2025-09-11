import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useUser } from '@/app/UserProvider';
import { getUserProfilesBatch } from '@/backend/src/competition';
import { getFriendsList } from '@/backend/src/users';

const { width, height } = Dimensions.get('window');

const guidelineBaseWidth = 393;
const guidelineBaseHeight = 852;

const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

type Results = {
    user_id: string,
    steps: number,
    rank: string
};

type PrevData = {
    competition_id: string,
    start_time: string,
    end_time: string,
    is_active: boolean,
    first_place_winner: string | null,
    median_winner: string | null,
    referral_winner: string | null,
};

type ReferralResults = {
    rank: string,
    user_id: string,
    referral_count: number
};

type Props = {
    results: Results[];
    prevData: PrevData;
    referralResults: ReferralResults[];
};

type UserInfo = {
    user_id: string,
    username?: string,
    profileImageUrl?: string,
}

type Profile = { username?: string; profileImageUrl?: string };

const ResultsModal: React.FC<Props> = ({ results, prevData, referralResults }) => {
    const { userID, name } = useUser();
    const [resultsWithUserInfo, setResultsWithUserInfo] = useState<any[]>([]);
    const [referralResultsWithUserInfo, setReferralResultsWithUserInfo] = useState<any[]>([]);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [firstPlaceUserInfo, setFirstPlaceUserInfo] = useState<UserInfo | null>(null);
    const [medianUserInfo, setMedianUserInfo] = useState<UserInfo | null>(null);
    const [referralUserInfo, setReferralUserInfo] = useState<UserInfo | null>(null);
    const [selectedTab, setSelectedTab] = useState<'Steps' | 'Referrals'>('Steps');
    const [friendsToggle, setFriendsToggle] = useState<boolean>(false);
    const [friendsList, setFriendsList] = useState<any[]>([]);

    const resultsToDisplay = selectedTab === 'Steps'
        ? resultsWithUserInfo
        : referralResultsWithUserInfo;

    const filteredResults = friendsToggle
        ? resultsToDisplay.filter(user =>
            friendsList.includes(user.user_id) || user.user_id === userID
        )
        : resultsToDisplay;

    const grabUsersInfo = async () => {
        try {
            if (!results || !Array.isArray(results)) return;
            
            const userIds = results.map((u: any) => u.user_id || u.id);
            
            // Batch fetch profiles
            const profiles = await getUserProfilesBatch(userIds);

            // Get user info (steps, rank) for each
            const userInfos = await Promise.all(
                userIds.map(async (userId: string) => {
                    const profile: Profile = profiles.find((p: any) => p.userId === userId) || {};
                    if (userId === userID) {
                        setUserInfo({
                            username: profile.username || '',
                            profileImageUrl: profile.profileImageUrl || '',
                            steps: results.find((r: Results) => r.user_id === userId)?.steps || 0,
                            rank: results.find((r: Results) => r.user_id === userId)?.rank || '-1'
                        });
                    }
                    return {
                        user_id: userId,
                        username: profile.username || '',
                        profileImageUrl: profile.profileImageUrl || '',
                        steps: results.find((r: Results) => r.user_id === userId)?.steps || 0,
                        rank: results.find((r: Results) => r.user_id === userId)?.rank || '-1'
                    };
                })
            );
            setResultsWithUserInfo(userInfos);

            if (referralResults.length > 0) {
                const userIds = referralResults.map((u: any) => u.user_id || u.id);
                const referralProfiles = await getUserProfilesBatch(userIds);
                const referralUserInfos = await Promise.all(
                    userIds.map(async (userId: string) => {
                        const profile: Profile = referralProfiles.find((p: any) => p.userId === userId) || {};
                        return {
                            user_id: userId,
                            username: profile.username || '',
                            profileImageUrl: profile.profileImageUrl || '',
                            referral_count: referralResults.find((r: ReferralResults) => r.user_id === userId)?.referral_count || 0,
                            rank: referralResults.find((r: ReferralResults) => r.user_id === userId)?.rank || '-1'
                        };
                    })
                );
                setReferralResultsWithUserInfo(referralUserInfos);
                if (prevData.referral_winner) {
                    const profile: Profile = referralProfiles.find((p: any) => p.userId === prevData.referral_winner) || {};
                    setReferralUserInfo({
                        user_id: prevData.referral_winner,
                        username: profile.username || '',
                        profileImageUrl: profile.profileImageUrl || ''
                    })
                }
            }

            // Winners
            if (prevData.first_place_winner) {
                const profile: Profile = profiles.find((p: any) => p.userId === prevData.first_place_winner) || {};
                setFirstPlaceUserInfo({
                    user_id: prevData.first_place_winner,
                    username: profile.username || '',
                    profileImageUrl: profile.profileImageUrl || ''
                })
            }
            if (prevData.median_winner) {
                const profile: Profile = profiles.find((p: any) => p.userId === prevData.median_winner) || {};
                setMedianUserInfo({
                    user_id: prevData.median_winner,
                    username: profile.username || '',
                    profileImageUrl: profile.profileImageUrl || ''
                })
            }
        } catch (err) {
            console.error('Error fetching user info in results modal:', err);
        }
    };
    
    const fetchFriendsList = async () => {
        try {
            const response = await getFriendsList(userID);
            setFriendsList(response);
        } catch (err) {
            console.error('Error fetching friends list:', err);
        }
    };

    useEffect (() => {
        grabUsersInfo();
        fetchFriendsList();
    }, [results, referralResults, userID, prevData, referralResultsWithUserInfo]);

    return (
        <View style={{ height: '100%' }}>
            <Text style={styles.header}>Hey {name}! Here are the results of the competition:</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Competition times (based on first item) */}
                {/* {results[0] && (
                    <View style={{ alignItems: 'center', marginVertical: 10 }}>
                        <Text>Competition Start: {formatTime(leaderboard[0].start_time)}</Text>
                        <Text>Competition End: {formatTime(leaderboard[0].end_time)}</Text>
                    </View>
                )} */}
                <View style={{ marginTop: 10 }} />


                <View style={styles.profileRow}>
                    <Image
                        source={
                            userInfo?.profileImageUrl
                                ? { uri: userInfo?.profileImageUrl }
                                : require('@components/blank-profile-picture.png')
                        }
                        style={styles.profileImage}
                    />
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>
                            {userInfo?.username}
                        </Text>
                        <Text style={styles.profileSteps}>
                            {userInfo?.steps ?? 0} steps
                        </Text>
                        <Text style={styles.profileRank}>
                            {userInfo?.rank !== '-1' ? `Rank: ${userInfo?.rank}` : 'Rank: N/A'}
                        </Text>
                    </View>
                </View>
                <View style={styles.winnerContainer}>
                    <View style={styles.winnerRow}>
                        <Text style={styles.winnerText}>First Place Winner</Text>
                        <View style={styles.row}>
                            <Image
                                source={
                                    firstPlaceUserInfo?.profileImageUrl
                                        ? { uri: firstPlaceUserInfo?.profileImageUrl }
                                        : require('@components/blank-profile-picture.png')
                                }
                                style={styles.winnerPfp}
                            />
                            <Text style={styles.winnerUsername}>{firstPlaceUserInfo?.username || 'None'}</Text>
                        </View>
                    </View>
                    <View style={styles.winnerRow}>
                        <Text style={styles.winnerText}>Median Winner</Text>
                        <View style={styles.row}>
                            <Image
                                source={
                                    medianUserInfo?.profileImageUrl
                                        ? { uri: medianUserInfo?.profileImageUrl }
                                        : require('@components/blank-profile-picture.png')
                                }
                                style={styles.winnerPfp}
                            />
                            <Text style={styles.winnerUsername}>{medianUserInfo?.username || 'None'}</Text>
                        </View>
                    </View>
                    <View style={styles.winnerRow}>
                        <Text style={styles.winnerText}>Referrals Winner</Text>
                        <View style={styles.row}>
                            {referralUserInfo === null ? (
                                <Text style={[styles.winnerUsername, { color: '#ffffffaa' }]}>None</Text>
                            ) : (
                                <>
                                    <Image
                                        source={
                                            referralUserInfo?.profileImageUrl
                                                ? { uri: referralUserInfo?.profileImageUrl }
                                                : require('@components/blank-profile-picture.png')
                                        }
                                        style={styles.winnerPfp}
                                    />
                                    <Text style={styles.winnerUsername}>{referralUserInfo?.username || 'None'}</Text>
                                </>
                            )}
                        </View>
                    </View>
                </View>
                <TouchableOpacity 
                    style={{ marginLeft: 'auto', marginRight: 5, marginTop: -20, }} 
                    onPress={() => setFriendsToggle(!friendsToggle)} 
                    activeOpacity={1}
                >
                    <Image
                        source={require('@assets/icons/friends.png')}
                        style={[styles.friendsImage, friendsToggle && { tintColor: '#7eff77ff' }]}
                    />
                </TouchableOpacity>
                <View style={styles.tabSwitcher}>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                        ]}
                        onPress={() => setSelectedTab('Steps')}
                        activeOpacity={1}
                    >
                        <Text style={[
                            styles.tabButtonText,
                            selectedTab === 'Steps' && styles.tabButtonTextActive
                        ]}>Steps</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                        ]}
                        onPress={() => setSelectedTab('Referrals')}
                        activeOpacity={1}
                    >
                        <Text style={[
                            styles.tabButtonText,
                            selectedTab === 'Referrals' && styles.tabButtonTextActive
                        ]}>Referrals</Text>
                    </TouchableOpacity>
                </View>
                {/* Line for showing selected tab */}
                <View style={[
                    styles.tabUnderline,
                    selectedTab === 'Referrals'
                        ? styles.tabUnderlineRight
                        : styles.tabUnderlineLeft
                ]} />
                <View style={styles.scrollView}>
                    {selectedTab === 'Referrals' && referralResultsWithUserInfo.length === 0 ? (
                        <View>
                            <Text style={{ color: '#fff', fontFamily: 'Lexend', alignSelf: 'center', margin: 10, }}>No referrals in this competition.</Text>
                        </View>
                    ) : (
                        <>
                            {/* Podium for Top 3 */}
                            <View style={styles.podiumRow}>
                                {[1, 0, 2].map((podiumIdx, i) => {
                                    const user = filteredResults[podiumIdx];
                                    if (!user) return <View key={i} style={styles.podiumEmpty} />;
                                    return (
                                        <View key={user?.user_id || i} style={[
                                            styles.podiumUser,
                                            podiumIdx === 0 && styles.podiumUserFirst
                                        ]}>
                                            <Image
                                                source={
                                                    user?.profileImageUrl
                                                        ? { uri: user?.profileImageUrl }
                                                        : require('@components/blank-profile-picture.png')
                                                }
                                                style={[
                                                    styles.podiumImage,
                                                    podiumIdx === 0 && styles.podiumImageFirst
                                                ]}
                                            />
                                            <View style={styles.podiumBadge}>
                                                <Text style={styles.podiumBadgeText}>{user?.rank ?? podiumIdx + 1}</Text>
                                            </View>
                                            <Text style={styles.podiumUsername}>{user?.username?.slice(0, 10) || user?.user_id}</Text>
                                            <Text style={styles.podiumSteps}>
                                                {selectedTab === 'Steps' ? `${user?.steps ?? 0} steps` : `${user?.referral_count ?? 0} referrals`}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                            <View>
                                {filteredResults.slice(3).map((user, idx) => (
                                    <View
                                        key={user.user_id || idx}
                                        style={[
                                            styles.leaderboardRow,
                                            user.user_id === userID && styles.leaderboardRowCurrent
                                        ]}
                                    >
                                        <Text style={[
                                            styles.leaderboardRank,
                                            user.user_id === userID && styles.leaderboardRankCurrent
                                        ]}>{idx + 4}</Text>
                                        <Image
                                            source={
                                                user.profileImageUrl
                                                    ? { uri: user.profileImageUrl }
                                                    : require('@components/blank-profile-picture.png')
                                            }
                                            style={styles.leaderboardAvatar}
                                        />
                                        <Text style={styles.leaderboardUsername}>{user.username?.slice(0, 12) || user.user_id}</Text>
                                        <Text style={[
                                            styles.leaderboardSteps,
                                            user.user_id === userID && styles.leaderboardStepsCurrent
                                        ]}>
                                            {selectedTab === 'Steps' ? `${user?.steps ?? 0} steps` : `${user?.referral_count ?? 0} referrals`}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}
                </View>
                <View style={{ marginTop: 10 }} />
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    header: {
        color: '#fff',
        fontFamily: 'Lexend',
        fontSize: 15,
        marginHorizontal: 5,
        marginTop: -30,
        marginBottom: 10,
    },
    profileRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: '#fff',
        marginTop: 0,
        marginBottom: 10,
    },
    profileInfo: {
        marginLeft: 18,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    profileName: {
        color: '#fff',
        fontFamily: 'Lexend-Bold',
        fontSize: 18,
        textAlign: 'left',
    },
    profileSteps: {
        color: '#BEFFBB',
        fontFamily: 'Lexend-Bold',
        fontSize: 18,
        marginTop: 2,
        textAlign: 'left',
    },
    profileRank: {
        color: '#fff',
        fontFamily: 'Lexend',
        fontSize: 16,
        marginTop: 2,
        textAlign: 'left',
    },
    leaderboardContainer: {
        flex: 1,
        padding: 20,
        width: '100%',
    },
    leaderboardTitle: {
        color: '#fff',
        fontFamily: 'Lexend',
        fontSize: 24,
        marginBottom: 10,
    },
    scrollView: {
        width: '100%',
        backgroundColor: '#00000080',
        borderRadius: 10,
        marginTop: 10,
        maxHeight: '70%',
        padding: 10,
        paddingTop: 25,
    },
    friendsImage: {
        width: 24,
        height: 24,
        tintColor: '#ffffffaa',
    },
    tabSwitcher: {
        flexDirection: 'row',
        backgroundColor: '#65656580',
        borderRadius: 10,
        width: '100%',
        marginTop: 10,
    },
    tabButton: {
        flex: 1,
        padding: 10,
        alignItems: 'center',
        borderRadius: 15,
        borderBottomColor: 'transparent',
        borderBottomWidth: 2,
    },
    tabButtonActive: {
        borderBottomColor: '#74FF6D',
        borderBottomWidth: 2,
    },
    tabButtonText: {
        color: '#fff',
        fontSize: 13,
        fontFamily: 'Lexend',
    },
    tabButtonTextActive: {
        color: '#74FF6D',
    },
    tabUnderline: {
        borderBottomWidth: 1.5,
        borderBottomColor: '#74FF6D',
        width: '47%',
        top: -2,
    },
    tabUnderlineLeft: {
        alignSelf: 'flex-start',
        left: 10,
    },
    tabUnderlineRight: {
        alignSelf: 'flex-end',
        right: 10,
    },
    tabContentContainer: {
        flex: 1,
        backgroundColor: '#65656580',
        borderRadius: 20,
        paddingHorizontal: 10,
        marginTop: 8,
        paddingVertical: 15,
        minHeight: 120,
        // width: '100%',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
    },
    podiumRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        marginBottom: 15,
    },
    podiumEmpty: {
        width: 60,
        height: 60,
    },
    podiumUser: {
        alignItems: 'center',
        marginHorizontal: 12,
        marginTop: 15,
    },
    podiumUserFirst: {
        marginTop: 0,
    },
    podiumImage: {
        width: 45,
        height: 45,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#fff',
    },
    podiumImageFirst: {
        width: 60,
        height: 60,
    },
    podiumBadge: {
        backgroundColor: '#74FF6D',
        borderRadius: 9,
        width: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -10,
    },
    podiumBadgeText: {
        fontFamily: 'Lexend',
        color: '#000',
        fontSize: 10,
    },
    podiumUsername: {
        color: '#fff',
        fontFamily: 'Lexend',
        fontSize: 12,
        marginTop: 2,
    },
    podiumSteps: {
        color: '#BEFFBB',
        fontFamily: 'Lexend-Bold',
        fontSize: 12,
    },
    leaderboardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#00000080',
        borderRadius: 10,
        marginBottom: 5,
        padding: 10,
    },
    leaderboardRowCurrent: {
        backgroundColor: '#4bff6c99',
    },
    leaderboardRank: {
        fontFamily: 'Lexend',
        fontSize: 13,
        color: '#a7a7a7',
        marginRight: 10,
        width: 20,
        textAlign: 'center',
    },
    leaderboardRankCurrent: {
        color: '#fff',
    },
    leaderboardAvatar: {
        width: 26,
        height: 26,
        borderRadius: 15,
        marginRight: 10,
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    leaderboardUsername: {
        fontFamily: 'Lexend',
        fontSize: 13,
        color: '#fff',
        flex: 1,
    },
    leaderboardSteps: {
        fontFamily: 'Lexend-Bold',
        fontSize: 13,
        color: '#BEFFBB',
    },
    leaderboardStepsCurrent: {
        color: '#fff',
    },
    winnerContainer: {

    },
    winnerRow: {

    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
        marginBottom: 15,
        marginLeft: 10,
    },
    winnerText: {
        fontFamily: 'Lexend',
        fontSize: 15,
        color: '#fff',
    },
    winnerPfp: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    winnerUsername: {
        fontFamily: 'Lexend',
        fontSize: 13,
        color: '#fff',
    }
});

export default ResultsModal;