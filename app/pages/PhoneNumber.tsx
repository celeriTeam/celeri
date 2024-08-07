import React from 'react';
import { View, Text, Button } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

type RootStackParamList = {
    PhoneNumber: undefined;
    Verification: undefined;
};

type PhoneNumberPageNavigationProp = StackNavigationProp<RootStackParamList, 'PhoneNumber'>;
type PhoneNumberPageRouteProp = RouteProp<RootStackParamList, 'PhoneNumber'>;

type Props = {
    navigation: PhoneNumberPageNavigationProp;
    route: PhoneNumberPageRouteProp;
};

const PhoneNumberPage: React.FC<Props> = ({ navigation }) => {
    return (
        <View>
            <Text>Phone Number Page</Text>
            <Button title="Back" onPress={() => navigation.goBack()} />
            <Button title="Next" onPress={() => navigation.navigate('Verification')} />
        </View>
    );
};

export default PhoneNumberPage;
