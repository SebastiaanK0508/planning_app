import { Link } from 'expo-router';
import React, { useState } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorBanner, PrimaryButton, TextField } from '../../src/components/ui';
import { useAuth } from '../../src/contexts/AuthContext';
import { ApiError } from '../../src/lib/api';
import { colors } from '../../src/lib/theme';

export default function LoginScreen() {
    const insets = useSafeAreaInsets();
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
        <View style={{ flex: 1, backgroundColor: colors.primary }}>
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
                    <View style={styles.header}>
                        <View style={styles.logoBadge}>
                            <Image source={require('../../assets/icon.png')} style={styles.logo} />
                        </View>
                        <Text style={styles.brand}>Webplanning</Text>
                        <Text style={styles.tagline}>Log in om je rooster te bekijken</Text>
                    </View>

                    <View style={styles.card}>
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
                    </View>

                    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
                        <Text style={styles.footerText}>Nog geen account voor je organisatie?</Text>
                        <Link href="/(auth)/register" style={styles.linkStrong}>
                            Organisatie registreren
                        </Link>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    scroll: { flexGrow: 1, backgroundColor: colors.primary },
    header: {
        alignItems: 'center',
        paddingTop: 64,
        paddingBottom: 40,
        paddingHorizontal: 24,
    },
    logoBadge: {
        width: 88,
        height: 88,
        borderRadius: 24,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
    },
    logo: { width: 64, height: 64, borderRadius: 16 },
    brand: { fontSize: 24, fontWeight: '800', color: '#fff' },
    tagline: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
    card: {
        flexGrow: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 24,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
        elevation: 4,
    },
    link: { textAlign: 'center', color: colors.primary, fontWeight: '600', marginTop: 18 },
    linkStrong: { color: colors.primary, fontWeight: '700', marginTop: 4 },
    footer: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#fff' },
    footerText: { color: colors.textMuted, fontSize: 13 },
});
