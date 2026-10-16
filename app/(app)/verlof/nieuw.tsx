import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DateField, ErrorBanner, FieldLabel, HeroCard, IconTile, PrimaryButton, Screen, Segmented, TextField } from '../../../src/components/ui';
import { useMijnInstellingen } from '../../../src/hooks/useMijnInstellingen';
import { ApiError } from '../../../src/lib/api';
import { toIsoDate } from '../../../src/lib/format';
import { VerlofApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';
import { berekenDagenUren, VERLOF_TYPES, verlofIcoon } from '../../../src/lib/verlof';

function hhmm(d: Date) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function tijd(h: number, m = 0) {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
}

export default function NieuwVerlofScreen() {
    const params = useLocalSearchParams<{ saldo?: string }>();
    const saldo = params.saldo !== undefined && params.saldo !== '' ? parseFloat(params.saldo) : null;
    const { instellingen } = useMijnInstellingen();
    const [modus, setModus] = useState<'dagen' | 'uren'>('dagen');
    const [type, setType] = useState<string>(VERLOF_TYPES[0]);
    const [startDatum, setStartDatum] = useState(new Date());
    const [eindDatum, setEindDatum] = useState(new Date());
    const [urenDatum, setUrenDatum] = useState(new Date());
    const [tijdVan, setTijdVan] = useState(tijd(9));
    const [tijdTot, setTijdTot] = useState(tijd(13));
    const [notitie, setNotitie] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Live urenvoorbeeld, zoals calculateDays() op verlof.html.
    const preview = useMemo(() => {
        if (modus === 'dagen') {
            if (eindDatum < startDatum && toIsoDate(eindDatum) !== toIsoDate(startDatum)) return null;
            const vaste = instellingen?.vaste_uren || instellingen?.rooster || {};
            return berekenDagenUren(startDatum, eindDatum, vaste);
        }
        const diff = (tijdTot.getHours() + tijdTot.getMinutes() / 60) - (tijdVan.getHours() + tijdVan.getMinutes() / 60);
        return diff > 0 ? diff : null;
    }, [modus, startDatum, eindDatum, tijdVan, tijdTot, instellingen]);

    let hint = 'Dit wordt van je verlofsaldo afgetrokken.';
    let hintKleur = '#94a3b8';
    if (preview !== null && preview <= 0 && modus === 'dagen') {
        hint = 'Let op: voor de gekozen dag(en) staan 0 standaarduren geregistreerd.';
        hintKleur = '#fcd34d';
    } else if (saldo === null) {
        hint = 'Let op: je hebt geen geregistreerd verlofsaldo.';
        hintKleur = '#fcd34d';
    } else if (preview !== null && preview > saldo) {
        hint = `Let op: je hebt nog maar ${saldo.toFixed(1)} uren beschikbaar!`;
        hintKleur = '#fcd34d';
    }

    async function handleSubmit() {
        setError('');
        let start_datum: string;
        let eind_datum: string;
        if (modus === 'dagen') {
            if (toIsoDate(eindDatum) < toIsoDate(startDatum)) return setError('Einddatum kan niet voor de startdatum liggen.');
            start_datum = `${toIsoDate(startDatum)} 00:00:00`;
            eind_datum = `${toIsoDate(eindDatum)} 23:59:59`;
        } else {
            if (hhmm(tijdTot) <= hhmm(tijdVan)) return setError('De eindtijd moet na de starttijd liggen.');
            const d = toIsoDate(urenDatum);
            start_datum = `${d} ${hhmm(tijdVan)}:00`;
            eind_datum = `${d} ${hhmm(tijdTot)}:00`;
        }

        setLoading(true);
        try {
            const res = await VerlofApi.aanvragen({ start_datum, eind_datum, notitie: `${type}: ${notitie.trim()}` });
            const uren = res?.uren_berekend;
            Alert.alert('Aanvraag verstuurd', uren !== undefined ? `Je aanvraag voor ${Number(uren).toFixed(1)} uur ligt bij je planner.` : 'Je aanvraag ligt bij je planner.');
            router.back();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Aanvragen is mislukt.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Screen>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                <ErrorBanner message={error} />

                <Segmented
                    value={modus}
                    onChange={setModus}
                    options={[
                        { value: 'dagen', label: 'Hele dag(en)' },
                        { value: 'uren', label: 'Uren / dagdeel' },
                    ]}
                    style={{ marginBottom: 18 }}
                />

                <FieldLabel>Type verlof</FieldLabel>
                <View style={styles.typeRow}>
                    {VERLOF_TYPES.map((t) => {
                        const actief = type === t;
                        return (
                            <Pressable key={t} onPress={() => setType(t)} style={[styles.typeCard, actief && styles.typeCardActive]}>
                                <IconTile name={verlofIcoon(t)} tone={actief ? 'blue' : 'slate'} size={36} />
                                <Text style={[styles.typeText, actief && { color: colors.primary }]}>{t}</Text>
                            </Pressable>
                        );
                    })}
                </View>

                {modus === 'dagen' ? (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <DateField
                            label="Van"
                            value={startDatum}
                            onChange={(d) => {
                                setStartDatum(d);
                                if (toIsoDate(eindDatum) < toIsoDate(d)) setEindDatum(d);
                            }}
                            style={{ flex: 1 }}
                        />
                        <DateField label="Tot en met" value={eindDatum} minimumDate={startDatum} onChange={setEindDatum} style={{ flex: 1 }} />
                    </View>
                ) : (
                    <>
                        <DateField label="Datum" value={urenDatum} onChange={setUrenDatum} />
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <DateField label="Van" mode="time" value={tijdVan} onChange={setTijdVan} style={{ flex: 1 }} />
                            <DateField label="Tot" mode="time" value={tijdTot} onChange={setTijdTot} style={{ flex: 1 }} />
                        </View>
                    </>
                )}

                <TextField
                    label="Toelichting (optioneel)"
                    value={notitie}
                    onChangeText={setNotitie}
                    placeholder="Bijv. familiebezoek"
                    multiline
                    style={{ minHeight: 90, textAlignVertical: 'top' }}
                />

                {preview !== null ? (
                    <HeroCard style={{ marginBottom: 16 }}>
                        <Text style={styles.previewLabel}>Totaal aan te vragen</Text>
                        <Text style={styles.previewValue}>{preview.toFixed(1)} uren</Text>
                        <Text style={[styles.previewHint, { color: hintKleur }]}>{hint}</Text>
                    </HeroCard>
                ) : null}

                <PrimaryButton title="Aanvraag indienen" icon="paper-plane-outline" onPress={handleSubmit} loading={loading} disabled={modus === 'uren' && preview === null} />
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    typeCard: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: '#fff',
    },
    typeCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    typeText: { fontSize: 13, fontWeight: '800', color: colors.text },
    previewLabel: { fontSize: 10, fontWeight: '900', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 1.4 },
    previewValue: { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: -1, marginTop: 4 },
    previewHint: { fontSize: 12, fontWeight: '700', marginTop: 4 },
});
