import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, Linking, PanResponder, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { ShiftDetailsModal } from '../../../src/components/ShiftDetailsModal';
import { groepeerPerWeek, ShiftRow, WeekHeader } from '../../../src/components/ShiftRow';
import { IconButton, TopBar } from '../../../src/components/TopBar';
import { Badge, Card, CenteredLoader, Chip, DateField, EmptyState, ErrorBanner, PrimaryButton, SearchField, Segmented, Sheet } from '../../../src/components/ui';
import { deelPdf, urenoverzichtHtml } from '../../../src/lib/pdf';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { settingAan, useOrgSettings } from '../../../src/hooks/useOrgSettings';
import { API_URL } from '../../../src/lib/config';
import { addDays, formatDayLabel, formatUren, isSameDay, isVerlofStatus, normaliseer, parseServerDate, startOfWeek, toIsoDate, weekNummer } from '../../../src/lib/format';
import { PlanningApi } from '../../../src/lib/services';
import { colors, hasRole, PLANNER_PLUS } from '../../../src/lib/theme';

LocaleConfig.locales.nl = {
    monthNames: ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
    monthNamesShort: ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
    dayNames: ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'],
    dayNamesShort: ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'],
    today: 'Vandaag',
};
LocaleConfig.defaultLocale = 'nl';

type Modus = 'lijst' | 'week' | 'maand';

function sorteer(a: any, b: any) {
    return (parseServerDate(a.start_tijd)?.getTime() || 0) - (parseServerDate(b.start_tijd)?.getTime() || 0);
}

export default function RoosterScreen() {
    const { user } = useAuth();
    const settings = useOrgSettings();
    const [modus, setModus] = useState<Modus>('lijst');
    const [zoek, setZoek] = useState('');
    const [toonVerleden, setToonVerleden] = useState(false);
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
    const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()));
    const [selectedShift, setSelectedShift] = useState<any | null>(null);
    const { data, loading, refreshing, error, refresh } = useAsyncData(() => PlanningApi.mijnRooster(user!.uuid) as Promise<any[]>, [user?.uuid]);
    const [pdfOpen, setPdfOpen] = useState(false);
    const [pdfVan, setPdfVan] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
    const [pdfTot, setPdfTot] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 0));
    const [pdfBezig, setPdfBezig] = useState(false);

    async function downloadUren() {
        const van = new Date(pdfVan);
        van.setHours(0, 0, 0, 0);
        const tot = new Date(pdfTot);
        tot.setHours(23, 59, 59, 999);
        const items = (data || []).filter((s: any) => {
            const d = parseServerDate(s.start_tijd);
            return d && d >= van && d <= tot;
        });
        if (items.length === 0) return Alert.alert('Geen gegevens', 'Er zijn geen diensten of verlof gevonden in deze periode.');
        setPdfBezig(true);
        try {
            const periode = `${van.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })} – ${tot.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}`;
            await deelPdf(urenoverzichtHtml({ naam: `${user?.voornaam} ${user?.achternaam}`, periode, items }), 'Urenoverzicht');
            setPdfOpen(false);
        } catch (err) {
            Alert.alert('PDF mislukt', err instanceof Error ? err.message : 'Probeer het opnieuw.');
        } finally {
            setPdfBezig(false);
        }
    }

    const teamZichtbaar = settingAan(settings?.rooster_zichtbaar, false) || hasRole(user?.rol, PLANNER_PLUS);

    async function handleAgendaAbonnement() {
        if (!user) return;
        try {
            const { token } = await PlanningApi.icsToken(user.uuid);
            const uuidHex = user.uuid.replace(/-/g, '');
            const httpsUrl = `${API_URL}/api/ics/mijn-rooster/${uuidHex}/${token}/rooster.ics`;
            const webcalUrl = httpsUrl.replace(/^https?:\/\//, 'webcal://');
            Alert.alert(
                'Abonneer op je rooster',
                'Voeg dit adres toe aan je agenda-app (Apple Agenda, Google Agenda, Outlook). Wijzigingen in je rooster verschijnen dan vanzelf.',
                [
                    { text: 'Open in agenda-app', onPress: () => Linking.openURL(webcalUrl).catch(() => Linking.openURL(httpsUrl).catch(() => {})) },
                    { text: 'Deel link', onPress: () => Share.share({ message: httpsUrl }) },
                    { text: 'Annuleren', style: 'cancel' },
                ]
            );
        } catch {
            Alert.alert('Mislukt', 'Kon geen agenda-abonnementslink ophalen.');
        }
    }

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponderCapture: (_evt, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
            onPanResponderRelease: (_evt, g) => {
                if (g.dx <= -50) setWeekStart((w) => addDays(w, 7));
                else if (g.dx >= 50) setWeekStart((w) => addDays(w, -7));
            },
        })
    ).current;

    // ---- Lijst (zoals mijn_rooster.html) ----
    const lijst = useMemo(() => {
        const term = normaliseer(zoek.trim());
        const nu = new Date();
        return (data || [])
            .filter((s: any) => {
                const eind = parseServerDate(s.eind_tijd);
                if (!toonVerleden && eind && eind < nu) return false;
                if (!term) return true;
                return [formatDayLabel(s.start_tijd), s.status, s.locatie_naam, s.afdeling_naam, s.notitie].some((v) => normaliseer(v).includes(term));
            })
            .sort(sorteer);
    }, [data, zoek, toonVerleden]);
    const lijstWeken = useMemo(() => groepeerPerWeek(lijst), [lijst]);
    const lijstUren = useMemo(() => lijst.reduce((a: number, s: any) => a + (parseFloat(s.uren) || 0), 0), [lijst]);

    // ---- Week ----
    const dagen = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
    const dagenMetItems = useMemo(
        () =>
            dagen.map((dag) => {
                const items = (data || []).filter((s: any) => {
                    const d = parseServerDate(s.start_tijd);
                    return d && isSameDay(d, dag);
                });
                items.sort(sorteer);
                return { dag, items, uren: items.reduce((a: number, s: any) => a + (Number(s.uren) || 0), 0) };
            }),
        [dagen, data]
    );
    const weekUren = dagenMetItems.reduce((a, d) => a + d.uren, 0);

    // ---- Maand ----
    const markedDates = useMemo(() => {
        const marks: Record<string, any> = {};
        (data || []).forEach((s: any) => {
            const d = parseServerDate(s.start_tijd);
            if (!d) return;
            const key = toIsoDate(d);
            const kleur = isVerlofStatus(s.status) ? '#e6467a' : s.status === 'ziek' ? colors.danger : s.status === 'te ruil' ? colors.warning : colors.primary;
            marks[key] = { marked: true, dotColor: kleur };
        });
        marks[selectedDate] = { ...(marks[selectedDate] || {}), selected: true, selectedColor: colors.primary };
        return marks;
    }, [data, selectedDate]);
    const dagItems = useMemo(
        () =>
            (data || [])
                .filter((s: any) => {
                    const d = parseServerDate(s.start_tijd);
                    return d && toIsoDate(d) === selectedDate;
                })
                .sort(sorteer),
        [data, selectedDate]
    );

    const refreshControl = <RefreshControl refreshing={refreshing} onRefresh={refresh} />;

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <TopBar
                icon="calendar"
                title="Mijn rooster"
                right={
                    <>
                        <IconButton name="document-text-outline" onPress={() => setPdfOpen(true)} />
                        <IconButton name="sync-outline" onPress={handleAgendaAbonnement} />
                        {teamZichtbaar ? <IconButton name="people-outline" onPress={() => router.push('/(app)/beheer/team-rooster')} /> : null}
                    </>
                }
            />
            <View style={styles.subbar}>
                <Segmented
                    value={modus}
                    onChange={setModus}
                    options={[
                        { value: 'lijst', label: 'Lijst' },
                        { value: 'week', label: 'Week' },
                        { value: 'maand', label: 'Maand' },
                    ]}
                />
            </View>

            {loading ? (
                <CenteredLoader />
            ) : modus === 'lijst' ? (
                <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl} keyboardShouldPersistTaps="handled">
                    <ErrorBanner message={error} />
                    <SearchField value={zoek} onChangeText={setZoek} placeholder="Zoek op datum, status, locatie..." />
                    <View style={styles.filterRow}>
                        <Chip label="Toon verleden" icon={toonVerleden ? 'checkmark' : 'time-outline'} active={toonVerleden} onPress={() => setToonVerleden((v) => !v)} />
                        {lijst.length > 0 ? (
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                <Badge label={`${lijst.length} ${lijst.length === 1 ? 'dienst' : 'diensten'}`} tone="blue" icon="list" />
                                <Badge label={`${lijstUren.toFixed(1)} uur`} tone="emerald" icon="stopwatch" />
                            </View>
                        ) : null}
                    </View>
                    <Card style={{ padding: 10 }}>
                        {lijstWeken.length === 0 ? (
                            <EmptyState icon="search" title="Geen diensten gevonden" subtitle="Pas je zoekterm aan of toon ook het verleden." />
                        ) : (
                            lijstWeken.map((w, i) => (
                                <View key={w.maandag.toISOString()} style={i > 0 ? { paddingTop: 16 } : { paddingTop: 4 }}>
                                    <WeekHeader maandag={w.maandag} aantal={w.items.length} uren={w.uren} />
                                    {w.items.map((s: any) => (
                                        <ShiftRow key={`${s.uuid}-${s.start_tijd}`} item={s} onPress={() => setSelectedShift(s)} />
                                    ))}
                                </View>
                            ))
                        )}
                    </Card>
                </ScrollView>
            ) : modus === 'week' ? (
                <View style={{ flex: 1 }} {...panResponder.panHandlers}>
                    <View style={styles.weekNav}>
                        <Pressable onPress={() => setWeekStart(addDays(weekStart, -7))} style={styles.weekNavBtn}>
                            <Ionicons name="chevron-back" size={18} color={colors.text} />
                        </Pressable>
                        <Pressable onPress={() => setWeekStart(startOfWeek(new Date()))} style={{ alignItems: 'center' }}>
                            <Text style={styles.weekLabel}>
                                Week {weekNummer(weekStart)} · {dagen[0].toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} – {dagen[6].toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                            </Text>
                            <Text style={styles.weekSub}>{formatUren(weekUren)} uur deze week</Text>
                        </Pressable>
                        <Pressable onPress={() => setWeekStart(addDays(weekStart, 7))} style={styles.weekNavBtn}>
                            <Ionicons name="chevron-forward" size={18} color={colors.text} />
                        </Pressable>
                    </View>
                    <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
                        <ErrorBanner message={error} />
                        {dagenMetItems.map(({ dag, items, uren }) => {
                            const isVandaag = isSameDay(dag, new Date());
                            return (
                                <View key={dag.toISOString()} style={styles.dagBlok}>
                                    <View style={styles.dagKop}>
                                        <Text style={[styles.dagTitel, isVandaag && { color: colors.primary }]}>{formatDayLabel(toIsoDate(dag))}</Text>
                                        {isVandaag ? <Badge label="Vandaag" tone="blue" /> : null}
                                        <View style={{ flex: 1 }} />
                                        {uren > 0 ? <Text style={styles.dagUren}>{formatUren(uren)} u</Text> : null}
                                    </View>
                                    {items.length === 0 ? (
                                        <Text style={styles.vrij}>Vrij</Text>
                                    ) : (
                                        <Card style={{ padding: 6 }}>
                                            {items.map((s: any) => (
                                                <ShiftRow key={`${s.uuid}-${s.start_tijd}`} item={s} onPress={() => setSelectedShift(s)} />
                                            ))}
                                        </Card>
                                    )}
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
                    <ErrorBanner message={error} />
                    <Card style={{ padding: 8, overflow: 'hidden' }}>
                        <Calendar
                            firstDay={1}
                            onDayPress={(day) => setSelectedDate(day.dateString)}
                            markedDates={markedDates}
                            theme={{
                                todayTextColor: colors.primary,
                                arrowColor: colors.primary,
                                selectedDayBackgroundColor: colors.primary,
                                textMonthFontWeight: '900',
                                textDayFontWeight: '600',
                                textDayHeaderFontWeight: '800',
                                textSectionTitleColor: colors.subtle,
                            }}
                        />
                    </Card>
                    <Text style={[styles.dagTitel, { marginTop: 18, marginBottom: 8, marginLeft: 4 }]}>{formatDayLabel(selectedDate)}</Text>
                    <Card style={{ padding: 6 }}>
                        {dagItems.length === 0 ? (
                            <Text style={[styles.vrij, { padding: 12 }]}>Vrij</Text>
                        ) : (
                            dagItems.map((s: any) => <ShiftRow key={`${s.uuid}-${s.start_tijd}`} item={s} onPress={() => setSelectedShift(s)} />)
                        )}
                    </Card>
                </ScrollView>
            )}

            <Sheet
                visible={pdfOpen}
                onClose={() => setPdfOpen(false)}
                title="Urenoverzicht downloaden"
                subtitle="PDF met je diensten en uren in een periode"
                footer={<PrimaryButton title="Download PDF" icon="download-outline" onPress={downloadUren} loading={pdfBezig} />}
            >
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <DateField label="Van" value={pdfVan} onChange={setPdfVan} style={{ flex: 1 }} />
                    <DateField label="Tot en met" value={pdfTot} onChange={setPdfTot} style={{ flex: 1 }} />
                </View>
            </Sheet>

            <ShiftDetailsModal visible={!!selectedShift} shift={selectedShift} onClose={() => setSelectedShift(null)} onChanged={refresh} ownShift />
        </View>
    );
}

const styles = StyleSheet.create({
    subbar: { backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
    content: { padding: 16, paddingBottom: 40 },
    filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginVertical: 12, flexWrap: 'wrap' },
    weekNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
    },
    weekNavBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.slateSoft, alignItems: 'center', justifyContent: 'center' },
    weekLabel: { fontWeight: '900', color: colors.ink, fontSize: 14 },
    weekSub: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginTop: 2 },
    dagBlok: { marginBottom: 16 },
    dagKop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingHorizontal: 4 },
    dagTitel: { fontSize: 15, fontWeight: '900', color: colors.ink, textTransform: 'capitalize', letterSpacing: -0.2 },
    dagUren: { fontSize: 12, fontWeight: '800', color: colors.primary, backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
    vrij: { color: colors.subtle, fontSize: 13, fontStyle: 'italic', paddingHorizontal: 4 },
});
