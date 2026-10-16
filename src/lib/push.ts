import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { PushApi } from './services';

// expo-notifications gooit op Android binnen Expo Go al een fout bij het importeren
// (remote push is daar sinds SDK 53 verwijderd). Daarom laden we de module dynamisch
// en alleen buiten Expo Go.
const TOKEN_KEY = 'expo_push_token_v1';

export type PushResultaat = { ok: true; token: string } | { ok: false; reden: string };

export function pushBeschikbaar(): { ok: boolean; reden?: string } {
    if (Constants.appOwnership === 'expo') return { ok: false, reden: 'Pushmeldingen werken niet in Expo Go, alleen in de geïnstalleerde app.' };
    if (!Device.isDevice) return { ok: false, reden: 'Pushmeldingen werken alleen op een echt toestel.' };
    return { ok: true };
}

async function laadModule() {
    return import('expo-notifications');
}

export async function pushToestemmingGegeven(): Promise<boolean> {
    if (!pushBeschikbaar().ok) return false;
    try {
        const N = await laadModule();
        const { status } = await N.getPermissionsAsync();
        return status === 'granted';
    } catch {
        return false;
    }
}

/** Vraagt (optioneel) toestemming, haalt het Expo-token op en meldt het aan bij de backend. */
export async function registreerPush(vraagToestemming: boolean): Promise<PushResultaat> {
    const beschikbaar = pushBeschikbaar();
    if (!beschikbaar.ok) return { ok: false, reden: beschikbaar.reden! };
    try {
        const N = await laadModule();
        let { status } = await N.getPermissionsAsync();
        if (status !== 'granted' && vraagToestemming) status = (await N.requestPermissionsAsync()).status;
        if (status !== 'granted') return { ok: false, reden: 'Geef de app toestemming voor meldingen in de instellingen van je telefoon.' };

        if (Platform.OS === 'android') {
            await N.setNotificationChannelAsync('default', { name: 'Meldingen', importance: N.AndroidImportance.HIGH });
        }
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) return { ok: false, reden: 'Pushmeldingen zijn nog niet geconfigureerd (EAS projectId ontbreekt).' };

        const { data: token } = await N.getExpoPushTokenAsync({ projectId });
        await PushApi.registreerExpoToken(token, Platform.OS);
        await AsyncStorage.setItem(TOKEN_KEY, token).catch(() => {});
        return { ok: true, token };
    } catch (err) {
        return { ok: false, reden: err instanceof Error ? err.message : 'Aanmelden voor pushmeldingen is mislukt.' };
    }
}

/** Meldt dit toestel af (bij uitloggen of het uitzetten van pushmeldingen). Gooit nooit. */
export async function afmeldenPush(): Promise<void> {
    try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (!token) return;
        await PushApi.afmelden(token).catch(() => {});
        await AsyncStorage.removeItem(TOKEN_KEY);
    } catch {
        // niet kritiek
    }
}

/** Vertaalt de web-URL uit een melding (bv. '/rooster.html') naar een app-route. */
export function routeVoorMelding(url: unknown): string | null {
    const u = String(url || '');
    if (u.includes('ruil-verlof-beheer')) return '/(app)/beheer/ruil-verlof';
    if (u.includes('ruilbeurs')) return '/(app)/(tabs)/ruilbeurs';
    if (u.includes('verlof')) return '/(app)/(tabs)/verlof';
    if (u.includes('berichten')) return '/(app)/berichten';
    if (u.includes('planning')) return '/(app)/beheer/planning';
    if (u.includes('support')) return '/(app)/support';
    if (u.includes('rooster')) return '/(app)/(tabs)/rooster';
    return u ? '/(app)/(tabs)' : null;
}

export async function luisterNaarMeldingen(onOpen: (route: string) => void): Promise<() => void> {
    if (!pushBeschikbaar().ok) return () => {};
    try {
        const N = await laadModule();
        N.setNotificationHandler({
            handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
        });
        const open = (data: any) => {
            const route = routeVoorMelding(data?.url);
            if (route) onOpen(route);
        };
        const laatste = await N.getLastNotificationResponseAsync();
        if (laatste) open(laatste.notification.request.content.data);
        const sub = N.addNotificationResponseReceivedListener((r) => open(r.notification.request.content.data));
        return () => sub.remove();
    } catch {
        return () => {};
    }
}
