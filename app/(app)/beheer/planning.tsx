import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, ErrorBanner, PrimaryButton, TextField } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { ApiError } from '../../../src/lib/api';
import { formatTime, isSameDay, parseServerDate, toIsoDate } from '../../../src/lib/format';
import { OrganisatieApi, PlanningApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

export default function RoosterMakenScreen() {
    const { user } = useAuth();
    const [datum, setDatum] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [gebruikerUuid, setGebruikerUuid] = useState<string | null>(null);
    const [locatieUuid, setLocatieUuid] = useState<string | null>(null);
    const [afdelingUuid, setAfdelingUuid] = useState<string | null>(null);
    const [startTijd, setStartTijd] = useState(new Date(new Date().setHours(9, 0, 0, 0)));
    const [eindTijd, setEindTijd] = useState(new Date(new Date().setHours(17, 0, 0, 0)));
    const [showStart, setShowStart] = useState(false);
    const [showEind, setShowEind] = useState(false);
    const [pauze, setPauze] = useState('30');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [medewerkers, setMedewerkers] = useState<any[]>([]);
    const [locaties, setLocaties] = useState<any[]>([]);
    const [afdelingen, setAfdelingen] = useState<any[]>([]);

    useEffect(() => {
        if (!user) return;
        PlanningApi.medewerkers(user.org_uuid).then((rows: any) => setMedewerkers(rows || [])).catch(() => {});
        OrganisatieApi.locaties(user.org_uuid).then((rows: any) => setLocaties(rows || [])).catch(() => {});
        OrganisatieApi.afdelingenVanOrg(user.org_uuid).then((rows: any) => setAfdelingen(rows || [])).catch(() => {});
    }, [user]);

    const { data, reload } = useAsyncData(
        () => PlanningApi.totaal(user!.org_uuid, toIsoDate(datum), toIsoDate(datum)) as Promise<any[]>,
        [user?.org_uuid, datum.getTime()]
    );

    const dagShifts = useMemo(() => {
        if (!data) return [];
        return data
            .filter((item: any) => !String(item.status || '').startsWith('verlof'))
            .filter((item: any) => {
                const d = parseServerDate(item.start_tijd);
                return d && isSameDay(d, datum);
            })
            .sort((a: any, b: any) => new Date(a.start_tijd).getTime() - new Date(b.start_tijd).getTime());
    }, [data, datum]);

    async function handleAdd() {
        setError('');
        if (!gebruikerUuid) {
            setError('Kies een medewerker.');
            return;
        }
        setSaving(true);
        try {
            const dag = toIsoDate(datum);
            const s = `${dag} ${String(startTijd.getHours()).padStart(2, '0')}:${String(startTijd.getMinutes()).padStart(2, '0')}:00`;
            const e = `${dag} ${String(eindTijd.getHours()).padStart(2, '0')}:${String(eindTijd.getMinutes()).padStart(2, '0')}:00`;
            await PlanningApi.addShift({
                gebruiker_uuid: gebruikerUuid,
                locatie_uuid: locatieUuid,
                afdeling_uuid: afdelingUuid,
                start_tijd: s,
                eind_tijd: e,
                pauze_minuten: parseInt(pauze, 10) || 0,
                status: 'ingepland',
            });
            reload();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Toevoegen is mislukt.');
        } finally {
            setSaving(false);
        }
    }

    function confirmDelete(uuid: string) {
        Alert.alert('Dienst verwijderen', 'Weet je zeker dat je deze dienst wilt verwijderen?', [
            { text: 'Annuleren', style: 'cancel' },
            {
                text: 'Verwijderen',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await PlanningApi.deleteShift(uuid);
                        reload();
                    } catch (err) {
                        Alert.alert('Fout', err instanceof ApiError ? err.message : 'Verwijderen mislukt.');
                    }
                },
            },
        ]);
    }

    const gefilterdeAfdelingen = afdelingen.filter((a) => !locatieUuid || a.locatie_naam === locaties.find((l) => l.uuid === locatieUuid)?.naam);

    return (
        <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: '#f8fafc' }}>
            <ErrorBanner message={error} />

            <Text style={styles.label}>Datum</Text>
            <Pressable style={styles.dateField} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateFieldText}>{toIsoDate(datum)}</Text>
            </Pressable>
            {showDatePicker ? (
                <DateTimePicker
                    value={datum}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={(_, selected) => {
                        setShowDatePicker(Platform.OS === 'ios');
                        if (selected) setDatum(selected);
                    }}
                />
            ) : null}

            <Card style={{ marginBottom: 20 }}>
                <Text style={styles.cardTitle}>Nieuwe dienst</Text>

                <Text style={styles.label}>Medewerker</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {medewerkers.map((m: any) => (
                        <Pressable
                            key={m.uuid}
                            onPress={() => setGebruikerUuid(m.uuid)}
                            style={[styles.chip, gebruikerUuid === m.uuid && styles.chipActive]}
                        >
                            <Text style={[styles.chipText, gebruikerUuid === m.uuid && styles.chipTextActive]}>{m.voornaam}</Text>
                        </Pressable>
                    ))}
                </ScrollView>

                <Text style={styles.label}>Locatie (optioneel)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {locaties.map((l: any) => (
                        <Pressable key={l.uuid} onPress={() => setLocatieUuid(l.uuid)} style={[styles.chip, locatieUuid === l.uuid && styles.chipActive]}>
                            <Text style={[styles.chipText, locatieUuid === l.uuid && styles.chipTextActive]}>{l.naam}</Text>
                        </Pressable>
                    ))}
                </ScrollView>

                <Text style={styles.label}>Afdeling (optioneel)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {gefilterdeAfdelingen.map((a: any) => (
                        <Pressable key={a.uuid} onPress={() => setAfdelingUuid(a.uuid)} style={[styles.chip, afdelingUuid === a.uuid && styles.chipActive]}>
                            <Text style={[styles.chipText, afdelingUuid === a.uuid && styles.chipTextActive]}>{a.naam}</Text>
                        </Pressable>
                    ))}
                </ScrollView>

                <View style={styles.timeRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Start</Text>
                        <Pressable style={styles.dateField} onPress={() => setShowStart(true)}>
                            <Text style={styles.dateFieldText}>{formatTime(startTijd.toISOString())}</Text>
                        </Pressable>
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Eind</Text>
                        <Pressable style={styles.dateField} onPress={() => setShowEind(true)}>
                            <Text style={styles.dateFieldText}>{formatTime(eindTijd.toISOString())}</Text>
                        </Pressable>
                    </View>
                </View>
                {showStart ? (
                    <DateTimePicker
                        value={startTijd}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_, selected) => {
                            setShowStart(Platform.OS === 'ios');
                            if (selected) setStartTijd(selected);
                        }}
                    />
                ) : null}
                {showEind ? (
                    <DateTimePicker
                        value={eindTijd}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_, selected) => {
                            setShowEind(Platform.OS === 'ios');
                            if (selected) setEindTijd(selected);
                        }}
                    />
                ) : null}

                <TextField label="Pauze (minuten)" value={pauze} onChangeText={setPauze} keyboardType="number-pad" />

                <PrimaryButton title="Dienst toevoegen" onPress={handleAdd} loading={saving} />
            </Card>

            <Text style={styles.cardTitle}>Diensten op {toIsoDate(datum)}</Text>
            {dagShifts.map((s: any) => (
                <Card key={s.uuid} style={styles.shiftRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.naam}>{s.medewerker_naam}</Text>
                        <Text style={styles.tijd}>
                            {formatTime(s.start_tijd)} - {formatTime(s.eind_tijd)}
                        </Text>
                    </View>
                    <Pressable onPress={() => confirmDelete(s.uuid)}>
                        <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </Pressable>
                </Card>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8 },
    dateField: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: '#fff',
        marginBottom: 16,
    },
    dateFieldText: { fontSize: 15, color: '#0f172a', fontWeight: '600' },
    cardTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#fff',
        marginRight: 8,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, fontWeight: '600', color: '#334155' },
    chipTextActive: { color: '#fff' },
    timeRow: { flexDirection: 'row' },
    shiftRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    naam: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
    tijd: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
