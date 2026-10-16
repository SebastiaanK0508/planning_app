import { router } from 'expo-router';
import React, { useState } from 'react';
import { AuthShell } from '../../src/components/AuthShell';
import { ErrorBanner, InfoBanner, PrimaryButton, TextField } from '../../src/components/ui';
import { apiRequest, ApiError } from '../../src/lib/api';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    async function handleSubmit() {
        setError('');
        if (!email.trim()) return setError('Vul je e-mailadres in.');
        setLoading(true);
        try {
            await apiRequest('/api/auth/forgot-password', { method: 'POST', body: { email: email.trim().toLowerCase() } });
            setSent(true);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Versturen is mislukt.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthShell
            eyebrow="Wachtwoord vergeten"
            title="Nieuw wachtwoord instellen"
            subtitle="Vul je e-mailadres in. Als het bekend is, sturen we je een herstellink."
            footer={<PrimaryButton title="Terug naar inloggen" variant="secondary" onPress={() => router.replace('/(auth)/login')} style={{ alignSelf: 'stretch' }} />}
        >
            <ErrorBanner message={error} />
            {sent ? (
                <InfoBanner
                    tone="emerald"
                    icon="mail-unread-outline"
                    message="Als dit adres bekend is, ontvang je binnen enkele minuten een e-mail met een link om je wachtwoord te herstellen."
                />
            ) : (
                <>
                    <TextField label="E-mailadres" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} placeholder="naam@bedrijf.nl" />
                    <PrimaryButton title="Verstuur herstellink" icon="paper-plane-outline" onPress={handleSubmit} loading={loading} />
                </>
            )}
        </AuthShell>
    );
}
