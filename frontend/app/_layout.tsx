// app/_layout.tsx
import { Stack } from 'expo-router';
import FullScreenWrapper from '../components/FullScreenWrapper';

export default function RootLayout() {
    return (
        <FullScreenWrapper>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
            </Stack>
        </FullScreenWrapper>
    );
}
