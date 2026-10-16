import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ShiftDetailsModal } from '../../../src/components/ShiftDetailsModal';
import { Avatar, Badge, Chip, ChipRow, EmptyState, ErrorBanner, FieldLabel, CenteredLoader, PrimaryButton, SearchField, Sheet, SwitchRow } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { useOrgSettings } from '../../../src/hooks/useOrgSettings';
import { fotoUrl } from '../../../src/lib/config';
import { addDays, dagdeel, formatTime, isSameDay, isVerlofStatus, normaliseer, parseServerDate, startOfWeek, toIsoDate, weekNummer, zelfdeUuid } from '../../../src/lib/format';
import { PlanningApi } from '../../../src/lib/services';
import { colors, dagdeelKleuren, hasRole, PLANNER_PLUS } from '../../../src/lib/theme';

const KORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
const DAGDEEL_ICOON = { ochtend: 'sunny-outline', middag: 'partly-sunny-outline', avond: 'moon-outline' } as const;

function todayIndex(): number {
    return (new Date().getDay() + 6) % 7;
}

export default function TeamRoosterScreen() {
    const { user } = useAuth();
    const settings = useOrgSettings();
    const isPlanner = hasRole(user?.rol, PLANNER_PLUS);
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
    const dagen = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
    const [selectedDay, setSelectedDay] = useState(() => todayIndex());
    const [selectedShift, setSelectedShift] = useState<any | null>(null);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [zoek, setZoek] = useState('');
    const [afdeling, setAfdeling] = useState('');
    const [locatie, setLocatie] = useState('');
    const [alleenIk, setAlleenIk] = useState(false);

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
            onMoveShouldSetPanResponderCapture: (_evt, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
            onPanResponderRelease: (_evt, g) => {
                if (g.dx <= -50) goToDay(1);
                else if (g.dx >= 50) goToDay(-1);
            },
        })
    ).current;

    const { data, loading, refreshing, error, refresh } = useAsyncData(
        () => PlanningApi.totaal(user!.org_uuid, toIsoDate(weekStart), toIsoDate(addDays(weekStart, 6))) as Promise<any[]>,
        [user?.org_uuid, weekStart.getTime()]
    );

    const feestdagen = useMemo(() => {
        const map: Record<string, string> = {};
        (settings?.feestdagen || []).forEach((f: any) => f?.datum && (map[f.datum] = f.naam));
        return map;
    }, [settings]);

    const afdelingen = useMemo(() => [...new Set((data || []).map((s: any) => s.afdeling_naam).filter(Boolean))].sort() as string[], [data]);
    const locaties = useMemo(() => [...new Set((data || []).map((s: any) => s.locatie_naam).filter(Boolean))].sort() as string[], [data]);

    // Zelfde regels als applyFilters() op team-rooster.html: verlof van anderen alleen voor planners.
    const gefilterd = useMemo(() => {
        const term = normaliseer(zoek.trim());
        return (data || []).filter((s: any) => {
            const isMe = zelfdeUuid(s.gebruiker_uuid, user?.uuid);
            if (alleenIk && !isMe) return false;
            if (isVerlofStatus(s.status)) {
                if (!isPlanner && !isMe) return false;
            } else {
                if (afdeling && s.afdeling_naam !== afdeling) return false;
                if (locatie && s.locatie_naam !== locatie) return false;
            }
            if (term && !normaliseer(`${s.medewerker_naam} ${s.afdeling_naam} ${s.locatie_naam}`).includes(term)) return false;
            return true;
        });
    }, [data, zoek, afdeling, locatie, alleenIk, isPlanner, user?.uuid]);

    const perDag = useMemo(
        () =>
            dagen.map((dag) =>
                gefilterd
                    .filter((s: any) => {
                        const d = parseServerDate(s.start_tijd);
                        return d && isSameDay(d, dag);
                    })
                    .sort((a: any, b: any) => (parseServerDate(a.start_tijd)?.getTime() || 0) - (parseServerDate(b.start_tijd)?.getTime() || 0))
            ),
        [gefilterd, dagen]
    );

    const dag = dagen[selectedDay];
    const dagItems = perDag[selectedDay];
    const feestdag = feestdagen[toIsoDate(dag)];
    const huidigeWeek = weekStart.getTime() === startOfWeek(new Date()).getTime();
    const filterActief = !!(zoek || afdeling || locatie || alleenIk);

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }} {...panResponder.panHandlers}>
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <Pressable onPress={() => setFiltersOpen(true)} hitSlop={8} style={styles.filterKnop}>
                            <Ionicons name="options-outline" size={18} color={filterActief ? colors.primary : colors.text} />
                            {filterActief ? <View style={styles.filterDot} /> : null}
                        </Pressable>
                    ),
                }}
            />
            <View style={styles.weekNav}>
                <Pressable onPress={() => setWeekStart(addDays(weekStart, -7))} style={styles.weekNavBtn}>
                    <Ionicons name="chevron-back" size={18} color={colors.text} />
                </Pressable>
                <View style={{ alignItems: 'center' }}>
                    <Text style={styles.maand}>{weekStart.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}</Text>
                    <Text style={styles.weekLabel}>
                        Week {weekNummer(weekStart)} · {dagen[0].getDate()} t/m {dagen[6].getDate()} {dagen[6].toLocaleDateString('nl-NL', { month: 'short' })}
                    </Text>
                </View>
                <Pressable onPress={() => setWeekStart(addDays(weekStart, 7))} style={styles.weekNavBtn}>
                    <Ionicons name="chevron-forward" size={18} color={colors.text} />
                </Pressable>
            </View>

            <View style={styles.dayTabs}>
                {dagen.map((d, i) => {
                    const actief = selectedDay === i;
                    const vandaag = isSameDay(d, new Date());
                    return (
                        <Pressable key={i} onPress={() => setSelectedDay(i)} style={[styles.dayTab, actief && styles.dayTabActive, !actief && vandaag && styles.dayTabToday]}>
                            {feestdagen[toIsoDate(d)] ? <Ionicons name="star" size={8} color="#fbbf24" style={styles.ster} /> : null}
                            <Text style={[styles.dayTabDow, actief && styles.dayTabTextActive]}>{KORT[i]}</Text>
                            <Text style={[styles.dayTabNum, actief && styles.dayTabTextActive]}>{d.getDate()}</Text>
                            <View style={[styles.tabDot, perDag[i].length > 0 && { backgroundColor: actief ? '#fff' : colors.primary }]} />
                        </Pressable>
                    );
                })}
            </View>

            {loading ? (
                <CenteredLoader />
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
                    <ErrorBanner message={error} />
                    {!huidigeWeek ? (
                        <PrimaryButton
                            small
                            variant="soft"
                            title="Naar vandaag"
                            icon="today-outline"
                            onPress={() => {
                                setWeekStart(startOfWeek(new Date()));
                                setSelectedDay(todayIndex());
                            }}
                            style={{ alignSelf: 'center', marginBottom: 12 }}
                        />
                    ) : null}
                    <View style={styles.dagKop}>
                        <Text style={styles.dagTitel}>
                            {isSameDay(dag, new Date()) ? 'Vandaag · ' : ''}
                            {dag.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </Text>
                        {feestdag ? <Badge label={feestdag} tone="amber" icon="star" /> : null}
                    </View>

                    {dagItems.length === 0 ? (
                        <EmptyState icon="calendar-clear-outline" title="Geen diensten" subtitle={filterActief ? 'Pas je filters aan om meer te zien.' : 'Er staat niets in het rooster op deze dag.'} />
                    ) : (
                        dagItems.map((s: any) => {
                            const isMe = zelfdeUuid(s.gebruiker_uuid, user?.uuid);
                            const verlof = isVerlofStatus(s.status);
                            const deel = verlof ? 'verlof' : dagdeel(s.start_tijd);
                            const kleur = dagdeelKleuren[deel];
                            return (
                                <Pressable
                                    key={`${s.uuid}-${s.start_tijd}`}
                                    onPress={() => setSelectedShift(s)}
                                    style={[
                                        styles.kaart,
                                        { borderLeftColor: kleur.fg },
                                        verlof && !isMe && { backgroundColor: kleur.bg, borderColor: '#f7d3e1' },
                                        isMe && { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
                                    ]}
                                >
                                    <View style={styles.kaartKop}>
                                        <View style={[styles.chip, { backgroundColor: kleur.bg }]}>
                                            <Ionicons name={verlof ? 'umbrella-outline' : DAGDEEL_ICOON[deel as 'ochtend']} size={12} color={kleur.fg} />
                                        </View>
                                        <Text style={[styles.tijd, verlof && { color: kleur.fg }]}>
                                            {verlof ? 'Verlof' : `${formatTime(s.start_tijd)} – ${formatTime(s.eind_tijd)}`}
                                        </Text>
                                        <View style={{ flex: 1 }} />
                                        {s.status === 'ziek' ? <Badge label="Ziek" tone="rose" /> : null}
                                        {s.status === 'te ruil' ? <Badge label="Op de beurs" tone="amber" /> : null}
                                        {isMe ? (
                                            <View style={[styles.ik, verlof && { backgroundColor: kleur.fg }]}>
                                                <Text style={styles.ikText}>IK</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    <View style={styles.persoon}>
                                        <Avatar uri={fotoUrl(s.profielfoto)} naam={s.medewerker_naam} size={34} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.naam} numberOfLines={1}>
                                                {s.medewerker_naam}
                                            </Text>
                                            <Text style={[styles.meta, verlof && { color: kleur.fg }]} numberOfLines={1}>
                                                {verlof ? s.notitie || 'Afwezig' : `${s.afdeling_naam || 'Algemeen'}${s.locatie_naam ? ` · ${s.locatie_naam}` : ''}`}
                                            </Text>
                                        </View>
                                    </View>
                                </Pressable>
                            );
                        })
                    )}
                </ScrollView>
            )}

            <Sheet
                visible={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                title="Filters"
                footer={
                    <PrimaryButton
                        title="Filters wissen"
                        variant="secondary"
                        onPress={() => {
                            setZoek('');
                            setAfdeling('');
                            setLocatie('');
                            setAlleenIk(false);
                        }}
                    />
                }
            >
                <SearchField value={zoek} onChangeText={setZoek} placeholder="Zoek op naam, afdeling of locatie" style={{ marginBottom: 14 }} />
                {afdelingen.length > 0 ? (
                    <>
                        <FieldLabel>Afdeling</FieldLabel>
                        <ChipRow style={{ marginBottom: 14 }}>
                            <Chip label="Alle" active={!afdeling} onPress={() => setAfdeling('')} />
                            {afdelingen.map((a) => (
                                <Chip key={a} label={a} active={afdeling === a} onPress={() => setAfdeling(a)} />
                            ))}
                        </ChipRow>
                    </>
                ) : null}
                {locaties.length > 0 ? (
                    <>
                        <FieldLabel>Locatie</FieldLabel>
                        <ChipRow style={{ marginBottom: 14 }}>
                            <Chip label="Alle" active={!locatie} onPress={() => setLocatie('')} />
                            {locaties.map((l) => (
                                <Chip key={l} label={l} active={locatie === l} onPress={() => setLocatie(l)} />
                            ))}
                        </ChipRow>
                    </>
                ) : null}
                <SwitchRow label="Alleen mijn diensten" value={alleenIk} onValueChange={setAlleenIk} />
            </Sheet>

            <ShiftDetailsModal
                visible={!!selectedShift}
                shift={selectedShift}
                onClose={() => setSelectedShift(null)}
                onChanged={refresh}
                ownShift={!!selectedShift && zelfdeUuid(selectedShift.gebruiker_uuid, user?.uuid)}
                medewerkerNaam={selectedShift && !zelfdeUuid(selectedShift.gebruiker_uuid, user?.uuid) ? selectedShift.medewerker_naam : undefined}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    filterKnop: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.slateSoft, alignItems: 'center', justifyContent: 'center' },
    filterDot: { position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
    weekNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#fff',
    },
    weekNavBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.slateSoft, alignItems: 'center', justifyContent: 'center' },
    maand: { fontSize: 10, fontWeight: '900', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1.4 },
    weekLabel: { fontWeight: '900', color: colors.ink, fontSize: 14, marginTop: 2 },
    dayTabs: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
        paddingHorizontal: 10,
        paddingBottom: 10,
        gap: 4,
    },
    dayTab: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 14 },
    dayTabActive: { backgroundColor: colors.primary },
    dayTabToday: { backgroundColor: colors.primarySoft },
    ster: { position: 'absolute', top: 3 },
    dayTabDow: { fontSize: 10, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
    dayTabNum: { fontSize: 16, fontWeight: '900', color: colors.ink, letterSpacing: -0.4 },
    dayTabTextActive: { color: '#fff' },
    tabDot: { width: 5, height: 5, borderRadius: 3, marginTop: 3, backgroundColor: 'transparent' },
    dagKop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12, paddingHorizontal: 4 },
    dagTitel: { fontSize: 16, fontWeight: '900', color: colors.ink, textTransform: 'capitalize', letterSpacing: -0.3 },
    kaart: {
        backgroundColor: '#fff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.line,
        borderLeftWidth: 4,
        padding: 12,
        marginBottom: 10,
        gap: 8,
    },
    kaartKop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    chip: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    tijd: { fontSize: 13, fontWeight: '800', color: colors.text },
    ik: { backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    ikText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    persoon: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    naam: { fontSize: 14, fontWeight: '800', color: colors.ink },
    meta: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 1 },
});
