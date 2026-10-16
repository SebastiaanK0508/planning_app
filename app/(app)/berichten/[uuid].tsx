import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar, Badge, Card, CenteredLoader, PrimaryButton, TextField } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { ApiError } from '../../../src/lib/api';
import { formatDateTime, zelfdeUuid } from '../../../src/lib/format';
import { BerichtenApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

export default function BerichtDetailScreen() {
    const { user } = useAuth();
    const { data } = useLocalSearchParams<{ uuid: string; data?: string }>();
    const bericht = useMemo(() => {
        try {
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    }, [data]);
    const [antwoord, setAntwoord] = useState('');
    const [busy, setBusy] = useState(false);

    const gemarkeerd = useRef(false);
    useEffect(() => {
        if (!bericht || Number(bericht.is_gelezen_door_mij) === 1 || gemarkeerd.current) return;
        gemarkeerd.current = true;
        BerichtenApi.markeerGelezen(bericht.uuid).catch(() => {});
    }, [bericht]);

    if (!bericht) return <CenteredLoader />;

    const vanMij = zelfdeUuid(bericht.zender_uuid, user?.uuid);
    const kanAntwoorden = !vanMij && !!bericht.zender_uuid;

    async function verstuurAntwoord() {
        if (!antwoord.trim()) return;
        setBusy(true);
        try {
            await BerichtenApi.versturen({
                ontvanger_uuid: bericht.zender_uuid,
                titel: String(bericht.titel || '').startsWith('RE:') ? bericht.titel : `RE: ${bericht.titel}`,
                bericht: antwoord.trim(),
                belangrijk: 0,
            });
            setAntwoord('');
            Alert.alert('Verstuurd', `Je antwoord is verstuurd naar ${bericht.zender_naam}.`);
            router.back();
        } catch (err) {
            Alert.alert('Versturen mislukt', err instanceof ApiError ? err.message : 'Probeer het opnieuw.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                <Card>
                    <View style={styles.kop}>
                        <Avatar naam={bericht.zender_naam || 'Systeem'} size={46} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.afzender}>{vanMij ? 'Jij' : bericht.zender_naam || 'Systeem'}</Text>
                            <Text style={styles.datum}>{formatDateTime(bericht.datum_geplaatst)}</Text>
                        </View>
                    </View>
                    {Number(bericht.belangrijk) === 1 ? (
                        <View style={{ marginBottom: 8 }}>
                            <Badge label="Urgent" tone="rose" icon="alert" />
                        </View>
                    ) : null}
                    <Text style={styles.titel}>{bericht.titel}</Text>
                    <Text style={styles.inhoud}>{bericht.bericht}</Text>
                    {vanMij && bericht.ontvanger_uuid ? (
                        <View style={{ marginTop: 16 }}>
                            {Number(bericht.is_gelezen_door_ander) === 1 ? (
                                <Badge label={`Gelezen door ${bericht.ontvanger_naam}`} tone="emerald" icon="checkmark-done" />
                            ) : (
                                <Badge label="Nog niet gelezen" icon="checkmark" />
                            )}
                        </View>
                    ) : null}
                </Card>

                {kanAntwoorden ? (
                    <Card style={{ marginTop: 14 }}>
                        <TextField
                            label={`Antwoord aan ${bericht.zender_naam}`}
                            value={antwoord}
                            onChangeText={setAntwoord}
                            placeholder="Typ je antwoord..."
                            multiline
                            style={{ minHeight: 100, textAlignVertical: 'top' }}
                        />
                        <PrimaryButton title="Verstuur antwoord" icon="arrow-undo-outline" onPress={verstuurAntwoord} loading={busy} disabled={!antwoord.trim()} />
                    </Card>
                ) : null}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    kop: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
    afzender: { fontSize: 15, fontWeight: '900', color: colors.ink },
    datum: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
    titel: { fontSize: 20, fontWeight: '900', color: colors.ink, letterSpacing: -0.5 },
    inhoud: { fontSize: 15, color: colors.text, marginTop: 12, lineHeight: 23 },
});
