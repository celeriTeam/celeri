import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Keyboard, TouchableWithoutFeedback, Modal, Dimensions, ScrollView, StyleProp, ViewStyle, KeyboardAvoidingView } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useUser } from '../../../../UserProvider';
import { addToFinishedBetting, addToFinishedRecap, addToFinishedTutorial, createBet, getUnbetDuels } from '@/backend/src/bets';
import BetRecapPage from './Recap';
import WeeklyBetRecapPage from './WeeklyRecap';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getGroupIsFirstDay, getTodaysBetTokens, getUserTokens, setTodaysBetTokens } from '@/backend/src/groups';
import { LinearGradient } from 'expo-linear-gradient';
import { match } from 'assert';
import { getLastWeekSteps, getWeeklyDuelsWon } from '@/backend/src/users';
import { useTabBar } from '../../../../../hooks/useTabBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-size-scaling';
import NewHeadToHeadTutorial from './tutorials/NewHeadToHeadTutorial';


const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const WelcomePage: React.FC = () => {
    const { userID, groups, loading } = useUser();
    const router = useRouter();
    const { groupIDTemp } = useLocalSearchParams();
    const groupID = groupIDTemp ? String(groupIDTemp) : '';
    const [currentPage, setCurrentPage] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const [currentGroupUsersArray, setCurrentGroupUsersArray] = useState<{ id: string; username: string | undefined; pfp: string | undefined; name: string | undefined; }[]>([]);
    const [startingTokens, setStartingTokens] = useState<number | undefined>(0);
    const [userFinishedTutorial, setUserFinishedTutorial] = useState<boolean | undefined>(false);
    
    useEffect(() => {    
        const initialize = async () => {
            try {
                fetchData(userID);
            } catch (error) {
                console.error('Error fetching user groups:', error);
            }
        };
    
        initialize();
    }, [userID]);

    const fetchData = (uid: string) => {
        // for user in groups[groupID].users, get username, pfp, and name and add to currentgroupusersarray:
        
        let groupUsersArray: { id: string; username: string | undefined; pfp: string | undefined; name: string | undefined; }[] = [];
        if (!groups[groupID] || !groups[groupID].users) {
            console.log('Group or users data not available yet');
            return;
        }
        
        // Method 1: Use userList if available
        if (groups[groupID].userList) {
            groups[groupID].userList.forEach((userId: string) => {
                const user = groups[groupID].users[userId];
                if (user && userId !== uid) {
                    groupUsersArray.push({ 
                        id: userId, 
                        username: user.username, 
                        pfp: user.profilePic, // Note: it's profilePic in your context, not pfp
                        name: user.name 
                    });
                }
            });
        } 
        setCurrentGroupUsersArray(groupUsersArray);
        setStartingTokens(groups[groupID]?.startingTokens);
        setUserFinishedTutorial(groups[groupID]?.userFinishedTutorial);
    }

    const handleScroll = (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const page = Math.round(offsetX / width);
        setCurrentPage(page);
    };

    const skipTutorial = async () => {
        // Handle skip tutorial logic here
        addToFinishedTutorial(groupID, userID);
        setTimeout(() => {
            router.replace({
                pathname: '/(authenticated)/(tabs)/home/bets/NewHeadToHead',
                params: { groupIDTemp, showTutorialTemp: 'false' },
            });
        }, 0);
    };

    const handleNext = () => {
        router.replace({
            pathname: '/(authenticated)/(tabs)/home/bets/NewHeadToHead',
            params: { groupIDTemp, showTutorialTemp: 'true' },
        });
    }

    return (
        <LinearGradient
            colors={['#000000', '#024405']}
            style={{
                flex: 1,
                width: '100%',
            }}
        >
            <SafeAreaView style={styles.safeView} edges={['top']}>
                <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    style={styles.scrollView}
                >
                    {/* page 1 */}
                    <View style={styles.page}>
                        <View style={styles.content}>
                            <Text style={styles.title}>Welcome to Celeri!</Text>
                            <Text style={styles.text}>Here's a quick tutorial to help you get started.</Text>
                        </View>
                    </View>

                    {/* Page 2 */}
                    <View style={styles.page}>
                        <View style={styles.content}>
                            <Text style={styles.text}>The goal of the game is to <Text style={styles.highlight}>win the most tokens. </Text>
                                Every player starts with {startingTokens} tokens, and you can only gain tokens by
                                <Text style={styles.highlight}> stealing them from other players.</Text>
                            </Text>
                            <Text style={styles.text}>These may have been your friends, but right now, they are your <Text style={styles.highlight}>enemies.</Text></Text>

                            <ScrollView style={styles.scrollContainer}>
                                {currentGroupUsersArray ? (
                                    currentGroupUsersArray.map((user) => (
                                        <View key={user.id} style={styles.memberItem}>
                                            <View style={styles.row}>
                                                <Image
                                                    source={
                                                        user.pfp ? 
                                                        { uri: user?.pfp }
                                                        : require('@components/blank-profile-picture.png')
                                                    }
                                                    style={styles.profilePic}
                                                />
                                                <Text style={styles.memberName}>{user?.name}</Text>
                                            </View>
                                            <Text style={styles.memberUserName}>@{user?.username}</Text>
                                        </View>
                                    ))
                                ) : ( 
                                    <Text>No users found.</Text>
                                )}
                                <View style={{ height: 20 }} />
                            </ScrollView>
                        </View>
                    </View>

                    {/* Page 3 */}
                    <View style={styles.page}>
                        <View style={styles.content}>
                            <Text style={styles.text}>There are three ways to gain tokens:</Text>
                                <Text style={styles.highlight}>1. Head-to-head bets</Text>
                                <Text style={styles.highlight}>2. Daily prop bets</Text>
                                <Text style={styles.highlight}>3. Weekly races</Text>
                            <Text style={[styles.text, { marginTop: 10, }]}>Now we'll walk you through each one.</Text>

                            <TouchableOpacity style={styles.button} onPress={handleNext}>
                                <Text style={styles.buttonText}>Let's go!</Text>
                                <Image
                                    source={require('@assets/icons/rightArrow.png')}
                                    style={{ width: 18, height: 18, marginLeft: 20, tintColor: '#74FF6D', }}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>

                {/* Pagination Indicators */}
                <View style={styles.pagination}>
                    {[0, 1, 2].map(index => (
                        <View
                            key={index}
                            style={[
                                styles.paginationDot,
                                currentPage === index ? styles.paginationDotActive : {}
                            ]}
                        />
                    ))}
                </View>

                {/* Skip Tutorial Button */}
                {userFinishedTutorial && (
                    <TouchableOpacity style={styles.skipButton} onPress={skipTutorial}>
                        <Text style={styles.skipText}>Skip Tutorial</Text>
                    </TouchableOpacity>
                )}
                <View style={{ height: 50 }} />
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    safeView: {
        flex: 1,
    },
    container: {
        flex: 1,
        position: 'relative',
    },
    scrollView: {
        flex: 1,
        width: width,
    },
    page: {
        width: width,
        alignItems: 'center',
    },
    content: {
        flex: 1,
        width: '100%',
        justifyContent: 'flex-end',
        marginBottom: 70,
        paddingHorizontal: 20,
        paddingRight: 45,
    },
    title: {
        fontSize: 30,
        fontFamily: 'Lexend',
        color: '#fff',
        marginBottom: 20,
    },
    highlight: {
        fontSize: 15,
        fontFamily: 'Lexend',
        color: '#74FF6D', // Light green color for highlighted text
    },
    text: {
        fontSize: 15,
        fontFamily: 'Lexend',
        color: '#fff',
        marginBottom: 15,
    },
    scrollContainer: {
        maxHeight: '48%',
        padding: 10,
        borderRadius: 10,
        backgroundColor: '#5BE35C32',
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10,
        paddingHorizontal: 20,
        backgroundColor: '#00000080',
        marginVertical: 3,
        borderRadius: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profilePic: {
        width: 26,
        height: 26,
        borderRadius: 20,
        borderColor: '#fff',
        borderWidth: 1,
    },
    memberName: {
        fontFamily: "Lexend",
        fontSize: 12,
        color: '#fff',
        marginLeft: 10,
    },
    memberUserName: {
        fontFamily: "Lexend",
        fontSize: 12,
        color: '#74FF6D',
    },
    button: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#74FF6D',
        paddingVertical: 6,
        paddingLeft: 30,
        paddingRight: 15,
        borderRadius: 35,
        marginTop: 30,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonText: {
        color: '#74FF6D',
        fontSize: 20,
        fontFamily: 'Lexend',
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
    },
    paginationDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderColor: '#fff',
        borderWidth: 1,
        backgroundColor: 'transparent',
        marginHorizontal: 3,
    },
    paginationDotActive: {
        backgroundColor: '#fff',
    },
    skipButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#fff',
        borderRadius: 20,
        alignSelf: 'center',
        paddingVertical: 4,
        paddingHorizontal: 23,
    },
    skipText: {
        fontFamily: "Lexend",
        color: '#fff',
        textAlign: 'center',
    },
});

export default WelcomePage;