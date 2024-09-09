import React from 'react';
import { View, Text } from 'react-native';
import { useRoute } from '@react-navigation/native';

const BetsPage: React.FC = () => {
    const route = useRoute();
    const { groupID } = route.params as { groupID: string };
    const isRecap = false;

    if (isRecap) {
        
    }
    return (
        // if isRecap, render the Recap page, else render the headToHead page
        <View>
            <Text>bet summary!</Text>
        </View>
    );
};

export default BetsPage;