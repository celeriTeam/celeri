import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView } from 'react-native';

import { View, Text, TouchableOpacity, Button, ActivityIndicator, TouchableHighlight, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { addToFinishedPropBet } from '@/backend/src/bets';
import { addPropBet } from '@/backend/src/groups';
import { StyleSheet } from 'react-native-size-scaling';
import { useUser } from '@/app/UserProvider';

const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

type News = {
    type: string;
    username: string;
    pfp: string;
    opponentUsername: string | undefined;
    opponentPfp: string | undefined;
    record: number | undefined;
    place: number | undefined;
    steps: number | undefined;
    betters: string[] | undefined;
    nonBetters: string[] | undefined;
};

const NewsPage: React.FC< { 
    groupID: string,
    userID: string,
    newsList: News[],
    setNewsModalVisible: (visible: boolean) => void;
    setPropBetModalVisible: (visible: boolean) => void;
} > = ({ groupID, userID, newsList, setNewsModalVisible, setPropBetModalVisible }) => {
    const { groups } = useUser();

    const handleClose = () => {
        setNewsModalVisible(false);
        const timer = setTimeout(() => {
            setPropBetModalVisible(true);
        }, 100);
        return () => clearTimeout(timer);
    };

    return (
        <View style={styles.container}>
            {/* <GestureHandlerRootView style={{ flex: 1, width: '100%', marginBottom: 70, }}> */}
                <ScrollView style={styles.newsContainer}>
                    {newsList.map((news: News) => (
                        <View style={styles.newsItem}>
                            <View style={styles.row}>
                                {news.type === 'recordSetter' && (
                                    <>
                                        <Image
                                            source={{ uri: news.pfp }}
                                            style={styles.pfp}
                                        />
                                        <Text style={styles.username}>{news.username}</Text>
                                        <Text style={styles.text}> set a record of </Text>
                                        <Text style={styles.misc}>{news.record}</Text>
                                    </>
                                )}
                                {news.type === 'racePullAheadTopThree' && (
                                    <>
                                        <Image
                                            source={{ uri: news.pfp }}
                                            style={styles.pfp}
                                        />
                                        <Text style={styles.username}>{news.username}</Text>
                                        <Text style={styles.text}> rose up to </Text>
                                        <Text style={styles.misc}>{news.place}</Text>
                                        <Text style={styles.text}> place</Text>
                                    </>
                                )}
                                {news.type === 'headToHeadPullAhead' && (
                                    <>
                                        {(groups[groupID]?.users[userID]?.username === news.username && groups[groupID]?.users[userID]?.opponentUsername === news.opponentUsername) ? (
                                            <>
                                                {groups[groupID]?.users[userID]?.username === news.username ? (
                                                    <Text style={styles.text}>You</Text>
                                                ) : (
                                                    <>
                                                        <Image
                                                            source={{ uri: news.pfp }}
                                                            style={styles.pfp}
                                                        />
                                                        <Text style={styles.username}>{news.username}</Text>
                                                    </>
                                                )}
                                                <Text style={styles.text}> surpassed </Text>
                                                {groups[groupID]?.users[userID]?.username === news.username ? (
                                                    <>
                                                        <Image
                                                            source={{ uri: news.opponentPfp }}
                                                            style={styles.pfp}
                                                        />
                                                        <Text style={styles.username}>{news.opponentUsername}</Text>
                                                    </>
                                                ) : (
                                                    <Text style={styles.text}>you</Text>
                                                )}
                                                <Text style={styles.text}> in your head to head</Text>
                                            </>
                                        ) : (
                                            <>
                                                <Image
                                                    source={{ uri: news.pfp }}
                                                    style={styles.pfp}
                                                />
                                                <Text style={styles.username}>{news.username}</Text>
                                                <Text style={styles.text}> just surpassed </Text>
                                                <Image
                                                    source={{ uri: news.opponentPfp }}
                                                    style={styles.pfp}
                                                />
                                                <Text style={styles.username}>{news.opponentUsername}</Text>
                                                <Text style={styles.text}> in your head to head.</Text>
                                                {news.betters?.includes(userID) && (
                                                    <Text style={styles.text}> Give your friend a cookie</Text>
                                                )}
                                                {news.nonBetters?.includes(userID) && (
                                                    <Text style={styles.text}> Tell your friend to keep on walkin</Text>
                                                )}
                                            </>
                                        ) }
                                    </>
                                )}
                                {news.type === 'headToHeadPullAhead' && groups[groupID]?.users[userID]?.username === news.username && (
                                    <>
                                        <Text style={styles.text}>You surpassed </Text>
                                        <Image
                                            source={{ uri: news.opponentPfp }}
                                            style={styles.pfp}
                                        />
                                        <Text style={styles.username}>{news.opponentUsername}</Text>
                                        <Text style={styles.text}> in your head to head</Text>
                                    </>
                                )}
                                {news.type === 'headToHeadPullAhead' && groups[groupID]?.users[userID]?.username === news.opponentUsername && (
                                    <>
                                        <Image
                                            source={{ uri: news.pfp }}
                                            style={styles.pfp}
                                        />
                                        <Text style={styles.username}>{news.username}</Text>
                                        <Text style={styles.text}> just surpassed you in your head to head</Text>
                                    </>
                                )}
                                {news.type === 'headToHeadPullAhead' && news.betters?.includes(userID) && (
                                    <>
                                        <Image
                                            source={{ uri: news.pfp }}
                                            style={styles.pfp}
                                        />
                                        <Text style={styles.username}>{news.username}</Text>
                                        <Text style={styles.text}> just surpassed </Text>
                                        <Image
                                            source={{ uri: news.opponentPfp }}
                                            style={styles.pfp}
                                        />
                                        <Text style={styles.username}>{news.opponentUsername}</Text>
                                        <Text style={styles.text}> in your head to head. Give your friend a cookie</Text>
                                    </>
                                )}
                                {news.type === 'headToHeadPullAhead' && news.nonBetters?.includes(userID) && (
                                    <>
                                    <Image
                                        source={{ uri: news.pfp }}
                                        style={styles.pfp}
                                    />
                                    <Text style={styles.username}>{news.username}</Text>
                                    <Text style={styles.text}> just surpassed </Text>
                                    <Image
                                        source={{ uri: news.opponentPfp }}
                                        style={styles.pfp}
                                    />
                                    <Text style={styles.username}>{news.opponentUsername}</Text>
                                    <Text style={styles.text}> in your head to head. Tell your friend to keep on walkin</Text>
                                    </>
                                )}
                                {news.type === 'racePullAheadOfYou' && (
                                    <>
                                        <Image
                                            source={{ uri: news.pfp }}
                                            style={styles.pfp}
                                        />
                                        <Text style={styles.username}>{news.username}</Text>
                                        <Text style={styles.text}> pulled ahead of you</Text>
                                    </>
                                )}
                                {news.type === 'headToHeadOpponentWalking' && groups[groupID]?.users[userID]?.username !== news.username && (
                                    <>
                                        {groups[groupID]?.users[userID]?.username !== news.opponentUsername && (<Text style={styles.text}>Your head to head opponent </Text>)}
                                        <Image
                                            source={{ uri: news.pfp }}
                                            style={styles.pfp}
                                        />
                                        <Text style={styles.username}>{news.username}</Text>
                                        <Text style={styles.text}> walked </Text>
                                        <Text style={styles.misc}>{news.steps}</Text>
                                        <Text style={styles.text}> within a 5 hour window</Text>
                                    </>
                                )}
                            </View>
                        </View>
                    ))}
                </ScrollView>
            {/* </GestureHandlerRootView> */}
            <TouchableOpacity onPress={handleClose}>
                <Text>Close</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 30,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    newsContainer: {
        padding: 10,
        borderRadius: 10,
        backgroundColor: '#5BE35C32',
    },
    newsItem: {
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
    pfp: {
        width: 26,
        height: 26,
        borderRadius: 20,
        borderColor: '#fff',
        borderWidth: 1,
    },
    username: {
        fontFamily: "Lexend",
        fontSize: 13,
        color: '#74FF6D',
    },
    text: {
        fontFamily: "Lexend",
        fontSize: 12,
        color: '#fff',
    },
    misc: {
        fontFamily: "Lexend",
        fontSize: 12,
        color: '#74FF6D',
    },
});

export default NewsPage;