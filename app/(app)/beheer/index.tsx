import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '../../../src/components/ui';
import { useRoleGuard } from '../../../src/hooks/useRoleGuard';
import { colors, PLANNER_PLUS } from '../../../src/lib/theme';

const ITEMS: { icon: keyof typeof Ionicons.glyphMap; label: string; desc: string; href: any }[] = [
    { icon: 'calendar-outline', label: 'Team rooster', desc: 'Bekijk het rooster van je hele team', href: '/(app)/beheer/team-rooster' },
    { icon: 'create-outline', label: 'Rooster maken', desc: 'Diensten inplannen per medewerker', href: '/(app)/beheer/planning' },
    { icon: 'airplane-outline', label: 'Verlofaanvragen', desc: 'Goedkeuren of afwijzen', href: '/(app)/beheer/verlof-beheer' },
    { icon: 'swap-horizontal-outline', label: 'Ruilverzoeken', desc: 'Verzoeken die op jouw goedkeuring wachten', href: '/(app)/beheer/ruil-beheer' },
    { icon: 'people-outline', label: 'Medewerkers', desc: 'Beheer je team', href: '/(app)/beheer/medewerkers' },
    { icon: 'business-outline', label: 'Locaties & afdelingen', desc: 'Beheer vestigingen en afdelingen', href: '/(app)/beheer/locaties' },
    { icon: 'stats-chart-outline', label: 'Maandoverzicht', desc: 'Gewerkte uren per medewerker', href: '/(app)/beheer/maandoverzicht' },
    { icon: 'settings-outline', label: 'Instellingen', desc: 'Organisatie-instellingen', href: '/(app)/beheer/instellingen' },
];

export default function BeheerIndexScreen() {
    useRoleGuard(PLANNER_PLUS);
    return (
        <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: '#f8fafc' }}>
            {ITEMS.map((item) => (
                <Pressable key={item.href} onPress={() => router.push(item.href)}>
                    <Card style={styles.row}>
                        <View style={styles.iconWrap}>
                            <Ionicons name={item.icon} size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>{item.label}</Text>
                            <Text style={styles.desc}>{item.desc}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                    </Card>
                </Pressable>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
    desc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
