import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Chip, ChipRow, ErrorBanner, FieldLabel, PrimaryButton, TextField } from '../../../src/components/ui';
import { ApiError } from '../../../src/lib/api';
import { SupportApi } from '../../../src/lib/services';
import { categorieIcoon, TICKET_CATEGORIEEN, TICKET_PRIORITEITEN } from '../../../src/lib/support';
import { colors } from '../../../src/lib/theme';

export default function NieuwTicketScreen() {
    const [onderwerp, setOnderwerp] = useState('');
    const [omschrijving, setOmschrijving] = useState('');
    const [categorie, setCategorie] = useState<string>('Algemeen');
    const [prioriteit, setPrioriteit] = useState<string>('Medium');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit() {
        setError('');
        if (!onderwerp.trim() || !omschrijving.trim()) return setError('Vul onderwerp en omschrijving in.');
        setLoading(true);
        try {
            await SupportApi.nieuwTicket({ onderwerp: onderwerp.trim(), omschrijving: omschrijving.trim(), categorie, prioriteit });
            router.back();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Aanmaken is mislukt.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <ErrorBanner message={error} />
            <TextField label="Onderwerp" value={onderwerp} onChangeText={setOnderwerp} placeholder="Waar gaat het over?" />
            <FieldLabel>Categorie</FieldLabel>
            <ChipRow style={{ marginBottom: 16 }}>
                {TICKET_CATEGORIEEN.map((c) => (
                    <Chip key={c} label={c} icon={categorieIcoon(c)} active={categorie === c} onPress={() => setCategorie(c)} />
                ))}
            </ChipRow>
            <FieldLabel>Prioriteit</FieldLabel>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {TICKET_PRIORITEITEN.map((p) => (
                    <Chip key={p} label={p} active={prioriteit === p} onPress={() => setPrioriteit(p)} />
                ))}
            </View>
            <TextField
                label="Omschrijving"
                value={omschrijving}
                onChangeText={setOmschrijving}
                placeholder="Beschrijf je vraag of probleem zo duidelijk mogelijk..."
                multiline
                style={{ minHeight: 140, textAlignVertical: 'top' }}
            />
            <PrimaryButton title="Ticket aanmaken" icon="paper-plane-outline" onPress={handleSubmit} loading={loading} />
        </ScrollView>
    );
}
