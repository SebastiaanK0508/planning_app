import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Card, CenteredLoader, EmptyState, ErrorBanner } from '../../../src/components/ui';
import { TopBar } from '../../../src/components/TopBar';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { formatShortDate, formatTime, statusLabel } from '../../../src/lib/format';
import { PlanningApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

export default function VerlofScreen() {
    const { user } = useAuth();
    const { data, loading, refreshing, error, refresh } = useAsyncData(
        () => PlanningApi.mijnRooster(user!.uuid) as Promise<any[]>,
        [user?.uuid]
    );

    const verlofItems = useMemo(() => {
        if (!data) return [];
        return data
            .filter((item: any) => String(item.status || '').startsWith('verlof'))
            .sort((a: any, b: any) => new Date(b.start_tijd).getTime() - new Date(a.start_tijd).getTime());
    }, [data]);

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <TopBar
                title="Verlof"
                subtitle={`${verlofItems.length} aanvra${verlofItems.length === 1 ? 'ag' : 'gen'}`}
            />
            {loading ? (
                <CenteredLoader />
            ) : (
                <ScrollView contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
                    <ErrorBanner message={error} />
                    <Pressable style={styles.newButton} onPress={() => router.push('/(app)/verlof/nieuw')}>
                        <Ionicons name="add-circle" size={20} color="#fff" />
                        <Text style={styles.newButtonText}>Nieuwe verlofaanvraag</Text>
                    </Pressable>

                    {verlofItems.length === 0 ? (
                        <EmptyState title="Nog geen verlofaanvragen" subtitle="Dien een aanvraag in via de knop hierboven." />
                    ) : (
                        verlofItems.map((item: any) => {
                            const st = statusLabel(item.status);
                            const zelfdeDag = formatShortDate(item.start_tijd) === formatShortDate(item.eind_tijd);
                            const isDagdeel = zelfdeDag && (formatTime(item.start_tijd) !== '00:00' || formatTime(item.eind_tijd) !== '23:59');
                            return (
                                <Card key={item.uuid} style={{ marginBottom: 10 }}>
                                    <View style={styles.rowBetween}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.periode}>
                                                {isDagdeel
                                                    ? `${formatShortDate(item.start_tijd)} · ${formatTime(item.start_tijd)}-${formatTime(item.eind_tijd)}`
                                                    : `${formatShortDate(item.start_tijd)} — ${formatShortDate(item.eind_tijd)}`}
                                            </Text>
                                            {item.notitie ? <Text style={styles.notitie}>{item.notitie}</Text> : null}
                                            {item.uren ? <Text style={styles.uren}>{item.uren} uur</Text> : null}
                                        </View>
                                        <Badge label={st.label} tone={st.tone} />
                                    </View>
                                </Card>
                            );
                        })
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    newButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
        marginBottom: 20,
    },
    newButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    periode: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
    notitie: { fontSize: 13, color: '#334155', marginTop: 4 },
    uren: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
});
