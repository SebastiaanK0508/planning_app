import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { ErrorBanner, PrimaryButton, TextField } from '../../src/components/ui';
import { apiRequest, ApiError } from '../../src/lib/api';
import { colors } from '../../src/lib/theme';

export default function RegisterScreen() {
    const [bedrijfsnaam, setBedrijfsnaam] = useState('');
    const [voornaam, setVoornaam] = useState('');
    const [achternaam, setAchternaam] = useState('');
    const [email, setEmail] = useState('');
    const [wachtwoord, setWachtwoord] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    async function handleSubmit() {
        setError('');
        if (!bedrijfsnaam || !voornaam || !achternaam || !email || !wachtwoord) {
            setError('Vul alle verplichte velden in.');
            return;
        }
        if (wachtwoord.length < 8) {
            setError('Wachtwoord moet minimaal 8 tekens bevatten.');
            return;
        }
        setLoading(true);
        try {
            await apiRequest('/api/auth/register-organisatie', {
                method: 'POST',
                body: {
                    bedrijfsnaam,
                    voornaam,
                    achternaam,
                    email: email.trim().toLowerCase(),
                    wachtwoord,
                    plan_type: 'team',
                },
            });
            setSuccess(true);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Registreren is mislukt.');
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Organisatie aangemaakt 🎉</Text>
                <Text style={styles.subtitle}>Je kunt nu inloggen met je e-mailadres en wachtwoord.</Text>
                <PrimaryButton title="Naar inloggen" onPress={() => router.replace('/(auth)/login')} />
            </ScrollView>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Organisatie registreren</Text>
            <Text style={styles.subtitle}>Je wordt automatisch eigenaar van de nieuwe organisatie.</Text>

            <ErrorBanner message={error} />

            <TextField label="Bedrijfsnaam" value={bedrijfsnaam} onChangeText={setBedrijfsnaam} placeholder="Mijn Bedrijf B.V." />
            <TextField label="Voornaam" value={voornaam} onChangeText={setVoornaam} placeholder="Jan" />
            <TextField label="Achternaam" value={achternaam} onChangeText={setAchternaam} placeholder="Jansen" />
            <TextField
                label="E-mailadres"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                placeholder="jan@bedrijf.nl"
            />
            <TextField label="Wachtwoord" secureTextEntry value={wachtwoord} onChangeText={setWachtwoord} placeholder="Minimaal 8 tekens" />

            <PrimaryButton title="Registreren" onPress={handleSubmit} loading={loading} />
            <PrimaryButton title="Terug naar inloggen" variant="outline" onPress={() => router.replace('/(auth)/login')} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
    title: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
    subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 20 },
});
