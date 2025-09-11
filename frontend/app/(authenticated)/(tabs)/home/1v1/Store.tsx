import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useUser } from '../../../../UserProvider';
import { buyPowerup } from '../../../../../backend/src/store';
import { StyleSheet } from 'react-native-size-scaling';

const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

type Props = {
    userDiamonds: number;
    setStoreModalVisible: (visible: boolean) => void;
};

const Store1v1Page: React.FC<Props> = ({ userDiamonds, setStoreModalVisible }) => {
    const { userID, loading } = useUser();
    const storeBoxes = [
        { rarity: 'Common', price: 1 },
        { rarity: 'Rare', price: 5 },
        { rarity: 'Legendary', price: 20 }
    ]
    
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Store</Text>
            <View style={styles.diamonds}>
                <Image 
                    source={require('../../../../../assets/icons/diamonds.png')}
                    style={styles.diamondIcon} 
                />
                <Text style={styles.text}>{userDiamonds}</Text>
            </View>
            <FlatList
                data={storeBoxes}
                renderItem={({ item }) => (
                    <View style={[
                        styles.itemContainer,
                        item.rarity === 'Rare' && { borderWidth: 1, borderColor: '#74FF6D' },
                        item.rarity === 'Legendary' && { 
                            borderWidth: 1, 
                            borderColor: '#74FF6D',
                        
                            shadowColor: '#51ba51',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.7,
                            shadowRadius: moderateScale(7),
                            elevation: 10,
                        },
                    ]}>
                        <Text style={[styles.title, { textAlign: 'left', }]}>{item.rarity}</Text>
                        <View style={styles.buyContainer}>
                            <TouchableOpacity style={styles.buyButton} >
                                <Text style={styles.buyButtonText}>Buy Box</Text>
                            </TouchableOpacity>
                            <View style={styles.diamonds}>
                                <Image 
                                    source={require('../../../../../assets/icons/diamonds.png')}
                                    style={styles.diamondIcon} 
                                />
                                <Text style={styles.text}>{item.price}</Text>
                            </View>
                        </View>
                    </View>
                )}
                keyExtractor={(item) => item.rarity}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 30,
    },
    title: {
        fontFamily: 'Lexend',
        color: '#fff',
        fontSize: 20,
        textAlign: 'center',
    },
    text: {
        fontFamily: 'Lexend',
        color: '#fff',
        fontSize: 13,
        marginRight: 5,
    },
    diamonds: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        padding: 10,
        gap: 5,
    },
    diamondIcon: {
        width: 14,
        height: 12,
    },
    itemContainer: {
        backgroundColor: '#5BE35C33',
        justifyContent: 'center',
        marginVertical: 10,
        borderRadius: 15,
        paddingVertical: 10,
        paddingLeft: 20,
        paddingTop: 30,
    },
    buyContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingVertical: 10,
    },
    buyButton: {
        backgroundColor: '#fff',
        borderRadius: 18,
        paddingVertical: 7,
        width: '50%',
        alignItems: 'center',
    },
    buyButtonText: {
        fontFamily: 'Lexend',
        color: '#000',
        fontSize: 13,
    },
});

export default Store1v1Page;