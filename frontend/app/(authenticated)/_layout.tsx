// app/(authenticated)/_layout.tsx
import { Stack } from 'expo-router';

export default function AuthenticatedStack() {
  return (
    <Stack>
      {/* this shows your bottom‑tab navigator */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* this is the hidden route */}
      <Stack.Screen
        name="friends"
        options={{ title: 'Friends', headerShown: false }}
      />
    </Stack>
  )
}
