import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions, ScrollView } from 'react-native';
import { useUser } from '../../../../../UserProvider';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native-size-scaling';
import { addDiamonds, setTutorialStatus } from '@/backend/src/groups';

const { width, height } = Dimensions.get('window');

// Guidelines based on my test device (iPhone 16):
const guidelineBaseWidth = 393;   // 1179 / 3
const guidelineBaseHeight = 852;  // 2556 / 3

// Scale functions to calculate sizes proportionate to the device dimensions
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

type TutorialStatus = {
    store?: boolean;
    liveDuels?: boolean;
    currency?: boolean;
    steps?: boolean;
};

const StoreTutorial: React.FC<{
    tutorialStep: number,
    setCurrentTutorialStatus: (value: React.SetStateAction<TutorialStatus>) => void;
}> = ({ tutorialStep, setCurrentTutorialStatus }) => {
    const { userID, groups, loading } = useUser();
    const router = useRouter();
    const { groupIDTemp } = useLocalSearchParams();
    const groupID = groupIDTemp ? String(groupIDTemp) : '';
    const [currentPage, setCurrentPage] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const [addedDiamond, setAddedDiamond] = useState(false);

    const handleNextStep = async () => {
        await setTutorialStatus(groupID, userID, 'store');
        setCurrentTutorialStatus(prevState => ({
            ...prevState,
            store: true
        }));
    };

    const handlePrevStep = () => {
    };
    
    const addDiamond = async () => {
        try {
            setAddedDiamond(true);
            await addDiamonds(groupID, userID, 1);
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
            <View style={styles.overlay}>
                <View style={styles.arrowContainer}>
                    <TouchableOpacity style={styles.circle} onPress={handleNextStep}>
                        <Image
                            source={require('@assets/icons/x.png')}
                            style={styles.arrow}
                        />
                    </TouchableOpacity>
                </View>
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
                        <Text style={styles.tokenText}>Welcome to the store! 
                            Here, you can purchase powerups with diamonds!</Text>
                    </View>

                    {/* Page 2 */}
                    <View style={styles.page}>
                        <Text style={styles.tokenText}>
                            Powerups can change the step count of players in their 
                            head-to-heads, but it won't change their step count in 
                            the weekly race. Use them wisely!</Text>
                    </View>
                </ScrollView>

                {/* Pagination Indicators */}
                <View style={styles.pagination}>
                    {[0, 1].map(index => (
                        <View
                            key={index}
                            style={[
                                styles.paginationDot,
                                currentPage === index ? styles.paginationDotActive : {}
                            ]}
                        />
                    ))}
                </View>
                <View style={{ alignItems: 'center' }}>
                    <TouchableOpacity onPress={addDiamond} style={[styles.diamondsButton, addedDiamond && { borderColor: '#ffffff80' }]} disabled={addedDiamond}>
                        <Text style={[{ fontFamily: 'Lexend', color: '#fff', }, addedDiamond && { color: '#ffffff80' }]}>+1</Text>
                        <Image
                            source={require('@assets/icons/diamonds.png')}
                            style={[styles.diamondsIcon, addedDiamond && { tintColor: '#74FF6D80' }]}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlayContainer: {
        flex: 1,
        alignItems: 'center',
        // center
        justifyContent: 'center',
    },
    overlay: {
        position: 'absolute',
        backgroundColor: '#000',
        borderWidth: 1,
        borderColor: '#fff',
        padding: 20,
        borderRadius: 10,
        bottom: 60,
        width: guidelineBaseWidth * 0.9,
        height: 255,
    },
    arrowContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        // marginBottom: 10,
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
        fontFamily: 'Lexend',
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
        // paddingVertical: 10,
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

export default StoreTutorial;