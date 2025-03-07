import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Image, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, TextInput } from 'react-native';
import { useUser } from '../../../UserProvider';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native-size-scaling';

const NewHeadToHeadTutorial: React.FC = () => {
    const { userID, groups } = useUser();
    const router = useRouter();
    const { groupIDTemp } = useLocalSearchParams();
    const groupID = groupIDTemp ? String(groupIDTemp) : '';
    const [tutorialStep, setTutorialStep] = useState(1);
    const [showTutorialNext, setShowTutorialNext] = useState(true);
    const [showTutorial, setShowTutorial] = useState(true);
    const [selectedPlayer, setSelectedPlayer] = useState<boolean>(false);
    const [betAmount, setBetAmount] = useState('');
    const increments = [25, 100, 250, 500];

    return (
        <View>
            
        </View>
    );
};