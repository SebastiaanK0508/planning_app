import React, { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, CenteredLoader, EmptyState, ErrorBanner, PrimaryButton } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { ApiError } from '../../../src/lib/api';
import { formatDayLabel, formatTime } from '../../../src/lib/format';
import { RuilbeursApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

export default function RuilBeheerScreen() {
    const { user } = useAuth();
    const { data, loading, refreshing, error, refresh } = useAsyncData(
        () => RuilbeursApi.adminOverzicht(user!.org_uuid) as Promise<any[]>,
        [user?.org_uuid]
    );
    const [busy, setBusy] = useState<string | null>(null);

    async function bevestigen(id: string) {
        setBusy(id);
        try {
            await RuilbeursApi.adminBevestigen(id);
            refresh();
        } catch (err) {
            Alert.alert('Fout', err instanceof ApiError ? err.message : 'Bevestigen is mislukt.');
        } finally {
            setBusy(null);
        }
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            {loading ? (
                <CenteredLoader />
            ) : (
                <ScrollView contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
                    <ErrorBanner message={error} />
                    {(data || []).length === 0 ? (
                        <EmptyState title="Geen ruilverzoeken die goedkeuring nodig hebben" />
                    ) : (
                        (data || []).map((v: any) => (
                            <Card key={v.id} style={{ marginBottom: 10 }}>
                                <Text style={styles.line}>
                                    <Text style={styles.bold}>{v.van_collega}</Text> ruilt met <Text style={styles.bold}>{v.naar_collega || 'collega'}</Text>
                                </Text>
                                {v.hun_dienst_start ? (
                                    <Text style={styles.meta}>
                                        Hun dienst: {formatDayLabel(v.hun_dienst_start)} {formatTime(v.hun_dienst_start)}-{formatTime(v.hun_dienst_eind)}
                                    </Text>
                                ) : null}
                                {v.jouw_dienst_start ? (
                                    <Text style={styles.meta}>
                                        Collega dienst: {formatDayLabel(v.jouw_dienst_start)} {formatTime(v.jouw_dienst_start)}-
                                        {formatTime(v.jouw_dienst_eind)}
                                    </Text>
                                ) : null}
                                <PrimaryButton title="Definitief goedkeuren" onPress={() => bevestigen(v.id)} loading={busy === v.id} />
                            </Card>
                        ))
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    line: { fontSize: 14, color: '#0f172a', marginBottom: 6 },
    bold: { fontWeight: '700' },
    meta: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
});
