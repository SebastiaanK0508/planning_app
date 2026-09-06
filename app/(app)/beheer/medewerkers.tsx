import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, CenteredLoader, EmptyState, ErrorBanner, PrimaryButton, TextField } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { ApiError } from '../../../src/lib/api';
import { AuthApi } from '../../../src/lib/services';
import { colors, roleLabels } from '../../../src/lib/theme';

const ROLLEN = ['medewerker', 'planner', 'beheerder'];

export default function MedewerkersScreen() {
    const { user } = useAuth();
    const { data, loading, refreshing, error, refresh } = useAsyncData(
        () => AuthApi.alleGebruikers(user!.org_uuid) as Promise<any[]>,
        [user?.org_uuid]
    );

    const [showModal, setShowModal] = useState(false);
    const [voornaam, setVoornaam] = useState('');
    const [achternaam, setAchternaam] = useState('');
    const [email, setEmail] = useState('');
    const [rol, setRol] = useState('medewerker');
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    async function handleAdd() {
        setFormError('');
        if (!voornaam || !achternaam || !email) {
            setFormError('Vul alle velden in.');
            return;
        }
        setSaving(true);
        try {
            await AuthApi.registerMedewerker({ voornaam, achternaam, email: email.trim().toLowerCase(), rol });
            setShowModal(false);
            setVoornaam('');
            setAchternaam('');
            setEmail('');
            setRol('medewerker');
            refresh();
            Alert.alert('Toegevoegd', 'De medewerker is aangemaakt met het standaardwachtwoord "Welkom01!".');
        } catch (err) {
            setFormError(err instanceof ApiError ? err.message : 'Toevoegen is mislukt.');
        } finally {
            setSaving(false);
        }
    }

    function confirmDelete(m: any) {
        Alert.alert('Medewerker verwijderen', `Weet je zeker dat je ${m.voornaam} ${m.achternaam} wilt verwijderen?`, [
            { text: 'Annuleren', style: 'cancel' },
            {
                text: 'Verwijderen',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await AuthApi.deleteMedewerker(m.uuid);
                        refresh();
                    } catch (err) {
                        Alert.alert('Fout', err instanceof ApiError ? err.message : 'Verwijderen mislukt.');
                    }
                },
            },
        ]);
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            {loading ? (
                <CenteredLoader />
            ) : (
                <ScrollView contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
                    <ErrorBanner message={error} />
                    <Pressable style={styles.newButton} onPress={() => setShowModal(true)}>
                        <Ionicons name="person-add-outline" size={18} color="#fff" />
                        <Text style={styles.newButtonText}>Medewerker toevoegen</Text>
                    </Pressable>

                    {(data || []).length === 0 ? (
                        <EmptyState title="Nog geen medewerkers" />
                    ) : (
                        (data || []).map((m: any) => (
                            <Card key={m.uuid} style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.naam}>
                                        {m.voornaam} {m.achternaam}
                                    </Text>
                                    <Text style={styles.email}>{m.email}</Text>
                                    <Text style={styles.rol}>{roleLabels[m.rol] || m.rol}</Text>
                                </View>
                                {m.uuid !== user?.uuid ? (
                                    <Pressable onPress={() => confirmDelete(m)}>
                                        <Ionicons name="trash-outline" size={20} color={colors.danger} />
                                    </Pressable>
                                ) : null}
                            </Card>
                        ))
                    )}
                </ScrollView>
            )}

            <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Nieuwe medewerker</Text>
                        <ErrorBanner message={formError} />
                        <TextField label="Voornaam" value={voornaam} onChangeText={setVoornaam} />
                        <TextField label="Achternaam" value={achternaam} onChangeText={setAchternaam} />
                        <TextField label="E-mailadres" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                        <Text style={styles.label}>Rol</Text>
                        <View style={styles.chipRow}>
                            {ROLLEN.map((r) => (
                                <Pressable key={r} onPress={() => setRol(r)} style={[styles.chip, rol === r && styles.chipActive]}>
                                    <Text style={[styles.chipText, rol === r && styles.chipTextActive]}>{roleLabels[r]}</Text>
                                </Pressable>
                            ))}
                        </View>
                        <PrimaryButton title="Toevoegen" onPress={handleAdd} loading={saving} />
                        <PrimaryButton title="Annuleren" variant="outline" onPress={() => setShowModal(false)} />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    newButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
        marginBottom: 16,
    },
    newButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    naam: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
    email: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    rol: { fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 2 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
    label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8 },
    chipRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, fontWeight: '600', color: '#334155' },
    chipTextActive: { color: '#fff' },
});
