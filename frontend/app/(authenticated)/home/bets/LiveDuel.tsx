import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';

import { View, Text, TouchableOpacity, StyleSheet, Button, ActivityIndicator, TouchableHighlight, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
//import { getBetPlayerInfo } from './BetSummary';

//from fetchPowerups, 
//powerupsArray.push([powerupType, targetUserID, targetUserName, userID, duelID]);

type BetPlayerInfo = {
    player1Steps: number, 
    player2Steps: number, 
    player2Ratio: number, 
    player1Powerups: {
        powerupType: string;
        targetUserID: string;
        targetUserName: string;
        powerupUserID: string;
        duelID: string;
    }[];
    player2Powerups: {
        powerupType: string;
        targetUserID: string;
        targetUserName: string;
        powerupUserID: string;
        duelID: string;
    }[];
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
    averageSteps: number[] | undefined;
};

type GroupUsersArray = GroupUser[];

type Params = {
    selectedUserIDTemp: string;
    groupIDTemp: string;
};

const LiveDuelPage: React.FC< { 
    betPlayerInfo: BetPlayerInfo,
    bet: Bet,
    currentGroupUsersArray: GroupUsersArray,
    userID: string,
    groupID: string,
    onNavigate: (id: string) => void;
} > = ({ betPlayerInfo, bet, currentGroupUsersArray, userID, groupID, onNavigate }) => {

    const yourUser = currentGroupUsersArray.find((user) => user.id === userID);
    const yourName = yourUser?.name;

    const createMemberButtonHandle = (id: string, inBet: boolean) => {
        const userID = inBet ? currentGroupUsersArray.find((user) => user.name === id)?.id : id;
        console.log('id: ', userID);
        onNavigate(userID ?? '');
    };

    const renderBets = (bets: {user: string; wager: number}[], onPlayer: string, playerPfp: string, borderColor: string) => {
        if (bets.length === 0) {
            return null;
        }
        return bets.map((bet, index) => {
            //find the user where the user id is the same as the one in the bet map; this user is a GroupUser type
            const user = currentGroupUsersArray.find((user) => user.name === bet.user);
            return  (
                <View 
                    key={index} 
                    style={yourName === bet.user ? styles.rowContainerYou : styles.rowContainer}
                >
                    {/* Profile picture of the person making the bet */}
                    <TouchableOpacity onPress={() => createMemberButtonHandle(user?.id || '', false)} activeOpacity={0.8}>
                        <Image
                            source={
                                user?.pfp
                                    ? { uri: user.pfp }
                                    : require('@components/blank-profile-picture.png')
                            }
                            style={styles.profilePicture}
                        />
                    </TouchableOpacity>
                    {/* Name and bet details */}
                    <View style={styles.betDetails}>
                        <Text style={styles.personName}>
                            {yourName === bet.user ? 'You' : user?.name || 'Unknown'}
                        </Text>
                    </View>

                    <Image
                        source={require('../../../../assets/icons/tokensWhite.png')}
                        style={styles.tokensWhiteIcon}
                    />
                    <Text style={[styles.personName, { paddingLeft: 5 }]}>{bet.wager}</Text>

                    <Text style={[styles.personName, { paddingHorizontal: 10 }]}>for</Text>

                    {/* Profile picture of the person they bet on */}
                    <Image
                        source={
                            playerPfp
                                ? { uri: playerPfp }
                                : require('@components/blank-profile-picture.png')
                        }
                        style={[styles.profilePicture, { borderColor: borderColor, }]}
                    />

                </View>

                
            )
        })
    }

    // Powerup images mapping
    const powerupImages: Record<string, any> = {
        speedBoots: require('../../../../assets/images/speed_boot.png'),
        secondWind: require('../../../../assets/images/wind.png'),
        legCramp: require('../../../../assets/images/leg_cramp.png'),
        brickWall: require('../../../../assets/images/brick_wall.png'),
    };

    const renderPowerups = (
        powerups: {
            powerupType: string, 
            targetUserID: string, 
            targetUserName: string,
            powerupUserID: string,
            duelID: string,
        }[],
        playerPfp: string,
        borderColor: string
    ) => {
        
        if (powerups.length === 0) {
            return null;
        }

        return powerups.map((powerup, index) => {

            //find the user where the user id is the same as the one in the bet map; this user is a GroupUser type
            const user = currentGroupUsersArray.find((user) => user.id === powerup.powerupUserID);
            console.log(powerup.powerupType, "powerupType");

            let change = "";
            if(powerup.powerupType == "secondWind"){
                change = "+200";
            } else if(powerup.powerupType == "brickWall"){
                change = "-200";
            }

            return  (
                <View 
                    key={index} 
                    style={yourUser?.id === powerup.powerupUserID ? styles.rowContainerYou : styles.rowContainer}
                >
                    {/* Profile picture of the person using the powerup */}
                    <TouchableOpacity onPress={() => createMemberButtonHandle(user?.id || '', false)} activeOpacity={0.8}>
                        <Image
                            source={
                                user?.pfp
                                    ? { uri: user.pfp }
                                    : require('@components/blank-profile-picture.png')
                            }
                            style={styles.profilePicture}
                        />
                    </TouchableOpacity>

                    {/* Name and powerup details */}
                    <View style={styles.betDetails}>
                        <Text style={styles.personName}>
                            {yourUser?.id === powerup.powerupUserID ? 'You' : user?.name || 'Unknown'}
                        </Text>
                    </View>

                    <Text style={[styles.personName, { paddingRight: 5 }]}>{change}</Text>

                    <Image
                        source={powerupImages[powerup.powerupType]} // Map powerupType to the corresponding image
                        style={styles.powerupImage}
                    />

                    <Text style={[styles.personName, { paddingHorizontal: 10 }]}>for</Text>

                    {/* Profile picture of the person they bought the powerup for */}
                    <Image
                        source={
                            playerPfp
                                ? { uri: playerPfp }
                                : require('@components/blank-profile-picture.png')
                        }
                        style={[styles.profilePicture, { borderColor: borderColor, }]}
                    />
                </View>
            )

        })
     }

    return (
        <View style={styles.container}>
            <View style={styles.duelCard}>

                {/* player 1 */}
                <View style={styles.playerInfo}>
                    <TouchableOpacity onPress={() => createMemberButtonHandle(bet?.player1, true)} activeOpacity={0.8}>
                        <Image 
                            source={bet?.player1Pfp ? 
                                { uri: bet?.player1Pfp } : 
                                require('@components/blank-profile-picture.png')
                            }
                            style={[styles.playerImage, { borderColor: '#FF6060', }]}
                        />
                    </TouchableOpacity>
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
                    <TouchableOpacity onPress={() => createMemberButtonHandle(bet?.player2, true)} activeOpacity={0.8}>
                        <Image 
                            source={bet?.player2Pfp ? 
                                { uri: bet?.player2Pfp } : 
                                require('@components/blank-profile-picture.png')
                            }
                            style={[styles.playerImage, { borderColor: '#7464FF', }]}
                        />
                    </TouchableOpacity>
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
                    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContentContainer}>
                        {bet.player1Bets.length === 0 && bet.player2Bets.length === 0 ? <Text style={styles.betText}>No bets placed yet</Text> : null}
                        {renderBets(bet.player1Bets, bet.player1, bet.player1Pfp, '#FF6060')}
                        {renderBets(bet.player2Bets, bet.player2, bet.player2Pfp, '#7464FF')}
                    </ScrollView>
                </View>

            </View>
            <View style={styles.dataContainer}>
                <Text style={[styles.sectionTitle,]}>Powerups Used</Text>
                <View style={styles.overlayContainer}>
                    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContentContainer}>
                        {betPlayerInfo.player1Powerups.length === 0 && betPlayerInfo.player2Powerups.length === 0 ? <Text style={styles.betText}>No powerups used yet</Text> : null}
                        {renderPowerups(betPlayerInfo.player1Powerups, bet.player1Pfp, '#FF6060')}
                        {renderPowerups(betPlayerInfo.player2Powerups, bet.player2Pfp, '#7464FF')}
                    </ScrollView>
                </View>
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
        flex: 1,
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
        paddingTop: 5,
    },
    rowContainer: {
        width: '95%', // 95% of the overlayContainer width
        height: 46, // Fixed height
        backgroundColor: 'rgba(0, 0, 0, 0.6)', // Row color with 60% opacity
        borderRadius: 10, // Rounded corners
        flexDirection: 'row', // Row layout
        alignItems: 'center', // Center items vertically
        paddingHorizontal: 10, // Padding for inner content
        marginBottom: 5
        
    },
    rowContainerYou: {
        width: '95%', // 95% of the overlayContainer width
        height: 46, // Fixed height
        backgroundColor: 'rgba(75, 255, 108, 0.6)', // Row color with 60% opacity
        borderRadius: 10, // Rounded corners
        flexDirection: 'row', // Row layout
        alignItems: 'center', // Center items vertically
        paddingHorizontal: 10, // Padding for inner content
        marginBottom: 5,
    },
    scrollContainer: {
        flex: 1, // Allow ScrollView to take available space
        width: '100%',
    },
    scrollContentContainer: {
        flexGrow: 1, // Allows content to stretch vertically
        alignItems: 'center', // Centers rows horizontally
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
        borderWidth: 1,
        borderColor: '#fff',
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
    powerupImage: {
        width: 18,
        height: 15,
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
        color: '#ffffff80',
        fontStyle: 'italic',
        fontSize: 15,
        fontFamily: 'Lexend',
        // center:
        textAlign: 'center',
        padding: 10,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Lexend',
        marginBottom: 10,
    },
});

export default LiveDuelPage