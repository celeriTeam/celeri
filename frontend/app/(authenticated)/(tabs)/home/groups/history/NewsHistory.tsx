import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useUser } from '@/app/UserProvider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native-size-scaling';
import { getNewsSummary } from '@/backend/src/groups'; // Assume this function exists
import { formatDistanceToNow } from 'date-fns'; // For relative time formatting

const NewsHistoryPage: React.FC = () => {
    const { userID, groups, loading } = useUser();
    const { groupIDTemp } = useLocalSearchParams();
    const groupID = groupIDTemp ? String(groupIDTemp) : '';
    const [newsHistory, setNewsHistory] = useState<{ date: string; news: NewsItem[] }[]>([]);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loadedDates, setLoadedDates] = useState<Date[]>([]);
    const [currentTargetDate, setCurrentTargetDate] = useState<Date>(new Date());
    const [hasMore, setHasMore] = useState(true);
    const [seenNewsKeys, setSeenNewsKeys] = useState<Set<string>>(new Set());

    const router = useRouter();
    const screenWidth = Dimensions.get('window').width;

    interface NewsItem {
        id: string;
        type: string;
        userID: string;
        username: string;
        profilePic: string;
        createdAt: string;
        content: string;
    }

    useEffect(() => {
        loadMoreNews();
    }, [groupID, groups]);

    const loadMoreNews = async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const { news, nextTargetDate } = await getNewsSummary(groupID, currentTargetDate);

            // if nexttargetdate < gamestartedat, set hasmore to false
            if (nextTargetDate < new Date(groups[groupID]?.gameStartedAt?.toDate())) {
                setHasMore(false);
            }
        
            if (news && news.length > 0) {
                const groupedNews = groupNewsByDate(news);
                setNewsHistory(prev => [...prev, ...groupedNews]);
                setLoadedDates(prev => [...prev, currentTargetDate]);
            }
            setCurrentTargetDate(nextTargetDate);
            
        } catch (error) {
            console.error('Error loading news:', error);
            setHasMore(false);
        }
        setLoadingMore(false);
    };

    const groupNewsByDate = (news: NewsItem[]) => {
        const grouped = news.reduce((acc, item) => {
            const date = new Date(item.createdAt).toDateString();
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(item);
            return acc;
        }, {} as Record<string, NewsItem[]>);

        return Object.entries(grouped).map(([date, items]) => ({
            date,
            news: items,
        }));
    };

    const getRelativeDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        if (date.toDateString() === now.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === new Date(now.setDate(now.getDate() - 1)).toDateString()) {
            return 'Yesterday';
        } else {
            return formatDistanceToNow(date, { addSuffix: true });
        }
    };

    const renderNewsItem = ({ item }: { item: NewsItem }) => (
        <View style={[styles.newsItem, { width: screenWidth * 0.9 }]}>
            <View style={styles.newsHeader}>
                <Image source={{ uri: item.profilePic }} style={styles.profileImage} />
                <View style={styles.newsInfo}>
                    <Text style={styles.username}>{item.username}</Text>
                    <Text style={styles.newsType}>{item.content}</Text>
                </View>
                <Text style={styles.newsTime}>
                {new Date(item.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</Text>
            </View>
            {/* <Text style={styles.newsContent}>{item.content}</Text> */}
        </View>
    );

    const renderNewsGroup = ({ item }: { item: { date: string; news: NewsItem[] } }) => (
        <View>
            <Text style={styles.dateHeader}>{getRelativeDate(item.date)}</Text>
            {item.news.map(newsItem => renderNewsItem({ item: newsItem }))}
        </View>
    );

    if (loading) {
        return (
            <LinearGradient colors={['#000000', '#024405']} style={{ flex: 1, width: '100%' }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" />
                    <Text style={{ color: '#fff' }}>Loading...</Text>
                </View>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={['#000000', '#024405']} style={{ flex: 1, width: '100%' }}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.container}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Image source={require('@assets/icons/back.png')} style={styles.backImage} />
                    </TouchableOpacity>
                    <Text style={styles.title}>News Feed</Text>
                    <FlatList
                        data={newsHistory}
                        keyExtractor={(item) => item.date}
                        renderItem={renderNewsGroup}
                        onEndReached={loadMoreNews}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={loadingMore ? <ActivityIndicator /> : null}
                        showsVerticalScrollIndicator={false}
                    />
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: '100%',
    },
    spacer: {
        flex: 1,
        marginRight: 10,
    },
    gainCountContainer: {
        width: 30,
        alignItems: 'flex-end',
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
    backButton: {
        position: 'absolute',
        top: 10,
        left: 16,
    },
    backImage: {
        width: 19,
        height: 19,
    },
    title: {
        textAlign: "center",
        fontSize: 30,
        fontWeight: "200",
        fontFamily: 'Lexend',
        color: '#fff',
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
    racesFlatList: {
        marginTop: 10,
    },
    racesContainer: {
        backgroundColor: '#5BE35C32',
        borderRadius: 15,
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
        color: '#74FF6D',
        fontSize: 11,
    },
    lostGainEarningsText: {
        fontFamily: "Lexend",
        color: '#FF6060',
        fontSize: 11,
    },
    zeroGainEarningsText: {
        fontFamily: "Lexend",
        color: '#fff',
        fontSize: 11,
    },
    stepCountText: {
        fontFamily: "Lexend",
        color: '#fff',
        fontSize: 11,
        paddingRight: 15,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
        backgroundColor: '#00000080',
        borderRadius: 10,
        padding: 10,
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
        width: 26,
        height: 26,
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
        fontFamily: "Lexend",
        fontSize: 11,
        color: '#fff',
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
        color: '#fff',
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
    emptyText: { fontSize: 18, color: 'gray', fontFamily: 'Lexend' },
    newsItem: {
        backgroundColor: '#5BE35C32',
        borderRadius: 15,
        padding: 10,
        marginBottom: 10,
    },
    newsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    newsInfo: {
        flex: 1,
    },
    username: {
        color: '#fff',
        fontWeight: 'bold',
    },
    newsType: {
        color: '#ccc',
        fontSize: 12,
    },
    newsTime: {
        color: '#ccc',
        fontSize: 12,
    },
    newsContent: {
        color: '#fff',
    },
    dateHeader: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginVertical: 10,
    },
});

export default NewsHistoryPage;