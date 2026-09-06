import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Card, CenteredLoader, EmptyState, ErrorBanner } from '../../../src/components/ui';
import { TopBar } from '../../../src/components/TopBar';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { addDays, formatDayLabel, formatTime, isSameDay, parseServerDate, startOfWeek } from '../../../src/lib/format';
import { PlanningApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

export default function RoosterScreen() {
    const { user } = useAuth();
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
    const { data, loading, refreshing, error, refresh } = useAsyncData(
        () => PlanningApi.mijnRooster(user!.uuid) as Promise<any[]>,
        [user?.uuid]
    );

    const dagen = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

    const weekItems = useMemo(() => {
        if (!data) return [];
        const weekEnd = addDays(weekStart, 7);
        return data
            .filter((item: any) => {
                const d = parseServerDate(item.start_tijd);
                return d && d >= weekStart && d < weekEnd;
            })
            .sort((a: any, b: any) => new Date(a.start_tijd).getTime() - new Date(b.start_tijd).getTime());
    }, [data, weekStart]);

    const totaalUren = useMemo(
        () => weekItems.reduce((sum: number, item: any) => sum + (Number(item.uren) || 0), 0),
        [weekItems]
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <TopBar title="Mijn rooster" subtitle={`${totaalUren.toFixed(1)} uur deze week`} />

            <View style={styles.weekNav}>
                <Pressable onPress={() => setWeekStart(addDays(weekStart, -7))} style={styles.weekNavBtn}>
                    <Ionicons name="chevron-back" size={20} color={colors.primary} />
                </Pressable>
                <Text style={styles.weekLabel}>
                    {dagen[0].getDate()} {dagen[0].toLocaleDateString('nl-NL', { month: 'short' })} — {dagen[6].getDate()}{' '}
                    {dagen[6].toLocaleDateString('nl-NL', { month: 'short' })}
                </Text>
                <Pressable onPress={() => setWeekStart(addDays(weekStart, 7))} style={styles.weekNavBtn}>
                    <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                </Pressable>
            </View>

            {loading ? (
                <CenteredLoader />
            ) : (
                <ScrollView contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
                    <ErrorBanner message={error} />
                    {dagen.map((dag) => {
                        const items = weekItems.filter((item: any) => isSameDay(parseServerDate(item.start_tijd)!, dag));
                        return (
                            <View key={dag.toISOString()} style={{ marginBottom: 16 }}>
                                <Text style={styles.dayHeader}>{formatDayLabel(dag.toISOString())}</Text>
                                {items.length === 0 ? (
                                    <Card style={styles.emptyDayCard}>
                                        <Text style={styles.emptyDayText}>Vrij</Text>
                                    </Card>
                                ) : (
                                    items.map((item: any) => {
                                        const isVerlof = String(item.status || '').startsWith('verlof');
                                        return (
                                            <Card key={item.uuid} style={{ marginBottom: 8 }}>
                                                <View style={styles.rowBetween}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.tijd}>
                                                            {formatTime(item.start_tijd)} - {formatTime(item.eind_tijd)}
                                                        </Text>
                                                        {item.locatie_naam ? <Text style={styles.meta}>{item.locatie_naam}</Text> : null}
                                                        {item.afdeling_naam ? <Text style={styles.meta}>{item.afdeling_naam}</Text> : null}
                                                        {item.notitie ? <Text style={styles.meta}>{item.notitie}</Text> : null}
                                                    </View>
                                                    {!isVerlof && item.status === 'ingepland' ? (
                                                        <Pressable
                                                            onPress={() =>
                                                                router.push({ pathname: '/(app)/(tabs)/ruilbeurs', params: { aanbieden: item.uuid } })
                                                            }
                                                            style={styles.ruilBtn}
                                                        >
                                                            <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
                                                            <Text style={styles.ruilBtnText}>Ruilen</Text>
                                                        </Pressable>
                                                    ) : null}
                                                </View>
                                            </Card>
                                        );
                                    })
                                )}
                            </View>
                        );
                    })}
                    {weekItems.length === 0 ? <EmptyState title="Geen diensten deze week" /> : null}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    weekNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    weekNavBtn: { padding: 6 },
    weekLabel: { fontWeight: '700', color: '#0f172a', fontSize: 14 },
    dayHeader: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 8, textTransform: 'capitalize' },
    emptyDayCard: { paddingVertical: 14 },
    emptyDayText: { color: colors.textMuted, fontSize: 13 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tijd: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    ruilBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.primarySoft,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    ruilBtnText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
});
