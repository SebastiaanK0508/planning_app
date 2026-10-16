import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
    Avatar,
    Badge,
    Card,
    CardHeader,
    CenteredLoader,
    EmptyState,
    ErrorBanner,
    FieldLabel,
    IconButtonSmall,
    PrimaryButton,
    ProgressBar,
    SearchField,
    Segmented,
    Sheet,
    StatTile,
    SwitchRow,
    TextField,
} from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useRoleGuard } from '../../../src/hooks/useRoleGuard';
import { ApiError } from '../../../src/lib/api';
import { formatDateTime, normaliseer } from '../../../src/lib/format';
import { BerichtenApi } from '../../../src/lib/services';
import { colors, PLANNER_PLUS, roleLabels } from '../../../src/lib/theme';

// Teammededelingen (admin_berichten.html): aan iedereen of een selectie, met leesstatus.
export default function MededelingenBeheerScreen() {
    useRoleGuard(PLANNER_PLUS);
    const { user } = useAuth();
    const [berichten, setBerichten] = useState<any[] | null>(null);
    const [gebruikers, setGebruikers] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [zoek, setZoek] = useState('');
    const [nieuwOpen, setNieuwOpen] = useState(false);
    const [doelgroep, setDoelgroep] = useState<'iedereen' | 'selectie'>('iedereen');
    const [ontvangers, setOntvangers] = useState<string[]>([]);
    const [persoonZoek, setPersoonZoek] = useState('');
    const [titel, setTitel] = useState('');
    const [tekst, setTekst] = useState('');
    const [urgent, setUrgent] = useState(false);
    const [bezig, setBezig] = useState(false);
    const [details, setDetails] = useState<any | null>(null);
    const [leesStatus, setLeesStatus] = useState<any[] | null>(null);

    const laad = useCallback(
        async (isRefresh = false) => {
            if (!user) return;
            if (isRefresh) setRefreshing(true);
            try {
                const [b, g] = await Promise.all([BerichtenApi.adminOverzicht(user.org_uuid) as Promise<any[]>, BerichtenApi.gebruikers(user.org_uuid) as Promise<any[]>]);
                setBerichten((b || []).filter((x) => !x.ontvanger_uuid));
                setGebruikers(g || []);
                setError('');
            } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Kon de mededelingen niet laden.');
                setBerichten((x) => x || []);
            } finally {
                setRefreshing(false);
            }
        },
        [user]
    );

    useEffect(() => {
        laad();
    }, [laad]);

    const lijst = useMemo(() => {
        const t = normaliseer(zoek.trim());
        return (berichten || []).filter((b) => !t || normaliseer(`${b.titel} ${b.bericht}`).includes(t));
    }, [berichten, zoek]);

    const stats = useMemo(() => {
        const alle = berichten || [];
        return {
            totaal: alle.length,
            gelezen: alle.filter((b) => Number(b.totaal_medewerkers) > 0 && Number(b.gelezen_count) >= Number(b.totaal_medewerkers)).length,
            urgent: alle.filter((b) => Number(b.belangrijk) === 1).length,
        };
    }, [berichten]);

    const personen = useMemo(() => {
        const t = normaliseer(persoonZoek.trim());
        return gebruikers.filter((g) => !t || normaliseer(`${g.voornaam} ${g.achternaam}`).includes(t));
    }, [gebruikers, persoonZoek]);

    async function verstuur() {
        if (!titel.trim() || !tekst.trim()) return Alert.alert('Nog niet compleet', 'Vul een titel en bericht in.');
        if (doelgroep === 'selectie' && ontvangers.length === 0) return Alert.alert('Ontvangers', 'Kies minimaal één collega.');
        setBezig(true);
        try {
            await BerichtenApi.versturen({
                titel: titel.trim(),
                bericht: tekst.trim(),
                belangrijk: urgent ? 1 : 0,
                ...(doelgroep === 'selectie' ? { ontvangers } : { ontvanger_uuid: 'ALL' }),
            });
            setNieuwOpen(false);
            setTitel('');
            setTekst('');
            setUrgent(false);
            setOntvangers([]);
            laad(true);
        } catch (err) {
            Alert.alert('Versturen mislukt', err instanceof ApiError ? err.message : 'Probeer het opnieuw.');
        } finally {
            setBezig(false);
        }
    }

    async function openDetails(b: any) {
        setDetails(b);
        setLeesStatus(null);
        try {
            setLeesStatus(((await BerichtenApi.leesStatus(b.uuid, user!.org_uuid)) as any[]) || []);
        } catch {
            setLeesStatus([]);
        }
    }

    function verwijder(b: any) {
        Alert.alert('Mededeling verwijderen?', `"${b.titel}" wordt voor iedereen verwijderd.`, [
            { text: 'Annuleren', style: 'cancel' },
            {
                text: 'Verwijderen',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await BerichtenApi.verwijder(b.uuid);
                        setDetails(null);
                        laad(true);
                    } catch (err) {
                        Alert.alert('Mislukt', err instanceof ApiError ? err.message : 'Verwijderen is mislukt.');
                    }
                },
            },
        ]);
    }

    if (berichten === null) return <CenteredLoader />;

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => laad(true)} />} keyboardShouldPersistTaps="handled">
                <ErrorBanner message={error} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <StatTile label="Verstuurd" value={stats.totaal} icon="paper-plane-outline" tone="blue" />
                    <StatTile label="Gelezen" value={stats.gelezen} icon="checkmark-done" tone="emerald" />
                    <StatTile label="Urgent" value={stats.urgent} icon="alert-circle-outline" tone="rose" />
                </View>
                <PrimaryButton title="Nieuwe mededeling" icon="megaphone-outline" onPress={() => setNieuwOpen(true)} style={{ marginTop: 14 }} />
                <SearchField value={zoek} onChangeText={setZoek} placeholder="Zoek in mededelingen..." style={{ marginVertical: 12 }} />
                <Card style={{ padding: 8 }}>
                    <CardHeader icon="megaphone-outline" title="Verstuurde mededelingen" />
                    {lijst.length === 0 ? (
                        <EmptyState icon="megaphone-outline" title="Nog geen mededelingen" />
                    ) : (
                        lijst.map((b, i) => {
                            const totaal = Number(b.totaal_medewerkers) || 0;
                            const gelezen = Number(b.gelezen_count) || 0;
                            return (
                                <Pressable key={b.uuid} onPress={() => openDetails(b)} style={[styles.rij, i > 0 && styles.border]}>
                                    <View style={styles.rijKop}>
                                        <Text style={styles.titel} numberOfLines={1}>
                                            {b.titel}
                                        </Text>
                                        {Number(b.belangrijk) === 1 ? <Badge label="Urgent" tone="rose" /> : null}
                                    </View>
                                    <Text style={styles.snippet} numberOfLines={2}>
                                        {b.bericht}
                                    </Text>
                                    <Text style={styles.meta}>
                                        {formatDateTime(b.datum_geplaatst)} · {b.doelgroep_namen ? `Aan ${b.doelgroep_namen}` : 'Aan iedereen'}
                                    </Text>
                                    <View style={styles.lees}>
                                        <View style={{ flex: 1 }}>
                                            <ProgressBar value={totaal ? gelezen / totaal : 0} color={totaal && gelezen >= totaal ? colors.success : colors.primary} height={6} />
                                        </View>
                                        <Text style={styles.leesTekst}>
                                            {gelezen}/{totaal} gelezen
                                        </Text>
                                    </View>
                                </Pressable>
                            );
                        })
                    )}
                </Card>
            </ScrollView>

            <Sheet visible={nieuwOpen} onClose={() => setNieuwOpen(false)} title="Nieuwe mededeling" footer={<PrimaryButton title="Versturen" icon="paper-plane-outline" onPress={verstuur} loading={bezig} />}>
                <Segmented
                    value={doelgroep}
                    onChange={setDoelgroep}
                    options={[
                        { value: 'iedereen', label: 'Iedereen' },
                        { value: 'selectie', label: `Specifieke personen${ontvangers.length ? ` (${ontvangers.length})` : ''}` },
                    ]}
                    style={{ marginBottom: 14 }}
                />
                {doelgroep === 'selectie' ? (
                    <View style={styles.kiezer}>
                        <SearchField value={persoonZoek} onChangeText={setPersoonZoek} placeholder="Zoek collega..." style={{ marginBottom: 6 }} />
                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                            {personen.map((g) => {
                                const aan = ontvangers.includes(g.uuid);
                                return (
                                    <Pressable key={g.uuid} onPress={() => setOntvangers((o) => (aan ? o.filter((x) => x !== g.uuid) : [...o, g.uuid]))} style={[styles.persoon, aan && styles.persoonAan]}>
                                        <Avatar naam={`${g.voornaam} ${g.achternaam}`} size={30} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.persoonNaam}>
                                                {g.voornaam} {g.achternaam}
                                            </Text>
                                            <Text style={styles.meta}>{roleLabels[g.rol] || g.rol}</Text>
                                        </View>
                                        <Ionicons name={aan ? 'checkbox' : 'square-outline'} size={20} color={aan ? colors.primary : colors.subtle} />
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                ) : null}
                <TextField label="Titel" value={titel} onChangeText={setTitel} placeholder="Onderwerp van de mededeling" />
                <TextField label="Bericht" value={tekst} onChangeText={setTekst} multiline placeholder="Typ je mededeling..." style={{ minHeight: 120, textAlignVertical: 'top' }} />
                <SwitchRow label="Urgent" description="Wordt met een rode markering getoond." value={urgent} onValueChange={setUrgent} />
            </Sheet>

            <Sheet
                visible={!!details}
                onClose={() => setDetails(null)}
                title={details?.titel || ''}
                subtitle={details ? formatDateTime(details.datum_geplaatst) : ''}
                footer={details ? <PrimaryButton title="Verwijderen" variant="danger" icon="trash-outline" onPress={() => verwijder(details)} /> : undefined}
            >
                {details ? (
                    <>
                        <Text style={styles.body}>{details.bericht}</Text>
                        <FieldLabel>Wie heeft het gelezen</FieldLabel>
                        {leesStatus === null ? (
                            <CenteredLoader />
                        ) : (
                            leesStatus.map((l, i) => (
                                <View key={i} style={styles.leesRij}>
                                    <Avatar naam={`${l.voornaam} ${l.achternaam}`} size={30} />
                                    <Text style={[styles.persoonNaam, { flex: 1 }]}>
                                        {l.voornaam} {l.achternaam}
                                    </Text>
                                    {Number(l.is_gelezen) === 1 ? (
                                        <Badge label={l.datum_gelezen ? `Gelezen ${formatDateTime(l.datum_gelezen)}` : 'Gelezen'} tone="emerald" icon="checkmark-done" />
                                    ) : (
                                        <Badge label="Ongelezen" />
                                    )}
                                </View>
                            ))
                        )}
                    </>
                ) : null}
            </Sheet>
        </View>
    );
}

const styles = StyleSheet.create({
    rij: { padding: 10, gap: 4 },
    border: { borderTopWidth: 1, borderTopColor: colors.line },
    rijKop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    titel: { flex: 1, fontSize: 15, fontWeight: '900', color: colors.ink },
    snippet: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
    meta: { fontSize: 11, fontWeight: '700', color: colors.subtle },
    lees: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
    leesTekst: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
    kiezer: { borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, padding: 8, marginBottom: 14 },
    persoon: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 12 },
    persoonAan: { backgroundColor: colors.primarySoft },
    persoonNaam: { fontSize: 14, fontWeight: '800', color: colors.ink },
    body: { fontSize: 14, color: colors.text, lineHeight: 21, marginBottom: 16 },
    leesRij: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.line },
});
