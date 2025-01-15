import { Stack } from 'expo-router';
import React from 'react';

export default function HomeLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false, // No headers for any screens
                presentation: 'card', // Default screen presentation
            }}
        >
            {/* Automatically includes all screens in this folder */}
        </Stack>
    );
}
