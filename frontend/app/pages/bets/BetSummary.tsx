import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Button, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useUser } from '../../UserProvider';

type headToHeadPageNavigationProp = StackNavigationProp<RootStackParamList, 'BetSummaryPage'>;

type Props = {
    navigation: headToHeadPageNavigationProp;
};

const BetSummaryPage: React.FC<Props> = ({ navigation }) => {
    const { userID } = useUser();
    return (
        <View>
            <Text>bet summary!</Text>
        </View>
    );
};

export default BetSummaryPage;