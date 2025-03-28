import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, TouchableHighlight, Modal, PanResponder, Animated, TouchableWithoutFeedback, Image, Keyboard, KeyboardAvoidingView, Platform, StyleProp, ViewStyle, Dimensions } from 'react-native';
import { useUser } from '../../../../UserProvider';
import { addToFinishedTutorial } from '@/backend/src/bets';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native-size-scaling';
import { setUserFinishedTutorial } from '@/backend/src/users';
import { addDiamonds, setTutorialStatus } from '@/backend/src/groups';

const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;


const CurrencyTutorial: React.FC<{
    diamondsTutorialStatus: boolean;
}> = ({ diamondsTutorialStatus }) => {
    const { userID, groups, loading } = useUser();
    const router = useRouter();
    const { groupIDTemp } = useLocalSearchParams();
    const groupID = groupIDTemp ? String(groupIDTemp) : '';
    const [addedDiamond, setAddedDiamond] = useState(false);
    
    const addDiamond = async () => {
        try {
            setAddedDiamond(true);
            // await addDiamonds(groupID, userID, 1);
            // await setTutorialStatus(groupID, userID, 'currency');
        } catch (error) {
            console.error('Error adding diamond:', error);
        }
    };

    return (
        <View style={styles.overlayContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={styles.tokenText}>Here are your diamonds. You gain one diamond for every daily prop-bet that you win. Use them in the power-ups store.</Text>
            </View>
            {!diamondsTutorialStatus && (
                <View style={{ alignItems: 'center' }}>
                    <TouchableOpacity onPress={addDiamond} style={[styles.diamondsButton, addedDiamond && { borderColor: '#ffffff80' }]} disabled={addedDiamond}>
                        <Text style={[{ fontFamily: 'Lexend', color: '#fff', }, addedDiamond && { color: '#ffffff80' }]}>+1</Text>
                        <Image
                            source={require('@assets/icons/diamonds.png')}
                            style={[styles.diamondsIcon, addedDiamond && { tintColor: '#74FF6D80' }]}
                        />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    overlayContainer: {
        padding: 30,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    overlay: {
        position: 'absolute',
        backgroundColor: '#000',
        borderWidth: 1,
        borderColor: '#fff',
        padding: 20,
        borderRadius: 10,
    },
    arrowContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 10,
    },
    circle: {
        width: 21,
        height: 21,
        borderRadius: 15,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 5,
    },
    arrow: {
        width: 11,
        height: 11,
        tintColor: '#fff',
    },
    tutorialText: {
        fontSize: 16,
        marginBottom: 10,
        color: '#fff',
    },
    nextButton: {
        backgroundColor: '#007bff',
        padding: 10,
        borderRadius: 5,
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    diamondsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderRadius: 10,
        marginTop: 25,
        borderWidth: 1,
        borderColor: '#fff',
        gap: 5,
    },
    diamondsIcon: {
        width: 14,
        height: 12,
    },
    tokenText: {
        fontFamily: 'Lexend',
        fontSize: 15,
        color: 'white',
    },
});

export default CurrencyTutorial;