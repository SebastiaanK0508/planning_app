import { router } from 'expo-router';
import React from 'react';
import { Pressable, Text } from 'react-native';
import { useAppStatus } from '../contexts/AppStatusContext';
import { useAuth } from '../contexts/AuthContext';
import { InfoBanner } from './ui';

function datum(d?: string | null) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
}

// Zelfde regels als toonAbonnementBanner() in navigation.js.
export function AbonnementBanner() {
    const { user } = useAuth();
    const { abonnement: st } = useAppStatus();
    if (!user || user.rol === 'super_admin' || !st || st.geen_org || !st.afgedwongen) return null;

    const isBeheerder = user.rol === 'beheerder' || user.rol === 'eigenaar';
    let tekst = '';
    let tone: 'amber' | 'rose' = 'amber';
    if (st.toegang === 'geblokkeerd') {
        tone = 'rose';
        tekst = isBeheerder
            ? 'Het abonnement is verlopen en de toegang is geblokkeerd. Verleng het abonnement via de website.'
            : 'De toegang van je organisatie is geblokkeerd. Neem contact op met je beheerder.';
    } else if (st.toegang === 'alleen_lezen') {
        tone = 'rose';
        tekst = isBeheerder
            ? `Het abonnement is verlopen: je team kan alleen nog inzien, niets wijzigen. Op ${datum(st.coulance_tot)} wordt de toegang geblokkeerd.`
            : 'Het abonnement van je organisatie is verlopen: je kunt alleen nog inzien. Neem contact op met je beheerder.';
    } else if (isBeheerder && st.status === 'trial' && st.dagen_over != null && st.dagen_over <= 7) {
        tekst = `Je proefperiode loopt over ${st.dagen_over} ${st.dagen_over === 1 ? 'dag' : 'dagen'} af (${datum(st.geldig_tot)}).`;
    } else if (isBeheerder && st.status === 'opgezegd' && st.dagen_over != null && st.dagen_over <= 7) {
        tekst = `Je abonnement is opgezegd en stopt op ${datum(st.geldig_tot)}.`;
    }
    if (!tekst) return null;

    return (
        <InfoBanner
            tone={tone}
            icon={tone === 'rose' ? 'lock-closed' : 'hourglass-outline'}
            message={tekst}
            action={
                isBeheerder ? (
                    <Pressable onPress={() => router.push('/(app)/beheer/abonnement')} hitSlop={6}>
                        <Text style={{ fontWeight: '900', textDecorationLine: 'underline', color: tone === 'rose' ? '#9f1239' : '#92400e', marginTop: 6, fontSize: 13 }}>
                            Naar abonnement
                        </Text>
                    </Pressable>
                ) : undefined
            }
        />
    );
}
