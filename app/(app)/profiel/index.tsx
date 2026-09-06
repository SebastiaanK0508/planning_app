import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, ErrorBanner, PrimaryButton, TextField } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { API_URL } from '../../../src/lib/config';
import { ApiError } from '../../../src/lib/api';
import { initials } from '../../../src/lib/format';
import { AuthApi } from '../../../src/lib/services';
import { colors, roleLabels } from '../../../src/lib/theme';

export default function ProfielScreen() {
    const { user, refreshUser } = useAuth();
    const [voornaam, setVoornaam] = useState(user?.voornaam || '');
    const [achternaam, setAchternaam] = useState(user?.achternaam || '');
    const [email, setEmail] = useState(user?.email || '');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const [profielfoto, setProfielfoto] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        AuthApi.getUser(user.uuid)
            .then((res: any) => setProfielfoto(res.profielfoto || null))
            .catch(() => {});
    }, [user?.uuid]);

    async function handleSave() {
        setError('');
        setSaved(false);
        setLoading(true);
        try {
            await AuthApi.updateInstellingen({ uuid: user!.uuid, voornaam, achternaam, email, instellingen: {} });
            refreshUser({ voornaam, achternaam, email });
            setSaved(true);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Opslaan is mislukt.');
        } finally {
            setLoading(false);
        }
    }

    async function pickImage() {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Toestemming nodig', 'Geef toegang tot je foto\'s om een profielfoto in te stellen.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
        if (result.canceled || !result.assets?.[0]) return;

        const asset = result.assets[0];
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', {
                uri: asset.uri,
                name: 'avatar.jpg',
                type: 'image/jpeg',
            } as unknown as Blob);
            const res: any = await AuthApi.updateProfielfoto(formData);
            setProfielfoto(res.url);
        } catch (err) {
            Alert.alert('Uploaden mislukt', err instanceof ApiError ? err.message : 'Probeer het opnieuw.');
        } finally {
            setUploading(false);
        }
    }

    const avatarUrl = profielfoto ? `${API_URL}${profielfoto}` : null;

    return (
        <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: '#f8fafc' }}>
            <Pressable onPress={pickImage} style={styles.avatarWrap}>
                {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                ) : (
                    <View style={styles.avatarFallback}>
                        <Text style={styles.avatarFallbackText}>{initials(user?.voornaam, user?.achternaam)}</Text>
                    </View>
                )}
                <Text style={styles.avatarEdit}>{uploading ? 'Bezig met uploaden...' : 'Foto wijzigen'}</Text>
            </Pressable>

            <Card>
                <ErrorBanner message={error} />
                {saved ? <Text style={styles.savedText}>Wijzigingen opgeslagen.</Text> : null}
                <TextField label="Voornaam" value={voornaam} onChangeText={setVoornaam} />
                <TextField label="Achternaam" value={achternaam} onChangeText={setAchternaam} />
                <TextField label="E-mailadres" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                <Text style={styles.roleText}>Rol: {user ? roleLabels[user.rol] : ''}</Text>
                <PrimaryButton title="Opslaan" onPress={handleSave} loading={loading} />
            </Card>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    avatarWrap: { alignItems: 'center', marginBottom: 20 },
    avatarImg: { width: 96, height: 96, borderRadius: 48, marginBottom: 8 },
    avatarFallback: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    avatarFallbackText: { color: '#fff', fontWeight: '800', fontSize: 30 },
    avatarEdit: { color: colors.primary, fontWeight: '700', fontSize: 13 },
    roleText: { fontSize: 13, color: colors.textMuted, marginBottom: 16 },
    savedText: { color: colors.success, fontWeight: '600', marginBottom: 12 },
});
