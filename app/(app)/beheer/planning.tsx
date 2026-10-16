import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, PanResponder, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ShiftEditor, ShiftEditorStart } from '../../../src/components/ShiftEditor';
import { Avatar, Badge, Card, CenteredLoader, Chip, ChipRow, EmptyState, ErrorBanner, IconTile, InfoBanner, PrimaryButton, SwitchRow } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useOrgSettings, settingAan } from '../../../src/hooks/useOrgSettings';
import { useRoleGuard } from '../../../src/hooks/useRoleGuard';
import { ApiError } from '../../../src/lib/api';
import { addDays, formatUren, startOfWeek, toIsoDate, weekNummer } from '../../../src/lib/format';
import { deelPdf, weekoverzichtHtml } from '../../../src/lib/pdf';
import {
    BEZ_DAGDELEN,
    bepaalDagdeel,
    DAGNAMEN,
    feestdagenVoorJaar,
    isWerkDienst,
    minimaleBezetting,
    openingstijdenVoor,
    schoonId,
    splitDatumTijd,
    telBezetting,
} from '../../../src/lib/planning';
import { OrganisatieApi, PlanningApi } from '../../../src/lib/services';
import { colors, PLANNER_PLUS } from '../../../src/lib/theme';

const KORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
const LOCATIE_KEY = 'planning_locatie_v1';

export default function PlanningScreen() {
    useRoleGuard(PLANNER_PLUS);
    const { user } = useAuth();
    const settings = useOrgSettings();
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
    const [dagIndex, setDagIndex] = useState(() => (new Date().getDay() + 6) % 7);
    const [locaties, setLocaties] = useState<any[] | null>(null);
    const [medewerkers, setMedewerkers] = useState<any[]>([]);
    const [actieveLocatie, setActieveLocatie] = useState<string | null>(null); // '' = alle locaties
    const [toonAlle, setToonAlle] = useState(false);
    const [shifts, setShifts] = useState<any[] | null>(null);
    const [feestdagen, setFeestdagen] = useState<{ naam: string; datum: string }[]>([]);
    const [laden, setLaden] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [bezig, setBezig] = useState<string | null>(null);
    const [editor, setEditor] = useState<ShiftEditorStart | null>(null);

    const startStr = toIsoDate(weekStart);
    const eindStr = toIsoDate(addDays(weekStart, 6));
    const dagen = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

    // Basisgegevens: locaties + medewerkers + bewaarde locatiekeuze.
    useEffect(() => {
        if (!user) return;
        (async () => {
            try {
                const [locs, meds, bewaard, alle] = await Promise.all([
                    OrganisatieApi.locaties(user.org_uuid) as Promise<any[]>,
                    PlanningApi.medewerkers(user.org_uuid) as Promise<any[]>,
                    AsyncStorage.getItem(`${LOCATIE_KEY}_${user.org_uuid}`).catch(() => null),
                    AsyncStorage.getItem(`${LOCATIE_KEY}_${user.org_uuid}_alle`).catch(() => null),
                ]);
                const l = locs || [];
                setLocaties(l);
                setMedewerkers(meds || []);
                setToonAlle(alle === '1');
                if (l.length === 0) setActieveLocatie('');
                else if (l.length === 1) setActieveLocatie(schoonId(l[0].uuid));
                else if (bewaard !== null && (bewaard === '' || l.some((x) => schoonId(x.uuid) === bewaard))) setActieveLocatie(bewaard);
            } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Kon de planning niet laden.');
                setLocaties([]);
            }
        })();
    }, [user?.org_uuid]); // eslint-disable-line react-hooks/exhaustive-deps

    const laadWeek = useCallback(
        async (isRefresh = false) => {
            if (!user) return;
            if (isRefresh) setRefreshing(true);
            else setLaden(true);
            setError('');
            try {
                const data = (await PlanningApi.totaal(user.org_uuid, startStr, eindStr, true)) as any[];
                setShifts(data || []);
            } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Kon de week niet laden.');
            } finally {
                setLaden(false);
                setRefreshing(false);
            }
        },
        [user, startStr, eindStr]
    );

    useEffect(() => {
        if (actieveLocatie !== null) laadWeek();
    }, [actieveLocatie, laadWeek]);

    useEffect(() => {
        Promise.all([feestdagenVoorJaar(weekStart.getFullYear(), settings), feestdagenVoorJaar(addDays(weekStart, 6).getFullYear(), settings)]).then(([a, b]) =>
            setFeestdagen([...a, ...b])
        );
    }, [weekStart, settings]);

    function kiesLocatie(id: string) {
        setActieveLocatie(id);
        AsyncStorage.setItem(`${LOCATIE_KEY}_${user!.org_uuid}`, id).catch(() => {});
    }

    function zetToonAlle(aan: boolean) {
        setToonAlle(aan);
        AsyncStorage.setItem(`${LOCATIE_KEY}_${user!.org_uuid}_alle`, aan ? '1' : '0').catch(() => {});
    }

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > 25 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
            onPanResponderRelease: (_e, g) => {
                if (g.dx <= -60) setDagIndex((i) => (i < 6 ? i + 1 : i));
                else if (g.dx >= 60) setDagIndex((i) => (i > 0 ? i - 1 : i));
            },
        })
    ).current;

    // ---------- Afgeleide data ----------
    const opActieve = useCallback((s: any) => !actieveLocatie || !s.locatie_uuid || schoonId(s.locatie_uuid) === actieveLocatie, [actieveLocatie]);
    const werkDiensten = useMemo(() => (shifts || []).filter(isWerkDienst), [shifts]);
    const verlof = useMemo(() => (shifts || []).filter((s) => !isWerkDienst(s)), [shifts]);
    const conceptenHier = werkDiensten.filter((s) => s.status === 'concept' && opActieve(s)).length;

    const tellingen = useMemo(() => {
        const t: Record<string, number> = {};
        werkDiensten.forEach((s) => {
            const id = schoonId(s.locatie_uuid);
            if (id) t[id] = (t[id] || 0) + 1;
        });
        return t;
    }, [werkDiensten]);

    const zichtbaar = useMemo(() => {
        if (!actieveLocatie || toonAlle) return medewerkers;
        return medewerkers.filter(
            (m) =>
                !m.locatie_uuid ||
                schoonId(m.locatie_uuid) === actieveLocatie ||
                werkDiensten.some((s) => schoonId(s.gebruiker_uuid) === schoonId(m.uuid) && schoonId(s.locatie_uuid) === actieveLocatie)
        );
    }, [medewerkers, actieveLocatie, toonAlle, werkDiensten]);

    const opDag = (s: any, d: string) => splitDatumTijd(s.start_tijd).datum === d;

    const dagTotalen = useMemo(
        () => dagen.map((d) => werkDiensten.filter((s) => opDag(s, toIsoDate(d)) && opActieve(s)).reduce((a, s) => a + (parseFloat(s.uren) || 0), 0)),
        [dagen, werkDiensten, opActieve]
    );

    const weekTotaalPer = useMemo(() => {
        const t: Record<string, number> = {};
        werkDiensten.forEach((s) => {
            const id = schoonId(s.gebruiker_uuid);
            t[id] = (t[id] || 0) + (parseFloat(s.uren) || 0);
        });
        return t;
    }, [werkDiensten]);

    const dag = dagen[dagIndex];
    const dStr = toIsoDate(dag);
    const dagNaam = DAGNAMEN[dag.getDay()];
    const feestdag = feestdagen.find((f) => f.datum === dStr);

    // Bezetting van de gekozen dag (zoals renderBezetting op het web).
    const bezetting = useMemo(() => {
        const vandaag = werkDiensten.filter((s) => opDag(s, dStr));
        const locs = actieveLocatie
            ? [{ id: actieveLocatie, naam: (locaties || []).find((l) => schoonId(l.uuid) === actieveLocatie)?.naam || '' }]
            : (locaties || []).length > 1
              ? (locaties || []).map((l) => ({ id: schoonId(l.uuid), naam: l.naam }))
              : [];
        const perLocatie = locs.map((l) => {
            const diensten = actieveLocatie ? vandaag.filter(opActieve) : vandaag.filter((s) => schoonId(s.locatie_uuid) === l.id);
            const telling = telBezetting(diensten);
            const norm = minimaleBezetting(settings, l.id, dagNaam);
            const tijden = openingstijdenVoor(settings, l.id, dagNaam);
            const dicht = !!tijden?.gesloten && telling.aantal === 0;
            const status = dicht || !norm ? '' : telling.aantal < norm ? 'tekort' : 'ok';
            return { ...l, telling, norm, dicht, status };
        });
        const totaal = actieveLocatie ? perLocatie[0]?.telling || telBezetting([]) : telBezetting(vandaag);
        return { totaal, perLocatie, hoofd: actieveLocatie ? perLocatie[0] : null };
    }, [werkDiensten, dStr, actieveLocatie, locaties, settings, dagNaam, opActieve]);

    // ---------- Acties ----------
    async function publiceer() {
        const email = settingAan(settings?.email_notif_enabled);
        const locNaam = actieveLocatie ? (locaties || []).find((l) => schoonId(l.uuid) === actieveLocatie)?.naam : null;
        const scope = locNaam ? `alle concepten van ${locNaam}` : 'alle concepten';
        Alert.alert(
            'Concepten publiceren?',
            email
                ? `Weet je zeker dat je ${scope} wilt publiceren? Betrokken medewerkers krijgen direct een e-mail en pushmelding.`
                : `Weet je zeker dat je ${scope} wilt publiceren? (E-mailnotificaties staan uit.)`,
            [
                { text: 'Annuleren', style: 'cancel' },
                {
                    text: 'Publiceren',
                    onPress: async () => {
                        setBezig('publiceer');
                        try {
                            const r = await PlanningApi.publiceerWeek({ start_datum: startStr, eind_datum: eindStr, locatie_uuid: (locaties || []).length > 1 ? actieveLocatie || null : null });
                            Alert.alert('Gepubliceerd', `${r.gepubliceerde_diensten} diensten gepubliceerd${r.mails_verzonden ? ' en e-mails verzonden' : ''}.`);
                            laadWeek(true);
                        } catch (err) {
                            Alert.alert('Publiceren mislukt', err instanceof ApiError ? err.message : 'Probeer het opnieuw.');
                        } finally {
                            setBezig(null);
                        }
                    },
                },
            ]
        );
    }

    function kopieerVorigeWeek() {
        Alert.alert(
            'Vorige week kopiëren?',
            'De diensten van vorige week worden als concept naar deze week gekopieerd. Dagen met goedgekeurd verlof worden overgeslagen.',
            [
                { text: 'Annuleren', style: 'cancel' },
                {
                    text: 'Kopiëren',
                    onPress: async () => {
                        setBezig('kopie');
                        try {
                            const vorige = (await PlanningApi.totaal(user!.org_uuid, toIsoDate(addDays(weekStart, -7)), toIsoDate(addDays(weekStart, -1)), true)) as any[];
                            const kandidaten = (vorige || []).filter((s) => isWerkDienst(s) && opActieve(s));
                            if (kandidaten.length === 0) {
                                Alert.alert('Niets te kopiëren', 'Er zijn geen diensten gevonden in de vorige week.');
                                return;
                            }
                            let gekopieerd = 0;
                            let overgeslagen = 0;
                            const plus7 = (v: string) => {
                                const { datum, tijd } = splitDatumTijd(v);
                                return `${toIsoDate(addDays(new Date(`${datum}T12:00:00`), 7))} ${tijd}:00`;
                            };
                            await Promise.all(
                                kandidaten.map(async (s) => {
                                    const nieuweStart = plus7(s.start_tijd);
                                    const doelDatum = nieuweStart.substring(0, 10);
                                    const heleDagVerlof = verlof.some((v) => {
                                        const a = splitDatumTijd(v.start_tijd);
                                        const b = splitDatumTijd(v.eind_tijd);
                                        return (
                                            schoonId(v.gebruiker_uuid) === schoonId(s.gebruiker_uuid) &&
                                            a.datum === doelDatum &&
                                            v.status === 'verlof_goedgekeurd' &&
                                            a.tijd === '00:00' &&
                                            (b.tijd === '23:59' || b.tijd === '00:00')
                                        );
                                    });
                                    if (heleDagVerlof) {
                                        overgeslagen++;
                                        return;
                                    }
                                    try {
                                        await PlanningApi.addShift({
                                            gebruiker_uuid: s.gebruiker_uuid,
                                            locatie_uuid: s.locatie_uuid,
                                            afdeling_uuid: s.afdeling_uuid || null,
                                            start_tijd: nieuweStart,
                                            eind_tijd: plus7(s.eind_tijd),
                                            pauze_minuten: s.pauze_minuten || 0,
                                        });
                                        gekopieerd++;
                                    } catch (err) {
                                        if (err instanceof ApiError && err.status === 409) overgeslagen++;
                                        else throw err;
                                    }
                                })
                            );
                            Alert.alert('Gekopieerd', overgeslagen ? `${gekopieerd} toegevoegd, ${overgeslagen} overgeslagen i.v.m. verlof.` : `${gekopieerd} diensten gekopieerd.`);
                            laadWeek(true);
                        } catch (err) {
                            Alert.alert('Kopiëren mislukt', err instanceof ApiError ? err.message : 'Probeer het opnieuw.');
                        } finally {
                            setBezig(null);
                        }
                    },
                },
            ]
        );
    }

    async function exporteerWeek() {
        setBezig('pdf');
        try {
            const locNaam = actieveLocatie ? (locaties || []).find((l) => schoonId(l.uuid) === actieveLocatie)?.naam : 'Alle locaties';
            const html = weekoverzichtHtml({
                orgNaam: settings?.naam || 'Organisatie',
                locatie: locNaam || '',
                maandag: weekStart,
                medewerkers: zichtbaar,
                diensten: werkDiensten.filter(opActieve),
                verlof,
                feestdagen,
            });
            await deelPdf(html, `Weekrooster week ${weekNummer(weekStart)}`);
        } catch (err) {
            Alert.alert('PDF mislukt', err instanceof Error ? err.message : 'Probeer het opnieuw.');
        } finally {
            setBezig(null);
        }
    }

    // ---------- Locatiekiezer ----------
    if (locaties === null) return <CenteredLoader />;
    if (actieveLocatie === null) {
        return (
            <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
                <Text style={styles.kiesTitel}>Welke locatie wil je plannen?</Text>
                <Text style={styles.kiesSub}>Je keuze wordt onthouden. Wisselen kan altijd bovenin.</Text>
                {locaties.map((l) => {
                    const n = medewerkers.filter((m) => schoonId(m.locatie_uuid) === schoonId(l.uuid)).length;
                    return (
                        <Pressable key={l.uuid} onPress={() => kiesLocatie(schoonId(l.uuid))} style={styles.kiesKaart}>
                            <IconTile name="storefront-outline" tone="blue" size={42} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.kiesNaam}>{l.naam}</Text>
                                <Text style={styles.kiesMeta}>
                                    {l.adres ? `${l.adres} · ` : ''}
                                    {n} {n === 1 ? 'medewerker' : 'medewerkers'}
                                </Text>
                            </View>
                            <Ionicons name="arrow-forward" size={18} color="#cbd5e1" />
                        </Pressable>
                    );
                })}
                <Pressable onPress={() => kiesLocatie('')} style={[styles.kiesKaart, { borderStyle: 'dashed' }]}>
                    <IconTile name="layers-outline" tone="dark" size={42} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.kiesNaam}>Alle locaties</Text>
                        <Text style={styles.kiesMeta}>Totaaloverzicht van de hele organisatie</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={18} color="#cbd5e1" />
                </Pressable>
            </ScrollView>
        );
    }

    const dagVerlof = (m: any) => verlof.filter((v) => schoonId(v.gebruiker_uuid) === schoonId(m.uuid) && opDag(v, dStr));
    const dagWerk = (m: any) => werkDiensten.filter((s) => schoonId(s.gebruiker_uuid) === schoonId(m.uuid) && opDag(s, dStr));
    const ingeplandVandaag = zichtbaar.filter((m) => dagWerk(m).length > 0 || dagVerlof(m).length > 0);
    const vrijVandaag = zichtbaar.filter((m) => !ingeplandVandaag.includes(m));

    function MedewerkerRij({ m }: { m: any }) {
        const vl = dagVerlof(m);
        const wk = dagWerk(m);
        const hier = wk.filter(opActieve);
        const elders = wk.filter((s) => !opActieve(s));
        const heleDagAkkoord = vl.some((v) => {
            const a = splitDatumTijd(v.start_tijd).tijd;
            const b = splitDatumTijd(v.eind_tijd).tijd;
            return v.status === 'verlof_goedgekeurd' && a === '00:00' && (b === '23:59' || b === '00:00');
        });
        return (
            <View style={styles.rij}>
                <View style={styles.rijKop}>
                    <Avatar naam={`${m.voornaam} ${m.achternaam}`} size={34} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.naam} numberOfLines={1}>
                            {m.voornaam} {m.achternaam}
                        </Text>
                        <Text style={styles.weekUren}>{(weekTotaalPer[schoonId(m.uuid)] || 0).toFixed(1)} uur deze week</Text>
                    </View>
                    {heleDagAkkoord ? (
                        <Badge label="Verlof" tone="emerald" icon="lock-closed" />
                    ) : (
                        <Pressable onPress={() => setEditor({ gebruiker_uuid: m.uuid, datum: dStr, locatie_uuid: actieveLocatie || null })} style={styles.plus} hitSlop={6}>
                            <Ionicons name="add" size={18} color={colors.primary} />
                        </Pressable>
                    )}
                </View>
                {vl.map((v) => {
                    const akkoord = v.status === 'verlof_goedgekeurd';
                    const a = splitDatumTijd(v.start_tijd).tijd;
                    const b = splitDatumTijd(v.eind_tijd).tijd;
                    const heel = a === '00:00' && (b === '23:59' || b === '00:00');
                    return (
                        <View key={`${v.uuid}-${v.start_tijd}`} style={[styles.verlofKaart, akkoord ? styles.verlofAkkoord : styles.verlofAanvraag]}>
                            <Ionicons name={akkoord ? 'checkmark-circle' : 'time-outline'} size={14} color={akkoord ? colors.success : '#ea580c'} />
                            <Text style={[styles.verlofTekst, { color: akkoord ? '#047857' : '#c2410c' }]}>
                                {akkoord ? 'Verlof akkoord' : 'Verlofaanvraag'} · {heel ? 'Hele dag' : `${a}–${b}`}
                            </Text>
                        </View>
                    );
                })}
                {hier.map((s) => {
                    const a = splitDatumTijd(s.start_tijd).tijd;
                    const b = splitDatumTijd(s.eind_tijd).tijd;
                    const concept = s.status === 'concept';
                    const dd = bepaalDagdeel(a, b);
                    return (
                        <Pressable key={s.uuid} onPress={() => setEditor({ uuid: s.uuid })} style={[styles.dienst, concept && styles.dienstConcept]}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.dienstTijd}>
                                    {a}–{b}
                                </Text>
                                <Text style={styles.dienstMeta} numberOfLines={1}>
                                    {dd.label} · {formatUren(s.uren)}u{s.pauze_minuten ? ` · ${s.pauze_minuten} min pauze` : ''}
                                    {!actieveLocatie && s.locatie_naam ? ` · ${s.locatie_naam}` : ''}
                                    {s.afdeling_naam ? ` · ${s.afdeling_naam}` : ''}
                                </Text>
                                {actieveLocatie && !s.locatie_uuid ? <Text style={styles.geenLoc}>Geen locatie</Text> : null}
                            </View>
                            {concept ? <Badge label="Concept" /> : s.status && s.status !== 'ingepland' ? <Badge label={s.status === 'ziek' ? 'Ziek' : s.status === 'te ruil' ? 'Op de beurs' : s.status} tone={s.status === 'ziek' ? 'rose' : 'amber'} /> : null}
                            <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
                        </Pressable>
                    );
                })}
                {elders.map((s) => (
                    <Pressable key={s.uuid} onPress={() => setEditor({ uuid: s.uuid })} style={styles.elders}>
                        <Ionicons name="swap-horizontal" size={12} color={colors.subtle} />
                        <Text style={styles.eldersTekst}>
                            {splitDatumTijd(s.start_tijd).tijd}–{splitDatumTijd(s.eind_tijd).tijd} · {s.locatie_naam || 'Andere locatie'}
                        </Text>
                    </Pressable>
                ))}
            </View>
        );
    }

    const hoofd = bezetting.hoofd;
    const bezStatus = hoofd ? (hoofd.dicht ? 'dicht' : hoofd.status) : bezetting.perLocatie.some((l) => l.status === 'tekort') ? 'tekort' : '';

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <Pressable onPress={() => router.push('/(app)/beheer/uren')} hitSlop={8} style={styles.headerKnop}>
                            <Ionicons name="stopwatch-outline" size={18} color={colors.text} />
                        </Pressable>
                    ),
                }}
            />
            <View style={styles.weekNav}>
                <Pressable onPress={() => setWeekStart(addDays(weekStart, -7))} style={styles.navBtn}>
                    <Ionicons name="chevron-back" size={18} color={colors.text} />
                </Pressable>
                <Pressable onPress={() => setWeekStart(startOfWeek(new Date()))} style={{ alignItems: 'center' }}>
                    <Text style={styles.eyebrow}>Week {weekNummer(weekStart)}</Text>
                    <Text style={styles.weekLabel}>
                        {dagen[0].toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} t/m {dagen[6].toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                    </Text>
                </Pressable>
                <Pressable onPress={() => setWeekStart(addDays(weekStart, 7))} style={styles.navBtn}>
                    <Ionicons name="chevron-forward" size={18} color={colors.text} />
                </Pressable>
            </View>

            {(locaties || []).length > 1 ? (
                <View style={styles.locBalk}>
                    <ChipRow>
                        {(locaties || []).map((l) => (
                            <Chip
                                key={l.uuid}
                                label={`${l.naam} · ${tellingen[schoonId(l.uuid)] || 0}`}
                                active={actieveLocatie === schoonId(l.uuid)}
                                onPress={() => kiesLocatie(schoonId(l.uuid))}
                            />
                        ))}
                        <Chip label={`Alle · ${werkDiensten.length}`} icon="layers-outline" active={actieveLocatie === ''} onPress={() => kiesLocatie('')} />
                    </ChipRow>
                </View>
            ) : null}

            <View style={styles.dagTabs}>
                {dagen.map((d, i) => {
                    const actief = i === dagIndex;
                    const vandaag = toIsoDate(d) === toIsoDate(new Date());
                    const fd = feestdagen.some((f) => f.datum === toIsoDate(d));
                    return (
                        <Pressable key={i} onPress={() => setDagIndex(i)} style={[styles.dagTab, actief && styles.dagTabActief, !actief && vandaag && styles.dagTabVandaag]}>
                            {fd ? <Ionicons name="star" size={8} color="#f43f5e" style={styles.ster} /> : null}
                            <Text style={[styles.dagKort, actief && styles.wit]}>{KORT[i]}</Text>
                            <Text style={[styles.dagNum, actief && styles.wit]}>{d.getDate()}</Text>
                            <Text style={[styles.dagUren, actief && { color: '#bfdbfe' }]}>{dagTotalen[i].toFixed(1)}u</Text>
                        </Pressable>
                    );
                })}
            </View>

            {laden ? (
                <CenteredLoader />
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => laadWeek(true)} />}
                    {...panResponder.panHandlers}
                >
                    <ErrorBanner message={error} />

                    <View style={styles.acties}>
                        <PrimaryButton
                            small
                            title={conceptenHier > 0 ? `Publiceer (${conceptenHier})` : 'Gepubliceerd'}
                            icon={conceptenHier > 0 ? 'paper-plane' : 'checkmark'}
                            onPress={publiceer}
                            disabled={conceptenHier === 0}
                            loading={bezig === 'publiceer'}
                            style={{ flex: 1.3 }}
                        />
                        <PrimaryButton small variant="secondary" title="Kopieer" icon="copy-outline" onPress={kopieerVorigeWeek} loading={bezig === 'kopie'} style={{ flex: 1 }} />
                        <PrimaryButton small variant="secondary" title="PDF" icon="document-outline" onPress={exporteerWeek} loading={bezig === 'pdf'} style={{ flex: 0.8 }} />
                    </View>
                    {actieveLocatie && (locaties || []).length > 1 ? (
                        <View style={{ marginBottom: 6 }}>
                            <SwitchRow label="Ook medewerkers van andere locaties" value={toonAlle} onValueChange={zetToonAlle} />
                        </View>
                    ) : null}

                    <View style={styles.dagKop}>
                        <Text style={styles.dagTitel}>{dag.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
                        {feestdag ? <Badge label={feestdag.naam} tone="rose" icon="star" /> : null}
                    </View>

                    <Card style={[styles.bezKaart, bezStatus === 'tekort' && styles.bezTekort, bezStatus === 'ok' && styles.bezOk]}>
                        <View style={styles.bezKop}>
                            <IconTile name="people" tone="dark" size={36} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.bezGetal}>
                                    {bezetting.totaal.aantal}
                                    <Text style={styles.bezNorm}>{hoofd?.norm && !hoofd.dicht ? ` / ${hoofd.norm}` : ' pers.'}</Text>
                                </Text>
                                <Text style={styles.bezLabel}>Bezetting{hoofd ? '' : ' · alle locaties'}</Text>
                            </View>
                            {hoofd?.dicht ? <Badge label="Gesloten" /> : null}
                            {hoofd && hoofd.status === 'tekort' ? <Badge label={`${(hoofd.norm || 0) - hoofd.telling.aantal} tekort`} tone="rose" icon="warning" /> : null}
                            {hoofd && hoofd.status === 'ok' ? <Badge label="In orde" tone="emerald" icon="checkmark" /> : null}
                        </View>
                        <View style={styles.dagdelen}>
                            {BEZ_DAGDELEN.map(([kort, naam, , , kleur], k) => (
                                <View key={kort} style={[styles.dagdeel, { borderColor: bezetting.totaal.perDagdeel[k] ? kleur : colors.line }]}>
                                    <Text style={[styles.dagdeelTekst, { color: bezetting.totaal.perDagdeel[k] ? kleur : colors.subtle }]}>
                                        {naam} {bezetting.totaal.perDagdeel[k]}
                                    </Text>
                                </View>
                            ))}
                        </View>
                        {!hoofd
                            ? bezetting.perLocatie.map((l) => (
                                  <View key={l.id} style={styles.bezLoc}>
                                      <Text style={[styles.bezLocNaam, l.status === 'tekort' && { color: colors.danger }]}>{l.naam}</Text>
                                      <Text style={[styles.bezLocWaarde, l.status === 'tekort' && { color: colors.danger }]}>
                                          {l.dicht ? 'dicht' : `${l.telling.aantal}${l.norm ? `/${l.norm}` : ''}`}
                                      </Text>
                                  </View>
                              ))
                            : null}
                    </Card>

                    {zichtbaar.length === 0 ? (
                        <Card>
                            <EmptyState icon="people-outline" title="Nog geen medewerkers hier" subtitle="Koppel medewerkers aan deze locatie of toon ook medewerkers van andere locaties." />
                        </Card>
                    ) : (
                        <>
                            {ingeplandVandaag.length > 0 ? (
                                <Card style={{ padding: 8, marginBottom: 12 }}>
                                    {ingeplandVandaag.map((m) => (
                                        <MedewerkerRij key={m.uuid} m={m} />
                                    ))}
                                </Card>
                            ) : (
                                <InfoBanner message="Nog niemand ingepland op deze dag. Tik op + bij een medewerker om een dienst toe te voegen." />
                            )}
                            {vrijVandaag.length > 0 ? (
                                <>
                                    <Text style={styles.groep}>Nog niet ingepland ({vrijVandaag.length})</Text>
                                    <Card style={{ padding: 8 }}>
                                        {vrijVandaag.map((m) => (
                                            <MedewerkerRij key={m.uuid} m={m} />
                                        ))}
                                    </Card>
                                </>
                            ) : null}
                        </>
                    )}
                </ScrollView>
            )}

            <ShiftEditor
                visible={!!editor}
                start={editor}
                onClose={() => setEditor(null)}
                onSaved={() => laadWeek(true)}
                settings={settings}
                locaties={locaties || []}
                medewerkers={medewerkers}
                verlof={verlof}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    headerKnop: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.slateSoft, alignItems: 'center', justifyContent: 'center' },
    kiesTitel: { fontSize: 22, fontWeight: '900', color: colors.ink, letterSpacing: -0.6, marginTop: 4 },
    kiesSub: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 4, marginBottom: 16 },
    kiesKaart: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1.5, borderColor: colors.line, padding: 14, marginBottom: 10 },
    kiesNaam: { fontSize: 15, fontWeight: '900', color: colors.ink },
    kiesMeta: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
    weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff' },
    navBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.slateSoft, alignItems: 'center', justifyContent: 'center' },
    eyebrow: { fontSize: 10, fontWeight: '900', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1.4 },
    weekLabel: { fontSize: 14, fontWeight: '900', color: colors.ink, marginTop: 2 },
    locBalk: { backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 10 },
    dagTabs: { flexDirection: 'row', gap: 4, backgroundColor: '#fff', paddingHorizontal: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
    dagTab: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 14 },
    dagTabActief: { backgroundColor: colors.primary },
    dagTabVandaag: { backgroundColor: colors.primarySoft },
    ster: { position: 'absolute', top: 3, right: 6 },
    dagKort: { fontSize: 10, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' },
    dagNum: { fontSize: 16, fontWeight: '900', color: colors.ink },
    dagUren: { fontSize: 9, fontWeight: '800', color: colors.subtle },
    wit: { color: '#fff' },
    acties: { flexDirection: 'row', gap: 8, marginBottom: 6 },
    dagKop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6, marginBottom: 10, paddingHorizontal: 4 },
    dagTitel: { fontSize: 17, fontWeight: '900', color: colors.ink, textTransform: 'capitalize', letterSpacing: -0.4 },
    bezKaart: { marginBottom: 12, padding: 14 },
    bezTekort: { borderColor: colors.dangerBorder, backgroundColor: '#fffafb' },
    bezOk: { borderColor: colors.successBorder },
    bezKop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bezGetal: { fontSize: 24, fontWeight: '900', color: colors.ink, letterSpacing: -0.6 },
    bezNorm: { fontSize: 13, fontWeight: '800', color: colors.subtle },
    bezLabel: { fontSize: 10, fontWeight: '900', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
    dagdelen: { flexDirection: 'row', gap: 6, marginTop: 12 },
    dagdeel: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 5, alignItems: 'center' },
    dagdeelTekst: { fontSize: 11, fontWeight: '900' },
    bezLoc: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line },
    bezLocNaam: { fontSize: 12, fontWeight: '700', color: colors.text },
    bezLocWaarde: { fontSize: 12, fontWeight: '900', color: colors.ink },
    groep: { fontSize: 10, fontWeight: '900', color: colors.subtle, textTransform: 'uppercase', letterSpacing: 1.4, marginTop: 8, marginBottom: 8, marginLeft: 4 },
    rij: { padding: 8, gap: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
    rijKop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    naam: { fontSize: 14, fontWeight: '900', color: colors.ink },
    weekUren: { fontSize: 11, fontWeight: '700', color: colors.subtle, marginTop: 1 },
    plus: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    verlofKaart: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, marginLeft: 44 },
    verlofAkkoord: { borderColor: colors.successBorder, backgroundColor: colors.successSoft },
    verlofAanvraag: { borderColor: '#fdba74', backgroundColor: '#fff7ed' },
    verlofTekst: { fontSize: 12, fontWeight: '800' },
    dienst: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderLeftWidth: 4, borderLeftColor: colors.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, marginLeft: 44, backgroundColor: '#fff' },
    dienstConcept: { borderLeftColor: '#cbd5e1', borderStyle: 'dashed', backgroundColor: colors.inputBg },
    dienstTijd: { fontSize: 14, fontWeight: '900', color: colors.ink },
    dienstMeta: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 1 },
    geenLoc: { fontSize: 11, fontWeight: '800', color: colors.warning, marginTop: 2 },
    elders: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 44, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.slateSoft },
    eldersTekst: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
});
