import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ErrorBanner, PrimaryButton, TextField } from '../../src/components/ui';
import { apiRequest, ApiError } from '../../src/lib/api';
import { colors } from '../../src/lib/theme';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    async function handleSubmit() {
        setError('');
        if (!email) {
            setError('Vul je e-mailadres in.');
            return;
        }
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
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Wachtwoord vergeten</Text>
            <Text style={styles.subtitle}>
                Vul je e-mailadres in. Als het bekend is, sturen we een herstellink.
            </Text>

            <ErrorBanner message={error} />

            {sent ? (
                <View style={styles.successBox}>
                    <Text style={styles.successText}>
                        Als dit adres bekend is, ontvang je binnen enkele minuten een e-mail met een link om je
                        wachtwoord te herstellen.
                    </Text>
                </View>
            ) : (
                <>
                    <TextField
                        label="E-mailadres"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        value={email}
                        onChangeText={setEmail}
                        placeholder="naam@bedrijf.nl"
                    />
                    <PrimaryButton title="Verstuur herstellink" onPress={handleSubmit} loading={loading} />
                </>
            )}

            <PrimaryButton title="Terug naar inloggen" variant="outline" onPress={() => router.replace('/(auth)/login')} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 12 },
    title: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
    subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 20 },
    successBox: { backgroundColor: colors.successSoft, borderRadius: 12, padding: 16, marginBottom: 16 },
    successText: { color: colors.success, fontSize: 14, fontWeight: '600' },
});
