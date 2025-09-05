import { Stack } from 'expo-router';

export default function ProfileLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ title: 'Profile' }} />
            <Stack.Screen name="editProfile" options={{ title: 'Edit Profile' }} />
            <Stack.Screen name="friends" options={{ title: 'Friends' }} />
        </Stack>
    );
}
