import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Card, CenteredLoader, EmptyState, ErrorBanner, PrimaryButton, TextField } from '../../../src/components/ui';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { ApiError } from '../../../src/lib/api';
import { OrganisatieApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

export default function OrganisatiesScreen() {
    const { data, loading, refreshing, error, refresh } = useAsyncData(() => OrganisatieApi.adminLijst() as Promise<any[]>, []);
    const [showModal, setShowModal] = useState(false);
    const [naam, setNaam] = useState('');
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    async function handleAdd() {
        setFormError('');
        if (!naam.trim()) {
            setFormError('Naam is verplicht.');
            return;
        }
        setSaving(true);
        try {
            await OrganisatieApi.adminAdd({ naam });
            setShowModal(false);
            setNaam('');
            refresh();
        } catch (err) {
            setFormError(err instanceof ApiError ? err.message : 'Toevoegen is mislukt.');
        } finally {
            setSaving(false);
        }
    }

    async function toggle(uuid: string) {
        try {
            await OrganisatieApi.adminToggle(uuid);
            refresh();
        } catch (err) {
            Alert.alert('Fout', err instanceof ApiError ? err.message : 'Bijwerken mislukt.');
        }
    }

    function remove(org: any) {
        Alert.alert('Organisatie verwijderen', `Weet je zeker dat je "${org.naam}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`, [
            { text: 'Annuleren', style: 'cancel' },
            {
                text: 'Verwijderen',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await OrganisatieApi.adminDelete(org.uuid);
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
                    <Pressable style={styles.newButton} onPress={() => { setShowModal(true); setFormError(''); }}>
                        <Ionicons name="add-circle" size={18} color="#fff" />
                        <Text style={styles.newButtonText}>Organisatie toevoegen</Text>
                    </Pressable>

                    {(data || []).length === 0 ? (
                        <EmptyState title="Nog geen organisaties" />
                    ) : (
                        (data || []).map((o: any) => (
                            <Card key={o.uuid} style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.naam}>{o.naam}</Text>
                                    <Text style={styles.meta}>{o.actief ? 'Actief' : 'Gedeactiveerd'}</Text>
                                </View>
                                <Switch value={!!o.actief} onValueChange={() => toggle(o.uuid)} trackColor={{ true: colors.primary }} />
                                <Pressable onPress={() => remove(o)} style={{ marginLeft: 12 }}>
                                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                                </Pressable>
                            </Card>
                        ))
                    )}
                </ScrollView>
            )}

            <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Nieuwe organisatie</Text>
                        <ErrorBanner message={formError} />
                        <TextField label="Naam" value={naam} onChangeText={setNaam} />
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
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
});
