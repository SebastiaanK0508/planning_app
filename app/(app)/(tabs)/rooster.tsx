import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, Linking, PanResponder, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Badge, Card, CenteredLoader, ErrorBanner } from '../../../src/components/ui';
import { ShiftDetailsModal } from '../../../src/components/ShiftDetailsModal';
import { IconButton, TopBar } from '../../../src/components/TopBar';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { API_URL } from '../../../src/lib/config';
import { addDays, formatDayLabel, formatTime, isSameDay, parseServerDate, startOfWeek, toIsoDate } from '../../../src/lib/format';
import { OrganisatieApi, PlanningApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

function ShiftCard({ item, onPress }: { item: any; onPress: () => void }) {
    const isVerlof = String(item.status || '').startsWith('verlof');
    const teRuil = item.status === 'te ruil';
    return (
        <Pressable onPress={onPress}>
            <Card style={{ marginBottom: 8 }}>
                <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.tijd}>
                            {formatTime(item.start_tijd)} - {formatTime(item.eind_tijd)}
                        </Text>
                        {item.locatie_naam ? <Text style={styles.meta}>{item.locatie_naam}</Text> : null}
                        {item.afdeling_naam ? <Text style={styles.meta}>{item.afdeling_naam}</Text> : null}
                        {item.notitie ? <Text style={styles.meta}>{item.notitie}</Text> : null}
                    </View>
                    {isVerlof ? (
                        <Badge label="Verlof" tone="warning" />
                    ) : teRuil ? (
                        <Badge label="Op de beurs" tone="warning" />
                    ) : (
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    )}
                </View>
            </Card>
        </Pressable>
    );
}

export default function RoosterScreen() {
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState<'week' | 'maand'>('week');
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
    const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()));
    const [selectedShift, setSelectedShift] = useState<any | null>(null);
    const { data, loading, refreshing, error, refresh } = useAsyncData(
        () => PlanningApi.mijnRooster(user!.uuid) as Promise<any[]>,
        [user?.uuid]
    );
    const { data: orgSettings } = useAsyncData(
        () => OrganisatieApi.settings(user!.org_uuid) as Promise<any>,
        [user?.org_uuid]
    );
    const teamRoosterZichtbaar = !!Number(orgSettings?.rooster_zichtbaar ?? 1);

    async function handleAgendaAbonnement() {
        if (!user) return;
        try {
            const { token } = await PlanningApi.icsToken(user.uuid);
            const uuidHex = user.uuid.replace(/-/g, '');
            const httpsUrl = `${API_URL}/api/ics/mijn-rooster/${uuidHex}/${token}/rooster.ics`;
            const webcalUrl = httpsUrl.replace(/^https?:\/\//, 'webcal://');

            Alert.alert(
                'Abonneer op je rooster',
                'Voeg dit adres toe aan je agenda-app (Apple Agenda, Google Agenda, Outlook). Wijzigingen in je rooster verschijnen dan vanzelf, zonder opnieuw te exporteren.',
                [
                    {
                        text: 'Open in agenda-app',
                        onPress: () => {
                            Linking.openURL(webcalUrl).catch(() => Linking.openURL(httpsUrl).catch(() => {}));
                        },
                    },
                    { text: 'Deel link', onPress: () => Share.share({ message: httpsUrl }) },
                    { text: 'Annuleren', style: 'cancel' },
                ]
            );
        } catch (err) {
            Alert.alert('Mislukt', 'Kon geen agenda-abonnementslink ophalen.');
        }
    }

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponderCapture: (_evt, gesture) =>
                viewMode === 'week' && Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
            onPanResponderRelease: (_evt, gesture) => {
                if (gesture.dx <= -50) setWeekStart((w) => addDays(w, 7));
                else if (gesture.dx >= 50) setWeekStart((w) => addDays(w, -7));
            },
        })
    ).current;

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

    const dagenMetItems = useMemo(
        () =>
            dagen.map((dag) => {
                const items = weekItems
                    .filter((item: any) => isSameDay(parseServerDate(item.start_tijd)!, dag))
                    .sort((a: any, b: any) => new Date(a.start_tijd).getTime() - new Date(b.start_tijd).getTime());
                const uren = items.reduce((sum: number, item: any) => sum + (Number(item.uren) || 0), 0);
                return { dag, items, uren };
            }),
        [dagen, weekItems]
    );

    const markedDates = useMemo(() => {
        const marks: Record<string, any> = {};
        (data || []).forEach((item: any) => {
            const d = parseServerDate(item.start_tijd);
            if (!d) return;
            const key = toIsoDate(d);
            const isVerlof = String(item.status || '').startsWith('verlof');
            marks[key] = { marked: true, dotColor: isVerlof ? colors.warning : colors.primary };
        });
        marks[selectedDate] = { ...(marks[selectedDate] || {}), selected: true, selectedColor: colors.primary };
        return marks;
    }, [data, selectedDate]);

    const selectedDayItems = useMemo(() => {
        if (!data) return [];
        return data
            .filter((item: any) => {
                const d = parseServerDate(item.start_tijd);
                return d && toIsoDate(d) === selectedDate;
            })
            .sort((a: any, b: any) => new Date(a.start_tijd).getTime() - new Date(b.start_tijd).getTime());
    }, [data, selectedDate]);

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }} {...panResponder.panHandlers}>
            <TopBar
                title="Mijn rooster"
                subtitle={viewMode === 'week' ? `${totaalUren.toFixed(1)} uur deze week` : undefined}
                right={
                    <View style={{ flexDirection: 'row' }}>
                        <IconButton name="sync-outline" onPress={handleAgendaAbonnement} />
                        <IconButton
                            name={viewMode === 'week' ? 'calendar-outline' : 'reorder-three-outline'}
                            onPress={() => setViewMode(viewMode === 'week' ? 'maand' : 'week')}
                        />
                        {teamRoosterZichtbaar ? (
                            <IconButton name="people-outline" onPress={() => router.push('/(app)/beheer/team-rooster')} />
                        ) : null}
                    </View>
                }
            />

            {viewMode === 'week' ? (
                <>
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
                            {dagenMetItems.map(({ dag, items, uren }) => {
                                const isVandaag = isSameDay(dag, new Date());
                                return (
                                    <View key={dag.toISOString()} style={styles.dagBlok}>
                                        <View style={[styles.dagBlokRand, isVandaag && styles.dagBlokRandVandaag]} />
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.dayHeaderRow}>
                                                <View style={styles.dayHeaderLeft}>
                                                    <Text style={[styles.dayHeader, isVandaag && styles.dayHeaderVandaag]}>
                                                        {formatDayLabel(dag.toISOString())}
                                                    </Text>
                                                    {isVandaag ? (
                                                        <View style={styles.vandaagBadge}>
                                                            <Text style={styles.vandaagBadgeText}>Vandaag</Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                                {uren > 0 ? <Text style={styles.dayHeaderUren}>{uren.toFixed(1)} uur</Text> : null}
                                            </View>
                                            {items.length === 0 ? (
                                                <View style={styles.emptyDayRow}>
                                                    <Text style={styles.emptyDayText}>Vrij</Text>
                                                </View>
                                            ) : (
                                                items.map((item: any) => (
                                                    <ShiftCard key={item.uuid} item={item} onPress={() => setSelectedShift(item)} />
                                                ))
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    )}
                </>
            ) : loading ? (
                <CenteredLoader />
            ) : (
                <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
                    <ErrorBanner message={error} />
                    <Calendar
                        firstDay={1}
                        onDayPress={(day) => setSelectedDate(day.dateString)}
                        markedDates={markedDates}
                        theme={{
                            todayTextColor: colors.primary,
                            arrowColor: colors.primary,
                            selectedDayBackgroundColor: colors.primary,
                            dotColor: colors.primary,
                            textMonthFontWeight: '700',
                            textDayFontWeight: '600',
                        }}
                    />
                    <View style={{ padding: 20, paddingTop: 4 }}>
                        <Text style={styles.dayHeader}>
                            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('nl-NL', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                            })}
                        </Text>
                        {selectedDayItems.length === 0 ? (
                            <Card style={styles.emptyDayCard}>
                                <Text style={styles.emptyDayText}>Vrij</Text>
                            </Card>
                        ) : (
                            selectedDayItems.map((item: any) => <ShiftCard key={item.uuid} item={item} onPress={() => setSelectedShift(item)} />)
                        )}
                    </View>
                </ScrollView>
            )}

            <ShiftDetailsModal
                visible={!!selectedShift}
                shift={selectedShift}
                onClose={() => setSelectedShift(null)}
                onChanged={refresh}
                ownShift
            />
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
    dagBlok: { flexDirection: 'row', marginBottom: 20 },
    dagBlokRand: { width: 3, borderRadius: 2, backgroundColor: colors.border, marginRight: 12 },
    dagBlokRandVandaag: { backgroundColor: colors.primary },
    dayHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    dayHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dayHeader: { fontSize: 15, fontWeight: '800', color: '#334155', textTransform: 'capitalize' },
    dayHeaderVandaag: { color: colors.primary },
    vandaagBadge: { backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    vandaagBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
    dayHeaderUren: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primary,
        backgroundColor: colors.primarySoft,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    emptyDayRow: { paddingVertical: 4, paddingBottom: 4 },
    emptyDayCard: { paddingVertical: 14 },
    emptyDayText: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tijd: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
