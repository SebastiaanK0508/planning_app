import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar, Badge, Card, CardHeader, ErrorBanner, InfoBanner, ListRow, PrimaryButton, SwitchRow, TextField } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useMijnInstellingen } from '../../../src/hooks/useMijnInstellingen';
import { ApiError } from '../../../src/lib/api';
import { APP_VERSION, fotoUrl } from '../../../src/lib/config';
import { afmeldenPush, pushBeschikbaar, pushToestemmingGegeven, registreerPush } from '../../../src/lib/push';
import { AuthApi } from '../../../src/lib/services';
import { colors, roleLabels } from '../../../src/lib/theme';

export default function ProfielScreen() {
    const { user, refreshUser } = useAuth();
    const { instellingen, profielfoto, setProfielfoto } = useMijnInstellingen();
    const [telefoon, setTelefoon] = useState('');
    const [geboortedatum, setGeboortedatum] = useState('');
    const [adres, setAdres] = useState('');
    const [noodcontact, setNoodcontact] = useState('');
    const [push, setPush] = useState(false);
    const [email, setEmail] = useState(true);
    const [pushBezig, setPushBezig] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!instellingen) return;
        const p = instellingen.persoonsgegevens || {};
        setTelefoon(p.telefoon || '');
        setGeboortedatum(p.geboortedatum || '');
        setAdres(p.adres || '');
        setNoodcontact(p.noodcontact || '');
        setEmail(instellingen.email !== undefined ? !!instellingen.email : true);
        pushToestemmingGegeven().then((toestemming) => setPush(toestemming && instellingen.push !== false));
    }, [instellingen]);

    async function bewaar(extra: Record<string, unknown> = {}) {
        const nieuw = {
            push,
            email,
            persoonsgegevens: { telefoon, geboortedatum, adres, noodcontact },
            ...extra,
        };
        await AuthApi.updateInstellingen({ uuid: user!.uuid, instellingen: nieuw });
        refreshUser({ instellingen: { ...(user?.instellingen || {}), ...nieuw } });
    }

    async function handleSave() {
        setError('');
        if (geboortedatum && !/^\d{4}-\d{2}-\d{2}$/.test(geboortedatum)) return setError('Vul de geboortedatum in als JJJJ-MM-DD.');
        setLoading(true);
        try {
            await bewaar();
            Alert.alert('Opgeslagen', 'Profiel en instellingen zijn opgeslagen.');
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Opslaan is mislukt.');
        } finally {
            setLoading(false);
        }
    }

    async function togglePush(aan: boolean) {
        setPushBezig(true);
        try {
            if (aan) {
                const res = await registreerPush(true);
                if (!res.ok) {
                    Alert.alert('Pushmeldingen', res.reden);
                    return;
                }
            } else {
                await afmeldenPush();
            }
            setPush(aan);
            await bewaar({ push: aan }).catch(() => {});
        } finally {
            setPushBezig(false);
        }
    }

    async function pickImage() {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Toestemming nodig', "Geef toegang tot je foto's om een profielfoto in te stellen.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
        if (result.canceled || !result.assets?.[0]) return;

        const asset = result.assets[0];
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', { uri: asset.uri, name: asset.fileName || 'avatar.jpg', type: asset.mimeType || 'image/jpeg' } as unknown as Blob);
            const res = await AuthApi.updateProfielfoto(formData);
            setProfielfoto(res.url);
            refreshUser({ profielfoto_url: res.url });
        } catch (err) {
            Alert.alert('Uploaden mislukt', err instanceof ApiError ? err.message : 'Probeer het opnieuw.');
        } finally {
            setUploading(false);
        }
    }

    const naam = `${user?.voornaam || ''} ${user?.achternaam || ''}`.trim();
    const pushInfo = pushBeschikbaar();

    return (
        <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
                <View style={styles.glow} />
                <Pressable onPress={pickImage} style={{ alignItems: 'center' }}>
                    <Avatar uri={fotoUrl(profielfoto)} naam={naam} size={92} />
                    <Text style={styles.fotoLink}>{uploading ? 'Bezig met uploaden...' : 'Foto wijzigen'}</Text>
                </Pressable>
                <View style={{ alignItems: 'center', marginTop: 12, gap: 6 }}>
                    <View style={{ alignSelf: 'center' }}>
                        <Badge label={user ? roleLabels[user.rol] : ''} tone="blue" />
                    </View>
                    <Text style={styles.naam}>{naam}</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                </View>
            </View>

            <ErrorBanner message={error} />

            <Card style={{ marginTop: 14 }}>
                <CardHeader icon="id-card-outline" title="Persoonlijke gegevens" />
                <TextField label="Telefoonnummer" value={telefoon} onChangeText={setTelefoon} placeholder="Bijv. 06 12345678" keyboardType="phone-pad" autoComplete="tel" />
                <TextField label="Geboortedatum" value={geboortedatum} onChangeText={setGeboortedatum} placeholder="JJJJ-MM-DD" autoComplete="birthdate-full" />
                <TextField label="Adres" value={adres} onChangeText={setAdres} placeholder="Straat en huisnummer, postcode, woonplaats" autoComplete="street-address" />
                <TextField label="Noodcontact" value={noodcontact} onChangeText={setNoodcontact} placeholder="Bijv. partner: 06 87654321" />
            </Card>

            <Card style={{ marginTop: 14 }}>
                <CardHeader icon="notifications-outline" tone="amber" title="Meldingen" />
                <SwitchRow
                    label="Pushmeldingen"
                    description="Direct een melding bij een nieuw rooster, ruil of verlofbesluit"
                    value={push}
                    onValueChange={togglePush}
                    disabled={pushBezig || !pushInfo.ok}
                />
                {!pushInfo.ok ? <InfoBanner message={pushInfo.reden!} style={{ marginTop: 4 }} /> : null}
                <SwitchRow label="E-mail updates" description="Roosterwijzigingen in je mailbox" value={email} onValueChange={setEmail} />
            </Card>

            <PrimaryButton title="Opslaan" icon="checkmark" onPress={handleSave} loading={loading} style={{ marginTop: 16 }} />

            <Card style={{ marginTop: 16, paddingVertical: 4 }}>
                <ListRow icon="lock-closed-outline" title="Wachtwoord wijzigen" onPress={() => router.push('/(app)/profiel/wachtwoord')} last />
            </Card>
            <Text style={styles.versie}>Webplanning app v{APP_VERSION}</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    hero: { backgroundColor: colors.ink, borderRadius: 24, paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center', overflow: 'hidden' },
    glow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: colors.primary, opacity: 0.3, top: -110, right: -60 },
    fotoLink: { color: '#93c5fd', fontWeight: '800', fontSize: 12, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
    naam: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.6 },
    email: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
    versie: { textAlign: 'center', color: colors.subtle, fontSize: 12, fontWeight: '600', marginTop: 18 },
});
