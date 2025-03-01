import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView } from 'react-native';

import { View, Text, TouchableOpacity, Button, ActivityIndicator, TouchableHighlight, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { addToFinishedPropBet } from '@/backend/src/bets';
import { addPropBet } from '@/backend/src/groups';
import { StyleSheet } from 'react-native-size-scaling';

const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const NewsPage: React.FC< { 
    groupID: string,
    userID: string,
    setNewsModalVisible: (visible: boolean) => void;
} > = ({ groupID, userID, setNewsModalVisible }) => {

    return (
        <View style={styles.container}>
            
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 30,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default NewsPage;