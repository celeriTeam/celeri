import React, { useState, useEffect } from 'react';
import { View, Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchCurrentCompetition } from '@/backend/src/api';
import { useUser } from '@/app/UserProvider';

const CompetitionGamePage: React.FC = () => {
    const [timeLeft, setTimeLeft] = useState<string>('00:00:00');
    const { userID, username, profilePicture } = useUser();

    // Timer update helper
    const updateTimer = (endTimeStr: string) => {
        const endTime = new Date(endTimeStr).getTime();
        const now = Date.now();
        const diff = endTime - now;
        if (diff <= 0) {
            setTimeLeft("00:00:00");
            return;
        }
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(
            `${hours.toString().padStart(2, '0')}:` +
            `${minutes.toString().padStart(2, '0')}:` +
            `${seconds.toString().padStart(2, '0')}`
        );
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;
        const setup = async () => {
            const game = await fetchCurrentCompetition();
            if (game && game.end_time) {
                updateTimer(game.end_time);
                interval = setInterval(() => updateTimer(game.end_time), 1000);
            }
        };
        setup();
        return () => {
            if (interval) clearInterval(interval);
        };
    }, []);

    return (
        <LinearGradient
            colors={['#000000', '#024405']}
            style={{
                flex: 1,
                width: '100%',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <View style={{ alignItems: 'center' }}>
                <Text style={{
                    color: '#fff',
                    fontFamily: 'Lexend',
                    fontSize: 60,
                    textAlign: 'center',
                }}>
                    {timeLeft}
                </Text>
                <Image
                    source={
                        profilePicture
                            ? { uri: profilePicture }
                            : require('@components/blank-profile-picture.png')
                    }
                    style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        borderWidth: 2,
                        borderColor: '#fff',
                        marginTop: 20,
                        marginBottom: 10,
                    }}
                />
                <Text style={{
                    color: '#fff',
                    fontFamily: 'Lexend-Bold',
                    fontSize: 18,
                    textAlign: 'center',
                }}>
                    {username}
                </Text>
            </View>
        </LinearGradient>
    );
};

export default CompetitionGamePage;