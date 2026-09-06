import { Link } from 'expo-router';
import React, { useState } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { ErrorBanner, PrimaryButton, TextField } from '../../src/components/ui';
import { useAuth } from '../../src/contexts/AuthContext';
import { ApiError } from '../../src/lib/api';
import { colors } from '../../src/lib/theme';

export default function LoginScreen() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [wachtwoord, setWachtwoord] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleLogin() {
        setError('');
        if (!email || !wachtwoord) {
            setError('Vul je e-mailadres en wachtwoord in.');
            return;
        }
        setLoading(true);
        try {
            await login(email.trim().toLowerCase(), wachtwoord);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Inloggen is mislukt. Probeer het opnieuw.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#fff' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <View style={styles.logoWrap}>
                    <View style={styles.logoCircle}>
                        <Text style={styles.logoText}>W</Text>
                    </View>
                    <Text style={styles.title}>Webplanning</Text>
                    <Text style={styles.subtitle}>Log in om je rooster te bekijken</Text>
                </View>

                <ErrorBanner message={error} />

                <TextField
                    label="E-mailadres"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="naam@bedrijf.nl"
                />
                <TextField
                    label="Wachtwoord"
                    secureTextEntry
                    autoCapitalize="none"
                    value={wachtwoord}
                    onChangeText={setWachtwoord}
                    placeholder="••••••••"
                />

                <PrimaryButton title="Inloggen" onPress={handleLogin} loading={loading} />

                <Link href="/(auth)/forgot-password" style={styles.link}>
                    Wachtwoord vergeten?
                </Link>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Nog geen account voor je organisatie?</Text>
                    <Link href="/(auth)/register" style={styles.linkStrong}>
                        Organisatie registreren
                    </Link>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
    logoWrap: { alignItems: 'center', marginBottom: 32 },
    logoCircle: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    logoText: { color: '#fff', fontSize: 28, fontWeight: '800' },
    title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
    subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
    link: { textAlign: 'center', color: colors.primary, fontWeight: '600', marginTop: 18 },
    linkStrong: { color: colors.primary, fontWeight: '700', marginTop: 4 },
    footer: { alignItems: 'center', marginTop: 32 },
    footerText: { color: colors.textMuted, fontSize: 13 },
});
