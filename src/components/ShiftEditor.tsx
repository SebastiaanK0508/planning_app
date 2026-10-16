import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../lib/api';
import { normaliseer, toIsoDate } from '../lib/format';
import {
    berekenStandaardPauze,
    DAGNAMEN,
    dienstDuurUren,
    openingstijdenVoor,
    schoonId,
    sjablonenVoor,
    splitDatumTijd,
} from '../lib/planning';
import { OrganisatieApi, PlanningApi } from '../lib/services';
import { colors } from '../lib/theme';
import { Avatar, Chip, ChipRow, DateField, FieldLabel, InfoBanner, PrimaryButton, SearchField, Sheet, TextField } from './ui';

export type ShiftEditorStart = { uuid?: string; gebruiker_uuid?: string; datum?: string; locatie_uuid?: string | null };

type Props = {
    visible: boolean;
    start: ShiftEditorStart | null;
    onClose: () => void;
    onSaved: () => void;
    settings: any;
    locaties: any[];
    medewerkers: any[];
    /** Verlofregels van de geladen week (uit /totaal), voor de waarschuwing. */
    verlof: any[];
};

const tijdNaarDate = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
};
const dateNaarTijd = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const datumNaarDate = (s: string) => new Date(`${s}T12:00:00`);

export function ShiftEditor({ visible, start, onClose, onSaved, settings, locaties, medewerkers, verlof }: Props) {
    const [uuid, setUuid] = useState<string | null>(null);
    const [medewerker, setMedewerker] = useState<string>('');
    const [datum, setDatum] = useState(toIsoDate(new Date()));
    const [locatie, setLocatie] = useState<string>('');
    const [afdeling, setAfdeling] = useState<string>('');
    const [afdelingen, setAfdelingen] = useState<any[]>([]);
    const [begin, setBegin] = useState('09:00');
    const [eind, setEind] = useState('17:00');
    const [pauze, setPauze] = useState('30');
    const [pauzeHandmatig, setPauzeHandmatig] = useState(false);
    const [tijdenHandmatig, setTijdenHandmatig] = useState(false);
    const [zoek, setZoek] = useState('');
    const [kiesMedewerker, setKiesMedewerker] = useState(false);
    const [bezig, setBezig] = useState(false);
    const [laden, setLaden] = useState(false);

    // Initialiseren bij openen.
    useEffect(() => {
        if (!visible || !start) return;
        setZoek('');
        setKiesMedewerker(false);
        if (start.uuid) {
            setLaden(true);
            (PlanningApi.getShift(start.uuid) as Promise<any>)
                .then((s) => {
                    setUuid(s.uuid);
                    setMedewerker(schoonId(s.gebruiker_uuid));
                    const a = splitDatumTijd(s.start_tijd);
                    const b = splitDatumTijd(s.eind_tijd);
                    setDatum(a.datum);
                    setBegin(a.tijd);
                    setEind(b.tijd);
                    setPauze(String(s.pauze_minuten ?? 0));
                    setPauzeHandmatig(true);
                    setTijdenHandmatig(true);
                    setLocatie(schoonId(s.locatie_uuid));
                    setAfdeling(schoonId(s.afdeling_uuid));
                })
                .catch(() => Alert.alert('Fout', 'Kon de dienst niet laden.'))
                .finally(() => setLaden(false));
        } else {
            setUuid(null);
            setMedewerker(schoonId(start.gebruiker_uuid));
            setDatum(start.datum || toIsoDate(new Date()));
            const loc = start.locatie_uuid ? schoonId(start.locatie_uuid) : locaties.length === 1 ? schoonId(locaties[0].uuid) : '';
            setLocatie(loc);
            setAfdeling('');
            setPauzeHandmatig(false);
            setTijdenHandmatig(false);
            if (!start.gebruiker_uuid) setKiesMedewerker(true);
        }
    }, [visible, start]); // eslint-disable-line react-hooks/exhaustive-deps

    // Nieuwe dienst: tijden volgen de openingstijden van locatie + dag, tot de planner ze zelf kiest.
    useEffect(() => {
        if (!visible || uuid || tijdenHandmatig) return;
        const dagNaam = DAGNAMEN[datumNaarDate(datum).getDay()];
        const t = openingstijdenVoor(settings, locatie, dagNaam);
        const open = t && !t.gesloten;
        setBegin((open && t?.open) || '09:00');
        setEind((open && t?.sluit) || '17:00');
    }, [visible, uuid, tijdenHandmatig, datum, locatie, settings]);

    // Afdelingen van de gekozen locatie.
    useEffect(() => {
        if (!locatie) {
            setAfdelingen([]);
            return;
        }
        (OrganisatieApi.afdelingen(locatie) as Promise<any[]>).then((r) => setAfdelingen(r || [])).catch(() => setAfdelingen([]));
    }, [locatie]);

    const standaard = useMemo(() => berekenStandaardPauze(settings, locatie, begin, eind), [settings, locatie, begin, eind]);
    useEffect(() => {
        if (!pauzeHandmatig) setPauze(String(standaard.minuten));
    }, [standaard.minuten, pauzeHandmatig]);

    const sjablonen = useMemo(() => sjablonenVoor(settings, locatie), [settings, locatie]);

    // Verlof op deze dag voor deze medewerker (goedgekeurd gaat voor op een aanvraag).
    const verlofHier = useMemo(() => {
        const opDag = verlof.filter((v) => schoonId(v.gebruiker_uuid) === medewerker && splitDatumTijd(v.start_tijd).datum === datum);
        const v = opDag.find((x) => x.status === 'verlof_goedgekeurd') || opDag[0];
        if (!v) return null;
        const van = splitDatumTijd(v.start_tijd).tijd;
        const tot = splitDatumTijd(v.eind_tijd).tijd;
        return { ...v, akkoord: v.status === 'verlof_goedgekeurd', heleDag: van === '00:00' && (tot === '23:59' || tot === '00:00'), van, tot };
    }, [verlof, medewerker, datum]);
    const geblokkeerd = !!verlofHier && verlofHier.akkoord && verlofHier.heleDag;

    const gekozen = medewerkers.find((m) => schoonId(m.uuid) === medewerker);
    const gefilterdeMedewerkers = useMemo(() => {
        const t = normaliseer(zoek.trim());
        const lijst = t ? medewerkers.filter((m) => normaliseer(`${m.voornaam} ${m.achternaam}`).includes(t)) : medewerkers;
        // Medewerkers van de gekozen locatie bovenaan.
        return [...lijst].sort((a, b) => {
            const ah = !locatie || !a.locatie_uuid || schoonId(a.locatie_uuid) === locatie ? 0 : 1;
            const bh = !locatie || !b.locatie_uuid || schoonId(b.locatie_uuid) === locatie ? 0 : 1;
            return ah - bh;
        });
    }, [medewerkers, zoek, locatie]);

    function kiesSjabloon(t: any) {
        setBegin(t.start);
        setEind(t.eind);
        setTijdenHandmatig(true);
        if (t.pauze === null || t.pauze === undefined) setPauzeHandmatig(false);
        else {
            setPauze(String(t.pauze));
            setPauzeHandmatig(true);
        }
    }

    async function opslaan() {
        if (!medewerker) return Alert.alert('Nog niet compleet', 'Kies een medewerker.');
        if (!locatie) return Alert.alert('Nog niet compleet', 'Kies een locatie.');
        if (geblokkeerd) return Alert.alert('Geblokkeerd', `${gekozen?.voornaam || 'Deze medewerker'} heeft goedgekeurd verlof op deze dag.`);
        // Eind vóór start = nachtdienst die doorloopt naar de volgende dag.
        const eindDatum = eind <= begin ? toIsoDate(new Date(datumNaarDate(datum).getTime() + 864e5)) : datum;
        const body = {
            gebruiker_uuid: medewerker,
            locatie_uuid: locatie,
            afdeling_uuid: afdeling || null,
            start_tijd: `${datum} ${begin}:00`,
            eind_tijd: `${eindDatum} ${eind}:00`,
            pauze_minuten: parseInt(pauze, 10) || 0,
        };
        setBezig(true);
        try {
            if (uuid) await PlanningApi.updateShift(uuid, body);
            else await PlanningApi.addShift(body);
            onSaved();
            onClose();
        } catch (err) {
            Alert.alert('Opslaan mislukt', err instanceof ApiError ? err.message : 'Probeer het opnieuw.');
        } finally {
            setBezig(false);
        }
    }

    function verwijderen() {
        if (!uuid) return;
        Alert.alert('Dienst verwijderen?', 'Weet je zeker dat je deze dienst wilt verwijderen?', [
            { text: 'Annuleren', style: 'cancel' },
            {
                text: 'Verwijderen',
                style: 'destructive',
                onPress: async () => {
                    setBezig(true);
                    try {
                        await PlanningApi.deleteShift(uuid);
                        onSaved();
                        onClose();
                    } catch (err) {
                        Alert.alert('Verwijderen mislukt', err instanceof ApiError ? err.message : 'Probeer het opnieuw.');
                    } finally {
                        setBezig(false);
                    }
                },
            },
        ]);
    }

    const locNaam = (id: string) => locaties.find((l) => schoonId(l.uuid) === id)?.naam || '';
    const duur = dienstDuurUren(begin, eind);
    const netto = Math.max(0, duur - (parseInt(pauze, 10) || 0) / 60);
    const pauzeAfwijkend = (parseInt(pauze, 10) || 0) !== standaard.minuten;

    return (
        <Sheet
            visible={visible}
            onClose={onClose}
            title={uuid ? 'Dienst aanpassen' : 'Nieuwe dienst'}
            subtitle={uuid ? undefined : 'Wordt als concept opgeslagen tot je de week publiceert'}
            footer={
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    {uuid ? <PrimaryButton title="Verwijder" variant="danger" icon="trash-outline" onPress={verwijderen} disabled={bezig} style={{ flex: 1 }} /> : null}
                    <PrimaryButton
                        title={geblokkeerd ? 'Geblokkeerd' : 'Opslaan'}
                        icon="checkmark"
                        onPress={opslaan}
                        loading={bezig}
                        disabled={laden || geblokkeerd}
                        style={{ flex: 2 }}
                    />
                </View>
            }
        >
            {laden ? null : (
                <>
                    <FieldLabel>Medewerker</FieldLabel>
                    {!kiesMedewerker && gekozen ? (
                        <Pressable onPress={() => setKiesMedewerker(true)} style={styles.gekozen}>
                            <Avatar naam={`${gekozen.voornaam} ${gekozen.achternaam}`} size={34} />
                            <Text style={styles.gekozenNaam}>
                                {gekozen.voornaam} {gekozen.achternaam}
                            </Text>
                            <Text style={styles.wijzig}>Wijzig</Text>
                        </Pressable>
                    ) : (
                        <View style={styles.kiezer}>
                            <SearchField value={zoek} onChangeText={setZoek} placeholder="Zoek medewerker..." style={{ marginBottom: 6 }} />
                            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                {gefilterdeMedewerkers.map((m) => (
                                    <Pressable
                                        key={m.uuid}
                                        onPress={() => {
                                            setMedewerker(schoonId(m.uuid));
                                            setKiesMedewerker(false);
                                        }}
                                        style={[styles.persoon, schoonId(m.uuid) === medewerker && styles.persoonActief]}
                                    >
                                        <Avatar naam={`${m.voornaam} ${m.achternaam}`} size={30} />
                                        <Text style={styles.persoonNaam}>
                                            {m.voornaam} {m.achternaam}
                                        </Text>
                                        {m.locatie_naam ? <Text style={styles.persoonLoc}>{m.locatie_naam}</Text> : null}
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <DateField label="Datum" value={datumNaarDate(datum)} onChange={(d) => setDatum(toIsoDate(d))} />

                    {verlofHier ? (
                        <InfoBanner
                            tone={geblokkeerd ? 'rose' : 'amber'}
                            icon={geblokkeerd ? 'lock-closed' : 'warning-outline'}
                            message={
                                geblokkeerd
                                    ? `Inplannen geblokkeerd: goedgekeurd verlof op deze dag (${verlofHier.notitie || 'geen reden opgegeven'}).`
                                    : verlofHier.akkoord
                                      ? `Goedgekeurd verlof van ${verlofHier.van} tot ${verlofHier.tot}. Plan de dienst buiten deze uren.`
                                      : 'Er is een openstaande verlofaanvraag voor deze dag. Inplannen kan, maar overleg is geadviseerd.'
                            }
                        />
                    ) : null}

                    <FieldLabel>Locatie</FieldLabel>
                    <ChipRow style={{ marginBottom: 14 }}>
                        {locaties.map((l) => (
                            <Chip key={l.uuid} label={l.naam} icon="location-outline" active={schoonId(l.uuid) === locatie} onPress={() => { setLocatie(schoonId(l.uuid)); setAfdeling(''); }} />
                        ))}
                    </ChipRow>

                    {locatie ? (
                        <>
                            <FieldLabel>Afdeling</FieldLabel>
                            <ChipRow style={{ marginBottom: 14 }}>
                                <Chip label="Algemeen" active={!afdeling} onPress={() => setAfdeling('')} />
                                {afdelingen.map((a) => (
                                    <Chip key={a.uuid} label={a.naam} active={schoonId(a.uuid) === afdeling} onPress={() => setAfdeling(schoonId(a.uuid))} />
                                ))}
                            </ChipRow>
                        </>
                    ) : null}

                    {sjablonen.length > 0 ? (
                        <>
                            <FieldLabel>Sjabloon</FieldLabel>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginBottom: 14, flexGrow: 0 }}>
                                {sjablonen.map((t) => {
                                    const actief = t.start === begin && t.eind === eind;
                                    const p = t.pauze === null || t.pauze === undefined ? berekenStandaardPauze(settings, locatie, t.start, t.eind).minuten : t.pauze;
                                    return (
                                        <Pressable key={t.id} onPress={() => kiesSjabloon(t)} style={[styles.sjabloon, actief && styles.sjabloonActief]}>
                                            <Text style={[styles.sjabloonNaam, actief && { color: colors.primary }]} numberOfLines={1}>
                                                {t.naam}
                                            </Text>
                                            <Text style={styles.sjabloonTijd}>
                                                {t.start}–{t.eind}
                                            </Text>
                                            <Text style={styles.sjabloonMeta}>
                                                {Math.round(dienstDuurUren(t.start, t.eind) * 100) / 100} u · {p} min{t.pauze === null ? ' (auto)' : ''}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </>
                    ) : null}

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <DateField
                            label="Start"
                            mode="time"
                            value={tijdNaarDate(begin)}
                            onChange={(d) => {
                                setBegin(dateNaarTijd(d));
                                setTijdenHandmatig(true);
                            }}
                            style={{ flex: 1 }}
                        />
                        <DateField
                            label="Eind"
                            mode="time"
                            value={tijdNaarDate(eind)}
                            onChange={(d) => {
                                setEind(dateNaarTijd(d));
                                setTijdenHandmatig(true);
                            }}
                            style={{ flex: 1 }}
                        />
                    </View>

                    <TextField
                        label="Pauze (minuten)"
                        value={pauze}
                        onChangeText={(v) => {
                            setPauze(v.replace(/[^0-9]/g, ''));
                            setPauzeHandmatig(true);
                        }}
                        keyboardType="number-pad"
                    />
                    <View style={styles.pauzeHint}>
                        <Ionicons name={pauzeAfwijkend ? 'create-outline' : 'sparkles-outline'} size={13} color={pauzeAfwijkend ? colors.textMuted : '#60a5fa'} />
                        <Text style={styles.pauzeHintTekst}>
                            {pauzeAfwijkend
                                ? `Aangepast. Standaard is ${standaard.minuten} min.`
                                : standaard.automatisch
                                  ? `Automatisch berekend${standaard.extra.length ? `: ${standaard.basis} min${standaard.extra.map((r) => ` + ${r.minuten} min na ${r.na}`).join('')}` : ''} (${standaard.eigenLocatie ? `regels van ${locNaam(locatie)}` : 'standaard organisatie'})`
                                  : 'Vaste standaardpauze van de organisatie'}
                        </Text>
                        {pauzeAfwijkend ? (
                            <Pressable onPress={() => setPauzeHandmatig(false)} hitSlop={6}>
                                <Text style={styles.link}>Standaard gebruiken</Text>
                            </Pressable>
                        ) : null}
                    </View>

                    <View style={styles.samenvatting}>
                        <Text style={styles.samenvattingTekst}>
                            {begin}–{eind}
                            {eind <= begin ? ' (tot volgende dag)' : ''}
                        </Text>
                        <Text style={styles.samenvattingUren}>{netto.toLocaleString('nl-NL', { maximumFractionDigits: 2 })} uur netto</Text>
                    </View>
                </>
            )}
        </Sheet>
    );
}

const styles = StyleSheet.create({
    gekozen: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.inputBg, marginBottom: 14 },
    gekozenNaam: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.ink },
    wijzig: { fontSize: 12, fontWeight: '900', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.6 },
    kiezer: { borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, padding: 8, marginBottom: 14 },
    persoon: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 12 },
    persoonActief: { backgroundColor: colors.primarySoft },
    persoonNaam: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.ink },
    persoonLoc: { fontSize: 11, fontWeight: '700', color: colors.subtle },
    sjabloon: { width: 132, padding: 12, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, backgroundColor: '#fff' },
    sjabloonActief: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    sjabloonNaam: { fontSize: 13, fontWeight: '900', color: colors.ink },
    sjabloonTijd: { fontSize: 15, fontWeight: '900', color: colors.ink, marginTop: 4 },
    sjabloonMeta: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
    pauzeHint: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: -6, marginBottom: 14 },
    pauzeHintTekst: { fontSize: 12, color: colors.textMuted, fontWeight: '600', flexShrink: 1 },
    link: { fontSize: 12, fontWeight: '900', color: colors.primary },
    samenvatting: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.ink, borderRadius: 16, padding: 14 },
    samenvattingTekst: { fontSize: 15, fontWeight: '900', color: '#fff' },
    samenvattingUren: { fontSize: 13, fontWeight: '800', color: '#93c5fd' },
});
