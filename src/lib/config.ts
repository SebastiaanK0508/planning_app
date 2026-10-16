import Constants from 'expo-constants';

// Basis-URL van de bestaande Express/MySQL backend (zelfde API als de webapp).
// Overschrijf via app.config met extra.apiUrl, of tijdens dev met EXPO_PUBLIC_API_URL.
const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

export const API_URL =
    process.env.EXPO_PUBLIC_API_URL ||
    (extra.apiUrl as string | undefined) ||
    'https://app.webplanning.nl';

export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

/** Volledige URL voor een profielfoto-pad uit de backend (bv. '/uploads/avatars/x.jpg'). */
export function fotoUrl(pad: string | null | undefined): string | null {
    if (!pad) return null;
    return /^https?:\/\//.test(pad) ? pad : `${API_URL}${pad.startsWith('/') ? '' : '/'}${pad}`;
}
