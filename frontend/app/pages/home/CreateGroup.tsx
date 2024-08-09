import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';

type CreateGroupPageNavigationProp = StackNavigationProp<RootStackParamList, 'CreateGroup'>;

type Props = {
    navigation: CreateGroupPageNavigationProp;
};

const CreateGroupPage: React.FC<Props> = ({ navigation }) => {
    return (
        <View style={styles.container}>
            <Text>Create Group Page</Text><br></br>
            <Text>Coming soon...</Text><br></br>
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

export default CreateGroupPage;
