import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar, Card, ErrorBanner, FieldLabel, PrimaryButton, SearchField, Segmented, SwitchRow, TextField } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { ApiError } from '../../../src/lib/api';
import { normaliseer, zelfdeUuid } from '../../../src/lib/format';
import { BerichtenApi } from '../../../src/lib/services';
import { colors, roleLabels } from '../../../src/lib/theme';

// Zoals berichten.html: iedereen mag een collega of het hele team een bericht sturen.
export default function NieuwBerichtScreen() {
    const { user } = useAuth();
    const [type, setType] = useState<'een' | 'iedereen'>('een');
    const [titel, setTitel] = useState('');
    const [bericht, setBericht] = useState('');
    const [urgent, setUrgent] = useState(false);
    const [ontvanger, setOntvanger] = useState<string | null>(null);
    const [zoek, setZoek] = useState('');
    const [gebruikers, setGebruikers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user) return;
        (BerichtenApi.gebruikers(user.org_uuid) as Promise<any[]>)
            .then((rows) => setGebruikers((rows || []).filter((g) => !zelfdeUuid(g.uuid, user.uuid))))
            .catch(() => {});
    }, [user]);

    const gefilterd = useMemo(() => {
        const t = normaliseer(zoek.trim());
        return t ? gebruikers.filter((g) => normaliseer(`${g.voornaam} ${g.achternaam}`).includes(t)) : gebruikers;
    }, [gebruikers, zoek]);

    async function handleSubmit() {
        setError('');
        if (type === 'een' && !ontvanger) return setError('Kies een collega.');
        if (!titel.trim() || !bericht.trim()) return setError('Vul een onderwerp en bericht in.');
        setLoading(true);
        try {
            await BerichtenApi.versturen({
                ontvanger_uuid: type === 'een' ? ontvanger! : 'ALL',
                titel: titel.trim(),
                bericht: bericht.trim(),
                belangrijk: urgent ? 1 : 0,
            });
            router.back();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Versturen is mislukt.');
        } finally {
            setLoading(false);
        }
    }

    const gekozen = gebruikers.find((g) => g.uuid === ontvanger);

    return (
        <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <ErrorBanner message={error} />
            <Segmented
                value={type}
                onChange={setType}
                options={[
                    { value: 'een', label: 'Eén collega' },
                    { value: 'iedereen', label: 'Iedereen' },
                ]}
                style={{ marginBottom: 16 }}
            />

            {type === 'een' ? (
                <Card style={{ marginBottom: 16, padding: 12 }}>
                    <FieldLabel>Ontvanger{gekozen ? `: ${gekozen.voornaam} ${gekozen.achternaam}` : ''}</FieldLabel>
                    <SearchField value={zoek} onChangeText={setZoek} placeholder="Zoek een collega..." style={{ marginBottom: 8 }} />
                    <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                        {gefilterd.map((g) => {
                            const actief = ontvanger === g.uuid;
                            return (
                                <Pressable key={g.uuid} onPress={() => setOntvanger(g.uuid)} style={[styles.persoon, actief && styles.persoonActief]}>
                                    <Avatar naam={`${g.voornaam} ${g.achternaam}`} size={34} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.persoonNaam}>
                                            {g.voornaam} {g.achternaam}
                                        </Text>
                                        <Text style={styles.persoonRol}>{roleLabels[g.rol] || g.rol}</Text>
                                    </View>
                                </Pressable>
                            );
                        })}
                        {gefilterd.length === 0 ? <Text style={styles.leeg}>Geen collega's gevonden.</Text> : null}
                    </ScrollView>
                </Card>
            ) : null}

            <TextField label="Onderwerp" value={titel} onChangeText={setTitel} placeholder="Waar gaat het over?" />
            <TextField label="Bericht" value={bericht} onChangeText={setBericht} placeholder="Typ je bericht..." multiline style={{ minHeight: 140, textAlignVertical: 'top' }} />
            <Card style={{ paddingVertical: 4, marginBottom: 16 }}>
                <SwitchRow label="Markeer als urgent" description="De ontvanger ziet een rode Urgent-markering." value={urgent} onValueChange={setUrgent} />
            </Card>

            <PrimaryButton title="Versturen" icon="paper-plane-outline" onPress={handleSubmit} loading={loading} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    persoon: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, borderWidth: 1.5, borderColor: 'transparent' },
    persoonActief: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    persoonNaam: { fontSize: 14, fontWeight: '800', color: colors.ink },
    persoonRol: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
    leeg: { fontSize: 13, color: colors.subtle, textAlign: 'center', padding: 12 },
});
