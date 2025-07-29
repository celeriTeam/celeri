import { Stack } from 'expo-router';

export default function CompetitionLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ title: 'Competition Landing' }} />
            <Stack.Screen name="inGame" options={{ title: 'Competition Proper' }} />
        </Stack>
    );
}
