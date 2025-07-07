// app/_layout.tsx
import { Stack } from 'expo-router';
import FullScreenWrapper from '../components/FullScreenWrapper';
import { TabBarProvider } from "../hooks/useTabBar";
import { TextInput, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// @ts-ignore
if ((Text as any).defaultProps == null) (Text as any).defaultProps = {};
// @ts-ignore
(Text as any).defaultProps.allowFontScaling = false;

// @ts-ignore
if ((TextInput as any).defaultProps == null) (TextInput as any).defaultProps = {};
// @ts-ignore
(TextInput as any).defaultProps.allowFontScaling = false;

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <FullScreenWrapper>
                <TabBarProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="index" />
                    </Stack>
                </TabBarProvider>
            </FullScreenWrapper>
        </GestureHandlerRootView>
    );
}
