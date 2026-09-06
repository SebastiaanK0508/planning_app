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

export default function NieuwVerlofScreen() {
    const { user } = useAuth();
    const [type, setType] = useState(TYPES[0]);
    const [startDatum, setStartDatum] = useState(new Date());
    const [eindDatum, setEindDatum] = useState(new Date());
    const [notitie, setNotitie] = useState('');
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEindPicker, setShowEindPicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit() {
        setError('');
        if (eindDatum < startDatum) {
            setError('Einddatum kan niet voor de startdatum liggen.');
            return;
        }
        setLoading(true);
        try {
            const start = new Date(startDatum);
            start.setHours(0, 0, 0, 0);
            const eind = new Date(eindDatum);
            eind.setHours(23, 59, 59, 0);
            await VerlofApi.aanvragen({
                start_datum: `${toIsoDate(start)} 00:00:00`,
                eind_datum: `${toIsoDate(eind)} 23:59:59`,
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
            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <ErrorBanner message={error} />

                <Text style={styles.label}>Type verlof</Text>
                <View style={styles.typeRow}>
                    {TYPES.map((t) => (
                        <Pressable key={t} onPress={() => setType(t)} style={[styles.typeChip, type === t && styles.typeChipActive]}>
                            <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>{t}</Text>
                        </Pressable>
                    ))}
                </View>

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
