import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { Card, ErrorBanner, PasswordField, PrimaryButton } from '../../../src/components/ui';
import { ApiError } from '../../../src/lib/api';
import { AuthApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

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
            Alert.alert('Gewijzigd', 'Je wachtwoord is gewijzigd.');
            router.back();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Wijzigen is mislukt.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <ErrorBanner message={error} />
            <Card>
                <PasswordField label="Huidig wachtwoord" value={huidig} onChangeText={setHuidig} autoComplete="current-password" />
                <PasswordField label="Nieuw wachtwoord" value={nieuw} onChangeText={setNieuw} hint="Minimaal 8 tekens" autoComplete="new-password" />
                <PasswordField label="Herhaal nieuw wachtwoord" value={herhaal} onChangeText={setHerhaal} autoComplete="new-password" />
                <PrimaryButton title="Wachtwoord wijzigen" icon="lock-closed-outline" onPress={handleSubmit} loading={loading} />
            </Card>
        </ScrollView>
    );
}
