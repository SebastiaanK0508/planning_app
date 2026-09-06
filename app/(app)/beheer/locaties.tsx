import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, CenteredLoader, EmptyState, ErrorBanner, PrimaryButton, TextField } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { ApiError } from '../../../src/lib/api';
import { OrganisatieApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

export default function LocatiesScreen() {
    const { user } = useAuth();
    const locatiesQuery = useAsyncData(() => OrganisatieApi.locaties(user!.org_uuid) as Promise<any[]>, [user?.org_uuid]);
    const afdelingenQuery = useAsyncData(() => OrganisatieApi.afdelingenVanOrg(user!.org_uuid) as Promise<any[]>, [user?.org_uuid]);

    const [modal, setModal] = useState<null | 'locatie' | 'afdeling'>(null);
    const [naam, setNaam] = useState('');
    const [adres, setAdres] = useState('');
    const [locatieVoorAfdeling, setLocatieVoorAfdeling] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    function refreshAll() {
        locatiesQuery.refresh();
        afdelingenQuery.refresh();
    }

    async function submitLocatie() {
        setFormError('');
        if (!naam) {
            setFormError('Naam is verplicht.');
            return;
        }
        setSaving(true);
        try {
            await OrganisatieApi.addLocatie({ naam, adres });
            setModal(null);
            setNaam('');
            setAdres('');
            refreshAll();
        } catch (err) {
            setFormError(err instanceof ApiError ? err.message : 'Opslaan mislukt.');
        } finally {
            setSaving(false);
        }
    }

    async function submitAfdeling() {
        setFormError('');
        if (!naam || !locatieVoorAfdeling) {
            setFormError('Kies een locatie en vul een naam in.');
            return;
        }
        setSaving(true);
        try {
            await OrganisatieApi.addAfdeling({ locatie_uuid: locatieVoorAfdeling, naam });
            setModal(null);
            setNaam('');
            refreshAll();
        } catch (err) {
            setFormError(err instanceof ApiError ? err.message : 'Opslaan mislukt.');
        } finally {
            setSaving(false);
        }
    }

    function deleteLocatie(uuid: string) {
        Alert.alert('Locatie verwijderen', 'Weet je het zeker?', [
            { text: 'Annuleren', style: 'cancel' },
            {
                text: 'Verwijderen',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await OrganisatieApi.deleteLocatie(uuid);
                        refreshAll();
                    } catch (err) {
                        Alert.alert('Kon niet verwijderen', err instanceof ApiError ? err.message : 'Probeer het opnieuw.');
                    }
                },
            },
        ]);
    }

    function deleteAfdeling(uuid: string) {
        Alert.alert('Afdeling verwijderen', 'Weet je het zeker?', [
            { text: 'Annuleren', style: 'cancel' },
            {
                text: 'Verwijderen',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await OrganisatieApi.deleteAfdeling(uuid);
                        refreshAll();
                    } catch (err) {
                        Alert.alert('Kon niet verwijderen', err instanceof ApiError ? err.message : 'Probeer het opnieuw.');
                    }
                },
            },
        ]);
    }

    const loading = locatiesQuery.loading || afdelingenQuery.loading;

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            {loading ? (
                <CenteredLoader />
            ) : (
                <ScrollView contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={locatiesQuery.refreshing} onRefresh={refreshAll} />}>
                    <ErrorBanner message={locatiesQuery.error || afdelingenQuery.error} />

                    <Text style={styles.sectionTitle}>Locaties</Text>
                    <Pressable style={styles.newButton} onPress={() => { setModal('locatie'); setFormError(''); }}>
                        <Ionicons name="add-circle" size={18} color="#fff" />
                        <Text style={styles.newButtonText}>Locatie toevoegen</Text>
                    </Pressable>
                    {(locatiesQuery.data || []).length === 0 ? (
                        <EmptyState title="Nog geen locaties" />
                    ) : (
                        (locatiesQuery.data || []).map((l: any) => (
                            <Card key={l.uuid} style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.naam}>{l.naam}</Text>
                                    {l.adres ? <Text style={styles.meta}>{l.adres}</Text> : null}
                                </View>
                                <Pressable onPress={() => deleteLocatie(l.uuid)}>
                                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                                </Pressable>
                            </Card>
                        ))
                    )}

                    <Text style={styles.sectionTitle}>Afdelingen</Text>
                    <Pressable style={styles.newButton} onPress={() => { setModal('afdeling'); setFormError(''); }}>
                        <Ionicons name="add-circle" size={18} color="#fff" />
                        <Text style={styles.newButtonText}>Afdeling toevoegen</Text>
                    </Pressable>
                    {(afdelingenQuery.data || []).length === 0 ? (
                        <EmptyState title="Nog geen afdelingen" />
                    ) : (
                        (afdelingenQuery.data || []).map((a: any) => (
                            <Card key={a.uuid} style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.naam}>{a.naam}</Text>
                                    <Text style={styles.meta}>{a.locatie_naam}</Text>
                                </View>
                                <Pressable onPress={() => deleteAfdeling(a.uuid)}>
                                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                                </Pressable>
                            </Card>
                        ))
                    )}
                </ScrollView>
            )}

            <Modal visible={modal === 'locatie'} transparent animationType="slide" onRequestClose={() => setModal(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Nieuwe locatie</Text>
                        <ErrorBanner message={formError} />
                        <TextField label="Naam" value={naam} onChangeText={setNaam} />
                        <TextField label="Adres (optioneel)" value={adres} onChangeText={setAdres} />
                        <PrimaryButton title="Opslaan" onPress={submitLocatie} loading={saving} />
                        <PrimaryButton title="Annuleren" variant="outline" onPress={() => setModal(null)} />
                    </View>
                </View>
            </Modal>

            <Modal visible={modal === 'afdeling'} transparent animationType="slide" onRequestClose={() => setModal(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Nieuwe afdeling</Text>
                        <ErrorBanner message={formError} />
                        <Text style={styles.label}>Locatie</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                            {(locatiesQuery.data || []).map((l: any) => (
                                <Pressable
                                    key={l.uuid}
                                    onPress={() => setLocatieVoorAfdeling(l.uuid)}
                                    style={[styles.chip, locatieVoorAfdeling === l.uuid && styles.chipActive]}
                                >
                                    <Text style={[styles.chipText, locatieVoorAfdeling === l.uuid && styles.chipTextActive]}>{l.naam}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                        <TextField label="Naam" value={naam} onChangeText={setNaam} />
                        <PrimaryButton title="Opslaan" onPress={submitAfdeling} loading={saving} />
                        <PrimaryButton title="Annuleren" variant="outline" onPress={() => setModal(null)} />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 10,
        marginTop: 8,
    },
    newButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        borderRadius: 14,
        paddingVertical: 12,
        marginBottom: 12,
    },
    newButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    naam: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
    label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', marginRight: 8 },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, fontWeight: '600', color: '#334155' },
    chipTextActive: { color: '#fff' },
});
