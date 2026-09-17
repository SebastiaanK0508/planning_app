import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ErrorBanner, PrimaryButton, Screen, TextField } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { ApiError } from '../../../src/lib/api';
import { toIsoDate } from '../../../src/lib/format';
import { VerlofApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

const TYPES = ['Vakantie', 'Ziekte', 'Bijzonder verlof', 'Onbetaald verlof'];

function timeToDate(date: Date, hhmm: string): Date {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date(date);
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
}

function dateToHHMM(d: Date): string {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function NieuwVerlofScreen() {
    const { user } = useAuth();
    const [modus, setModus] = useState<'dagen' | 'uren'>('dagen');
    const [type, setType] = useState(TYPES[0]);
    const [startDatum, setStartDatum] = useState(new Date());
    const [eindDatum, setEindDatum] = useState(new Date());
    const [urenDatum, setUrenDatum] = useState(new Date());
    const [tijdVan, setTijdVan] = useState('09:00');
    const [tijdTot, setTijdTot] = useState('13:00');
    const [notitie, setNotitie] = useState('');
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEindPicker, setShowEindPicker] = useState(false);
    const [showUrenDatumPicker, setShowUrenDatumPicker] = useState(false);
    const [showVanPicker, setShowVanPicker] = useState(false);
    const [showTotPicker, setShowTotPicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit() {
        setError('');
        let start_datum: string;
        let eind_datum: string;

        if (modus === 'dagen') {
            if (eindDatum < startDatum) {
                setError('Einddatum kan niet voor de startdatum liggen.');
                return;
            }
            const start = new Date(startDatum);
            start.setHours(0, 0, 0, 0);
            const eind = new Date(eindDatum);
            eind.setHours(23, 59, 59, 0);
            start_datum = `${toIsoDate(start)} 00:00:00`;
            eind_datum = `${toIsoDate(eind)} 23:59:59`;
        } else {
            if (tijdTot <= tijdVan) {
                setError('De eindtijd moet na de starttijd liggen.');
                return;
            }
            const datumStr = toIsoDate(urenDatum);
            start_datum = `${datumStr} ${tijdVan}:00`;
            eind_datum = `${datumStr} ${tijdTot}:00`;
        }

        setLoading(true);
        try {
            await VerlofApi.aanvragen({
                start_datum,
                eind_datum,
                notitie: notitie ? `${type}: ${notitie}` : type,
            });
            router.back();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Aanvragen is mislukt.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Screen>
            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                <ErrorBanner message={error} />

                <View style={styles.modusRow}>
                    <Pressable
                        onPress={() => setModus('dagen')}
                        style={[styles.modusBtn, modus === 'dagen' && styles.modusBtnActive]}
                    >
                        <Text style={[styles.modusBtnText, modus === 'dagen' && styles.modusBtnTextActive]}>Hele dag(en)</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => setModus('uren')}
                        style={[styles.modusBtn, modus === 'uren' && styles.modusBtnActive]}
                    >
                        <Text style={[styles.modusBtnText, modus === 'uren' && styles.modusBtnTextActive]}>Paar uur / dagdeel</Text>
                    </Pressable>
                </View>

                <Text style={styles.label}>Type verlof</Text>
                <View style={styles.typeRow}>
                    {TYPES.map((t) => (
                        <Pressable key={t} onPress={() => setType(t)} style={[styles.typeChip, type === t && styles.typeChipActive]}>
                            <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>{t}</Text>
                        </Pressable>
                    ))}
                </View>

                {modus === 'dagen' ? (
                    <>
                        <Text style={styles.label}>Startdatum</Text>
                        <Pressable style={styles.dateField} onPress={() => setShowStartPicker(true)}>
                            <Text style={styles.dateFieldText}>{toIsoDate(startDatum)}</Text>
                        </Pressable>
                        {showStartPicker ? (
                            <DateTimePicker
                                value={startDatum}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                onChange={(_, selected) => {
                                    setShowStartPicker(Platform.OS === 'ios');
                                    if (selected) setStartDatum(selected);
                                }}
                            />
                        ) : null}

                        <Text style={styles.label}>Einddatum</Text>
                        <Pressable style={styles.dateField} onPress={() => setShowEindPicker(true)}>
                            <Text style={styles.dateFieldText}>{toIsoDate(eindDatum)}</Text>
                        </Pressable>
                        {showEindPicker ? (
                            <DateTimePicker
                                value={eindDatum}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                onChange={(_, selected) => {
                                    setShowEindPicker(Platform.OS === 'ios');
                                    if (selected) setEindDatum(selected);
                                }}
                            />
                        ) : null}
                    </>
                ) : (
                    <>
                        <Text style={styles.label}>Datum</Text>
                        <Pressable style={styles.dateField} onPress={() => setShowUrenDatumPicker(true)}>
                            <Text style={styles.dateFieldText}>{toIsoDate(urenDatum)}</Text>
                        </Pressable>
                        {showUrenDatumPicker ? (
                            <DateTimePicker
                                value={urenDatum}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                onChange={(_, selected) => {
                                    setShowUrenDatumPicker(Platform.OS === 'ios');
                                    if (selected) setUrenDatum(selected);
                                }}
                            />
                        ) : null}

                        <View style={styles.timeRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Van</Text>
                                <Pressable style={styles.dateField} onPress={() => setShowVanPicker(true)}>
                                    <Text style={styles.dateFieldText}>{tijdVan}</Text>
                                </Pressable>
                            </View>
                            <View style={{ width: 12 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Tot</Text>
                                <Pressable style={styles.dateField} onPress={() => setShowTotPicker(true)}>
                                    <Text style={styles.dateFieldText}>{tijdTot}</Text>
                                </Pressable>
                            </View>
                        </View>
                        {showVanPicker ? (
                            <DateTimePicker
                                value={timeToDate(urenDatum, tijdVan)}
                                mode="time"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(_, selected) => {
                                    setShowVanPicker(Platform.OS === 'ios');
                                    if (selected) setTijdVan(dateToHHMM(selected));
                                }}
                            />
                        ) : null}
                        {showTotPicker ? (
                            <DateTimePicker
                                value={timeToDate(urenDatum, tijdTot)}
                                mode="time"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(_, selected) => {
                                    setShowTotPicker(Platform.OS === 'ios');
                                    if (selected) setTijdTot(dateToHHMM(selected));
                                }}
                            />
                        ) : null}
                    </>
                )}

                <TextField
                    label="Toelichting (optioneel)"
                    value={notitie}
                    onChangeText={setNotitie}
                    placeholder="Bijv. familiebezoek"
                    multiline
                    style={{ minHeight: 80, textAlignVertical: 'top' }}
                />

                <PrimaryButton title="Aanvraag indienen" onPress={handleSubmit} loading={loading} />
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    modusRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 14, padding: 4, marginBottom: 20 },
    modusBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    modusBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
    modusBtnText: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
    modusBtnTextActive: { color: colors.primary },
    label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 4 },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    typeChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#fff',
    },
    typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    typeChipText: { fontSize: 13, fontWeight: '600', color: '#334155' },
    typeChipTextActive: { color: '#fff' },
    timeRow: { flexDirection: 'row' },
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
});
