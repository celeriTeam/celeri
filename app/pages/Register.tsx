import React from 'react';
import { View, Text, Button } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

type RootStackParamList = {
    Register: undefined;
    PhoneNumber: undefined;
};

type RegisterPageNavigationProp = StackNavigationProp<RootStackParamList, 'Register'>;
type RegisterPageRouteProp = RouteProp<RootStackParamList, 'Register'>;

type Props = {
    navigation: RegisterPageNavigationProp;
    route: RegisterPageRouteProp;
};

const RegisterPage: React.FC<Props> = ({ navigation }) => {
    return (
        <View>
            <Text>Register Page</Text>
            <Button title="Register" onPress={() => navigation.navigate('PhoneNumber')} />
        </View>
    );
};

export default RegisterPage;
