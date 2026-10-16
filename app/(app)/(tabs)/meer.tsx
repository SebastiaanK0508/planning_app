import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TopBar } from '../../../src/components/TopBar';
import { Avatar, Badge } from '../../../src/components/ui';
import { useAppStatus } from '../../../src/contexts/AppStatusContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useMijnInstellingen } from '../../../src/hooks/useMijnInstellingen';
import { APP_VERSION, fotoUrl } from '../../../src/lib/config';
import { colors, hasRole, PLANNER_PLUS, roleLabels } from '../../../src/lib/theme';

type Item = { icon: keyof typeof Ionicons.glyphMap; label: string; href: any; badge?: number };

// Zelfde indeling als het menu op het web (navigation.js): Persoonlijk, Beheer, Organisatie, System Admin.
function Tegel({ item }: { item: Item }) {
    return (
        <Pressable onPress={() => router.push(item.href)} style={({ pressed }) => [styles.tegel, pressed && { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder }]}>
            <View style={styles.tegelIcoon}>
                <Ionicons name={item.icon} size={20} color={colors.primary} />
            </View>
            <Text style={styles.tegelLabel} numberOfLines={1}>
                {item.label}
            </Text>
            {item.badge ? (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
                </View>
            ) : null}
        </Pressable>
    );
}

function Groep({ titel, items }: { titel: string; items: Item[] }) {
    return (
        <>
            <Text style={styles.groepTitel}>{titel}</Text>
            <View style={styles.grid}>
                {items.map((i) => (
                    <Tegel key={i.label} item={i} />
                ))}
            </View>
        </>
    );
}

export default function MeerScreen() {
    const { user, logout } = useAuth();
    const { profielfoto } = useMijnInstellingen();
    const { ongelezenBerichten, beheerOpen } = useAppStatus();
    const isPlanner = hasRole(user?.rol, PLANNER_PLUS);
    const isSuperAdmin = user?.rol === 'super_admin';
    const magAbonnement = user?.rol === 'beheerder' || user?.rol === 'eigenaar';

    function confirmLogout() {
        Alert.alert('Uitloggen', 'Weet je zeker dat je wilt uitloggen?', [
            { text: 'Annuleren', style: 'cancel' },
            { text: 'Uitloggen', style: 'destructive', onPress: logout },
        ]);
    }

    const persoonlijk: Item[] = [
        { icon: 'calendar-outline', label: 'Mijn rooster', href: '/(app)/(tabs)/rooster' },
        { icon: 'airplane-outline', label: 'Verlof', href: '/(app)/(tabs)/verlof' },
        { icon: 'swap-horizontal', label: 'Ruilbeurs', href: '/(app)/(tabs)/ruilbeurs' },
        { icon: 'chatbubble-ellipses-outline', label: 'Berichten', href: '/(app)/berichten', badge: ongelezenBerichten },
        { icon: 'person-circle-outline', label: 'Profiel', href: '/(app)/profiel' },
        { icon: 'help-buoy-outline', label: 'Support', href: '/(app)/support' },
        { icon: 'book-outline', label: 'Kennisbank', href: '/(app)/kennisbank' },
        { icon: 'people-outline', label: 'Team rooster', href: '/(app)/beheer/team-rooster' },
    ];
    const beheer: Item[] = [
        { icon: 'pie-chart-outline', label: 'Dashboard', href: '/(app)/beheer' },
        { icon: 'create-outline', label: 'Planning', href: '/(app)/beheer/planning' },
        { icon: 'git-compare-outline', label: 'Ruil & verlof', href: '/(app)/beheer/ruil-verlof', badge: beheerOpen },
        { icon: 'megaphone-outline', label: 'Mededelingen', href: '/(app)/beheer/mededelingen' },
        { icon: 'stopwatch-outline', label: 'Uren', href: '/(app)/beheer/uren' },
    ];
    const organisatie: Item[] = [
        { icon: 'people-outline', label: 'Medewerkers', href: '/(app)/beheer/medewerkers' },
        { icon: 'location-outline', label: 'Locaties', href: '/(app)/beheer/locaties' },
        { icon: 'settings-outline', label: 'Instellingen', href: '/(app)/beheer/instellingen' },
        ...(magAbonnement ? [{ icon: 'card-outline' as const, label: 'Abonnement', href: '/(app)/beheer/abonnement' }] : []),
    ];

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <TopBar icon="grid" title="Menu" />
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                <Pressable style={styles.profiel} onPress={() => router.push('/(app)/profiel')}>
                    <View style={styles.glow} />
                    <Avatar uri={fotoUrl(profielfoto)} naam={`${user?.voornaam || ''} ${user?.achternaam || ''}`} size={52} />
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.naam} numberOfLines={1}>
                            {user?.voornaam} {user?.achternaam}
                        </Text>
                        <Badge label={user ? roleLabels[user.rol] : ''} tone="blue" />
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
                </Pressable>

                <Groep titel="Persoonlijk" items={persoonlijk} />
                {isPlanner ? <Groep titel="Beheer" items={beheer} /> : null}
                {isPlanner ? <Groep titel="Organisatie" items={organisatie} /> : null}
                {isSuperAdmin ? (
                    <Groep titel="System Admin" items={[{ icon: 'shield-checkmark-outline', label: 'Platformbeheer', href: '/(app)/admin' }]} />
                ) : null}

                <Pressable onPress={confirmLogout} style={styles.uitloggen}>
                    <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                    <Text style={styles.uitloggenText}>Uitloggen</Text>
                </Pressable>
                <Text style={styles.versie}>Webplanning app v{APP_VERSION}</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    profiel: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.ink, borderRadius: 24, padding: 16, overflow: 'hidden' },
    glow: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: colors.primary, opacity: 0.3, top: -80, right: -40 },
    naam: { fontSize: 17, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
    groepTitel: { fontSize: 10, fontWeight: '900', color: colors.subtle, textTransform: 'uppercase', letterSpacing: 1.4, marginTop: 22, marginBottom: 10, marginLeft: 4 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tegel: {
        flexBasis: '47%',
        flexGrow: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: 16,
        padding: 12,
    },
    tegelIcoon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    tegelLabel: { flex: 1, fontSize: 13, fontWeight: '800', color: colors.ink },
    badge: { backgroundColor: '#ef4444', borderRadius: 999, minWidth: 20, height: 20, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
    uitloggen: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 26,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: colors.dangerSoft,
        borderWidth: 1,
        borderColor: '#ffe4e6',
    },
    uitloggenText: { color: colors.danger, fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8 },
    versie: { textAlign: 'center', color: colors.subtle, fontSize: 12, fontWeight: '600', marginTop: 16 },
});
