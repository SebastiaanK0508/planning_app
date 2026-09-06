import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, CenteredLoader, EmptyState, ErrorBanner } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { formatDateTime } from '../../../src/lib/format';
import { BerichtenApi } from '../../../src/lib/services';
import { colors, hasRole, PLANNER_PLUS } from '../../../src/lib/theme';

export default function BerichtenScreen() {
    const { user } = useAuth();
    const isPlannerPlus = hasRole(user?.rol, PLANNER_PLUS);
    const { data, loading, refreshing, error, refresh } = useAsyncData(
        () => BerichtenApi.mijnBerichten(user!.uuid, user!.org_uuid) as Promise<any[]>,
        [user?.uuid, user?.org_uuid]
    );

    useEffect(() => {
        if (!data) return;
        data.filter((b: any) => !b.is_gelezen_door_mij && b.zender_uuid !== user?.uuid.replace(/-/g, '').toUpperCase()).forEach((b: any) => {
            BerichtenApi.markeerGelezen(b.uuid).catch(() => {});
        });
    }, [data]);

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            {loading ? (
                <CenteredLoader />
            ) : (
                <ScrollView contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
                    <ErrorBanner message={error} />
                    {isPlannerPlus ? (
                        <Pressable style={styles.newButton} onPress={() => router.push('/(app)/berichten/nieuw')}>
                            <Ionicons name="create-outline" size={18} color="#fff" />
                            <Text style={styles.newButtonText}>Nieuw bericht</Text>
                        </Pressable>
                    ) : null}

                    {(data || []).length === 0 ? (
                        <EmptyState title="Geen berichten" subtitle="Hier verschijnen mededelingen en directe berichten." />
                    ) : (
                        (data || []).map((b: any) => (
                            <Card key={b.uuid} style={{ marginBottom: 10 }}>
                                <View style={styles.rowBetween}>
                                    <Text style={styles.titel}>{b.titel}</Text>
                                    {!b.is_gelezen_door_mij ? <View style={styles.dot} /> : null}
                                </View>
                                <Text style={styles.inhoud}>{b.bericht}</Text>
                                <View style={styles.metaRow}>
                                    <Text style={styles.meta}>{b.zender_naam || 'Systeem'}</Text>
                                    <Text style={styles.meta}>{formatDateTime(b.datum_geplaatst)}</Text>
                                </View>
                            </Card>
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
    titel: { fontSize: 15, fontWeight: '700', color: '#0f172a', flex: 1 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 4 },
    inhoud: { fontSize: 14, color: '#334155', marginTop: 6 },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    meta: { fontSize: 11, color: colors.textMuted },
});
