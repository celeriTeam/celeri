// HomeTab.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeTab'>;

const HomeTab: React.FC = () => {
    const navigation = useNavigation<HomeScreenNavigationProp>();

    const handlePressButton1 = () => {
        navigation.navigate('CreateGroup');
    };

    const handlePressButton2 = () => {
        navigation.navigate('JoinGroup');
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.button} onPress={handlePressButton1}>
                <Text style={styles.buttonText}>Create Group</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handlePressButton2}>
                <Text style={styles.buttonText}>Join Group</Text>
            </TouchableOpacity>
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

export default HomeTab;