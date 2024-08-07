import React from 'react';
import { View, Text, Button } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

type RootStackParamList = {
    Verification: undefined;
    FLEX: undefined;
};

type VerificationPageNavigationProp = StackNavigationProp<RootStackParamList, 'Verification'>;
type VerificationPageRouteProp = RouteProp<RootStackParamList, 'Verification'>;

type Props = {
    navigation: VerificationPageNavigationProp;
    route: VerificationPageRouteProp;
};

const VerificationPage: React.FC<Props> = ({ navigation }) => {
    return (
        <View>
            <Text>Verification Page</Text>
            <Button title="Back" onPress={() => navigation.goBack()} />
            <Button title="Verify" onPress={() => navigation.navigate('FLEX')} />
        </View>
    );
};

export default VerificationPage;
