import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, StyleSheet as RNStyleSheet, Pressable, Keyboard, Text, TouchableOpacity, Alert, Button, ActivityIndicator, Modal, TouchableWithoutFeedback, ScrollView, Dimensions, Touchable, } from 'react-native';
import { app } from "@firebaseConfig";
import { getFirestore, doc, collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { getGroupCode, getGroupName, getUsersInGroup, startGame, getGroupCreator, generateGroupCode, createGroup, addUserToGroup, addGroupImage, deleteGroup, leaveGroup, getGroupIsGameActive, getGroupProfilePic } from '@backend/src/groups';
import { getUserName, getProfilePic, addGroupToUser, getAverageSteps, getBiweeklySteps, getWeeklySteps, getSteps, getName } from '@backend/src/users';
import { useUser } from '../../../UserProvider';
import firestore, { FieldValue } from '@react-native-firebase/firestore';
import { createNudge } from '@/backend/src/notifs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-size-scaling';
import { LinearGradient } from 'expo-linear-gradient';

  
const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;

const GameSettings: React.FC = () => {
    const [chosenAnswer, setChosenAnswer] = useState<string[]>([]);
    const [questionIndex, setCurrentMatchupIndex] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const router = useRouter();
    const { groupID, userCount } = useLocalSearchParams();
    const resolvedGroupID = groupID as string; 
    const resolvedUserCount = +(userCount as string);

    const oneCycleRounds = resolvedUserCount - 1;
    const twoCycleRounds = (resolvedUserCount - 1) * 2


    const [questions, setQuestions] = useState([
        {
          id: 0,
          text: "How often do you want group-wide bets?",
          options: [
            { label: "Twice a week", answer: "biweekly", description: "Faster paced games, more bets." },
            { label: "Once a week", answer: "weekly", description: "Slower paced game, less bets." }
          ]
        },
        {
          id: 1,
          text: "How many tokens should each user start with?",
          options: [
            { label: "1000", answer: "1000", description: "Conservative betting, play it safe!" },
            { label: "2000", answer: "2000", description: "A fair amount of tokens." },
            { label: "5000", answer: "5000", description: "Go big or go home!" }
          ]
        },
        {
            id: 2,
            text: "How many cycles do you want your game to have?",
            options: [
              { label: "One cycle", answer: "1", description: "" },
              { label: "Two cycles", answer: "2", description: "" }
            ]
          },
        // Add more questions here
    ]);
    

    const screenWidth = Dimensions.get('window').width;

    // Guidelines based on my test device (iPhone 16):
    const guidelineBaseWidth = 393;   // 1179 / 3
    const guidelineBaseHeight = 852;  // 2556 / 3

    // Scale functions to calculate sizes proportionate to the device dimensions
    const scale = (size: number) => (width / guidelineBaseWidth) * size;
    const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
    const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;


    const scrollViewRef = useRef<ScrollView>(null);


    const handleScroll = (event: any) => {
        const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
        setCurrentMatchupIndex(newIndex);
    };

    const scrollToIndex = (index: number) => {
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ x: index * screenWidth, animated: true });
        }
        setCurrentMatchupIndex(index);
    };

    const updateChosenAnswer = (index: number, answer: string) => {
        setChosenAnswer((prev) => {
            const newArray = [...prev];
            newArray[index] = answer;
            return newArray;
        });

        // Dynamically update the description of Question 2 based on Question 0
        if (index === 0) {
            const isBiweekly = answer === "biweekly";
            const roundsTextOne = isBiweekly
            ? `The game will last ${Math.ceil(oneCycleRounds / 2)} weeks long, with a total of ${oneCycleRounds} rounds.`
            : `The game will last ${oneCycleRounds} weeks long, with a total of ${oneCycleRounds} rounds.`;

            const roundsTextTwo = isBiweekly
            ? `The game will last ${Math.ceil(twoCycleRounds / 2)} weeks long, with a total of ${twoCycleRounds} rounds.`
            : `The game will last ${twoCycleRounds} weeks long, with a total of ${twoCycleRounds} rounds.`;


            setQuestions((prevQuestions) => {
            const updatedQuestions = [...prevQuestions];
            const originalOptionOne = updatedQuestions[2].options[0];
            const originalOptionTwo = updatedQuestions[2].options[1];
            updatedQuestions[2].options[0] = {
                ...originalOptionOne,
                description: `Each player will have a head-to-head matchup with every other player exactly once. ${roundsTextOne}`
            };
            updatedQuestions[2].options[1] = {
                ...originalOptionTwo,
                description: `Each player will have a head-to-head matchup with every other player exactly twice. ${roundsTextTwo}`
            };
            return updatedQuestions;
            });
        }

        // Automatically scroll to the next question if it's not the last one
        if (index < questions.length - 1) {
            setTimeout(() => {
                scrollToIndex(index + 1);
            }, 300); // slight delay to let the button press feel smooth
        }
    };

    const handleStartPress = async (cycles: string, startingTokens: string, gameType: string) => {
        console.log('Start game button pressed');
        if (isSubmitting) return; // prevent double-clicks
        setIsSubmitting(true);

        const resetDay = new Date().getDay();
        await startGame(resolvedGroupID, +cycles, +startingTokens, gameType, resetDay);

        router.back();
        setTimeout(() => {
            router.replace({
                pathname: '/(authenticated)/home/bets/Welcome',
                params: { groupIDTemp: resolvedGroupID },
            });
        }, 10);
    };


    return (
        <LinearGradient
            colors={['#000000', '#024405']}
            style={{
                flex: 1,
                width: '100%',
            }}
        >
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity style={{ position: 'absolute', left: 0, padding: 16 }} onPress={() => router.back()}>
                            <Image
                                source={require('@assets/icons/back.png')}
                                style={styles.backImage}
                            />
                        </TouchableOpacity>
                        <View style={styles.titleContainer}>
                            <Text style={styles.titleText}>Game Settings</Text>
                        </View>
                    </View>

                    <ScrollView
                        ref={scrollViewRef}
                        horizontal
                        pagingEnabled
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        showsHorizontalScrollIndicator={false}
                    >
                        {questions.map((q, index) => (
                            <View key={q.id} style={{ width, paddingHorizontal: 20 }}>
                                <Text style={styles.question}>{q.text}</Text>
                                <View style={styles.dividingLine} />

                                {q.options.map((option) => (
                                    <TouchableOpacity
                                        key={option.label}
                                        onPress={() => updateChosenAnswer(index, option.answer)}
                                        activeOpacity={1}
                                    >
                                        <LinearGradient
                                            colors={chosenAnswer[index] === option.answer ? ['#fff', '#fff'] : ['#5BE35C', '#14B582']}
                                            style={{
                                                marginVertical: 10,
                                                borderRadius: 20,
                                                padding: 20,
                                                alignItems: 'center', // Center text
                                            }}
                                        >
                                            <Text
                                                style={{
                                                color: chosenAnswer[index] === option.answer ? '#000' : '#fff',
                                                textAlign: 'center',
                                                fontFamily: 'Lexend-bold',
                                                fontSize: 20
                                                }}
                                            >
                                                {option.label}
                                            </Text>

                                            {/* Description Below Choice */}
                                            <Text
                                                style={{
                                                color: chosenAnswer[index] === option.answer ? '#000' : '#fff',
                                                textAlign: 'center',
                                                fontFamily: 'Lexend',
                                                fontSize: 12,
                                                paddingTop: 5,
                                                }}
                                            >
                                                {option.description}
                                            </Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                    
                                ))}
                            </View>
                        ))}
                    </ScrollView>

                    {/* Dots for completion indication */}
                    <View style={styles.dotRow}>
                    {questions.map((_, index) => (
                        <TouchableOpacity
                        key={index}
                        style={{
                            width: scale(10),
                            height: scale(10),
                            borderRadius: moderateScale(5),
                            borderColor: questionIndex === index ? '#74FF6D' : '#fff',
                            borderWidth: 1,
                            backgroundColor: chosenAnswer[index] ? '#fff' : 'transparent',
                            marginHorizontal: scale(3),
                        }}
                        onPress={() => scrollToIndex(index)}
                        activeOpacity={1}
                        />
                    ))}
                    </View>

                    <TouchableOpacity
                        disabled={chosenAnswer.length < questions.length}
                        style={[styles.submitButton,
                            { backgroundColor: chosenAnswer.length == questions.length ? '#fff' : '#656565' }
                        ]}
                        onPress={() => {
                            handleStartPress(chosenAnswer[2], chosenAnswer[1], chosenAnswer[0]);
                            console.log("Answers:", chosenAnswer);
                        }}
                        >
                        <Text style={[styles.submitButtonText, { color: chosenAnswer.length == questions.length ? '#000' : '#fff' }]}>Submit</Text>
                    </TouchableOpacity>



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
        height: '100%',
        paddingTop: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 5,
    },
    backImage: {
        width: 19,
        height: 19,
    },
    titleContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleText: {
        fontFamily: 'Lexend',
        fontSize: 30,
        color: '#fff',
    },
    question: {
        fontFamily: 'Lexend',
        fontSize: 22,
        color: '#fff',
        textAlign: 'center',
        marginTop: 10,
        marginHorizontal: 40,
    },
    dividingLine: {
        width: '90%',
        height: 1,
        backgroundColor: '#ffffff80',
        marginVertical: 20,
        alignSelf: 'center',
    },
    playerContainer: {
        width: '90%',
        // padding: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dotRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    submitButton: {
        borderRadius: 20,
        padding: 10,
        width: 130,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        alignSelf: 'center',
    },
    submitButtonText: {
        fontFamily: 'Lexend',
        fontSize: 13,
    },
})


export default GameSettings;
