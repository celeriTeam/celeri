import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';

type JoinGroupPageNavigationProp = StackNavigationProp<RootStackParamList, 'JoinGroup'>;

type Props = {
    navigation: JoinGroupPageNavigationProp;
};

const JoinGroupPage: React.FC<Props> = ({ navigation }) => {
    return (
        <View style={styles.container}>
            <Text>Join Group Page</Text>
            <Text style={styles.label}>Enter group code:</Text>
            <TextInput
                style={styles.input}
                id="groupCode"
                placeholder="Group Code"
            />
            <Button title="Enter" onPress={() => navigation.navigate('HomeTab')} />
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
    label: {
      fontSize: 18,
      marginBottom: 8,
    },
    input: {
      height: 40,
      borderColor: 'gray',
      borderWidth: 1,
      paddingHorizontal: 8,
      marginBottom: 16,
      width: '100%',
      maxWidth: 300,
    },
    text: {
        fontSize: 24,
    },
});

export default JoinGroupPage;