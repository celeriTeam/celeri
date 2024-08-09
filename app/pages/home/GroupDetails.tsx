import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
    GroupDetails: { GroupID: string };
};

type GroupDetailsPageNavigationProp = StackNavigationProp<RootStackParamList, 'GroupDetails'>;

type Props = {
    navigation: GroupDetailsPageNavigationProp;
};

const GroupDetails: React.FC<Props> = ({ navigation }) => {

    return (
        <View style={styles.container}>
            <Text>Group Details Page</Text>
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
    title: {
        fontSize: 24,
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#1E90FF', // Blue background color
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25, // Oval shape
        marginVertical: 10,
    },
    buttonText: {
        color: '#FFFFFF', // White text color
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default GroupDetails;