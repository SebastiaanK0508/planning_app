import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
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

    // Refresh elke keer als dit scherm weer in beeld komt (bv. terug uit een geopend bericht),
    // zodat de gelezen-status bijgewerkt is zonder handmatig te hoeven verversen.
    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [user?.uuid, user?.org_uuid])
    );

    function openBericht(b: any) {
        router.push({ pathname: '/(app)/berichten/[uuid]', params: { uuid: b.uuid, data: JSON.stringify(b) } });
    }

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
                        (data || []).map((b: any) => {
                            const ongelezen = !b.is_gelezen_door_mij;
                            return (
                                <Pressable key={b.uuid} onPress={() => openBericht(b)}>
                                    <Card style={[styles.rij, ongelezen && styles.rijOngelezen]}>
                                        {ongelezen ? <View style={styles.dot} /> : <View style={styles.dotSpacer} />}
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.rowBetween}>
                                                <Text style={[styles.titel, ongelezen && styles.titelOngelezen]} numberOfLines={1}>
                                                    {b.titel}
                                                </Text>
                                                <Text style={styles.datum}>{formatDateTime(b.datum_geplaatst)}</Text>
                                            </View>
                                            <Text style={styles.afzender} numberOfLines={1}>
                                                {b.zender_naam || 'Systeem'}
                                            </Text>
                                            <Text style={styles.snippet} numberOfLines={1}>
                                                {b.bericht}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                                    </Card>
                                </Pressable>
                            );
                        })
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
    rij: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8, paddingVertical: 12 },
    rijOngelezen: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
    dotSpacer: { width: 8 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    titel: { fontSize: 14, fontWeight: '600', color: '#334155', flex: 1 },
    titelOngelezen: { fontWeight: '800', color: '#0f172a' },
    afzender: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    snippet: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
    datum: { fontSize: 11, color: colors.textMuted },
});
