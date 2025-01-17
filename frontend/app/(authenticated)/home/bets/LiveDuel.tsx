import React, { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

import { View, Text, TouchableOpacity, StyleSheet, Button, ActivityIndicator, TouchableHighlight, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';  // Import the icon package
import { useUser } from '../../../UserProvider';
import Svg, { Circle, G } from 'react-native-svg';
//import { getBetPlayerInfo } from './BetSummary';

type BetPlayerInfo = {
    player1Steps: number, 
    player2Steps: number, 
    player2Ratio: number, 
    player1Powerups: string[][], 
    player2Powerups: string[][];
}

type Bet = {
    duelID: string;
    player1: string;
    player2: string;
    player1Pfp: string;
    player2Pfp: string;
    player1Bets: { user: string; wager: number }[];
    player2Bets: { user: string; wager: number }[];
    player1Steps: number;
    player2Steps: number;
};

type GroupUser = {
    id: string;
    name: string | undefined;
    pfp: string | undefined;
    tokens: number | undefined;
    steps: number | undefined;
    averageSteps: number | undefined;
};

type GroupUsersArray = GroupUser[];


const LiveDuelPage: React.FC< { betPlayerInfo: BetPlayerInfo , bet: Bet, currentGroupUsersArray: GroupUsersArray, userID: string} > = ({ betPlayerInfo, bet, currentGroupUsersArray, userID }) => {

    return (
        <View style={styles.container}>
            <View style={styles.duelCard}>

                {/* player 1 */}
                <View style={styles.playerInfo}>
                    <Image 
                        source={bet?.player1Pfp ? 
                            { uri: bet?.player1Pfp } : 
                            require('@components/blank-profile-picture.png')
                        }
                        style={styles.playerImage}
                    />
                    <Text style={styles.playerName}>{bet?.player1}</Text>
                    <Text style={styles.playerSteps}>{betPlayerInfo.player1Steps} steps</Text>
                    <View style={{  flexDirection: 'row', alignItems: 'center', }}>
                        <Image
                            source={require('../../../../assets/icons/tokensWhite.png')}
                            style={styles.tokensWhiteIcon}
                        />
                        <Text style={styles.playerTokens}> {bet?.player1Bets.reduce((sum, bet) => sum + bet.wager, 0)}</Text>
                    </View>
                </View>
                <View style={styles.duelInfo}>
                    <View style={styles.liveContainer}>
                        <Text style={styles.liveTag}><Text style={{ color: 'green', }}>•</Text> LIVE</Text>
                    </View>
                    <Text style={styles.versus}>VS</Text>

                </View>
                <View style={styles.playerInfo}>
                    <Image 
                        source={bet?.player2Pfp ? 
                            { uri: bet?.player2Pfp } : 
                            require('@components/blank-profile-picture.png')
                        }
                        style={styles.playerImage}
                    />
                    <Text style={styles.playerName}>{bet?.player2}</Text>
                    <Text style={styles.playerSteps}>{betPlayerInfo.player2Steps} steps</Text>
                    <View style={{  flexDirection: 'row', alignItems: 'center', }}>
                        <Image
                            source={require('../../../../assets/icons/tokensWhite.png')}
                            style={styles.tokensWhiteIcon}
                        />
                        <Text style={styles.playerTokens}> {bet?.player2Bets.reduce((sum, bet) => sum + bet.wager, 0)}</Text>
                    </View>

                </View>
            </View>
            <View style={styles.dataContainer}>
                <Text style={[styles.sectionTitle,]}>Bets Placed</Text>
                <View style={styles.overlayContainer}>
                    <View style={styles.rowContainer}>
                        {/* Profile picture of the person making the bet */}
                        <Image 
                            source={require('@components/blank-profile-picture.png')} 
                            style={styles.profilePicture} 
                        />

                        {/* Name and bet details */}
                        <View style={styles.betDetails}>
                            <Text style={styles.personName}>John Doe</Text>
                        </View>

                        <Image
                            source={require('../../../../assets/icons/tokensWhite.png')}
                            style={styles.tokensWhiteIcon}
                        />
                         <Text style={[styles.personName, { paddingLeft: 5 }]}>50</Text>

                        <Text style={[styles.personName, { paddingHorizontal: 10 }]}>for</Text>

                        {/* Profile picture of the person they bet on */}
                        <Image 
                            source={require('@components/blank-profile-picture.png')} 
                            style={styles.profilePicture} 
                        />
                    </View>
                </View>

            </View>
            <View style={styles.dataContainer}>
                <Text style={[styles.sectionTitle,]}>Powerups Used</Text>
                <View style={styles.overlayContainer} />
            </View>
        </View>
    );


}

const styles = StyleSheet.create({
    container: {
        borderRadius: 15,
        flex: 1, // Makes the container take the full screen
        //backgroundColor: '#000000', // Black background
       // padding: 16, // Optional padding for content
    },
    dataContainer: {
        paddingHorizontal: 15,
        paddingBottom: 10,
    },
    duelCard: {
        alignSelf: 'flex-start', // Ensures the card is positioned at the top
        width: '100%', // Full width to ensure no alignment issues
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        paddingVertical: 30,
    },
    overlayContainer: {
        width: '100%', // Full width of the parent
        height: 200, // Container height
        backgroundColor: 'rgba(91, 227, 92, 0.2)', // Green with 20% opacity
        borderRadius: 15, // Corner radius
        alignItems: 'center',
    },
    rowContainer: {
        width: '95%', // 95% of the overlayContainer width
        height: 46, // Fixed height
        backgroundColor: 'rgba(75, 255, 108, 0.6)', // Row color with 60% opacity
        borderRadius: 10, // Rounded corners
        flexDirection: 'row', // Row layout
        alignItems: 'center', // Center items vertically
        paddingHorizontal: 10, // Padding for inner content
    },
    playerInfo: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '38%',
        // flex: 1,
    },
    profilePicture: {
        width: 30, // Profile picture size
        height: 30,
        borderRadius: 15, // Makes it circular
        marginRight: 10, // Space between profile picture and text
    },
    betDetails: {
        flex: 1, // Fills remaining space between the profile pictures
        justifyContent: 'center',
    },
    personName: {
        color: '#fff',
        fontSize: 13,
        fontFamily: 'Lexend',
    },
    betAmount: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'Lexend',
    },
    text: {
        color: '#ffffff', // White text for visibility
        fontSize: 16,
        marginBottom: 8,
    },
    playerImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#74FF6D',
    },
    playerName: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'Lexend-Bold',
        marginVertical: 5,
    },
    playerSteps: {
        color: '#BEFFBB',
        fontSize: 12,
        fontFamily: 'Lexend',
    },
    tokensWhiteIcon: {
        width: 12,
        height: 12,
    },
    playerTokens: {
        color: '#BEFFBB',
        fontSize: 12,
    },
    duelInfo: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        width: '20%',
    },
    liveContainer: {
        position: 'absolute',
        top: -30,
        padding: 5,
        backgroundColor: '#fff',
        borderRadius: 20,
        marginTop: 5,
    },
    liveTag: {
        color: '#000',
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    versus: {
        color: '#fff',
        fontFamily: 'Lexend-Bold',
        fontSize: 28,
    },
    youBetText: {
        position: 'absolute',
        bottom: -30,
        color: '#fff',
        fontFamily: 'Lexend',
        fontSize: 11,
    },
    tokensBlackIcon: {
        width: 15,
        height: 14.3,
    },
    betText: {
        color: '#000',
        fontSize: 15,
        fontFamily: 'Lexend',
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Lexend',
        marginBottom: 10,
    },
});

export default LiveDuelPage