// app/_layout.tsx
import { Stack } from 'expo-router';
import FullScreenWrapper from '../components/FullScreenWrapper';
import { TabBarProvider } from "../hooks/useTabBar";

export default function RootLayout() {
    return (
        <FullScreenWrapper>
            <TabBarProvider>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                </Stack>
            </TabBarProvider>
        </FullScreenWrapper>
    );
}
