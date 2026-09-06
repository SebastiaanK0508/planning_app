import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Card, CenteredLoader, EmptyState, ErrorBanner } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { addDays, formatTime, isSameDay, parseServerDate, startOfWeek, toIsoDate } from '../../../src/lib/format';
import { PlanningApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

export default function TeamRoosterScreen() {
    const { user } = useAuth();
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
    const dagen = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
    const [selectedDay, setSelectedDay] = useState(0);

    const { data, loading, refreshing, error, refresh } = useAsyncData(
        () =>
            PlanningApi.totaal(user!.org_uuid, toIsoDate(weekStart), toIsoDate(addDays(weekStart, 6))) as Promise<any[]>,
        [user?.org_uuid, weekStart.getTime()]
    );

    const dagItems = useMemo(() => {
        if (!data) return [];
        const dag = dagen[selectedDay];
        return data
            .filter((item: any) => {
                const d = parseServerDate(item.start_tijd);
                return d && isSameDay(d, dag);
            })
            .sort((a: any, b: any) => new Date(a.start_tijd).getTime() - new Date(b.start_tijd).getTime());
    }, [data, dagen, selectedDay]);

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
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

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabs} contentContainerStyle={{ paddingHorizontal: 14 }}>
                {dagen.map((d, i) => (
                    <Pressable key={i} onPress={() => setSelectedDay(i)} style={[styles.dayTab, selectedDay === i && styles.dayTabActive]}>
                        <Text style={[styles.dayTabDow, selectedDay === i && styles.dayTabTextActive]}>
                            {d.toLocaleDateString('nl-NL', { weekday: 'short' })}
                        </Text>
                        <Text style={[styles.dayTabNum, selectedDay === i && styles.dayTabTextActive]}>{d.getDate()}</Text>
                    </Pressable>
                ))}
            </ScrollView>

            {loading ? (
                <CenteredLoader />
            ) : (
                <ScrollView contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
                    <ErrorBanner message={error} />
                    {dagItems.length === 0 ? (
                        <EmptyState title="Niemand ingepland" subtitle="Er staat niets in het rooster op deze dag." />
                    ) : (
                        dagItems.map((item: any) => {
                            const isVerlof = String(item.status || '').startsWith('verlof');
                            return (
                                <Card key={item.uuid} style={{ marginBottom: 8 }}>
                                    <View style={styles.rowBetween}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.naam}>{item.medewerker_naam}</Text>
                                            <Text style={styles.tijd}>
                                                {formatTime(item.start_tijd)} - {formatTime(item.eind_tijd)}
                                            </Text>
                                            {item.locatie_naam ? <Text style={styles.meta}>{item.locatie_naam}</Text> : null}
                                            {item.afdeling_naam ? <Text style={styles.meta}>{item.afdeling_naam}</Text> : null}
                                        </View>
                                        {isVerlof ? <Badge label="Verlof" tone="warning" /> : <Badge label={item.status} />}
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
    dayTabs: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 10 },
    dayTab: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, marginRight: 6 },
    dayTabActive: { backgroundColor: colors.primary },
    dayTabDow: { fontSize: 11, color: colors.textMuted, textTransform: 'capitalize' },
    dayTabNum: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginTop: 2 },
    dayTabTextActive: { color: '#fff' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    naam: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
    tijd: { fontSize: 13, color: '#334155', marginTop: 2 },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
