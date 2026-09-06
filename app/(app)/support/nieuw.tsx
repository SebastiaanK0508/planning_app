import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { ErrorBanner, PrimaryButton, TextField } from '../../../src/components/ui';
import { ApiError } from '../../../src/lib/api';
import { SupportApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

const PRIORITEITEN = ['Laag', 'Medium', 'Hoog', 'Kritiek'];

export default function NieuwTicketScreen() {
    const [onderwerp, setOnderwerp] = useState('');
    const [omschrijving, setOmschrijving] = useState('');
    const [prioriteit, setPrioriteit] = useState('Medium');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit() {
        setError('');
        if (!onderwerp || !omschrijving) {
            setError('Vul onderwerp en omschrijving in.');
            return;
        }
        setLoading(true);
        try {
            await SupportApi.nieuwTicket({ onderwerp, omschrijving, prioriteit });
            router.back();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Aanmaken is mislukt.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: '#f8fafc' }}>
            <ErrorBanner message={error} />
            <TextField label="Onderwerp" value={onderwerp} onChangeText={setOnderwerp} placeholder="Waar gaat het over?" />
            <TextField
                label="Omschrijving"
                value={omschrijving}
                onChangeText={setOmschrijving}
                placeholder="Beschrijf je vraag of probleem..."
                multiline
                style={{ minHeight: 120, textAlignVertical: 'top' }}
            />
            <Text style={styles.label}>Prioriteit</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {PRIORITEITEN.map((p) => (
                    <Pressable key={p} onPress={() => setPrioriteit(p)} style={[styles.chip, prioriteit === p && styles.chipActive]}>
                        <Text style={[styles.chipText, prioriteit === p && styles.chipTextActive]}>{p}</Text>
                    </Pressable>
                ))}
            </ScrollView>
            <PrimaryButton title="Ticket aanmaken" onPress={handleSubmit} loading={loading} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8 },
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
});
