import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

type RootStackParamList = {
    Verification: undefined;
    HomePage: undefined;
};

type VerificationPageNavigationProp = StackNavigationProp<RootStackParamList, 'Verification'>;
type VerificationPageRouteProp = RouteProp<RootStackParamList, 'Verification'>;

type Props = {
    navigation: VerificationPageNavigationProp;
    route: VerificationPageRouteProp;
};

const VerificationPage: React.FC<Props> = ({ navigation }) => {
    return (
        <View style={styles.container}>
            <Text>Verification Page</Text>
            <Button title="Back" onPress={() => navigation.goBack()} />
            <Button title="Verify" onPress={() => navigation.navigate('HomePage')} />
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

export default VerificationPage;
