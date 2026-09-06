import { router } from 'expo-router';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Card, CenteredLoader, EmptyState, ErrorBanner } from '../../../src/components/ui';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { formatDateTime } from '../../../src/lib/format';
import { SupportApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

function statusTone(status: string): 'default' | 'success' | 'danger' | 'warning' {
    if (status === 'Open') return 'warning';
    if (status === 'In Behandeling') return 'default';
    if (status === 'Opgelost') return 'success';
    return 'danger';
}

export default function AdminTicketsScreen() {
    const { data, loading, refreshing, error, refresh } = useAsyncData(() => SupportApi.alleTickets() as Promise<any[]>, []);

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            {loading ? (
                <CenteredLoader />
            ) : (
                <ScrollView contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
                    <ErrorBanner message={error} />
                    {(data || []).length === 0 ? (
                        <EmptyState title="Geen tickets" />
                    ) : (
                        (data || []).map((t: any) => (
                            <Pressable key={t.uuid} onPress={() => router.push(`/(app)/support/${t.uuid}`)}>
                                <Card style={{ marginBottom: 10 }}>
                                    <View style={styles.rowBetween}>
                                        <Text style={styles.onderwerp}>{t.onderwerp}</Text>
                                        <Badge label={t.status} tone={statusTone(t.status)} />
                                    </View>
                                    <Text style={styles.meta}>
                                        {t.bedrijfsnaam} · {t.voornaam} {t.achternaam}
                                    </Text>
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
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    onderwerp: { fontSize: 15, fontWeight: '700', color: '#0f172a', flex: 1 },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
});
