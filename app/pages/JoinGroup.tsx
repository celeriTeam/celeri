import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from './types';

type JoinGroupPageNavigationProp = StackNavigationProp<RootStackParamList, 'JoinGroup'>;

type Props = {
    navigation: JoinGroupPageNavigationProp;
};

const JoinGroupPage: React.FC<Props> = ({ navigation }) => {
    return (
        <View style={styles.container}>
            <Text>Join Group Page</Text>
            <Button title="Back" onPress={() => navigation.goBack()} />
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

export default JoinGroupPage;