import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '../../../src/components/ui';
import { TopBar } from '../../../src/components/TopBar';
import { useAuth } from '../../../src/contexts/AuthContext';
import { initials } from '../../../src/lib/format';
import { colors, hasRole, PLANNER_PLUS, roleLabels } from '../../../src/lib/theme';

function MenuRow({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
    return (
        <Pressable onPress={onPress} style={styles.row}>
            <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} />
            <Text style={[styles.rowText, danger && { color: colors.danger }]}>{label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </Pressable>
    );
}

export default function MeerScreen() {
    const { user, logout } = useAuth();
    const isPlannerPlus = hasRole(user?.rol, PLANNER_PLUS);
    const isSuperAdmin = user?.rol === 'super_admin';

    function confirmLogout() {
        Alert.alert('Uitloggen', 'Weet je zeker dat je wilt uitloggen?', [
            { text: 'Annuleren', style: 'cancel' },
            { text: 'Uitloggen', style: 'destructive', onPress: logout },
        ]);
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <TopBar title="Meer" />
            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <Pressable style={styles.profileCard} onPress={() => router.push('/(app)/profiel')}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials(user?.voornaam, user?.achternaam)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.naam}>
                            {user?.voornaam} {user?.achternaam}
                        </Text>
                        <Text style={styles.rol}>{user ? roleLabels[user.rol] : ''}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                </Pressable>

                <Text style={styles.sectionTitle}>Account</Text>
                <Card style={{ padding: 4 }}>
                    <MenuRow icon="person-outline" label="Mijn profiel" onPress={() => router.push('/(app)/profiel')} />
                    <MenuRow icon="lock-closed-outline" label="Wachtwoord wijzigen" onPress={() => router.push('/(app)/profiel/wachtwoord')} />
                    <MenuRow icon="chatbubbles-outline" label="Berichten" onPress={() => router.push('/(app)/berichten')} />
                    <MenuRow icon="help-buoy-outline" label="Support" onPress={() => router.push('/(app)/support')} />
                </Card>

                {isPlannerPlus ? (
                    <>
                        <Text style={styles.sectionTitle}>Beheer</Text>
                        <Card style={{ padding: 4 }}>
                            <MenuRow icon="briefcase-outline" label="Beheerpaneel" onPress={() => router.push('/(app)/beheer')} />
                        </Card>
                    </>
                ) : null}

                {isSuperAdmin ? (
                    <>
                        <Text style={styles.sectionTitle}>Platform</Text>
                        <Card style={{ padding: 4 }}>
                            <MenuRow icon="shield-checkmark-outline" label="Platformbeheer" onPress={() => router.push('/(app)/admin')} />
                        </Card>
                    </>
                ) : null}

                <Text style={styles.sectionTitle}>Sessie</Text>
                <Card style={{ padding: 4 }}>
                    <MenuRow icon="log-out-outline" label="Uitloggen" onPress={confirmLogout} danger />
                </Card>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        marginBottom: 20,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
    naam: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
    rol: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
        marginTop: 16,
        marginLeft: 4,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 12 },
    rowText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0f172a' },
});
