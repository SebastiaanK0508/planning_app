import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppStatusProvider } from '../src/contexts/AppStatusContext';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { CenteredLoader } from '../src/components/ui';
import { usePushRegistration } from '../src/hooks/usePushRegistration';
import { luisterNaarMeldingen } from '../src/lib/push';

function RootNavigator() {
    const { user, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    usePushRegistration(!!user, (user?.instellingen as any)?.push === false);

    // Tik op een pushmelding: open het bijbehorende scherm.
    useEffect(() => {
        if (!user) return;
        let stop = () => {};
        luisterNaarMeldingen((route) => router.push(route as any)).then((s) => (stop = s));
        return () => stop();
    }, [user?.uuid]); // eslint-disable-line react-hooks/exhaustive-deps

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
                    <AppStatusProvider>
                        <StatusBar style="dark" />
                        <RootNavigator />
                    </AppStatusProvider>
                </AuthProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
