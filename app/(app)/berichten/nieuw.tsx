import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ErrorBanner, PrimaryButton, TextField } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { ApiError } from '../../../src/lib/api';
import { BerichtenApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

export default function NieuwBerichtScreen() {
    const { user } = useAuth();
    const [titel, setTitel] = useState('');
    const [bericht, setBericht] = useState('');
    const [ontvanger, setOntvanger] = useState('ALL');
    const [gebruikers, setGebruikers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) BerichtenApi.gebruikers(user.org_uuid).then((rows: any) => setGebruikers(rows || [])).catch(() => {});
    }, [user]);

    async function handleSubmit() {
        setError('');
        if (!titel || !bericht) {
            setError('Vul een titel en bericht in.');
            return;
        }
        setLoading(true);
        try {
            await BerichtenApi.versturen({ ontvanger_uuid: ontvanger, titel, bericht });
            router.back();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Versturen is mislukt.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: '#f8fafc' }}>
            <ErrorBanner message={error} />
            <TextField label="Titel" value={titel} onChangeText={setTitel} placeholder="Onderwerp" />
            <TextField
                label="Bericht"
                value={bericht}
                onChangeText={setBericht}
                placeholder="Typ je bericht..."
                multiline
                style={{ minHeight: 120, textAlignVertical: 'top' }}
            />

            <Text style={styles.label}>Ontvanger</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <Pressable onPress={() => setOntvanger('ALL')} style={[styles.chip, ontvanger === 'ALL' && styles.chipActive]}>
                    <Text style={[styles.chipText, ontvanger === 'ALL' && styles.chipTextActive]}>Iedereen</Text>
                </Pressable>
                {gebruikers.map((g) => (
                    <Pressable key={g.uuid} onPress={() => setOntvanger(g.uuid)} style={[styles.chip, ontvanger === g.uuid && styles.chipActive]}>
                        <Text style={[styles.chipText, ontvanger === g.uuid && styles.chipTextActive]}>
                            {g.voornaam} {g.achternaam}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>

            <PrimaryButton title="Versturen" onPress={handleSubmit} loading={loading} />
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
