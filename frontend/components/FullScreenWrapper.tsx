// components/FullScreenWrapper.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FullScreenWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                styles.container,
                {
                    marginBottom: -insets.bottom,
                    marginTop: -insets.top,
                },
            ]}
        >
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default FullScreenWrapper;
