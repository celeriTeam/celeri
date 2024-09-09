import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Button, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useUser } from '../../UserProvider';

type headToHeadPageNavigationProp = StackNavigationProp<RootStackParamList, 'BetRecapPage'>;

type Props = {
    navigation: headToHeadPageNavigationProp;
};

const BetRecapPage: React.FC<Props> = ({ navigation }) => {
    const { userID } = useUser();
    return (
        <View>bets recap!</View>
    );
};

export default BetRecapPage;