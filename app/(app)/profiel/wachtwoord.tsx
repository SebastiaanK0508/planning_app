import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { ErrorBanner, PrimaryButton, TextField } from '../../../src/components/ui';
import { ApiError } from '../../../src/lib/api';
import { AuthApi } from '../../../src/lib/services';

export default function WachtwoordScreen() {
    const [huidig, setHuidig] = useState('');
    const [nieuw, setNieuw] = useState('');
    const [herhaal, setHerhaal] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit() {
        setError('');
        if (!huidig || !nieuw) {
            setError('Vul beide velden in.');
            return;
        }
        if (nieuw.length < 8) {
            setError('Nieuw wachtwoord moet minimaal 8 tekens bevatten.');
            return;
        }
        if (nieuw !== herhaal) {
            setError('Nieuwe wachtwoorden komen niet overeen.');
            return;
        }
        setLoading(true);
        try {
            await AuthApi.changePassword(huidig, nieuw);
            router.back();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Wijzigen is mislukt.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: '#f8fafc', flexGrow: 1 }}>
            <ErrorBanner message={error} />
            <TextField label="Huidig wachtwoord" secureTextEntry value={huidig} onChangeText={setHuidig} />
            <TextField label="Nieuw wachtwoord" secureTextEntry value={nieuw} onChangeText={setNieuw} />
            <TextField label="Herhaal nieuw wachtwoord" secureTextEntry value={herhaal} onChangeText={setHerhaal} />
            <PrimaryButton title="Wachtwoord wijzigen" onPress={handleSubmit} loading={loading} />
        </ScrollView>
    );
}
