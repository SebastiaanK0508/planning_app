import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Card, CenteredLoader, EmptyState, ErrorBanner } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { formatDateTime } from '../../../src/lib/format';
import { SupportApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';
import type { Ticket } from '../../../src/types';

function statusTone(status: string): 'default' | 'success' | 'danger' | 'warning' {
    if (status === 'Open') return 'warning';
    if (status === 'In Behandeling') return 'default';
    if (status === 'Opgelost') return 'success';
    return 'danger';
}

export default function SupportScreen() {
    const { user } = useAuth();
    const { data, loading, refreshing, error, refresh } = useAsyncData(
        () => SupportApi.ticketsVoorOrg(user!.org_uuid) as Promise<Ticket[]>,
        [user?.org_uuid]
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            {loading ? (
                <CenteredLoader />
            ) : (
                <ScrollView contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
                    <ErrorBanner message={error} />
                    <Pressable style={styles.newButton} onPress={() => router.push('/(app)/support/nieuw')}>
                        <Ionicons name="add-circle" size={20} color="#fff" />
                        <Text style={styles.newButtonText}>Nieuw ticket</Text>
                    </Pressable>

                    {(data || []).length === 0 ? (
                        <EmptyState title="Geen tickets" subtitle="Loop je ergens tegenaan? Maak een support-ticket aan." />
                    ) : (
                        (data || []).map((t: any) => (
                            <Pressable key={t.uuid} onPress={() => router.push(`/(app)/support/${t.uuid}`)}>
                                <Card style={{ marginBottom: 10 }}>
                                    <View style={styles.rowBetween}>
                                        <Text style={styles.onderwerp}>{t.onderwerp}</Text>
                                        <Badge label={t.status} tone={statusTone(t.status)} />
                                    </View>
                                    <Text style={styles.meta}>{formatDateTime(t.datum_aangemaakt)}</Text>
                                </Card>
                            </Pressable>
                        ))
                    )}
                </ScrollView>
            )}
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
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    onderwerp: { fontSize: 15, fontWeight: '700', color: '#0f172a', flex: 1 },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
});
