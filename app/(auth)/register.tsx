import { router } from 'expo-router';
import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { AuthShell } from '../../src/components/AuthShell';
import { Checkbox, ErrorBanner, PasswordField, PrimaryButton, TextField } from '../../src/components/ui';
import { useAuth } from '../../src/contexts/AuthContext';
import { apiRequest, ApiError } from '../../src/lib/api';
import { API_URL } from '../../src/lib/config';
import { colors } from '../../src/lib/theme';

export default function RegisterScreen() {
    const { login } = useAuth();
    const [bedrijfsnaam, setBedrijfsnaam] = useState('');
    const [voornaam, setVoornaam] = useState('');
    const [achternaam, setAchternaam] = useState('');
    const [email, setEmail] = useState('');
    const [wachtwoord, setWachtwoord] = useState('');
    const [akkoord, setAkkoord] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit() {
        setError('');
        if (!bedrijfsnaam.trim() || !voornaam.trim() || !achternaam.trim() || !email.trim() || !wachtwoord) return setError('Vul alle verplichte velden in.');
        if (wachtwoord.length < 8) return setError('Wachtwoord moet minimaal 8 tekens bevatten.');
        if (!akkoord) return setError('Ga akkoord met de algemene voorwaarden en het privacybeleid.');
        setLoading(true);
        const schoon = email.trim().toLowerCase();
        try {
            await apiRequest('/api/auth/register-organisatie', {
                method: 'POST',
                body: { bedrijfsnaam: bedrijfsnaam.trim(), voornaam: voornaam.trim(), achternaam: achternaam.trim(), email: schoon, wachtwoord },
            });
            // Direct inloggen, zoals inschrijven.html.
            await login(schoon, wachtwoord);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Registreren is mislukt.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthShell
            eyebrow="Gratis starten"
            title="Registreer je organisatie"
            subtitle="Je wordt automatisch eigenaar van de nieuwe organisatie en kunt daarna je team uitnodigen."
            footer={<PrimaryButton title="Terug naar inloggen" variant="secondary" onPress={() => router.replace('/(auth)/login')} style={{ alignSelf: 'stretch' }} />}
        >
            <ErrorBanner message={error} />
            <TextField label="Bedrijfsnaam" value={bedrijfsnaam} onChangeText={setBedrijfsnaam} placeholder="Mijn Bedrijf B.V." />
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                    <TextField label="Voornaam" value={voornaam} onChangeText={setVoornaam} placeholder="Jan" autoComplete="given-name" />
                </View>
                <View style={{ flex: 1 }}>
                    <TextField label="Achternaam" value={achternaam} onChangeText={setAchternaam} placeholder="Jansen" autoComplete="family-name" />
                </View>
            </View>
            <TextField label="E-mailadres" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} placeholder="jan@bedrijf.nl" />
            <PasswordField label="Wachtwoord" value={wachtwoord} onChangeText={setWachtwoord} placeholder="Minimaal 8 tekens" autoComplete="new-password" textContentType="newPassword" />
            <Checkbox checked={akkoord} onChange={setAkkoord}>
                <Text style={styles.akkoord}>
                    Ik ga akkoord met de{' '}
                    <Text style={styles.link} onPress={() => Linking.openURL(`${API_URL}/voorwaarden.html`)}>
                        algemene voorwaarden
                    </Text>{' '}
                    en het{' '}
                    <Text style={styles.link} onPress={() => Linking.openURL(`${API_URL}/privacy.html`)}>
                        privacybeleid
                    </Text>
                    .
                </Text>
            </Checkbox>
            <PrimaryButton title="Account aanmaken" icon="rocket-outline" onPress={handleSubmit} loading={loading} />
        </AuthShell>
    );
}

const styles = StyleSheet.create({
    akkoord: { fontSize: 13, color: colors.text, fontWeight: '600', lineHeight: 19 },
    link: { color: colors.primary, fontWeight: '800', textDecorationLine: 'underline' },
});
