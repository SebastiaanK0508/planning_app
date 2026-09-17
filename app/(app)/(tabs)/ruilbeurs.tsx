import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Card, CenteredLoader, EmptyState, ErrorBanner, PrimaryButton } from '../../../src/components/ui';
import { TopBar } from '../../../src/components/TopBar';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { ApiError } from '../../../src/lib/api';
import { formatDayLabel, formatTime, statusLabel } from '../../../src/lib/format';
import { markeerRuilUpdatesGezien } from '../../../src/lib/ruilNotificaties';
import { OrganisatieApi, RuilbeursApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

export default function RuilbeursScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useLocalSearchParams<{ aanbieden?: string }>();

    const ontvangen = useAsyncData(() => RuilbeursApi.ontvangen(user!.uuid) as Promise<any[]>, [user?.uuid]);
    const verzonden = useAsyncData(() => RuilbeursApi.mijnVerzonden(user!.uuid) as Promise<any[]>, [user?.uuid]);

    useEffect(() => {
        markeerRuilUpdatesGezien(verzonden.data);
    }, [verzonden.data]);

    const [aanbiedenDienst, setAanbiedenDienst] = useState<string | null>(null);
    const [collegas, setCollegas] = useState<any[]>([]);
    const [busyId, setBusyId] = useState<string | null>(null);

    useEffect(() => {
        if (params.aanbieden) setAanbiedenDienst(String(params.aanbieden));
    }, [params.aanbieden]);

    useEffect(() => {
        if (aanbiedenDienst && user) {
            OrganisatieApi.collegas(user.org_uuid)
                .then((rows: any) => setCollegas((rows || []).filter((c: any) => c.uuid.toLowerCase() !== user.uuid.replace(/-/g, '').toLowerCase())))
                .catch(() => setCollegas([]));
        }
    }, [aanbiedenDienst, user]);

    async function accepteren(id: string) {
        setBusyId(id);
        try {
            await RuilbeursApi.accepteren(id);
            ontvangen.refresh();
        } catch (err) {
            Alert.alert('Kon niet accepteren', err instanceof ApiError ? err.message : 'Probeer het opnieuw.');
        } finally {
            setBusyId(null);
        }
    }

    async function weigeren(id: string) {
        setBusyId(id);
        try {
            await RuilbeursApi.weigeren(id);
            ontvangen.refresh();
        } catch (err) {
            Alert.alert('Kon niet weigeren', err instanceof ApiError ? err.message : 'Probeer het opnieuw.');
        } finally {
            setBusyId(null);
        }
    }

    async function aanbiedenAan(collegaUuid: string) {
        if (!aanbiedenDienst) return;
        setBusyId('offer');
        try {
            await RuilbeursApi.directOverdragen({ dienst_uuid: aanbiedenDienst, naar_gebruiker_uuid: collegaUuid });
            setAanbiedenDienst(null);
            router.setParams({ aanbieden: undefined });
            verzonden.refresh();
            Alert.alert('Verstuurd', 'Je aanbod is verstuurd naar je collega.');
        } catch (err) {
            Alert.alert('Kon niet versturen', err instanceof ApiError ? err.message : 'Probeer het opnieuw.');
        } finally {
            setBusyId(null);
        }
    }

    const loading = ontvangen.loading || verzonden.loading;

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <TopBar title="Ruilbeurs" subtitle="Diensten ruilen met collega's" />
            {loading ? (
                <CenteredLoader />
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 20 }}
                    refreshControl={<RefreshControl refreshing={ontvangen.refreshing} onRefresh={() => { ontvangen.refresh(); verzonden.refresh(); }} />}
                >
                    <ErrorBanner message={ontvangen.error || verzonden.error} />

                    <Text style={styles.sectionTitle}>Voor jou aangeboden</Text>
                    {(ontvangen.data || []).length === 0 ? (
                        <Card style={{ marginBottom: 12 }}>
                            <EmptyState title="Niets voor je klaargezet" />
                        </Card>
                    ) : (
                        (ontvangen.data || []).map((v: any) => (
                            <Card key={v.uuid} style={{ marginBottom: 10 }}>
                                <Text style={styles.van}>Van {v.van_collega}</Text>
                                <Text style={styles.dienstLine}>
                                    Hun dienst: {formatDayLabel(v.hun_dienst_start)} {formatTime(v.hun_dienst_start)}-{formatTime(v.hun_dienst_eind)}
                                </Text>
                                {v.jouw_dienst_start ? (
                                    <Text style={styles.dienstLine}>
                                        Jouw dienst: {formatDayLabel(v.jouw_dienst_start)} {formatTime(v.jouw_dienst_start)}-
                                        {formatTime(v.jouw_dienst_eind)}
                                    </Text>
                                ) : null}
                                <View style={styles.actionsRow}>
                                    <PrimaryButton
                                        title="Weigeren"
                                        icon="close"
                                        variant="outline"
                                        onPress={() => weigeren(v.uuid)}
                                        loading={busyId === v.uuid}
                                        style={{ flex: 1 }}
                                    />
                                    <PrimaryButton
                                        title="Accepteren"
                                        icon="checkmark"
                                        onPress={() => accepteren(v.uuid)}
                                        loading={busyId === v.uuid}
                                        style={{ flex: 1 }}
                                    />
                                </View>
                            </Card>
                        ))
                    )}

                    <Text style={styles.sectionTitle}>Jouw aanbiedingen</Text>
                    {(verzonden.data || []).length === 0 ? (
                        <Card>
                            <EmptyState title="Je hebt nog niets aangeboden" subtitle="Ga naar je rooster en tik op 'Ruilen' bij een dienst." />
                        </Card>
                    ) : (
                        (verzonden.data || []).map((v: any) => {
                            const st = statusLabel(v.status);
                            return (
                                <Card key={v.uuid} style={{ marginBottom: 10 }}>
                                    <View style={styles.rowBetween}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.van}>Naar {v.doel_collega || 'collega'}</Text>
                                            {v.mijn_start ? <Text style={styles.dienstLine}>{formatDayLabel(v.mijn_start)} {formatTime(v.mijn_start)}</Text> : null}
                                        </View>
                                        <Badge label={st.label} tone={st.tone} />
                                    </View>
                                </Card>
                            );
                        })
                    )}
                </ScrollView>
            )}

            <Modal visible={!!aanbiedenDienst} transparent animationType="slide" onRequestClose={() => setAanbiedenDienst(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Aanbieden aan collega</Text>
                        <ScrollView style={{ maxHeight: 360 }}>
                            {collegas.map((c) => (
                                <Pressable key={c.uuid} style={styles.collegaRow} onPress={() => aanbiedenAan(c.uuid)} disabled={busyId === 'offer'}>
                                    <Text style={styles.collegaNaam}>
                                        {c.voornaam} {c.achternaam}
                                    </Text>
                                </Pressable>
                            ))}
                            {collegas.length === 0 ? <Text style={styles.collegaNaam}>Geen collega's gevonden.</Text> : null}
                        </ScrollView>
                        <PrimaryButton title="Annuleren" variant="outline" onPress={() => { setAanbiedenDienst(null); router.setParams({ aanbieden: undefined }); }} />
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
    van: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
    dienstLine: { fontSize: 13, color: '#334155', marginTop: 4 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
    modalTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
    collegaRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    collegaNaam: { fontSize: 15, color: '#0f172a' },
});
