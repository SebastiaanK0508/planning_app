import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, CenteredLoader, EmptyState, ErrorBanner } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { PlanningApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

const MAANDEN = [
    'januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

export default function MaandoverzichtScreen() {
    const { user } = useAuth();
    const [maand, setMaand] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const { data, loading, refreshing, error, refresh } = useAsyncData(
        () => PlanningApi.maandoverzichtTeam(user!.org_uuid, maand) as Promise<any[]>,
        [user?.org_uuid, maand]
    );

    function shiftMonth(delta: number) {
        const [y, m] = maand.split('-').map(Number);
        const d = new Date(y, m - 1 + delta, 1);
        setMaand(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const [jaar, maandNum] = maand.split('-').map(Number);

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <View style={styles.monthNav}>
                <Pressable onPress={() => shiftMonth(-1)} style={styles.navBtn}>
                    <Ionicons name="chevron-back" size={20} color={colors.primary} />
                </Pressable>
                <Text style={styles.monthLabel}>
                    {MAANDEN[maandNum - 1]} {jaar}
                </Text>
                <Pressable onPress={() => shiftMonth(1)} style={styles.navBtn}>
                    <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                </Pressable>
            </View>

            {loading ? (
                <CenteredLoader />
            ) : (
                <ScrollView contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
                    <ErrorBanner message={error} />
                    {(data || []).length === 0 ? (
                        <EmptyState title="Geen data voor deze maand" />
                    ) : (
                        (data || []).map((r: any) => (
                            <Card key={r.gebruiker_uuid} style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.naam}>
                                        {r.voornaam} {r.achternaam}
                                    </Text>
                                    <Text style={styles.meta}>
                                        Gepland: {r.geplande_uren}u · Correctie: {r.correctie_uren}u
                                    </Text>
                                </View>
                                <Text style={styles.totaal}>{r.totaal_uren}u</Text>
                            </Card>
                        ))
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    monthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    navBtn: { padding: 6 },
    monthLabel: { fontWeight: '700', color: '#0f172a', fontSize: 14, textTransform: 'capitalize' },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    naam: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    totaal: { fontSize: 16, fontWeight: '800', color: colors.primary },
});
