import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
    Avatar,
    Badge,
    Card,
    CenteredLoader,
    EmptyState,
    ErrorBanner,
    IconButtonSmall,
    PrimaryButton,
    SearchField,
    Segmented,
    Sheet,
    StatTile,
    TextField,
} from '../../../src/components/ui';
import { useAppStatus } from '../../../src/contexts/AppStatusContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useRoleGuard } from '../../../src/hooks/useRoleGuard';
import { ApiError } from '../../../src/lib/api';
import { formatTime, isSameDay, normaliseer, parseServerDate } from '../../../src/lib/format';
import { schoonId } from '../../../src/lib/planning';
import { AuthApi, PlanningApi, RuilbeursApi, VerlofApi } from '../../../src/lib/services';
import { colors, PLANNER_PLUS, roleLabels } from '../../../src/lib/theme';
import { parseInstellingen } from '../../../src/lib/verlof';

type Tab = 'verlof' | 'ruil' | 'ziek' | 'saldo';
type LogItem = { tijd: string; type: string; tekst: string; ok: boolean };

const kort = (d: Date) => d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
const fmt = (n: number) => Number(n).toFixed(2).replace(/\.00$/, '');

// Groepeert de per-dag uitgeklapte verlofregels van /totaal terug naar één aanvraag.
function groepeerVerlof(rows: any[]) {
    const g: Record<string, any> = {};
    rows.forEach((r) => {
        if (!g[r.uuid]) g[r.uuid] = { uuid: r.uuid, gebruiker_uuid: r.gebruiker_uuid, naam: r.medewerker_naam || r.voornaam || 'Onbekend', reden: r.notitie || 'Verlof', uren: parseFloat(r.totaal_uren) || 0, status: r.status, dates: [] as Date[] };
        const a = parseServerDate(r.start_tijd);
        const b = parseServerDate(r.eind_tijd);
        if (a) g[r.uuid].dates.push(a);
        if (b) g[r.uuid].dates.push(b);
    });
    return Object.values(g).map((x: any) => ({ ...x, start: new Date(Math.min(...x.dates)), eind: new Date(Math.max(...x.dates)) }));
}

export default function RuilVerlofBeheerScreen() {
    useRoleGuard(PLANNER_PLUS);
    const { user } = useAuth();
    const status = useAppStatus();
    const [tab, setTab] = useState<Tab>('verlof');
    const [zoek, setZoek] = useState('');
    const [laden, setLaden] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [planning, setPlanning] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [ruil, setRuil] = useState<any[]>([]);
    const [ziek, setZiek] = useState<any[]>([]);
    const [bezig, setBezig] = useState<string | null>(null);
    const [log, setLog] = useState<LogItem[]>([]);
    const [logOpen, setLogOpen] = useState(false);
    const [openTeam, setOpenTeam] = useState<string | null>(null);
    const [urenEdit, setUrenEdit] = useState<{ uuid: string; naam: string; datum: string; uren: string } | null>(null);
    const [saldoEdit, setSaldoEdit] = useState<{ uuid: string; naam: string; saldo: string; inst: any } | null>(null);

    const laad = useCallback(
        async (isRefresh = false) => {
            if (!user) return;
            if (isRefresh) setRefreshing(true);
            setError('');
            try {
                const [s, p, r, z] = await Promise.all([
                    PlanningApi.medewerkers(user.org_uuid) as Promise<any[]>,
                    PlanningApi.totaal(user.org_uuid) as Promise<any[]>,
                    (RuilbeursApi.adminOverzicht(user.org_uuid) as Promise<any[]>).catch(() => []),
                    (PlanningApi.ziekmeldingen(user.org_uuid) as Promise<any[]>).catch(() => []),
                ]);
                setStaff(s || []);
                setPlanning(p || []);
                const pl = p || [];
                setRuil(
                    (r || [])
                        .filter((x) => x.status === 'wacht_op_manager')
                        .map((x) => {
                            const d = parseServerDate(x.hun_dienst_start);
                            const conflict = !!d && pl.some((q) => schoonId(q.gebruiker_uuid) === schoonId(x.naar_gebruiker_uuid) && q.status === 'ingepland' && isSameDay(parseServerDate(q.start_tijd) || new Date(0), d));
                            return { ...x, conflict };
                        })
                );
                setZiek(z || []);
            } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Kon de gegevens niet laden.');
            } finally {
                setLaden(false);
                setRefreshing(false);
            }
        },
        [user]
    );

    useEffect(() => {
        laad();
    }, [laad]);

    function logboek(type: string, tekst: string, ok: boolean) {
        setLog((l) => [{ tijd: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }), type, tekst, ok }, ...l]);
    }

    const verlof = useMemo(() => groepeerVerlof(planning.filter((i) => ['verlof_aanvraag', 'aanvraag', 'in_afwachting'].includes(String(i.status || '').toLowerCase()))), [planning]);

    const teamData = useMemo(
        () =>
            staff
                .map((m) => {
                    const inst = parseInstellingen(m.instellingen);
                    const saldo = parseFloat(inst.verlofsaldo) || 0;
                    const eigen = planning.filter((p) => schoonId(p.gebruiker_uuid) === schoonId(m.uuid) && ['verlof_aanvraag', 'verlof_goedgekeurd'].includes(String(p.status)));
                    const groepen = groepeerVerlof(eigen);
                    const opgenomen = groepen.filter((g) => g.status === 'verlof_goedgekeurd').reduce((a, g) => a + g.uren, 0);
                    const wachtend = groepen.filter((g) => g.status !== 'verlof_goedgekeurd').reduce((a, g) => a + g.uren, 0);
                    const periodes = groepen.filter((g) => g.status === 'verlof_goedgekeurd').sort((a, b) => b.start.getTime() - a.start.getTime());
                    return { uuid: m.uuid, naam: `${m.voornaam} ${m.achternaam}`, rol: m.rol, inst, saldo, opgenomen, wachtend, resterend: Math.max(0, saldo - opgenomen), periodes };
                })
                .sort((a, b) => a.naam.localeCompare(b.naam)),
        [staff, planning]
    );

    const t = normaliseer(zoek.trim());
    const fVerlof = verlof.filter((v: any) => !t || normaliseer(`${v.naam} ${v.reden}`).includes(t));
    const fRuil = ruil.filter((r) => !t || normaliseer(`${r.van_collega} ${r.naar_collega}`).includes(t));
    const fZiek = ziek.filter((z) => !t || normaliseer(z.medewerker_naam).includes(t));
    const fTeam = teamData.filter((x) => !t || normaliseer(x.naam).includes(t));

    async function verwerk(key: string, actie: () => Promise<unknown>, log: [string, string, boolean]) {
        setBezig(key);
        try {
            await actie();
            logboek(...log);
            await laad(true);
            status.refresh();
        } catch (err) {
            Alert.alert('Mislukt', err instanceof ApiError ? err.message : 'Probeer het opnieuw.');
        } finally {
            setBezig(null);
        }
    }

    function verlofActie(v: any, nieuw: 'goedgekeurd' | 'afgewezen') {
        const doe = () => verwerk(v.uuid, () => VerlofApi.setStatus(v.uuid, nieuw), ['Verlof', `${v.naam}: ${nieuw === 'goedgekeurd' ? 'goedgekeurd' : 'afgewezen'}`, nieuw === 'goedgekeurd']);
        if (nieuw === 'afgewezen') Alert.alert('Verlof afwijzen?', `De aanvraag van ${v.naam} wordt afgewezen.`, [{ text: 'Annuleren', style: 'cancel' }, { text: 'Afwijzen', style: 'destructive', onPress: doe }]);
        else doe();
    }

    function ruilActie(r: any, akkoord: boolean) {
        const tekst = `${r.van_collega} ⇄ ${r.naar_collega || 'iedereen'}`;
        const doe = () =>
            verwerk(`r${r.id}`, () => (akkoord ? RuilbeursApi.adminBevestigen(r.id) : RuilbeursApi.weigeren(r.id)), ['Ruil', `${tekst}: ${akkoord ? 'goedgekeurd' : 'afgewezen'}`, akkoord]);
        if (!akkoord) Alert.alert('Ruil afwijzen?', 'Beide diensten gaan terug naar de oorspronkelijke medewerker.', [{ text: 'Annuleren', style: 'cancel' }, { text: 'Afwijzen', style: 'destructive', onPress: doe }]);
        else doe();
    }

    function bulk(type: 'verlof' | 'ruil') {
        const lijst = type === 'verlof' ? fVerlof : fRuil;
        Alert.alert('Alles goedkeuren?', `${lijst.length} ${type === 'verlof' ? 'verlofaanvragen' : 'ruilverzoeken'} worden in één keer goedgekeurd.`, [
            { text: 'Annuleren', style: 'cancel' },
            {
                text: 'Alles goedkeuren',
                onPress: () =>
                    verwerk(
                        `bulk-${type}`,
                        async () => {
                            for (const x of lijst) {
                                if (type === 'verlof') await VerlofApi.setStatus((x as any).uuid, 'goedgekeurd');
                                else await RuilbeursApi.adminBevestigen((x as any).id);
                            }
                        },
                        [type === 'verlof' ? 'Verlof' : 'Ruil', `${lijst.length} in één keer goedgekeurd`, true]
                    ),
            },
        ]);
    }

    function ziekTerug(z: any) {
        const datum = parseServerDate(z.start_tijd)?.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }) || '';
        Alert.alert('Ziekmelding terugzetten?', `De dienst van ${z.medewerker_naam} op ${datum} krijgt weer de status "ingepland". Gebruik dit als de melding een vergissing was.`, [
            { text: 'Annuleren', style: 'cancel' },
            { text: 'Terugzetten', onPress: () => verwerk(z.uuid, () => PlanningApi.ziekmeldingAnnuleren(z.uuid), ['Ziekmelding', `${z.medewerker_naam} op ${datum} teruggezet`, false]) },
        ]);
    }

    function intrekken(p: any, naam: string) {
        Alert.alert('Verlof intrekken?', `Het goedgekeurde verlof van ${naam} (${kort(p.start)}) wordt verwijderd en het saldo komt terug.`, [
            { text: 'Annuleren', style: 'cancel' },
            { text: 'Intrekken', style: 'destructive', onPress: () => verwerk(p.uuid, () => PlanningApi.deleteShift(p.uuid), ['Verlof', `${naam}: verlof ${kort(p.start)} ingetrokken`, false]) },
        ]);
    }

    async function bewaarUren() {
        if (!urenEdit) return;
        const n = parseFloat(urenEdit.uren.replace(',', '.'));
        if (Number.isNaN(n) || n < 0) return Alert.alert('Ongeldig', 'Vul een geldig aantal uren in.');
        await verwerk('uren', () => VerlofApi.updateUren(urenEdit.uuid, n), ['Verlof', `${urenEdit.naam}: uren aangepast naar ${n}`, true]);
        setUrenEdit(null);
    }

    async function bewaarSaldo() {
        if (!saldoEdit) return;
        const n = parseFloat(saldoEdit.saldo.replace(',', '.'));
        if (Number.isNaN(n) || n < 0) return Alert.alert('Ongeldig', 'Vul een geldig saldo in.');
        await verwerk('saldo', () => AuthApi.updateInstellingen({ uuid: schoonId(saldoEdit.uuid), instellingen: { verlofsaldo: n } }), ['Saldo', `${saldoEdit.naam}: saldo ${n} uur`, true]);
        setSaldoEdit(null);
    }

    if (laden) return <CenteredLoader />;

    const teamTotaal = fTeam.reduce((a, x) => a + x.opgenomen, 0);

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <Pressable onPress={() => setLogOpen(true)} hitSlop={8} style={styles.headerKnop}>
                            <Ionicons name="list-outline" size={18} color={colors.text} />
                            {log.length ? <View style={styles.logDot} /> : null}
                        </Pressable>
                    ),
                }}
            />
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => laad(true)} />} keyboardShouldPersistTaps="handled">
                <ErrorBanner message={error} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <StatTile label="Verlof" value={verlof.length} icon="airplane-outline" tone="amber" onPress={() => setTab('verlof')} />
                    <StatTile label="Ruil" value={ruil.length} icon="swap-horizontal" tone="blue" onPress={() => setTab('ruil')} />
                    <StatTile label="Ziek" value={ziek.length} icon="medkit-outline" tone="rose" onPress={() => setTab('ziek')} />
                </View>
                <Segmented
                    value={tab}
                    onChange={setTab}
                    options={[
                        { value: 'verlof', label: 'Verlof' },
                        { value: 'ruil', label: 'Ruil' },
                        { value: 'ziek', label: 'Ziek' },
                        { value: 'saldo', label: 'Saldo' },
                    ]}
                    style={{ marginTop: 14 }}
                />
                <SearchField value={zoek} onChangeText={setZoek} placeholder="Zoek op naam..." style={{ marginVertical: 12 }} />

                {tab === 'verlof' ? (
                    <>
                        {fVerlof.length > 1 ? <PrimaryButton small variant="success" title={`Alles goedkeuren (${fVerlof.length})`} icon="checkmark-done" onPress={() => bulk('verlof')} loading={bezig === 'bulk-verlof'} style={{ marginBottom: 10 }} /> : null}
                        {fVerlof.length === 0 ? (
                            <Card>
                                <EmptyState icon="checkmark-circle-outline" title="Geen wachtende verlofaanvragen" />
                            </Card>
                        ) : (
                            fVerlof.map((v: any) => (
                                <Card key={v.uuid} style={styles.kaart}>
                                    <View style={styles.kop}>
                                        <Avatar naam={v.naam} size={40} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.naam}>{v.naam}</Text>
                                            <Text style={styles.sub}>{isSameDay(v.start, v.eind) ? v.start.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }) : `${kort(v.start)} – ${kort(v.eind)}`}</Text>
                                        </View>
                                        <Text style={styles.uren}>{fmt(v.uren)} u</Text>
                                    </View>
                                    {v.reden ? <Text style={styles.reden}>{v.reden}</Text> : null}
                                    <View style={styles.knoppen}>
                                        <PrimaryButton small variant="success" title="Akkoord" icon="checkmark" onPress={() => verlofActie(v, 'goedgekeurd')} loading={bezig === v.uuid} style={{ flex: 1 }} />
                                        <PrimaryButton small variant="danger" title="Weigeren" onPress={() => verlofActie(v, 'afgewezen')} disabled={bezig === v.uuid} style={{ flex: 1 }} />
                                    </View>
                                </Card>
                            ))
                        )}
                    </>
                ) : null}

                {tab === 'ruil' ? (
                    <>
                        {fRuil.length > 1 ? <PrimaryButton small title={`Alles goedkeuren (${fRuil.length})`} icon="checkmark-done" onPress={() => bulk('ruil')} loading={bezig === 'bulk-ruil'} style={{ marginBottom: 10 }} /> : null}
                        {fRuil.length === 0 ? (
                            <Card>
                                <EmptyState icon="checkmark-circle-outline" title="Geen openstaande ruilverzoeken" />
                            </Card>
                        ) : (
                            fRuil.map((r) => {
                                const gift = !r.jouw_dienst_start;
                                const Persoon = ({ naam, start, eind, uren, overname }: any) => (
                                    <View style={[styles.persoon, overname && { backgroundColor: colors.successSoft }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.persoonNaam}>{naam}</Text>
                                            <Text style={styles.sub}>{overname ? 'Neemt de dienst over' : parseServerDate(start)?.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
                                        </View>
                                        {!overname ? (
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={styles.persoonTijd}>
                                                    {formatTime(start)}–{formatTime(eind)}
                                                </Text>
                                                {uren ? <Text style={styles.sub}>{fmt(uren)}u</Text> : null}
                                            </View>
                                        ) : null}
                                    </View>
                                );
                                return (
                                    <Card key={r.id} style={[styles.kaart, r.conflict && { borderColor: colors.dangerBorder, backgroundColor: '#fffafb' }]}>
                                        <Badge label={gift ? 'Overdracht' : 'Ruil'} tone={gift ? 'emerald' : 'blue'} icon={gift ? 'gift-outline' : 'swap-horizontal'} />
                                        <View style={{ gap: 6, marginTop: 10 }}>
                                            <Persoon naam={r.van_collega} start={r.hun_dienst_start} eind={r.hun_dienst_eind} uren={r.hun_uren} />
                                            <Ionicons name={gift ? 'arrow-down' : 'swap-vertical'} size={14} color={colors.subtle} style={{ alignSelf: 'center' }} />
                                            {gift ? <Persoon naam={r.naar_collega || 'Iedereen (open)'} overname /> : <Persoon naam={r.naar_collega} start={r.jouw_dienst_start} eind={r.jouw_dienst_eind} uren={r.jouw_uren} />}
                                        </View>
                                        {r.conflict ? <Text style={styles.conflict}>⚠ {r.naar_collega} staat al ingepland op die dag</Text> : null}
                                        <View style={styles.knoppen}>
                                            <PrimaryButton small title="Akkoord" icon="checkmark" onPress={() => ruilActie(r, true)} loading={bezig === `r${r.id}`} style={{ flex: 1 }} />
                                            <PrimaryButton small variant="danger" title="Weigeren" onPress={() => ruilActie(r, false)} disabled={bezig === `r${r.id}`} style={{ flex: 1 }} />
                                        </View>
                                    </Card>
                                );
                            })
                        )}
                    </>
                ) : null}

                {tab === 'ziek' ? (
                    fZiek.length === 0 ? (
                        <Card>
                            <EmptyState icon="checkmark-circle-outline" title="Geen ziekmeldingen" />
                        </Card>
                    ) : (
                        fZiek.map((z) => {
                            const eind = parseServerDate(z.eind_tijd);
                            const verleden = !!eind && eind < new Date();
                            return (
                                <Card key={z.uuid} style={[styles.kaart, !verleden && { borderColor: '#ffe4e6', backgroundColor: '#fffafb' }, verleden && { opacity: 0.7 }]}>
                                    <View style={styles.kop}>
                                        <Avatar naam={z.medewerker_naam} size={40} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.naam}>{z.medewerker_naam || 'Onbekend'}</Text>
                                            <Text style={styles.sub}>
                                                {parseServerDate(z.start_tijd)?.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime(z.start_tijd)}–{formatTime(z.eind_tijd)}
                                                {z.locatie_naam ? ` · ${z.locatie_naam}` : ''}
                                            </Text>
                                        </View>
                                        <Badge label="Ziek" tone="rose" />
                                    </View>
                                    {z.notitie ? <Text style={styles.reden}>{z.notitie}</Text> : null}
                                    <PrimaryButton small variant="secondary" title="Terug naar rooster" icon="arrow-undo-outline" onPress={() => ziekTerug(z)} loading={bezig === z.uuid} style={{ marginTop: 10 }} />
                                </Card>
                            );
                        })
                    )
                ) : null}

                {tab === 'saldo' ? (
                    <>
                        <Card style={[styles.kaart, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                            <Text style={styles.sub}>Team totaal opgenomen</Text>
                            <Text style={styles.uren}>{fmt(teamTotaal)} u</Text>
                        </Card>
                        {fTeam.map((x) => {
                            const basis = x.saldo > 0 ? x.saldo : 1;
                            const pOpg = Math.min(100, (x.opgenomen / basis) * 100);
                            const pWacht = Math.min(100 - pOpg, (x.wachtend / basis) * 100);
                            const isOpen = openTeam === x.uuid;
                            return (
                                <Card key={x.uuid} style={styles.kaart}>
                                    <View style={styles.kop}>
                                        <Avatar naam={x.naam} size={40} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.naam}>{x.naam}</Text>
                                            <Text style={styles.sub}>{roleLabels[x.rol] || x.rol}</Text>
                                        </View>
                                        <PrimaryButton small variant="soft" title="Saldo" icon="wallet-outline" onPress={() => setSaldoEdit({ uuid: x.uuid, naam: x.naam, saldo: String(x.saldo), inst: x.inst })} />
                                    </View>
                                    <View style={styles.saldoGrid}>
                                        <View style={[styles.saldoVak, { backgroundColor: colors.inputBg }]}>
                                            <Text style={styles.saldoLabel}>Totaal</Text>
                                            <Text style={styles.saldoWaarde}>{fmt(x.saldo)} u</Text>
                                        </View>
                                        <View style={[styles.saldoVak, { backgroundColor: colors.warningSoft }]}>
                                            <Text style={[styles.saldoLabel, { color: colors.warning }]}>Gepland</Text>
                                            <Text style={[styles.saldoWaarde, { color: '#b45309' }]}>{fmt(x.opgenomen)} u</Text>
                                        </View>
                                        <View style={[styles.saldoVak, { backgroundColor: colors.successSoft }]}>
                                            <Text style={[styles.saldoLabel, { color: colors.success }]}>Rest</Text>
                                            <Text style={[styles.saldoWaarde, { color: '#047857' }]}>{fmt(x.resterend)} u</Text>
                                        </View>
                                    </View>
                                    <View style={styles.balk}>
                                        <View style={{ width: `${pOpg}%`, backgroundColor: '#fbbf24' }} />
                                        <View style={{ width: `${pWacht}%`, backgroundColor: '#fde68a' }} />
                                    </View>
                                    <Pressable onPress={() => setOpenTeam(isOpen ? null : x.uuid)} style={styles.accordeon}>
                                        <Text style={styles.accordeonTekst}>Verlofperiodes ({x.periodes.length})</Text>
                                        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.subtle} />
                                    </Pressable>
                                    {isOpen
                                        ? x.periodes.length === 0
                                            ? <Text style={styles.leeg}>Geen goedgekeurd verlof.</Text>
                                            : x.periodes.map((p: any) => {
                                                  const datum = isSameDay(p.start, p.eind) ? kort(p.start) : `${kort(p.start)} t/m ${kort(p.eind)}`;
                                                  return (
                                                      <View key={p.uuid} style={styles.periode}>
                                                          <View style={{ flex: 1 }}>
                                                              <Text style={styles.persoonNaam}>{datum}</Text>
                                                              <Text style={styles.sub} numberOfLines={1}>{p.reden}</Text>
                                                          </View>
                                                          <Text style={styles.persoonTijd}>{fmt(p.uren)} u</Text>
                                                          <IconButtonSmall name="create-outline" onPress={() => setUrenEdit({ uuid: p.uuid, naam: x.naam, datum, uren: String(p.uren) })} />
                                                          <IconButtonSmall name="trash-outline" tone="danger" onPress={() => intrekken(p, x.naam)} />
                                                      </View>
                                                  );
                                              })
                                        : null}
                                </Card>
                            );
                        })}
                    </>
                ) : null}
            </ScrollView>

            <Sheet visible={!!urenEdit} onClose={() => setUrenEdit(null)} title="Verlofuren aanpassen" subtitle={urenEdit ? `${urenEdit.naam} · ${urenEdit.datum}` : ''} footer={<PrimaryButton title="Opslaan" icon="checkmark" onPress={bewaarUren} loading={bezig === 'uren'} />}>
                <TextField label="Totaal aantal uren" value={urenEdit?.uren || ''} onChangeText={(v) => setUrenEdit((u) => (u ? { ...u, uren: v } : u))} keyboardType="decimal-pad" />
            </Sheet>
            <Sheet visible={!!saldoEdit} onClose={() => setSaldoEdit(null)} title="Verlofsaldo" subtitle={saldoEdit?.naam} footer={<PrimaryButton title="Opslaan" icon="checkmark" onPress={bewaarSaldo} loading={bezig === 'saldo'} />}>
                <TextField label="Saldo dit jaar (uren)" value={saldoEdit?.saldo || ''} onChangeText={(v) => setSaldoEdit((s) => (s ? { ...s, saldo: v } : s))} keyboardType="decimal-pad" />
            </Sheet>
            <Sheet visible={logOpen} onClose={() => setLogOpen(false)} title="Logboek" subtitle="Acties in deze sessie">
                {log.length === 0 ? (
                    <EmptyState icon="list-outline" title="Nog geen acties" />
                ) : (
                    log.map((l, i) => (
                        <View key={i} style={styles.logRij}>
                            <View style={[styles.logIcoon, { backgroundColor: l.ok ? colors.successSoft : colors.dangerSoft }]}>
                                <Ionicons name={l.ok ? 'checkmark' : 'close'} size={14} color={l.ok ? colors.success : colors.danger} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.persoonNaam}>{l.tekst}</Text>
                                <Text style={styles.sub}>
                                    {l.type} · {l.tijd}
                                </Text>
                            </View>
                        </View>
                    ))
                )}
            </Sheet>
        </View>
    );
}

const styles = StyleSheet.create({
    headerKnop: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.slateSoft, alignItems: 'center', justifyContent: 'center' },
    logDot: { position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
    kaart: { marginBottom: 10, padding: 14 },
    kop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    naam: { fontSize: 15, fontWeight: '900', color: colors.ink },
    sub: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 1, textTransform: 'none' },
    uren: { fontSize: 17, fontWeight: '900', color: colors.primary },
    reden: { backgroundColor: colors.inputBg, borderRadius: 14, padding: 10, marginTop: 10, fontSize: 13, color: colors.text, fontWeight: '500' },
    knoppen: { flexDirection: 'row', gap: 8, marginTop: 12 },
    persoon: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.inputBg, borderRadius: 14, padding: 10 },
    persoonNaam: { fontSize: 13, fontWeight: '800', color: colors.ink },
    persoonTijd: { fontSize: 13, fontWeight: '900', color: colors.primary },
    conflict: { marginTop: 10, fontSize: 12, fontWeight: '800', color: colors.danger, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.dangerBorder, borderRadius: 12, padding: 8 },
    saldoGrid: { flexDirection: 'row', gap: 6, marginTop: 12 },
    saldoVak: { flex: 1, borderRadius: 14, paddingVertical: 8, alignItems: 'center' },
    saldoLabel: { fontSize: 9, fontWeight: '900', color: colors.subtle, textTransform: 'uppercase', letterSpacing: 1 },
    saldoWaarde: { fontSize: 15, fontWeight: '900', color: colors.ink, marginTop: 2 },
    balk: { height: 8, borderRadius: 4, backgroundColor: colors.slateSoft, flexDirection: 'row', overflow: 'hidden', marginTop: 10 },
    accordeon: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
    accordeonTekst: { fontSize: 13, fontWeight: '800', color: colors.text },
    periode: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
    leeg: { fontSize: 13, color: colors.subtle, fontWeight: '600', textAlign: 'center', paddingVertical: 10 },
    logRij: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    logIcoon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
