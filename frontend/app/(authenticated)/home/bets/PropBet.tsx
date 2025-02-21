import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView } from 'react-native';

import { View, Text, TouchableOpacity, Button, ActivityIndicator, TouchableHighlight, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { addToFinishedPropBet } from '@/backend/src/bets';
import { addPropBet } from '@/backend/src/groups';
import { StyleSheet } from 'react-native-size-scaling';

const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

type propBetPlayer = {
    id: string;
    name: string;
    averageStepCount: number;
}[];

type currentPropBet = {
    betOnUserID: string;
    averageStepCount: number;
    overUnder: string;
} | undefined;

type selectedPropBet = "over" | "under" | null;

const PropBetPage: React.FC< { 
    groupID: string,
    userID: string,
    propBetPlayer: propBetPlayer,
    finishedPropBet: boolean,
    currentPropBet: currentPropBet,
    overUnder: (overUnder: selectedPropBet) => void;
    setFinishedPropBet: (isFinished: boolean) => void;
    setPropBetModalVisible: (visible: boolean) => void;
} > = ({ groupID, userID, propBetPlayer, finishedPropBet, currentPropBet, overUnder, setFinishedPropBet, setPropBetModalVisible }) => {
    const [selectedPropBet, setSelectedPropBet] = useState<selectedPropBet>(null);
    const isCurrentOver = currentPropBet?.overUnder === 'over';

    return (
        <View style={styles.container}>
            {finishedPropBet ? (
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: verticalScale(20), }}>
                    <Image
                        source={require('@assets/icons/checkmark.png')}
                        style={{ width: 29, height: 29 }}
                    />
                    <Text style={styles.title}>Submitted</Text>
                </View>
            ) : (
                <>
                    <Text style={styles.title}>Today's Prop Bet</Text>
                    <Text style={styles.text}>How many steps will the following player{'\n'} walk today? If you win the prop bet,{'\n'} you'll earn 
                        <Text style={{ color: '#74FF6D' }}> +1 </Text>
                        <Image
                            source={require('@assets/icons/diamonds.png')}
                            style={{ width: 14, height: 11 }}
                        />
                    </Text>
                </>
            )}
            {propBetPlayer.map(player => (
                <View>
                    <Text key={player.id} style={styles.name}>{player.name}</Text>
                    {finishedPropBet ? (
                        <View>
                            <Text style={styles.submittedText}>You've entered:</Text>
                            <View style={styles.overUnderContainer}>
                                <Text style={styles.overUnderSteps}>
                                    <Text style={styles.overUnderText}>{isCurrentOver ? 'Over' : 'Under'} </Text>
                                    {currentPropBet?.averageStepCount}
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <View>
                            <View style={styles.overUnderButtons}
                            >
                                <TouchableOpacity
                                    style={selectedPropBet === 'over' ? styles.overUnderButtonTouched : styles.overUnderButtonTouchable}
                                    onPress={() => setSelectedPropBet('over')}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.overUnderChooseText}><Text style={{ color: "#74FF6D" }}>Over</Text> {(player.averageStepCount < 100) ? 100 : player.averageStepCount}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={selectedPropBet === 'under' ? styles.overUnderButtonTouched : styles.overUnderButtonTouchable}
                                    onPress={() => setSelectedPropBet('under')}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.overUnderChooseText}><Text style={{ color: "#74FF6D" }}>Under</Text> {(player.averageStepCount < 100) ? 100 : player.averageStepCount}</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                style={[styles.submitButton, { backgroundColor: selectedPropBet === null ? "#656565" : "#fff", }]}
                                onPress={() => {
                                    addToFinishedPropBet(groupID, userID);
                                    addPropBet(groupID, userID, player.id, (player.averageStepCount < 100) ? 100 : player.averageStepCount, selectedPropBet === 'over' ? 'over' : 'under');
                                    overUnder(selectedPropBet);
                                    setFinishedPropBet(true);
                                    setPropBetModalVisible(false);
                                    const timer = setTimeout(() => {
                                        setPropBetModalVisible(true);
                                    }, 100);
                                    return () => clearTimeout(timer);
                                }}
                                disabled={selectedPropBet === null}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.submitButtonText, { color: selectedPropBet === null ? '#fff' : '#000', }]}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            ))}
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
    title: {
        fontFamily: "Lexend",
        color: '#fff',
        fontSize: 22,
        textAlign: 'center',
        margin: 10,
    },
    text: {
        alignItems: 'center',
        fontFamily: "Lexend",
        color: '#fff',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 15
    },
    name: {
        fontFamily: "Lexend",
        color: '#74FF6D',
        fontSize: 19,
        textAlign: 'center',
        margin: 15,
    },
    submittedText: {
        fontFamily: "Lexend",
        color: '#fff',
        textAlign: 'center',
        marginTop: 20
    },
    overUnderContainer: {
        padding: 10,
        paddingHorizontal: 25,
        borderRadius: 25,
        alignSelf: 'center',
        marginTop: 10,
        backgroundColor: "#4BFF6C96",
    },
    overUnderSteps: {
        fontFamily: "Lexend",
        color: '#fff',
        fontSize: 14
    },
    overUnderText: {
        fontFamily: "Lexend-bold",
        textAlign: 'center'
    },
    overUnderChooseText: { 
        fontFamily: "Lexend", 
        fontSize: 15, 
        color: '#fff', 
        paddingHorizontal: 15, 
    },
    overUnderButtons: {
        marginTop: 20, 
        flexDirection: 'row',
        justifyContent: 'center',
        width: '70%',
        alignSelf: 'center',
        gap: 30,
    },
    overUnderButtonTouchable: {
        padding: 10, 
        borderRadius: 25, 
        borderColor: '#fff',
        borderWidth: 1,
    },
    overUnderButtonTouched: {
        padding: 10, 
        borderRadius: 25, 
        // borderColor: '#fff',
        // borderWidth: 1,
        backgroundColor: '#4BFF6C96',
    },
    submitButton: {
        padding: 10, 
        borderRadius: 25, 
        paddingHorizontal: 25, 
        marginTop: 15, 
        alignSelf: 'center',
    },
    submitButtonText: {
        fontFamily: "Lexend",
        fontSize: 15,
    }
});

export default PropBetPage;