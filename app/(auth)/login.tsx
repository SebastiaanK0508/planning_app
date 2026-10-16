import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { AuthShell } from '../../src/components/AuthShell';
import { Checkbox, ErrorBanner, PasswordField, PrimaryButton, TextField } from '../../src/components/ui';
import { useAuth } from '../../src/contexts/AuthContext';
import { ApiError } from '../../src/lib/api';
import { colors } from '../../src/lib/theme';

const ONTHOUD_KEY = 'login_email_onthouden';

export default function LoginScreen() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [wachtwoord, setWachtwoord] = useState('');
    const [onthoud, setOnthoud] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        AsyncStorage.getItem(ONTHOUD_KEY)
            .then((v) => {
                if (v) {
                    setEmail(v);
                    setOnthoud(true);
                }
            })
            .catch(() => {});
    }, []);

    async function handleLogin() {
        setError('');
        if (!email || !wachtwoord) return setError('Vul je e-mailadres en wachtwoord in.');
        setLoading(true);
        const schoon = email.trim().toLowerCase();
        try {
            if (onthoud) await AsyncStorage.setItem(ONTHOUD_KEY, schoon).catch(() => {});
            else await AsyncStorage.removeItem(ONTHOUD_KEY).catch(() => {});
            await login(schoon, wachtwoord);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Inloggen is mislukt. Probeer het opnieuw.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthShell
            eyebrow="Welkom terug"
            title="Log in op je rooster"
            subtitle="Bekijk je diensten, vraag verlof aan en ruil met collega's."
            footer={
                <>
                    <Text style={styles.footerText}>Nog geen account voor je organisatie?</Text>
                    <Link href="/(auth)/register" style={styles.linkStrong}>
                        Organisatie registreren
                    </Link>
                </>
            }
        >
            <ErrorBanner message={error} />
            <TextField
                label="E-mailadres"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="username"
                value={email}
                onChangeText={setEmail}
                placeholder="naam@bedrijf.nl"
            />
            <PasswordField
                label="Wachtwoord"
                value={wachtwoord}
                onChangeText={setWachtwoord}
                placeholder="••••••••"
                autoComplete="current-password"
                textContentType="password"
                onSubmitEditing={handleLogin}
                returnKeyType="go"
            />
            <Checkbox checked={onthoud} onChange={setOnthoud}>
                <Text style={styles.check}>E-mailadres onthouden</Text>
            </Checkbox>
            <PrimaryButton title="Inloggen" icon="log-in-outline" onPress={handleLogin} loading={loading} />
            <Link href="/(auth)/forgot-password" style={styles.link}>
                Wachtwoord vergeten?
            </Link>
        </AuthShell>
    );
}

const styles = StyleSheet.create({
    check: { fontSize: 14, color: colors.text, fontWeight: '600' },
    link: { textAlign: 'center', color: colors.primary, fontWeight: '800', marginTop: 18, fontSize: 14 },
    linkStrong: { color: colors.primary, fontWeight: '900', fontSize: 14 },
    footerText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
});
