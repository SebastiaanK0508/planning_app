import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { IconButton, TopBar } from '../../../src/components/TopBar';
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
    IconButtonSmall,
    IconTile,
    InfoBanner,
    PrimaryButton,
    Sheet,
} from '../../../src/components/ui';
import { useAppStatus } from '../../../src/contexts/AppStatusContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { ApiError } from '../../../src/lib/api';
import { addDays, formatTime, isVerlofStatus, parseServerDate, toIsoDate, toServerDateTime, zelfdeUuid } from '../../../src/lib/format';
import { markeerRuilUpdatesGezien } from '../../../src/lib/ruilNotificaties';
import { OrganisatieApi, PlanningApi, RuilbeursApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

const VERZOEK_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
    open: { label: 'In afwachting', tone: 'blue' },
    wacht_op_manager: { label: 'Bij planner', tone: 'amber' },
    geaccepteerd: { label: 'Geaccepteerd', tone: 'emerald' },
};

function kortDatum(v: string | null | undefined, weekday = true) {
    const d = parseServerDate(v);
    if (!d) return '';
    return d.toLocaleDateString('nl-NL', weekday ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' });
}

function tijdBlok(start?: string | null, eind?: string | null) {
    if (!start) return '';
    return eind ? `${formatTime(start)} – ${formatTime(eind)}` : formatTime(start);
}

/** Zet de uren/minuten van `tijd` op de datum van `basis`. */
function opDatum(basis: string, tijd: Date): Date {
    const d = parseServerDate(basis) || new Date();
    const r = new Date(d);
    r.setHours(tijd.getHours(), tijd.getMinutes(), 0, 0);
    return r;
}

function isToekomstigeDienst(d: any) {
    const start = parseServerDate(d.start_tijd);
    return !!start && start > new Date() && !isVerlofStatus(d.status) && ['ingepland', 'bevestigd', '', null, undefined].includes(d.status);
}

export default function RuilbeursScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const status = useAppStatus();
    const params = useLocalSearchParams<{ aanbieden?: string }>();
    const vandaag = toIsoDate(new Date());

    const beurs = useAsyncData(() => PlanningApi.totaal(user!.org_uuid, vandaag, toIsoDate(addDays(new Date(), 366))) as Promise<any[]>, [user?.org_uuid]);
    const ontvangen = useAsyncData(() => RuilbeursApi.ontvangen(user!.uuid) as Promise<any[]>, [user?.uuid]);
    const verzonden = useAsyncData(() => RuilbeursApi.mijnVerzonden(user!.uuid) as Promise<any[]>, [user?.uuid]);
    const mijnRooster = useAsyncData(() => PlanningApi.mijnRooster(user!.uuid) as Promise<any[]>, [user?.uuid]);

    const [busy, setBusy] = useState<string | null>(null);
    const [filterLoc, setFilterLoc] = useState('alles');
    const [filterAfd, setFilterAfd] = useState('alles');
    const [uitlegOpen, setUitlegOpen] = useState(false);

    // Ruilvoorstel op een beursdienst
    const [ruilDoel, setRuilDoel] = useState<any | null>(null);
    const [eigenKeuze, setEigenKeuze] = useState<any | null>(null);
    const [eigenVan, setEigenVan] = useState(new Date());
    const [eigenTot, setEigenTot] = useState(new Date());

    // Deel overnemen
    const [deelDoel, setDeelDoel] = useState<any | null>(null);
    const [deelVan, setDeelVan] = useState(new Date());
    const [deelTot, setDeelTot] = useState(new Date());

    // Direct voorstel aan één collega
    const [directOpen, setDirectOpen] = useState(false);
    const [directDienst, setDirectDienst] = useState<string | null>(null);
    const [directCollega, setDirectCollega] = useState<string | null>(null);
    const [directCollegaDienst, setDirectCollegaDienst] = useState<string | null>(null);
    const [collegas, setCollegas] = useState<any[]>([]);
    const [collegaDiensten, setCollegaDiensten] = useState<any[] | null>(null);

    function herlaadAlles() {
        beurs.refresh();
        ontvangen.refresh();
        verzonden.refresh();
        mijnRooster.refresh();
        status.refresh();
    }

    useFocusEffect(
        useCallback(() => {
            ontvangen.refresh();
            verzonden.refresh();
        }, [user?.uuid]) // eslint-disable-line react-hooks/exhaustive-deps
    );

    useEffect(() => {
        markeerRuilUpdatesGezien(verzonden.data).then(() => status.refresh());
    }, [verzonden.data]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (params.aanbieden) {
            openDirect(String(params.aanbieden));
            router.setParams({ aanbieden: undefined });
        }
    }, [params.aanbieden]); // eslint-disable-line react-hooks/exhaustive-deps

    const geclaimd = useMemo(() => new Set((verzonden.data || []).filter((v: any) => v.status === 'open' || v.status === 'wacht_op_manager').map((v: any) => String(v.doel_dienst_uuid || '').toLowerCase())), [verzonden.data]);

    const opDeBeurs = useMemo(
        () =>
            (beurs.data || [])
                .filter((s: any) => String(s.status || '').toLowerCase() === 'te ruil' && !zelfdeUuid(s.gebruiker_uuid, user?.uuid))
                .map((s: any) => ({ ...s, isGeclaimd: geclaimd.has(String(s.uuid).replace(/-/g, '').toLowerCase()) }))
                .sort((a: any, b: any) => (parseServerDate(a.start_tijd)?.getTime() || 0) - (parseServerDate(b.start_tijd)?.getTime() || 0)),
        [beurs.data, geclaimd, user?.uuid]
    );
    const locaties = useMemo(() => ['alles', ...new Set(opDeBeurs.map((s: any) => s.locatie_naam).filter(Boolean))], [opDeBeurs]);
    const afdelingen = useMemo(() => ['alles', ...new Set(opDeBeurs.map((s: any) => s.afdeling_naam).filter(Boolean))], [opDeBeurs]);
    const gefilterd = opDeBeurs.filter((s: any) => (filterLoc === 'alles' || s.locatie_naam === filterLoc) && (filterAfd === 'alles' || s.afdeling_naam === filterAfd));

    const mijnAanbiedingen = useMemo(
        () => (mijnRooster.data || []).filter((s: any) => ['te ruil', 'wacht_op_planner'].includes(s.status) && (parseServerDate(s.eind_tijd) || new Date()) >= new Date()),
        [mijnRooster.data]
    );
    const mijnToekomst = useMemo(() => (mijnRooster.data || []).filter(isToekomstigeDienst), [mijnRooster.data]);

    async function actie(key: string, fn: () => Promise<unknown>, succes?: string) {
        setBusy(key);
        try {
            await fn();
            if (succes) Alert.alert('Gelukt', succes);
            herlaadAlles();
            return true;
        } catch (err) {
            Alert.alert('Mislukt', err instanceof ApiError ? err.message : 'Kon geen verbinding maken met de server.');
            return false;
        } finally {
            setBusy(null);
        }
    }

    function accepteren(v: any) {
        Alert.alert('Verzoek accepteren?', 'Weet je zeker dat je dit verzoek wilt accepteren?', [
            { text: 'Annuleren', style: 'cancel' },
            {
                text: 'Accepteren',
                onPress: () =>
                    actie(v.uuid, async () => {
                        const res = await RuilbeursApi.accepteren(v.uuid);
                        Alert.alert(
                            res?.pendingManager ? 'Geaccepteerd' : 'Gelukt',
                            res?.pendingManager ? 'Het ligt nu bij de planner ter definitieve goedkeuring.' : 'Verzoek verwerkt en direct in het rooster gezet!'
                        );
                    }),
            },
        ]);
    }

    function weigeren(v: any) {
        Alert.alert('Verzoek afwijzen?', 'Weet je zeker dat je dit verzoek wilt afwijzen?', [
            { text: 'Annuleren', style: 'cancel' },
            { text: 'Afwijzen', style: 'destructive', onPress: () => actie(v.uuid, () => RuilbeursApi.weigeren(v.uuid), 'Verzoek afgewezen.') },
        ]);
    }

    function intrekken(s: any) {
        Alert.alert('Van de beurs halen?', 'Weet je zeker dat je deze dienst weer terug wilt zetten in je eigen rooster?', [
            { text: 'Annuleren', style: 'cancel' },
            { text: 'Terugzetten', onPress: () => actie(s.uuid, () => PlanningApi.updateStatus(s.uuid, 'ingepland'), 'Dienst is van de beurs gehaald.') },
        ]);
    }

    function overnemen(s: any) {
        Alert.alert('Dienst overnemen?', `Wil je de dienst van ${s.medewerker_naam} op ${kortDatum(s.start_tijd)} overnemen?`, [
            { text: 'Annuleren', style: 'cancel' },
            {
                text: 'Neem over',
                onPress: () =>
                    actie(s.uuid, async () => {
                        const res = await RuilbeursApi.overnemen(s.uuid);
                        if (res && res.success === false) throw new ApiError(res.error || 'Deze dienst is niet meer beschikbaar.', 409, res);
                        Alert.alert(
                            res?.status === 'wacht_op_planner' ? 'Verzoek verstuurd' : 'Gelukt',
                            res?.status === 'wacht_op_planner' ? 'Wacht op goedkeuring van de planner.' : 'Dienst succesvol overgenomen!'
                        );
                    }),
            },
        ]);
    }

    function openRuil(s: any) {
        setRuilDoel(s);
        setEigenKeuze(null);
    }

    function kiesEigen(d: any) {
        setEigenKeuze(d);
        setEigenVan(parseServerDate(d.start_tijd) || new Date());
        setEigenTot(parseServerDate(d.eind_tijd) || new Date());
    }

    async function verstuurRuil() {
        if (!ruilDoel || !eigenKeuze) return;
        const van = opDatum(eigenKeuze.start_tijd, eigenVan);
        const tot = opDatum(eigenKeuze.start_tijd, eigenTot);
        if (tot <= van) return Alert.alert('Ongeldige tijden', 'De eindtijd moet na de starttijd liggen.');
        const ingekort = formatTime(toServerDateTime(van)) !== formatTime(eigenKeuze.start_tijd) || formatTime(toServerDateTime(tot)) !== formatTime(eigenKeuze.eind_tijd);
        const ok = await actie('ruil', async () => {
            let mijnUuid = eigenKeuze.uuid;
            if (ingekort) {
                const res = await RuilbeursApi.splitsenZonderBeurs(eigenKeuze.uuid, toServerDateTime(van), toServerDateTime(tot));
                if (!res?.nieuw_blok_uuid) throw new ApiError('Inkorten van je uren is mislukt.', 400, res);
                mijnUuid = res.nieuw_blok_uuid;
            }
            await RuilbeursApi.voorstel({ mijn_dienst_uuid: mijnUuid, doel_dienst_uuid: ruilDoel.uuid });
        }, 'Ruilvoorstel succesvol verzonden!');
        if (ok) setRuilDoel(null);
    }

    function openDeel(s: any) {
        setDeelDoel(s);
        setDeelVan(parseServerDate(s.start_tijd) || new Date());
        setDeelTot(parseServerDate(s.eind_tijd) || new Date());
    }

    async function bevestigDeel() {
        if (!deelDoel) return;
        const van = opDatum(deelDoel.start_tijd, deelVan);
        const tot = opDatum(deelDoel.start_tijd, deelTot);
        if (tot <= van) return Alert.alert('Ongeldige tijden', 'De eindtijd moet na de starttijd liggen.');
        const ok = await actie('deel', async () => {
            const res = await RuilbeursApi.deelOvernemen(deelDoel.uuid, toServerDateTime(van), toServerDateTime(tot));
            Alert.alert(
                res?.status === 'wacht_op_planner' ? 'Verzoek verstuurd' : 'Gelukt',
                res?.status === 'wacht_op_planner' ? 'Wacht op goedkeuring van de planner.' : 'Deel van de dienst succesvol overgenomen!'
            );
        });
        if (ok) setDeelDoel(null);
    }

    function openDirect(dienstUuid: string | null = null) {
        setDirectDienst(dienstUuid);
        setDirectCollega(null);
        setDirectCollegaDienst(null);
        setCollegaDiensten(null);
        setDirectOpen(true);
        if (user && collegas.length === 0) {
            (OrganisatieApi.collegas(user.org_uuid) as Promise<any[]>)
                .then((rows) => setCollegas((rows || []).filter((c) => !zelfdeUuid(c.uuid, user.uuid))))
                .catch(() => setCollegas([]));
        }
    }

    async function kiesCollega(uuid: string) {
        setDirectCollega(uuid);
        setDirectCollegaDienst(null);
        setCollegaDiensten(null);
        try {
            const rows = (await PlanningApi.mijnRooster(uuid)) as any[];
            setCollegaDiensten((rows || []).filter((d) => (parseServerDate(d.start_tijd) || new Date(0)) > new Date() && !isVerlofStatus(d.status)));
        } catch {
            setCollegaDiensten([]);
        }
    }

    async function verstuurDirect() {
        if (!directDienst || !directCollega) return Alert.alert('Nog niet compleet', 'Selecteer jouw dienst en een collega.');
        const ok = await actie(
            'direct',
            () =>
                directCollegaDienst
                    ? RuilbeursApi.voorstel({ mijn_dienst_uuid: directDienst, doel_dienst_uuid: directCollegaDienst, naar_gebruiker_uuid: directCollega })
                    : RuilbeursApi.directOverdragen({ dienst_uuid: directDienst, naar_gebruiker_uuid: directCollega, van_gebruiker_uuid: user!.uuid }),
            'Verzoek succesvol verstuurd naar je collega!'
        );
        if (ok) setDirectOpen(false);
    }

    const loading = beurs.loading || ontvangen.loading || verzonden.loading || mijnRooster.loading;
    const fout = beurs.error || ontvangen.error || verzonden.error || mijnRooster.error;

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <TopBar
                icon="swap-horizontal"
                title="Ruilbeurs"
                subtitle="Diensten ruilen met collega's"
                right={
                    <>
                        <IconButton name="help-circle-outline" onPress={() => setUitlegOpen(true)} />
                        <IconButton name="add" onPress={() => openDirect()} />
                    </>
                }
            />
            {loading ? (
                <CenteredLoader />
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={beurs.refreshing} onRefresh={herlaadAlles} />}>
                    <ErrorBanner message={fout} />

                    {(ontvangen.data || []).map((v: any) => {
                        const isRuil = !!v.jouw_dienst_start;
                        return (
                            <Card key={v.uuid} style={styles.inkomend}>
                                <View style={styles.inkomendKop}>
                                    <Avatar naam={v.van_collega} size={44} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.naam}>{v.van_collega}</Text>
                                        <Text style={styles.inkomendSub}>{isRuil ? 'Stelt een ruil voor' : 'Biedt jou een dienst aan'}</Text>
                                    </View>
                                </View>
                                {isRuil ? (
                                    <View style={styles.ruilGrid}>
                                        <View style={[styles.ruilVak, { flex: 1 }]}>
                                            <Text style={styles.vakLabel}>Jij geeft</Text>
                                            <Text style={styles.vakDatum}>{kortDatum(v.jouw_dienst_start)}</Text>
                                            <Text style={styles.vakTijd}>{tijdBlok(v.jouw_dienst_start, v.jouw_dienst_eind)}</Text>
                                        </View>
                                        <Ionicons name="swap-horizontal" size={18} color="#60a5fa" />
                                        <View style={[styles.ruilVak, styles.ruilVakBlauw, { flex: 1 }]}>
                                            <Text style={[styles.vakLabel, { color: colors.primary }]}>Jij krijgt</Text>
                                            <Text style={[styles.vakDatum, { color: '#3b82f6' }]}>{kortDatum(v.hun_dienst_start)}</Text>
                                            <Text style={[styles.vakTijd, { color: colors.primaryDark }]}>{tijdBlok(v.hun_dienst_start, v.hun_dienst_eind)}</Text>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={[styles.ruilVak, styles.ruilVakBlauw, { marginBottom: 14 }]}>
                                        <Text style={[styles.vakLabel, { color: colors.primary }]}>Aangeboden dienst</Text>
                                        <Text style={styles.vakDatum}>{kortDatum(v.hun_dienst_start)}</Text>
                                        <Text style={[styles.vakTijd, { fontSize: 22 }]}>{tijdBlok(v.hun_dienst_start, v.hun_dienst_eind)}</Text>
                                    </View>
                                )}
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <PrimaryButton title="Accepteer" icon="checkmark" onPress={() => accepteren(v)} loading={busy === v.uuid} style={{ flex: 2 }} />
                                    <PrimaryButton title="Weiger" variant="danger" onPress={() => weigeren(v)} disabled={busy === v.uuid} style={{ flex: 1 }} />
                                </View>
                            </Card>
                        );
                    })}

                    <Card style={{ marginBottom: 14 }}>
                        <CardHeader icon="person-circle-outline" title="Mijn ruilzaken" />
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={[styles.statVak, { backgroundColor: colors.inputBg, borderColor: colors.line }]}>
                                <Text style={[styles.statLabel, { color: colors.subtle }]}>Op de beurs</Text>
                                <Text style={styles.statWaarde}>{mijnAanbiedingen.filter((s: any) => s.status === 'te ruil').length}</Text>
                            </View>
                            <View style={[styles.statVak, { backgroundColor: colors.warningSoft, borderColor: '#fef3c7' }]}>
                                <Text style={[styles.statLabel, { color: colors.warning }]}>Wacht op planner</Text>
                                <Text style={[styles.statWaarde, { color: '#b45309' }]}>{mijnAanbiedingen.filter((s: any) => s.status === 'wacht_op_planner').length}</Text>
                            </View>
                        </View>

                        {mijnAanbiedingen.length > 0 ? (
                            <>
                                <Text style={styles.subKop}>Jouw aanbiedingen</Text>
                                {mijnAanbiedingen.map((s: any) => (
                                    <View key={s.uuid} style={styles.miniRij}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.miniTitel}>{kortDatum(s.start_tijd)}</Text>
                                            <Text style={styles.miniSub}>{tijdBlok(s.start_tijd, s.eind_tijd)}</Text>
                                            {s.status === 'wacht_op_planner' ? (
                                                <View style={{ marginTop: 6 }}>
                                                    <Badge label="Wacht op planner" tone="amber" />
                                                </View>
                                            ) : null}
                                        </View>
                                        <PrimaryButton
                                            small
                                            variant="danger"
                                            title={s.status === 'wacht_op_planner' ? 'Annuleer' : 'Intrekken'}
                                            onPress={() => intrekken(s)}
                                            loading={busy === s.uuid}
                                        />
                                    </View>
                                ))}
                            </>
                        ) : null}

                        <Text style={styles.subKop}>Verstuurde verzoeken</Text>
                        {(verzonden.data || []).length === 0 ? (
                            <Text style={styles.leegTekst}>Geen openstaande verzoeken naar collega's.</Text>
                        ) : (
                            (verzonden.data || []).map((v: any) => {
                                const b = VERZOEK_BADGE[v.status] || { label: 'Afgewezen', tone: 'rose' as BadgeTone };
                                return (
                                    <View key={v.uuid} style={styles.verzoek}>
                                        <View style={[styles.rowBetween, { marginBottom: 8 }]}>
                                            <Text style={styles.miniTitel} numberOfLines={1}>
                                                Aan {v.doel_collega || 'collega'}
                                            </Text>
                                            <Badge label={b.label} tone={b.tone} />
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <View style={styles.geefVak}>
                                                <Text style={styles.vakLabel}>Jij geeft</Text>
                                                <Text style={styles.geefTekst}>
                                                    {v.mijn_start ? `${kortDatum(v.mijn_start, false)} · ${tijdBlok(v.mijn_start, v.mijn_eind)}` : '–'}
                                                </Text>
                                            </View>
                                            <View style={styles.geefVak}>
                                                <Text style={styles.vakLabel}>Jij krijgt</Text>
                                                <Text style={[styles.geefTekst, !v.hun_start && { fontStyle: 'italic', color: colors.subtle }]}>
                                                    {v.hun_start ? `${kortDatum(v.hun_start, false)} · ${tijdBlok(v.hun_start, v.hun_eind)}` : 'Niets (gift)'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </Card>

                    <Card>
                        <CardHeader icon="storefront-outline" tone="amber" title="Op de beurs" subtitle={gefilterd.length === 1 ? '1 dienst' : `${gefilterd.length} diensten`} />
                        {locaties.length > 2 ? (
                            <>
                                <FieldLabel>Locatie</FieldLabel>
                                <ChipRow style={{ marginBottom: 12 }}>
                                    {locaties.map((l) => (
                                        <Chip key={l} label={l === 'alles' ? 'Alle' : l} active={filterLoc === l} onPress={() => setFilterLoc(l)} />
                                    ))}
                                </ChipRow>
                            </>
                        ) : null}
                        {afdelingen.length > 2 ? (
                            <>
                                <FieldLabel>Afdeling</FieldLabel>
                                <ChipRow style={{ marginBottom: 12 }}>
                                    {afdelingen.map((a) => (
                                        <Chip key={a} label={a === 'alles' ? 'Alle' : a} active={filterAfd === a} onPress={() => setFilterAfd(a)} />
                                    ))}
                                </ChipRow>
                            </>
                        ) : null}

                        {gefilterd.length === 0 ? (
                            <EmptyState icon="cube-outline" title="Geen diensten op de beurs" subtitle="Zodra een collega een dienst aanbiedt, zie je hem hier." />
                        ) : (
                            gefilterd.map((s: any) => (
                                <View key={s.uuid} style={[styles.beursKaart, s.isGeclaimd && { opacity: 0.6 }]}>
                                    <View style={styles.beursKop}>
                                        <Avatar naam={s.medewerker_naam} size={40} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.naam} numberOfLines={1}>
                                                {s.medewerker_naam}
                                            </Text>
                                            <Text style={styles.miniSub} numberOfLines={1}>
                                                {s.afdeling_naam || 'Algemeen'} · {s.locatie_naam || 'Geen locatie'}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.beursTijd}>
                                        <Text style={styles.beursDatum}>{kortDatum(s.start_tijd)}</Text>
                                        <Text style={styles.beursUren}>{tijdBlok(s.start_tijd, s.eind_tijd)}</Text>
                                    </View>
                                    {s.isGeclaimd ? (
                                        <View style={styles.geclaimd}>
                                            <Ionicons name="paper-plane" size={14} color={colors.primaryDark} />
                                            <Text style={styles.geclaimdTekst}>Voorstel verstuurd</Text>
                                        </View>
                                    ) : (
                                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                            <PrimaryButton small variant="success" title="Neem over" icon="hand-left-outline" onPress={() => overnemen(s)} loading={busy === s.uuid} style={{ flex: 1 }} />
                                            <PrimaryButton small title="Ruilvoorstel" icon="sync" onPress={() => openRuil(s)} style={{ flex: 1 }} />
                                            <IconButtonSmall name="cut-outline" onPress={() => openDeel(s)} />
                                        </View>
                                    )}
                                </View>
                            ))
                        )}
                    </Card>
                </ScrollView>
            )}

            {/* Uitleg */}
            <Sheet visible={uitlegOpen} onClose={() => setUitlegOpen(false)} title="Hoe werkt ruilen?">
                {[
                    ['hand-left-outline', '1. Dienst overnemen', 'Zie je een dienst op de beurs die jou goed uitkomt? Kies Neem over en je neemt de hele dienst over van je collega.'],
                    ['sync', '2. Ruilvoorstel doen', 'Wil je ruilen? Kies Ruilvoorstel en selecteer een van je eigen diensten om terug te geven. Je kunt de uren daarvan ook inkorten.'],
                    ['cut-outline', '3. Deel overnemen', 'Kun je maar een paar uur helpen? Tik op de schaar en vul in welk blok jij overneemt. De rest blijft op de beurs staan.'],
                    ['paper-plane-outline', '4. Direct voorstel of weggeven', 'Met de + bovenin bied je een dienst aan één collega aan: als ruil, of als cadeautje zonder iets terug.'],
                    ['shield-checkmark-outline', 'Goedkeuring planner', 'Na akkoord krijgt een ruil de status Wacht op planner. De planner keurt de wijziging daarna definitief goed.'],
                ].map(([icon, titel, tekst]) => (
                    <View key={titel} style={styles.uitlegRij}>
                        <IconTile name={icon as any} tone="blue" size={38} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.miniTitel}>{titel}</Text>
                            <Text style={styles.uitlegTekst}>{tekst}</Text>
                        </View>
                    </View>
                ))}
            </Sheet>

            {/* Ruilvoorstel */}
            <Sheet
                visible={!!ruilDoel}
                onClose={() => setRuilDoel(null)}
                title="Ruilvoorstel doen"
                subtitle={ruilDoel ? `Voor ${ruilDoel.medewerker_naam}: ${kortDatum(ruilDoel.start_tijd)} ${tijdBlok(ruilDoel.start_tijd, ruilDoel.eind_tijd)}` : ''}
                footer={<PrimaryButton title="Verstuur voorstel" icon="paper-plane-outline" onPress={verstuurRuil} loading={busy === 'ruil'} disabled={!eigenKeuze} />}
            >
                <FieldLabel>Welke dienst geef je terug?</FieldLabel>
                {mijnToekomst.length === 0 ? (
                    <EmptyState icon="calendar-outline" title="Geen komende diensten" subtitle="Je hebt geen komende diensten om te ruilen." />
                ) : (
                    mijnToekomst.map((d: any) => (
                        <Pressable key={d.uuid} onPress={() => kiesEigen(d)} style={[styles.optie, eigenKeuze?.uuid === d.uuid && styles.optieActief]}>
                            <Text style={styles.optieDatum}>{kortDatum(d.start_tijd)}</Text>
                            <Text style={styles.optieTijd}>{tijdBlok(d.start_tijd, d.eind_tijd)}</Text>
                        </Pressable>
                    ))
                )}
                {eigenKeuze ? (
                    <View style={{ marginTop: 8 }}>
                        <Text style={styles.uitlegTekst}>Wil je maar een deel teruggeven? Pas de tijden aan.</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                            <DateField label="Van" mode="time" value={eigenVan} onChange={setEigenVan} style={{ flex: 1 }} />
                            <DateField label="Tot" mode="time" value={eigenTot} onChange={setEigenTot} style={{ flex: 1 }} />
                        </View>
                    </View>
                ) : null}
            </Sheet>

            {/* Deel overnemen */}
            <Sheet
                visible={!!deelDoel}
                onClose={() => setDeelDoel(null)}
                title="Deel overnemen"
                subtitle={deelDoel ? `${kortDatum(deelDoel.start_tijd)} · ${tijdBlok(deelDoel.start_tijd, deelDoel.eind_tijd)}` : ''}
                footer={<PrimaryButton title="Neem dit deel over" icon="cut-outline" onPress={bevestigDeel} loading={busy === 'deel'} />}
            >
                <Text style={styles.uitlegTekst}>Vul in welk blok jij overneemt. De rest blijft op de beurs staan.</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <DateField label="Van" mode="time" value={deelVan} onChange={setDeelVan} style={{ flex: 1 }} />
                    <DateField label="Tot" mode="time" value={deelTot} onChange={setDeelTot} style={{ flex: 1 }} />
                </View>
            </Sheet>

            {/* Direct voorstel */}
            <Sheet
                visible={directOpen}
                onClose={() => setDirectOpen(false)}
                title="Nieuw voorstel"
                subtitle="Bied een dienst aan één collega aan"
                footer={<PrimaryButton title="Verstuur" icon="paper-plane-outline" onPress={verstuurDirect} loading={busy === 'direct'} disabled={!directDienst || !directCollega} />}
            >
                <FieldLabel>Jouw dienst</FieldLabel>
                {mijnToekomst.length === 0 ? (
                    <Text style={styles.leegTekst}>Je hebt momenteel geen komende diensten.</Text>
                ) : (
                    mijnToekomst.map((d: any) => (
                        <Pressable key={d.uuid} onPress={() => setDirectDienst(d.uuid)} style={[styles.optie, directDienst === d.uuid && styles.optieActief]}>
                            <Text style={styles.optieDatum}>{kortDatum(d.start_tijd)}</Text>
                            <Text style={styles.optieTijd}>{tijdBlok(d.start_tijd, d.eind_tijd)}</Text>
                        </Pressable>
                    ))
                )}
                <FieldLabel>Collega</FieldLabel>
                <ChipRow style={{ marginBottom: 14 }}>
                    {collegas.map((c) => (
                        <Chip key={c.uuid} label={`${c.voornaam} ${c.achternaam || ''}`.trim()} active={directCollega === c.uuid} onPress={() => kiesCollega(c.uuid)} />
                    ))}
                </ChipRow>
                {directCollega ? (
                    <>
                        <FieldLabel>Wat krijg je terug?</FieldLabel>
                        <Pressable onPress={() => setDirectCollegaDienst(null)} style={[styles.optie, !directCollegaDienst && styles.optieActief]}>
                            <Text style={styles.optieDatum}>Niets: ik geef mijn dienst weg</Text>
                            <Ionicons name="gift-outline" size={16} color={colors.primary} />
                        </Pressable>
                        {collegaDiensten === null ? (
                            <CenteredLoader />
                        ) : collegaDiensten.length === 0 ? (
                            <InfoBanner message="Deze collega heeft geen komende diensten: alleen weggeven is mogelijk." />
                        ) : (
                            collegaDiensten.map((d: any) => (
                                <Pressable key={d.uuid} onPress={() => setDirectCollegaDienst(d.uuid)} style={[styles.optie, directCollegaDienst === d.uuid && styles.optieActief]}>
                                    <Text style={styles.optieDatum}>{kortDatum(d.start_tijd)}</Text>
                                    <Text style={styles.optieTijd}>{tijdBlok(d.start_tijd, d.eind_tijd)}</Text>
                                </Pressable>
                            ))
                        )}
                    </>
                ) : null}
            </Sheet>
        </View>
    );
}

const styles = StyleSheet.create({
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    inkomend: { marginBottom: 14, borderColor: colors.primaryBorder, borderWidth: 2 },
    inkomendKop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    inkomendSub: { fontSize: 12, fontWeight: '800', color: colors.primary, marginTop: 2 },
    naam: { fontSize: 15, fontWeight: '900', color: colors.ink, letterSpacing: -0.2 },
    ruilGrid: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    ruilVak: { borderRadius: 16, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.line, padding: 12, alignItems: 'center' },
    ruilVakBlauw: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
    vakLabel: { fontSize: 9, fontWeight: '900', color: colors.subtle, textTransform: 'uppercase', letterSpacing: 1.2 },
    vakDatum: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginTop: 4, textTransform: 'capitalize' },
    vakTijd: { fontSize: 15, fontWeight: '900', color: colors.ink, marginTop: 2 },
    statVak: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14 },
    statLabel: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    statWaarde: { fontSize: 28, fontWeight: '900', color: colors.ink, letterSpacing: -0.8, marginTop: 2 },
    subKop: { fontSize: 10, fontWeight: '900', color: colors.subtle, textTransform: 'uppercase', letterSpacing: 1.4, marginTop: 18, marginBottom: 8 },
    miniRij: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.line, marginBottom: 8 },
    miniTitel: { fontSize: 14, fontWeight: '900', color: colors.ink, textTransform: 'capitalize', flexShrink: 1 },
    miniSub: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
    leegTekst: { fontSize: 12, fontWeight: '600', color: colors.subtle, textAlign: 'center', paddingVertical: 8 },
    verzoek: { padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.line, marginBottom: 8 },
    geefVak: { flex: 1, borderRadius: 12, backgroundColor: colors.inputBg, paddingHorizontal: 10, paddingVertical: 8 },
    geefTekst: { fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 2 },
    beursKaart: { borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 10, backgroundColor: '#fff' },
    beursKop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    beursTijd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.inputBg, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
    beursDatum: { fontSize: 13, fontWeight: '700', color: colors.text, textTransform: 'capitalize' },
    beursUren: { fontSize: 16, fontWeight: '900', color: colors.primary },
    geclaimd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primarySoft, borderRadius: 14, paddingVertical: 12 },
    geclaimdTekst: { fontSize: 11, fontWeight: '900', color: colors.primaryDark, textTransform: 'uppercase', letterSpacing: 0.6 },
    uitlegRij: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    uitlegTekst: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginTop: 2 },
    optie: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: 14,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.line,
        marginBottom: 8,
        backgroundColor: '#fff',
    },
    optieActief: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    optieDatum: { fontSize: 14, fontWeight: '900', color: colors.ink, textTransform: 'capitalize', flexShrink: 1 },
    optieTijd: { fontSize: 13, fontWeight: '900', color: colors.primary },
});
