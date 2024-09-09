import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Button, Image } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useUser } from '../../UserProvider';
import { getDailyDuels } from '@/backend/src/bets';

type headToHeadPageNavigationProp = StackNavigationProp<RootStackParamList, 'BetSummaryPage'>;
type headToHeadPageRouteProp = RouteProp<RootStackParamList, 'BetSummaryPage'>;

type Props = {
    navigation: headToHeadPageNavigationProp;
};

const BetSummaryPage: React.FC<Props> = ({ navigation }) => {
    const { userID } = useUser();
    const route = useRoute<headToHeadPageRouteProp>();
    const { groupID } = route.params;
    const [isLoading, setIsLoading] = useState(true);
    const [currentBets, setCurrentBets] = useState({} || undefined);

    const fetchGroupData = async () => {
        try {
            const bets = await getDailyDuels(groupID);
            setCurrentBets(bets);
        } catch (error) {
            console.error("Error fetching user data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGroupData();
    }, []);

    return (
        <View>
            <Text>bet summary!</Text>
        </View>
    );
};

export default BetSummaryPage;