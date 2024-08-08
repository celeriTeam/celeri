import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

type RootStackParamList = {
    Register: undefined;
    SignUp: undefined;
};

type RegisterPageNavigationProp = StackNavigationProp<RootStackParamList, 'Register'>;
type RegisterPageRouteProp = RouteProp<RootStackParamList, 'Register'>;

type Props = {
    navigation: RegisterPageNavigationProp;
    route: RegisterPageRouteProp;
};

const RegisterPage: React.FC<Props> = ({ navigation }) => {
    return (
        <View style={styles.container}>
            <Text>Register Page</Text>
            <Button title="Register" onPress={() => navigation.navigate('SignUp')} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 24,
    },
});

export default RegisterPage;
