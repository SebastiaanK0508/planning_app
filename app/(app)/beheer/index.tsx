import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AbonnementBanner } from '../../../src/components/AbonnementBanner';
import { Avatar, Badge, Card, CardHeader, CenteredLoader, EmptyState, ErrorBanner, IconTile, Sheet, StatTile, TileTone } from '../../../src/components/ui';
import { useAppStatus } from '../../../src/contexts/AppStatusContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useRoleGuard } from '../../../src/hooks/useRoleGuard';
import { ApiError } from '../../../src/lib/api';
import { addDays, formatTime, formatUren, isSameDay, parseServerDate, startOfWeek, toIsoDate } from '../../../src/lib/format';
import { OrganisatieApi, PlanningApi } from '../../../src/lib/services';
import { colors, PLANNER_PLUS } from '../../../src/lib/theme';

const KORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

type Snel = { icon: keyof typeof Ionicons.glyphMap; label: string; href: any; tone: TileTone; badge?: number };

export default function DashboardScreen() {
    useRoleGuard(PLANNER_PLUS);
    const { user } = useAuth();
    const status = useAppStatus();
    const [data, setData] = useState<any[] | null>(null);
    const [aantalLocaties, setAantalLocaties] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [verlofOpen, setVerlofOpen] = useState(false);
    const [ziekOpen, setZiekOpen] = useState(false);
    const [geselecteerdeDag, setGeselecteerdeDag] = useState<number | null>(null);

    const laad = useCallback(
        async (isRefresh = false) => {
            if (!user) return;
            if (isRefresh) setRefreshing(true);
            try {
                const ma = startOfWeek(new Date());
                const [rows, locs] = await Promise.all([
                    PlanningApi.totaal(user.org_uuid, toIsoDate(ma), toIsoDate(addDays(new Date(), 120))) as Promise<any[]>,
                    (OrganisatieApi.locaties(user.org_uuid) as Promise<any[]>).catch(() => []),
                ]);
                setData(rows || []);
                setAantalLocaties((locs || []).length);
                setError('');
            } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Kon het dashboard niet laden.');
                setData((d) => d || []);
            } finally {
                setRefreshing(false);
            }
        },
        [user]
    );

    useFocusEffect(
        useCallback(() => {
            laad();
            status.refresh();
        }, [laad]) // eslint-disable-line react-hooks/exhaustive-deps
    );

    const afgeleid = useMemo(() => {
        const rows = data || [];
        const nu = new Date();
        const ma = startOfWeek(nu);
        const zo = addDays(ma, 7);
        const d = (s: any) => parseServerDate(s.start_tijd) || new Date(0);
        const ingepland = rows.filter((s) => s.status === 'ingepland');
        const vandaag = ingepland.filter((s) => isSameDay(d(s), nu));
        const ziek = rows.filter((s) => s.status === 'ziek' && (parseServerDate(s.eind_tijd) || nu) >= ma);
        const verlofVandaag = rows.filter((s) => s.status === 'verlof_goedgekeurd' && isSameDay(d(s), nu));
        const eindVandaag = new Date(nu);
        eindVandaag.setHours(23, 59, 59, 999);
        const toekomstigVerlof = rows.filter((s) => s.status === 'verlof_goedgekeurd' && d(s) > eindVandaag).sort((a, b) => d(a).getTime() - d(b).getTime());
        const binnenkort = ingepland
            .filter((s) => (parseServerDate(s.eind_tijd) || nu) >= nu)
            .sort((a, b) => d(a).getTime() - d(b).getTime())
            .slice(0, 10);
        const urenPerDag = [0, 0, 0, 0, 0, 0, 0];
        const perLocatie: Record<string, number> = {};
        ingepland
            .filter((s) => d(s) >= ma && d(s) < zo)
            .forEach((s) => {
                urenPerDag[(d(s).getDay() + 6) % 7] += parseFloat(s.uren) || 0;
                const loc = s.locatie_naam || 'Centraal';
                perLocatie[loc] = (perLocatie[loc] || 0) + 1;
            });
        const groepen: Record<string, any[]> = {};
        vandaag.forEach((s) => {
            const n = s.locatie_naam || 'Centraal';
            (groepen[n] = groepen[n] || []).push(s);
        });
        return { vandaag, ziek, verlofVandaag, toekomstigVerlof, binnenkort, urenPerDag, perLocatie, groepen, weekUren: urenPerDag.reduce((a, b) => a + b, 0) };
    }, [data]);

    const max = Math.max(1, ...afgeleid.urenPerDag);
    const locMax = Math.max(1, ...Object.values(afgeleid.perLocatie));
    const vandaagIdx = (new Date().getDay() + 6) % 7;

    const snel: Snel[] = [
        { icon: 'create-outline', label: 'Planning', href: '/(app)/beheer/planning', tone: 'blue' },
        { icon: 'git-compare-outline', label: 'Ruil & verlof', href: '/(app)/beheer/ruil-verlof', tone: 'amber', badge: status.beheerOpen },
        { icon: 'megaphone-outline', label: 'Mededelingen', href: '/(app)/beheer/mededelingen', tone: 'purple' },
        { icon: 'people-outline', label: 'Medewerkers', href: '/(app)/beheer/medewerkers', tone: 'emerald' },
        { icon: 'stopwatch-outline', label: 'Uren', href: '/(app)/beheer/uren', tone: 'slate' },
        { icon: 'calendar-outline', label: 'Team rooster', href: '/(app)/beheer/team-rooster', tone: 'blue' },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            {data === null ? (
                <CenteredLoader />
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => laad(true)} />}>
                    <Text style={styles.datum}>{new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                    <Text style={styles.welkom}>Welkom terug, {user?.voornaam}</Text>
                    <AbonnementBanner />
                    <ErrorBanner message={error} />

                    <View style={styles.kpis}>
                        <StatTile label="Diensten vandaag" value={afgeleid.vandaag.length} icon="today-outline" tone="blue" />
                        <StatTile label="Uren deze week" value={afgeleid.weekUren.toFixed(1)} icon="stopwatch-outline" tone="emerald" />
                    </View>
                    <View style={[styles.kpis, { marginTop: 8 }]}>
                        <StatTile label="Locaties" value={aantalLocaties ?? '-'} icon="location-outline" tone="purple" onPress={() => router.push('/(app)/beheer/locaties')} />
                        <StatTile label="Ziek" value={afgeleid.ziek.length} icon="medkit-outline" tone="rose" onPress={() => setZiekOpen(true)} />
                    </View>

                    <View style={styles.snelGrid}>
                        {snel.map((s) => (
                            <Pressable key={s.label} onPress={() => router.push(s.href)} style={({ pressed }) => [styles.snel, pressed && { opacity: 0.85 }]}>
                                <IconTile name={s.icon} tone={s.tone} size={36} />
                                <Text style={styles.snelLabel} numberOfLines={1}>
                                    {s.label}
                                </Text>
                                {s.badge ? (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeTekst}>{s.badge}</Text>
                                    </View>
                                ) : null}
                            </Pressable>
                        ))}
                    </View>

                    {/* Uren per weekdag: één reeks, één kleur; tik een staaf voor de waarde. */}
                    <Card style={{ marginTop: 14 }}>
                        <CardHeader
                            icon="bar-chart-outline"
                            title="Ingeplande uren"
                            subtitle={geselecteerdeDag === null ? 'Deze week, per dag' : `${KORT[geselecteerdeDag]}: ${formatUren(afgeleid.urenPerDag[geselecteerdeDag])} uur`}
                        />
                        <View style={styles.chart}>
                            {afgeleid.urenPerDag.map((u, i) => (
                                <Pressable key={i} style={styles.kolom} onPress={() => setGeselecteerdeDag(geselecteerdeDag === i ? null : i)}>
                                    <Text style={styles.kolomWaarde}>{u > 0 ? Math.round(u) : ''}</Text>
                                    <View style={styles.staafRuimte}>
                                        <View
                                            style={[
                                                styles.staaf,
                                                { height: `${(u / max) * 100}%`, backgroundColor: geselecteerdeDag === i || (geselecteerdeDag === null && i === vandaagIdx) ? colors.primary : '#93c5fd' },
                                            ]}
                                        />
                                    </View>
                                    <Text style={[styles.kolomLabel, i === vandaagIdx && { color: colors.primary }]}>{KORT[i]}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </Card>

                    {Object.keys(afgeleid.perLocatie).length > 0 ? (
                        <Card style={{ marginTop: 14 }}>
                            <CardHeader icon="pie-chart-outline" tone="purple" title="Diensten per locatie" subtitle="Deze week" />
                            {Object.entries(afgeleid.perLocatie)
                                .sort((a, b) => b[1] - a[1])
                                .map(([naam, n]) => (
                                    <View key={naam} style={{ marginBottom: 10 }}>
                                        <View style={styles.locKop}>
                                            <Text style={styles.locNaam}>{naam}</Text>
                                            <Text style={styles.locWaarde}>{n}</Text>
                                        </View>
                                        <View style={styles.locTrack}>
                                            <View style={[styles.locBalk, { width: `${(n / locMax) * 100}%` }]} />
                                        </View>
                                    </View>
                                ))}
                        </Card>
                    ) : null}

                    <Card style={{ marginTop: 14 }}>
                        <CardHeader icon="people-outline" title="Bezetting vandaag" />
                        {Object.keys(afgeleid.groepen).length === 0 ? (
                            <EmptyState icon="cafe-outline" title="Niemand ingepland vandaag" />
                        ) : (
                            Object.entries(afgeleid.groepen).map(([naam, mensen]) => (
                                <View key={naam} style={styles.groep}>
                                    <View style={styles.locKop}>
                                        <Text style={styles.groepNaam}>
                                            <Ionicons name="location" size={13} color={colors.primary} /> {naam}
                                        </Text>
                                        <Badge label={`${mensen.length} pers.`} />
                                    </View>
                                    {mensen.map((m) => (
                                        <View key={m.uuid} style={styles.persoon}>
                                            <Avatar naam={m.medewerker_naam} size={26} />
                                            <Text style={styles.persoonNaam} numberOfLines={1}>
                                                {m.medewerker_naam}
                                            </Text>
                                            <Text style={styles.tijd}>
                                                {formatTime(m.start_tijd)}–{formatTime(m.eind_tijd)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            ))
                        )}
                    </Card>

                    <Card style={{ marginTop: 14 }}>
                        <CardHeader
                            icon="umbrella-outline"
                            tone="amber"
                            title="Verlof vandaag"
                            subtitle={`${afgeleid.verlofVandaag.length} ${afgeleid.verlofVandaag.length === 1 ? 'persoon' : 'personen'}`}
                            right={
                                <Pressable onPress={() => setVerlofOpen(true)} hitSlop={8}>
                                    <Text style={styles.link}>Toekomstig</Text>
                                </Pressable>
                            }
                        />
                        {afgeleid.verlofVandaag.length === 0 ? (
                            <Text style={styles.leeg}>Niemand met verlof vandaag</Text>
                        ) : (
                            afgeleid.verlofVandaag.map((v) => (
                                <View key={v.uuid} style={styles.persoon}>
                                    <Avatar naam={v.medewerker_naam} size={26} />
                                    <Text style={styles.persoonNaam}>{v.medewerker_naam}</Text>
                                    <Text style={styles.tijd} numberOfLines={1}>
                                        {v.notitie || 'Hele dag'}
                                    </Text>
                                </View>
                            ))
                        )}
                    </Card>

                    <Card style={{ marginTop: 14 }}>
                        <CardHeader icon="time-outline" title="Binnenkort" subtitle="De eerstvolgende 10 diensten" />
                        {afgeleid.binnenkort.length === 0 ? (
                            <Text style={styles.leeg}>Geen diensten ingepland</Text>
                        ) : (
                            afgeleid.binnenkort.map((s) => (
                                <View key={s.uuid} style={styles.persoon}>
                                    <Avatar naam={s.medewerker_naam} size={26} />
                                    <Text style={styles.persoonNaam} numberOfLines={1}>
                                        {s.medewerker_naam}
                                    </Text>
                                    <Text style={styles.tijd}>
                                        {parseServerDate(s.start_tijd)?.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime(s.start_tijd)}
                                    </Text>
                                </View>
                            ))
                        )}
                    </Card>
                </ScrollView>
            )}

            <Sheet visible={verlofOpen} onClose={() => setVerlofOpen(false)} title="Toekomstig verlof" subtitle="Goedgekeurd, per dag">
                {afgeleid.toekomstigVerlof.length === 0 ? (
                    <EmptyState icon="umbrella-outline" title="Geen toekomstig verlof gepland" />
                ) : (
                    afgeleid.toekomstigVerlof.map((v) => (
                        <View key={`${v.uuid}-${v.start_tijd}`} style={styles.persoon}>
                            <Avatar naam={v.medewerker_naam} size={28} />
                            <Text style={styles.persoonNaam}>{v.medewerker_naam}</Text>
                            <Text style={styles.tijd}>
                                {parseServerDate(v.start_tijd)?.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatUren(v.uren)} u
                            </Text>
                        </View>
                    ))
                )}
            </Sheet>
            <Sheet visible={ziekOpen} onClose={() => setZiekOpen(false)} title="Ziekmeldingen" footer={<Text onPress={() => { setZiekOpen(false); router.push('/(app)/beheer/ruil-verlof'); }} style={[styles.link, { textAlign: 'center', paddingVertical: 8 }]}>Beheren in Ruil & verlof</Text>}>
                {afgeleid.ziek.length === 0 ? (
                    <EmptyState icon="checkmark-circle-outline" title="Geen openstaande meldingen" />
                ) : (
                    afgeleid.ziek.map((s) => (
                        <View key={s.uuid} style={styles.persoon}>
                            <Avatar naam={s.medewerker_naam} size={28} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.persoonNaam}>{s.medewerker_naam}</Text>
                                <Text style={styles.tijd}>
                                    {s.locatie_naam || 'Onbekend'} · {parseServerDate(s.start_tijd)?.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}
                                </Text>
                            </View>
                            <Badge label="Ziek" tone="rose" />
                        </View>
                    ))
                )}
            </Sheet>
        </View>
    );
}

const styles = StyleSheet.create({
    datum: { fontSize: 10, fontWeight: '900', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1.4, marginLeft: 4 },
    welkom: { fontSize: 22, fontWeight: '900', color: colors.ink, letterSpacing: -0.6, marginLeft: 4, marginBottom: 14, marginTop: 2 },
    kpis: { flexDirection: 'row', gap: 8 },
    snelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    snel: { flexBasis: '31%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 12, gap: 8 },
    snelLabel: { fontSize: 12, fontWeight: '900', color: colors.ink },
    badge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#ef4444', borderRadius: 999, minWidth: 20, height: 20, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
    badgeTekst: { color: '#fff', fontSize: 10, fontWeight: '900' },
    chart: { flexDirection: 'row', height: 170, gap: 6, alignItems: 'flex-end' },
    kolom: { flex: 1, alignItems: 'center', height: '100%' },
    kolomWaarde: { fontSize: 10, fontWeight: '800', color: colors.textMuted, height: 14 },
    staafRuimte: { flex: 1, width: '100%', justifyContent: 'flex-end', paddingHorizontal: 4 },
    staaf: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 2 },
    kolomLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, marginTop: 6 },
    locKop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    locNaam: { fontSize: 13, fontWeight: '700', color: colors.text },
    locWaarde: { fontSize: 13, fontWeight: '900', color: colors.ink },
    locTrack: { height: 8, borderRadius: 4, backgroundColor: colors.slateSoft, overflow: 'hidden' },
    locBalk: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
    groep: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 12, marginBottom: 8 },
    groepNaam: { fontSize: 14, fontWeight: '900', color: colors.ink },
    persoon: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
    persoonNaam: { flex: 1, fontSize: 13, fontWeight: '800', color: colors.ink },
    tijd: { fontSize: 12, fontWeight: '700', color: colors.textMuted, maxWidth: '50%' },
    link: { fontSize: 12, fontWeight: '900', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.6 },
    leeg: { fontSize: 13, color: colors.subtle, fontWeight: '600', textAlign: 'center', paddingVertical: 8 },
});
