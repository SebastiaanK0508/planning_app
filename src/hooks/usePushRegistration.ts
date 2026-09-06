import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

// Vraagt pushtoestemming en Expo push token op. De backend heeft momenteel geen
// endpoint om dit token op te slaan — dat is nodig voordat er echte pushmeldingen
// verstuurd kunnen worden (zie README.md, "Pushmeldingen").
export function usePushRegistration(enabled: boolean) {
    useEffect(() => {
        if (!enabled || !Device.isDevice) return;

        (async () => {
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

            try {
                await Notifications.getExpoPushTokenAsync({ projectId });
                // TODO: verstuur dit token naar de backend zodra daar een endpoint voor bestaat.
            } catch {
                // Stil falen: pushmeldingen zijn een progressive enhancement.
            }
        })();
    }, [enabled]);
}
