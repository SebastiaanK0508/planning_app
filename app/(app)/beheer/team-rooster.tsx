import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Card, CenteredLoader, EmptyState, ErrorBanner } from '../../../src/components/ui';
import { ShiftDetailsModal } from '../../../src/components/ShiftDetailsModal';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { addDays, formatTime, isSameDay, parseServerDate, startOfWeek, toIsoDate } from '../../../src/lib/format';
import { PlanningApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

function todayIndex(): number {
    return (new Date().getDay() + 6) % 7; // maandag = 0
}

export default function TeamRoosterScreen() {
    const { user } = useAuth();
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
    const dagen = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
    const [selectedDay, setSelectedDay] = useState(() => todayIndex());
    const [selectedShift, setSelectedShift] = useState<any | null>(null);

    const goToDay = (delta: number) => {
        setSelectedDay((prev) => {
            const next = prev + delta;
            if (next < 0) {
                setWeekStart((w) => addDays(w, -7));
                return 6;
            }
            if (next > 6) {
                setWeekStart((w) => addDays(w, 7));
                return 0;
            }
            return next;
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponderCapture: (_evt, gesture) =>
                Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
            onPanResponderRelease: (_evt, gesture) => {
                if (gesture.dx <= -50) goToDay(1);
                else if (gesture.dx >= 50) goToDay(-1);
            },
        })
    ).current;

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

    const dagIsVandaag = isSameDay(dagen[selectedDay], new Date());

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }} {...panResponder.panHandlers}>
            <View style={styles.weekNav}>
                <Pressable onPress={() => setWeekStart(addDays(weekStart, -7))} style={styles.weekNavBtn}>
                    <Ionicons name="chevron-back" size={18} color={colors.primary} />
                </Pressable>
                <Text style={styles.weekLabel}>
                    {dagen[0].getDate()} {dagen[0].toLocaleDateString('nl-NL', { month: 'short' })} — {dagen[6].getDate()}{' '}
                    {dagen[6].toLocaleDateString('nl-NL', { month: 'short' })}
                </Text>
                <Pressable onPress={() => setWeekStart(addDays(weekStart, 7))} style={styles.weekNavBtn}>
                    <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                </Pressable>
            </View>

            <View style={styles.dayTabs}>
                {dagen.map((d, i) => (
                    <Pressable key={i} onPress={() => setSelectedDay(i)} style={[styles.dayTab, selectedDay === i && styles.dayTabActive]}>
                        <Text style={[styles.dayTabNum, selectedDay === i && styles.dayTabTextActive]}>{d.getDate()}</Text>
                    </Pressable>
                ))}
            </View>

            {loading ? (
                <CenteredLoader />
            ) : (
                <ScrollView contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
                    <ErrorBanner message={error} />
                    <Text style={styles.dayHeader}>
                        {dagIsVandaag ? 'Vandaag · ' : ''}
                        {dagen[selectedDay].toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </Text>
                    {dagItems.length === 0 ? (
                        <EmptyState title="Niemand ingepland" subtitle="Er staat niets in het rooster op deze dag." />
                    ) : (
                        dagItems.map((item: any) => {
                            const isVerlof = String(item.status || '').startsWith('verlof');
                            return (
                                <Pressable key={item.uuid} onPress={() => setSelectedShift(item)}>
                                    <Card style={{ marginBottom: 8 }}>
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
                                </Pressable>
                            );
                        })
                    )}
                </ScrollView>
            )}

            <ShiftDetailsModal
                visible={!!selectedShift}
                shift={selectedShift}
                onClose={() => setSelectedShift(null)}
                ownShift={false}
                medewerkerNaam={selectedShift?.medewerker_naam}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    weekNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    weekNavBtn: { padding: 4 },
    weekLabel: { fontWeight: '700', color: '#0f172a', fontSize: 13 },
    dayTabs: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingVertical: 6,
    },
    dayTab: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    dayTabActive: { backgroundColor: colors.primary },
    dayTabNum: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
    dayTabTextActive: { color: '#fff' },
    dayHeader: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 12, textTransform: 'capitalize' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    naam: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
    tijd: { fontSize: 13, color: '#334155', marginTop: 2 },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
