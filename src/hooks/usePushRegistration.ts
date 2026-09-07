import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useEffect } from 'react';
import { Platform } from 'react-native';

// Vraagt pushtoestemming en Expo push token op. De backend heeft momenteel geen
// endpoint om dit token op te slaan — dat is nodig voordat er echte pushmeldingen
// verstuurd kunnen worden (zie README.md, "Pushmeldingen").
//
// expo-notifications gooit op Android binnen Expo Go al een fout bij het importeren
// van de module (remote push is daar sinds SDK 53 verwijderd uit Expo Go). Daarom
// laden we de module pas dynamisch, en alleen buiten Expo Go.
export function usePushRegistration(enabled: boolean) {
    useEffect(() => {
        const isExpoGo = Constants.appOwnership === 'expo';
        if (!enabled || !Device.isDevice || isExpoGo) return;

        (async () => {
            try {
                const Notifications = await import('expo-notifications');

                const { status: existing } = await Notifications.getPermissionsAsync();
                let status = existing;
                if (existing !== 'granted') {
                    const req = await Notifications.requestPermissionsAsync();
                    status = req.status;
                }
                if (status !== 'granted') return;

                if (Platform.OS === 'android') {
                    await Notifications.setNotificationChannelAsync('default', {
                        name: 'default',
                        importance: Notifications.AndroidImportance.DEFAULT,
                    });
                }

                const projectId = Constants.expoConfig?.extra?.eas?.projectId;
                if (!projectId || projectId === 'REPLACE_WITH_EAS_PROJECT_ID') return;

                await Notifications.getExpoPushTokenAsync({ projectId });
                // TODO: verstuur dit token naar de backend zodra daar een endpoint voor bestaat.
            } catch {
                // Stil falen: pushmeldingen zijn een progressive enhancement.
            }
        })();
    }, [enabled]);
}
