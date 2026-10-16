import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
    Avatar,
    Badge,
    BadgeTone,
    Card,
    CardHeader,
    CenteredLoader,
    Chip,
    ChipRow,
    DateField,
    EmptyState,
    ErrorBanner,
    FieldLabel,
    HeroCard,
    IconButtonSmall,
    PrimaryButton,
    SearchField,
    Segmented,
    Sheet,
    TextField,
} from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useOrgSettings } from '../../../src/hooks/useOrgSettings';
import { useRoleGuard } from '../../../src/hooks/useRoleGuard';
import { ApiError } from '../../../src/lib/api';
import { normaliseer, parseServerDate, toIsoDate } from '../../../src/lib/format';
import { CORRECTIE_LABELS, deelPdf, teamUrenHtml, urenoverzichtHtml } from '../../../src/lib/pdf';
import { schoonId } from '../../../src/lib/planning';
import { PlanningApi } from '../../../src/lib/services';
import { colors, PLANNER_PLUS } from '../../../src/lib/theme';

const TYPE_TONE: Record<string, BadgeTone> = { ziek: 'rose', overuren: 'emerald', minuren: 'amber', bijzonder_verlof: 'purple' };
const isMin = (t: string) => t === 'minuren' || t === 'ziek';

function huidigeMaand() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function verschuif(maand: string, n: number) {
    const [j, m] = maand.split('-').map(Number);
    const d = new Date(j, m - 1 + n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function maandLabel(maand: string) {
    const [j, m] = maand.split('-').map(Number);
    return new Date(j, m - 1, 1).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
}
const fmt = (n: number) => n.toFixed(2);

export default function UrenScreen() {
    useRoleGuard(PLANNER_PLUS);
    const { user } = useAuth();
    const settings = useOrgSettings();
    const [tab, setTab] = useState<'team' | 'individueel'>('team');
    const [maand, setMaand] = useState(huidigeMaand());
    const [medewerkers, setMedewerkers] = useState<any[]>([]);

    // Team
    const [team, setTeam] = useState<any[] | null>(null);
    const [teamLaden, setTeamLaden] = useState(false);
    const [zoek, setZoek] = useState('');
    const [open, setOpen] = useState<string | null>(null);
    const [spec, setSpec] = useState<Record<string, any[] | null>>({});
    const [error, setError] = useState('');

    // Individueel
    const [gekozen, setGekozen] = useState<string>('');
    const [indiv, setIndiv] = useState<{ correcties: any[]; totaalGepland: number } | null>(null);
    const [indivLaden, setIndivLaden] = useState(false);
    const [nieuwOpen, setNieuwOpen] = useState(false);
    const [cDatum, setCDatum] = useState(new Date());
    const [cType, setCType] = useState('overuren');
    const [cUren, setCUren] = useState('');
    const [cNotitie, setCNotitie] = useState('');
    const [bezig, setBezig] = useState<string | null>(null);

    useEffect(() => {
        if (user) (PlanningApi.medewerkers(user.org_uuid) as Promise<any[]>).then((r) => setMedewerkers(r || [])).catch(() => {});
    }, [user?.org_uuid]); // eslint-disable-line react-hooks/exhaustive-deps

    // Zoals laadTeamOverzicht(): correcties per medewerker opnieuw optellen (ziek telt negatief).
    const laadTeam = useCallback(async () => {
        if (!user) return;
        setTeamLaden(true);
        setError('');
        setSpec({});
        setOpen(null);
        try {
            const rows = (await PlanningApi.maandoverzichtTeam(user.org_uuid, maand)) as any[];
            const met = await Promise.all(
                (rows || []).map(async (m) => {
                    let correctie = 0;
                    try {
                        const c: any = await PlanningApi.correcties(user.org_uuid, m.gebruiker_uuid, maand);
                        (c?.correcties || []).forEach((x: any) => {
                            const u = parseFloat(x.uren) || 0;
                            correctie += isMin(x.type) ? -u : u;
                        });
                    } catch {
                        correctie = parseFloat(m.correctie_uren) || 0;
                    }
                    return { ...m, gepland: parseFloat(m.geplande_uren) || 0, correctie };
                })
            );
            setTeam(met);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Kon het teamoverzicht niet laden.');
        } finally {
            setTeamLaden(false);
        }
    }, [user, maand]);

    const laadIndiv = useCallback(async () => {
        if (!user || !gekozen) return;
        setIndivLaden(true);
        try {
            const r: any = await PlanningApi.correcties(user.org_uuid, gekozen, maand);
            setIndiv({ correcties: r?.correcties || [], totaalGepland: parseFloat(r?.totaalGepland) || 0 });
        } catch (err) {
            Alert.alert('Fout', err instanceof ApiError ? err.message : 'Kon de correcties niet laden.');
        } finally {
            setIndivLaden(false);
        }
    }, [user, gekozen, maand]);

    useEffect(() => {
        if (tab === 'team') laadTeam();
    }, [tab, laadTeam]);
    useEffect(() => {
        if (tab === 'individueel') laadIndiv();
    }, [tab, laadIndiv]);

    async function toggleSpec(uuid: string) {
        if (open === uuid) return setOpen(null);
        setOpen(uuid);
        if (spec[uuid]) return;
        try {
            const r: any = await PlanningApi.maandSpecificatie(user!.org_uuid, uuid, maand);
            const lijst = [...(r?.shifts || []), ...(r?.correcties || [])].sort((a, b) => String(a.datum).localeCompare(String(b.datum)));
            setSpec((s) => ({ ...s, [uuid]: lijst }));
        } catch {
            setSpec((s) => ({ ...s, [uuid]: [] }));
        }
    }

    const teamGefilterd = useMemo(() => {
        const t = normaliseer(zoek.trim());
        return (team || []).filter((m) => !t || normaliseer(`${m.voornaam} ${m.achternaam}`).includes(t));
    }, [team, zoek]);
    const som = teamGefilterd.reduce((a, m) => ({ g: a.g + m.gepland, c: a.c + m.correctie }), { g: 0, c: 0 });

    const correctieTotaal = (indiv?.correcties || []).reduce((a, c) => a + (isMin(c.type) ? -1 : 1) * (parseFloat(c.uren) || 0), 0);

    async function bewaarCorrectie() {
        const uren = Math.abs(parseFloat(cUren.replace(',', '.')));
        if (!uren) return Alert.alert('Uren ontbreken', 'Vul het aantal uren in.');
        setBezig('opslaan');
        try {
            await PlanningApi.addCorrectie({ gebruiker_uuid: gekozen, datum: toIsoDate(cDatum), type: cType, uren, notitie: cNotitie.trim() });
            setNieuwOpen(false);
            setCUren('');
            setCNotitie('');
            laadIndiv();
        } catch (err) {
            Alert.alert('Opslaan mislukt', err instanceof ApiError ? err.message : 'Probeer het opnieuw.');
        } finally {
            setBezig(null);
        }
    }

    function verwijderCorrectie(c: any) {
        Alert.alert('Correctie verwijderen?', 'Weet je zeker dat je deze correctie wilt verwijderen?', [
            { text: 'Annuleren', style: 'cancel' },
            {
                text: 'Verwijderen',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await PlanningApi.deleteCorrectie(c.uuid);
                        laadIndiv();
                    } catch (err) {
                        Alert.alert('Mislukt', err instanceof ApiError ? err.message : 'Kon de correctie niet verwijderen.');
                    }
                },
            },
        ]);
    }

    async function pdfTeam() {
        if (!team || team.length === 0) return Alert.alert('Geen gegevens', 'Er zijn geen teamgegevens voor deze maand.');
        setBezig('pdf');
        try {
            await deelPdf(
                teamUrenHtml({
                    orgNaam: settings?.naam || 'Organisatie',
                    maandLabel: maandLabel(maand),
                    rijen: team.map((m) => ({ naam: `${m.voornaam} ${m.achternaam}`, gepland: m.gepland, correctie: m.correctie })),
                }),
                `Urenoverzicht team ${maandLabel(maand)}`
            );
        } catch (err) {
            Alert.alert('PDF mislukt', err instanceof Error ? err.message : 'Probeer het opnieuw.');
        } finally {
            setBezig(null);
        }
    }

    async function pdfIndiv() {
        const m = medewerkers.find((x) => schoonId(x.uuid) === gekozen);
        if (!m) return;
        setBezig('pdf');
        try {
            const items = (await PlanningApi.mijnRooster(gekozen)) as any[];
            const [j, mm] = maand.split('-').map(Number);
            const inMaand = (items || []).filter((i) => {
                const d = parseServerDate(i.start_tijd);
                return d && d.getFullYear() === j && d.getMonth() + 1 === mm;
            });
            if (inMaand.length === 0 && !(indiv?.correcties || []).length) return Alert.alert('Geen gegevens', 'Geen diensten of verlof gevonden in deze maand.');
            await deelPdf(urenoverzichtHtml({ naam: `${m.voornaam} ${m.achternaam}`, periode: maandLabel(maand), items: inMaand, correcties: indiv?.correcties }), 'Urenoverzicht');
        } catch (err) {
            Alert.alert('PDF mislukt', err instanceof Error ? err.message : 'Probeer het opnieuw.');
        } finally {
            setBezig(null);
        }
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <View style={styles.top}>
                <Segmented
                    value={tab}
                    onChange={setTab}
                    options={[
                        { value: 'team', label: 'Team' },
                        { value: 'individueel', label: 'Per medewerker' },
                    ]}
                />
                <View style={styles.maandNav}>
                    <Pressable onPress={() => setMaand(verschuif(maand, -1))} style={styles.navBtn}>
                        <Ionicons name="chevron-back" size={18} color={colors.text} />
                    </Pressable>
                    <Text style={styles.maand}>{maandLabel(maand)}</Text>
                    <Pressable onPress={() => setMaand(verschuif(maand, 1))} style={styles.navBtn}>
                        <Ionicons name="chevron-forward" size={18} color={colors.text} />
                    </Pressable>
                </View>
            </View>

            {tab === 'team' ? (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={false} onRefresh={laadTeam} />} keyboardShouldPersistTaps="handled">
                    <ErrorBanner message={error} />
                    <HeroCard>
                        <Text style={styles.heroLabel}>Team totaal · {maandLabel(maand)}</Text>
                        <Text style={styles.heroWaarde}>{fmt(som.g + som.c)} uur</Text>
                        <Text style={styles.heroSub}>
                            {fmt(som.g)} gepland · {som.c >= 0 ? '+' : ''}
                            {fmt(som.c)} correcties
                        </Text>
                        <PrimaryButton title="Team-PDF" icon="document-outline" variant="secondary" small onPress={pdfTeam} loading={bezig === 'pdf'} style={{ marginTop: 14, alignSelf: 'flex-start' }} />
                    </HeroCard>
                    <SearchField value={zoek} onChangeText={setZoek} placeholder="Zoek medewerker..." style={{ marginVertical: 12 }} />
                    {teamLaden ? (
                        <CenteredLoader />
                    ) : teamGefilterd.length === 0 ? (
                        <Card>
                            <EmptyState icon="stats-chart-outline" title="Geen gegevens" subtitle="Geen gegevens gevonden voor deze maand." />
                        </Card>
                    ) : (
                        <Card style={{ padding: 6 }}>
                            {teamGefilterd.map((m, i) => {
                                const totaal = m.gepland + m.correctie;
                                const isOpen = open === m.gebruiker_uuid;
                                return (
                                    <View key={m.gebruiker_uuid} style={i > 0 && styles.border}>
                                        <Pressable onPress={() => toggleSpec(m.gebruiker_uuid)} style={[styles.teamRij, isOpen && { backgroundColor: colors.primarySoft }]}>
                                            <Avatar naam={`${m.voornaam} ${m.achternaam}`} size={36} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.naam}>
                                                    {m.voornaam} {m.achternaam}
                                                </Text>
                                                <Text style={styles.sub}>
                                                    {m.gepland > 0 ? fmt(m.gepland) : '-'} gepland
                                                    {m.correctie !== 0 ? (
                                                        <Text style={{ color: m.correctie > 0 ? colors.success : colors.danger, fontWeight: '800' }}>
                                                            {'  '}
                                                            {m.correctie > 0 ? '+' : ''}
                                                            {fmt(m.correctie)}
                                                        </Text>
                                                    ) : null}
                                                </Text>
                                            </View>
                                            <Text style={styles.totaal}>{fmt(totaal)} u</Text>
                                            <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.subtle} />
                                        </Pressable>
                                        {isOpen ? (
                                            <View style={styles.spec}>
                                                {!spec[m.gebruiker_uuid] ? (
                                                    <ActivityIndicator color={colors.primary} />
                                                ) : spec[m.gebruiker_uuid]!.length === 0 ? (
                                                    <Text style={styles.leeg}>Geen uren geregistreerd in deze maand.</Text>
                                                ) : (
                                                    spec[m.gebruiker_uuid]!.map((item, k) => (
                                                        <View key={k} style={styles.specRij}>
                                                            <Text style={styles.specDatum}>{String(item.datum).split('-').reverse().slice(0, 2).join('-')}</Text>
                                                            {item.soort === 'dienst' ? (
                                                                <>
                                                                    <Badge label="Gewerkt" tone="blue" />
                                                                    <Text style={styles.specTekst} numberOfLines={1}>
                                                                        {item.start}–{item.eind}
                                                                        {item.pauze_minuten > 0 ? ` (${item.pauze_minuten}m)` : ''}
                                                                    </Text>
                                                                    <Text style={styles.specUren}>{item.uren} u</Text>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Badge label={CORRECTIE_LABELS[item.type] || 'Aanpassing'} tone={TYPE_TONE[item.type] || 'default'} />
                                                                    <Text style={styles.specTekst} numberOfLines={1}>
                                                                        {item.notitie || '-'}
                                                                    </Text>
                                                                    <Text style={[styles.specUren, { color: isMin(item.type) ? colors.danger : colors.success }]}>
                                                                        {isMin(item.type) ? '-' : '+'}
                                                                        {item.uren} u
                                                                    </Text>
                                                                </>
                                                            )}
                                                        </View>
                                                    ))
                                                )}
                                                <PrimaryButton
                                                    small
                                                    variant="soft"
                                                    title="Correcties beheren"
                                                    icon="create-outline"
                                                    onPress={() => {
                                                        setGekozen(m.gebruiker_uuid);
                                                        setTab('individueel');
                                                    }}
                                                    style={{ marginTop: 10 }}
                                                />
                                            </View>
                                        ) : null}
                                    </View>
                                );
                            })}
                        </Card>
                    )}
                </ScrollView>
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                    <FieldLabel>Medewerker</FieldLabel>
                    <ChipRow style={{ marginBottom: 14 }}>
                        {medewerkers.map((m) => (
                            <Chip key={m.uuid} label={`${m.voornaam} ${m.achternaam}`} active={schoonId(m.uuid) === schoonId(gekozen)} onPress={() => setGekozen(schoonId(m.uuid))} />
                        ))}
                    </ChipRow>
                    {!gekozen ? (
                        <Card>
                            <EmptyState icon="person-outline" title="Kies een medewerker" subtitle="Bekijk de geplande uren en voeg correcties toe." />
                        </Card>
                    ) : indivLaden || !indiv ? (
                        <CenteredLoader />
                    ) : (
                        <>
                            <HeroCard>
                                <Text style={styles.heroLabel}>Totaal {maandLabel(maand)}</Text>
                                <Text style={styles.heroWaarde}>{fmt(indiv.totaalGepland + correctieTotaal)} uur</Text>
                                <Text style={styles.heroSub}>
                                    {fmt(indiv.totaalGepland)} gepland · {correctieTotaal >= 0 ? '+' : ''}
                                    {fmt(correctieTotaal)} correcties
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                                    <PrimaryButton small title="Correctie" icon="add" onPress={() => setNieuwOpen(true)} style={{ flex: 1 }} />
                                    <PrimaryButton small variant="secondary" title="PDF" icon="document-outline" onPress={pdfIndiv} loading={bezig === 'pdf'} style={{ flex: 1 }} />
                                </View>
                            </HeroCard>
                            <Card style={{ marginTop: 14 }}>
                                <CardHeader icon="git-commit-outline" title="Correcties" subtitle={`${indiv.correcties.length} in deze maand`} />
                                {indiv.correcties.length === 0 ? (
                                    <Text style={styles.leeg}>Geen correcties gevonden in deze maand.</Text>
                                ) : (
                                    indiv.correcties.map((c, i) => (
                                        <View key={c.uuid} style={[styles.corrRij, i > 0 && styles.border]}>
                                            <View style={{ flex: 1, gap: 4 }}>
                                                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                                    <Text style={styles.naam}>{String(c.datum).split('-').reverse().join('-')}</Text>
                                                    <Badge label={CORRECTIE_LABELS[c.type] || c.type} tone={TYPE_TONE[c.type] || 'default'} />
                                                </View>
                                                {c.notitie ? <Text style={styles.sub}>{c.notitie}</Text> : null}
                                            </View>
                                            <Text style={[styles.totaal, { color: isMin(c.type) ? colors.danger : colors.success }]}>
                                                {isMin(c.type) ? '-' : '+'}
                                                {(parseFloat(c.uren) || 0).toFixed(2)}
                                            </Text>
                                            <IconButtonSmall name="trash-outline" tone="danger" onPress={() => verwijderCorrectie(c)} />
                                        </View>
                                    ))
                                )}
                            </Card>
                        </>
                    )}
                </ScrollView>
            )}

            <Sheet
                visible={nieuwOpen}
                onClose={() => setNieuwOpen(false)}
                title="Correctie toevoegen"
                footer={<PrimaryButton title="Opslaan" icon="checkmark" onPress={bewaarCorrectie} loading={bezig === 'opslaan'} />}
            >
                <DateField label="Datum" value={cDatum} onChange={setCDatum} />
                <FieldLabel>Type</FieldLabel>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                    {Object.entries(CORRECTIE_LABELS).map(([k, l]) => (
                        <Chip key={k} label={l} active={cType === k} onPress={() => setCType(k)} />
                    ))}
                </View>
                <TextField label="Uren" value={cUren} onChangeText={setCUren} keyboardType="decimal-pad" placeholder="Bijv. 2,5" />
                <TextField label="Notitie (optioneel)" value={cNotitie} onChangeText={setCNotitie} placeholder="Reden of toelichting" />
            </Sheet>
        </View>
    );
}

const styles = StyleSheet.create({
    top: { backgroundColor: '#fff', padding: 16, paddingTop: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
    maandNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    navBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.slateSoft, alignItems: 'center', justifyContent: 'center' },
    maand: { fontSize: 15, fontWeight: '900', color: colors.ink, textTransform: 'capitalize' },
    heroLabel: { fontSize: 10, fontWeight: '900', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 1.4 },
    heroWaarde: { fontSize: 34, fontWeight: '900', color: '#fff', letterSpacing: -1, marginTop: 4 },
    heroSub: { fontSize: 13, color: '#94a3b8', fontWeight: '700', marginTop: 2 },
    border: { borderTopWidth: 1, borderTopColor: colors.line },
    teamRij: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14 },
    naam: { fontSize: 14, fontWeight: '900', color: colors.ink },
    sub: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 1 },
    totaal: { fontSize: 15, fontWeight: '900', color: colors.primaryDark },
    spec: { backgroundColor: colors.inputBg, borderRadius: 14, padding: 10, margin: 6, gap: 2 },
    specRij: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
    specDatum: { width: 40, fontSize: 12, fontWeight: '800', color: colors.text },
    specTekst: { flex: 1, fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    specUren: { fontSize: 12, fontWeight: '900', color: colors.ink },
    leeg: { fontSize: 13, color: colors.subtle, fontWeight: '600', textAlign: 'center', paddingVertical: 10 },
    corrRij: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
});
