import React from 'react';
import { View, Text, Button } from 'react-native';
import { StyleSheet } from 'react-native-size-scaling';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

const VerificationPage: React.FC = () => {
    return (
        <View style={styles.container}>
            <Text>Verification Page</Text>
            {/* <Button title="Back" onPress={() => navigation.goBack()} />
            <Button title="Verify" onPress={() => navigation.navigate('HomePage')} /> */}
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
