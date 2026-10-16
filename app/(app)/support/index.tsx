import { router, useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { TicketRow } from '../../../src/components/TicketRow';
import { Card, CardHeader, CenteredLoader, EmptyState, ErrorBanner, PrimaryButton } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { SupportApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

export default function SupportScreen() {
    const { user } = useAuth();
    const { data, loading, refreshing, error, refresh } = useAsyncData(() => SupportApi.ticketsVoorOrg(user!.org_uuid) as Promise<any[]>, [user?.org_uuid]);

    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [user?.org_uuid]) // eslint-disable-line react-hooks/exhaustive-deps
    );

    const tickets = data || [];

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            {loading ? (
                <CenteredLoader />
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
                    <ErrorBanner message={error} />
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                        <PrimaryButton title="Nieuw ticket" icon="add" onPress={() => router.push('/(app)/support/nieuw')} style={{ flex: 1 }} />
                        <PrimaryButton title="Kennisbank" icon="book-outline" variant="secondary" onPress={() => router.push('/(app)/kennisbank')} style={{ flex: 1 }} />
                    </View>
                    <Card style={{ padding: 12 }}>
                        <CardHeader icon="headset-outline" title="Mijn tickets" subtitle={`${tickets.length} ${tickets.length === 1 ? 'ticket' : 'tickets'}`} />
                        {tickets.length === 0 ? (
                            <EmptyState icon="chatbubbles-outline" title="Geen tickets" subtitle="Loop je ergens tegenaan? Maak een support-ticket aan." />
                        ) : (
                            tickets.map((t: any) => <TicketRow key={t.uuid} ticket={t} onPress={() => router.push(`/(app)/support/${t.uuid}`)} />)
                        )}
                    </Card>
                </ScrollView>
            )}
        </View>
    );
}
