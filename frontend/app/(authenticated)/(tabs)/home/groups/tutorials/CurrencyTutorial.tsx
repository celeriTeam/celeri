import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions, ScrollView } from 'react-native';
import { useUser } from '../../../../../UserProvider';
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
    const [currentPage, setCurrentPage] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
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

    const handleScroll = (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const page = Math.round(offsetX / (width * 0.74));
        setCurrentPage(page);
    };

    return (
        <View style={styles.overlayContainer}>
            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
            >
                {/* page 1 */}
                <View style={styles.page}>
                        <Text style={styles.tokenText}>The </Text>
                        <Image
                            source={require('@assets/icons/tokens.png')}
                            style={styles.tokensIcon}
                        />
                        <Text style={styles.tokenText}> icon shows how many tokens you</Text>
                        <Text style={styles.tokenText}>have.</Text>
                </View>

                {/* Page 2 */}
                <View style={styles.page}>
                        <Text style={styles.tokenText}>The </Text>
                        <Image
                            source={require('@assets/icons/betTokens.png')}
                            style={styles.betTokensIcon}
                        />
                        <Text style={styles.tokenText}> icon shows how many tokens</Text>
                    <Text style={styles.tokenText}>you're currently betting in the head-to-heads.</Text>
                </View>

                {/* Page 3 */}
                <View style={styles.page}>
                        <Text style={styles.tokenText}>The </Text>
                        <Image
                            source={require('@assets/icons/diamonds.png')}
                            style={styles.diamondsIcon}
                        />
                        <Text style={styles.tokenText}> icon shows how many diamonds</Text>
                    <Text style={styles.tokenText}>you have. You can use them in the shop!</Text>
                </View>
            </ScrollView>

            {/* Pagination Indicators */}
            <View style={styles.pagination}>
                {[0, 1, 2].map(index => (
                    <View
                        key={index}
                        style={[
                            styles.paginationDot,
                            currentPage === index ? styles.paginationDotActive : {}
                        ]}
                    />
                ))}
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
        width: '100%',
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
    tokensIcon: {
        width: 16,
        height: 16,
    },
    betTokensIcon: {
        width: 15,
        height: 15,
    },
    diamondsIcon: {
        width: 14,
        height: 12,
    },
    tokenText: {
        fontFamily: 'Lexend',
        fontSize: 15,
        color: 'white',
        // textAlign: 'center',
        flexShrink: 1,
    },
    scrollView: {
        width: width * 0.74,
        height: 2000,
    },
    scrollViewContent: {
        alignItems: 'center',
    },
    page: {
        width: width * 0.74,
        flexDirection: 'row',
        flexWrap: 'wrap',
        // height: 150,
        paddingVertical: 15,
        // justifyContent: 'center',
        alignItems: 'center',
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginVertical: 15,
    },
    paginationDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderColor: '#fff',
        borderWidth: 1,
        backgroundColor: 'transparent',
        marginHorizontal: 3,
    },
    paginationDotActive: {
        backgroundColor: '#fff',
    },
});

export default CurrencyTutorial;