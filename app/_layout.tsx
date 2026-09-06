import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { CenteredLoader } from '../src/components/ui';
import { usePushRegistration } from '../src/hooks/usePushRegistration';

function RootNavigator() {
    const { user, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    usePushRegistration(!!user);

    useEffect(() => {
        if (isLoading) return;
        const inAuthGroup = segments[0] === '(auth)';

        if (!user && !inAuthGroup) {
            router.replace('/(auth)/login');
        } else if (user && inAuthGroup) {
            router.replace('/(app)/(tabs)');
        }
    }, [user, isLoading, segments, router]);

    if (isLoading) return <CenteredLoader />;

    return <Slot />;
}

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <AuthProvider>
                    <StatusBar style="dark" />
                    <RootNavigator />
                </AuthProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
