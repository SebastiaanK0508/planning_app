import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar, Badge, Card, CenteredLoader, EmptyState, ErrorBanner, PrimaryButton, SearchField, Segmented } from '../../../src/components/ui';
import { useAppStatus } from '../../../src/contexts/AppStatusContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { formatDateTime, normaliseer, zelfdeUuid } from '../../../src/lib/format';
import { BerichtenApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

type Tab = 'inbox' | 'verzonden';

export default function BerichtenScreen() {
    const { user } = useAuth();
    const status = useAppStatus();
    const [tab, setTab] = useState<Tab>('inbox');
    const [zoek, setZoek] = useState('');
    const { data, loading, refreshing, error, refresh } = useAsyncData(
        () => BerichtenApi.mijnBerichten(user!.uuid, user!.org_uuid) as Promise<any[]>,
        [user?.uuid, user?.org_uuid]
    );

    // Terug uit een geopend bericht: gelezen-status en badge bijwerken.
    useFocusEffect(
        useCallback(() => {
            refresh();
            status.refresh();
        }, [user?.uuid, user?.org_uuid]) // eslint-disable-line react-hooks/exhaustive-deps
    );

    const { inbox, verzonden } = useMemo(() => {
        const alle = data || [];
        return {
            inbox: alle.filter((b: any) => !zelfdeUuid(b.zender_uuid, user?.uuid)),
            verzonden: alle.filter((b: any) => zelfdeUuid(b.zender_uuid, user?.uuid)),
        };
    }, [data, user?.uuid]);
    const ongelezen = inbox.filter((b: any) => Number(b.is_gelezen_door_mij) !== 1).length;

    const lijst = useMemo(() => {
        const term = normaliseer(zoek.trim());
        const bron = tab === 'inbox' ? inbox : verzonden;
        if (!term) return bron;
        return bron.filter((b: any) => [b.titel, b.bericht, b.zender_naam, b.ontvanger_naam].some((v) => normaliseer(v).includes(term)));
    }, [tab, inbox, verzonden, zoek]);

    function openBericht(b: any) {
        router.push({ pathname: '/(app)/berichten/[uuid]', params: { uuid: b.uuid, data: JSON.stringify(b) } });
    }

    function ontvangerTekst(b: any) {
        if (b.ontvanger_uuid) return `Aan ${b.ontvanger_naam || 'collega'}`;
        if (Number(b.aantal_doelgroep) > 0) return `Aan ${b.aantal_doelgroep} ${Number(b.aantal_doelgroep) === 1 ? 'collega' : 'collega\'s'}`;
        return 'Aan iedereen';
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <Stack.Screen options={{ title: 'Berichten' }} />
            {loading ? (
                <CenteredLoader />
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />} keyboardShouldPersistTaps="handled">
                    <ErrorBanner message={error} />
                    <PrimaryButton title="Nieuw bericht" icon="create-outline" onPress={() => router.push('/(app)/berichten/nieuw')} style={{ marginBottom: 14 }} />
                    <Segmented
                        value={tab}
                        onChange={setTab}
                        options={[
                            { value: 'inbox', label: ongelezen ? `Inbox (${ongelezen})` : 'Inbox' },
                            { value: 'verzonden', label: 'Verzonden' },
                        ]}
                        style={{ marginBottom: 12 }}
                    />
                    <SearchField value={zoek} onChangeText={setZoek} placeholder="Zoek in berichten..." style={{ marginBottom: 12 }} />

                    <Card style={{ padding: 6 }}>
                        {lijst.length === 0 ? (
                            <EmptyState
                                icon={tab === 'inbox' ? 'mail-open-outline' : 'paper-plane-outline'}
                                title={zoek ? 'Niets gevonden' : tab === 'inbox' ? 'Geen berichten' : 'Nog niets verstuurd'}
                                subtitle={tab === 'inbox' ? 'Hier verschijnen mededelingen en directe berichten.' : undefined}
                            />
                        ) : (
                            lijst.map((b: any, i: number) => {
                                const nieuw = tab === 'inbox' && Number(b.is_gelezen_door_mij) !== 1;
                                return (
                                    <Pressable
                                        key={b.uuid}
                                        onPress={() => openBericht(b)}
                                        style={({ pressed }) => [styles.rij, i > 0 && styles.rijBorder, nieuw && styles.rijNieuw, pressed && { backgroundColor: colors.inputBg }]}
                                    >
                                        <Avatar naam={tab === 'inbox' ? b.zender_naam || 'Systeem' : b.ontvanger_naam || 'Iedereen'} size={40} />
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.kop}>
                                                <Text style={[styles.naam, nieuw && { fontWeight: '900' }]} numberOfLines={1}>
                                                    {tab === 'inbox' ? b.zender_naam || 'Systeem' : ontvangerTekst(b)}
                                                </Text>
                                                <Text style={styles.datum}>{formatDateTime(b.datum_geplaatst)}</Text>
                                            </View>
                                            <Text style={[styles.titel, nieuw && { color: colors.ink, fontWeight: '900' }]} numberOfLines={1}>
                                                {b.titel}
                                            </Text>
                                            <Text style={styles.snippet} numberOfLines={1}>
                                                {b.bericht}
                                            </Text>
                                            <View style={styles.tags}>
                                                {Number(b.belangrijk) === 1 ? <Badge label="Urgent" tone="rose" icon="alert" /> : null}
                                                {nieuw ? <Badge label="Nieuw" tone="blue" /> : null}
                                                {tab === 'verzonden' && b.ontvanger_uuid ? (
                                                    Number(b.is_gelezen_door_ander) === 1 ? (
                                                        <Badge label="Gelezen" tone="emerald" icon="checkmark-done" />
                                                    ) : (
                                                        <Badge label="Nog niet gelezen" icon="checkmark" />
                                                    )
                                                ) : null}
                                            </View>
                                        </View>
                                        {nieuw ? <View style={styles.dot} /> : <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />}
                                    </Pressable>
                                );
                            })
                        )}
                    </Card>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    rij: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 18 },
    rijBorder: { borderTopWidth: 1, borderTopColor: colors.line },
    rijNieuw: { backgroundColor: 'rgba(239,246,255,0.6)' },
    kop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    naam: { fontSize: 13, fontWeight: '800', color: colors.text, flex: 1 },
    datum: { fontSize: 11, color: colors.subtle, fontWeight: '600' },
    titel: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 2 },
    snippet: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    tags: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
    dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6 },
});
