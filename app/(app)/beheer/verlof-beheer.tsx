import React, { useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Card, CenteredLoader, EmptyState, ErrorBanner, PrimaryButton } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { ApiError } from '../../../src/lib/api';
import { formatShortDate } from '../../../src/lib/format';
import { AuthApi, VerlofApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

export default function VerlofBeheerScreen() {
    const { user } = useAuth();
    const verlof = useAsyncData(() => VerlofApi.orgOverzicht(user!.org_uuid) as Promise<any[]>, [user?.org_uuid]);
    const gebruikers = useAsyncData(() => AuthApi.alleGebruikers(user!.org_uuid) as Promise<any[]>, [user?.org_uuid]);
    const [busy, setBusy] = useState<string | null>(null);

    const naamMap = useMemo(() => {
        const map: Record<string, string> = {};
        (gebruikers.data || []).forEach((g: any) => {
            map[g.uuid] = `${g.voornaam} ${g.achternaam}`;
        });
        return map;
    }, [gebruikers.data]);

    const perAanvraag = useMemo(() => {
        if (!verlof.data) return [];
        const map = new Map<string, any>();
        verlof.data
            .filter((v: any) => v.status === 'verlof_aanvraag')
            .forEach((v: any) => {
                if (!map.has(v.uuid)) {
                    map.set(v.uuid, { ...v, van: v.datum, tot: v.datum });
                } else {
                    const entry = map.get(v.uuid);
                    if (v.datum < entry.van) entry.van = v.datum;
                    if (v.datum > entry.tot) entry.tot = v.datum;
                }
            });
        return Array.from(map.values());
    }, [verlof.data]);

    async function beslis(uuid: string, status: 'goedgekeurd' | 'afgewezen') {
        setBusy(uuid);
        try {
            await VerlofApi.setStatus(uuid, status);
            verlof.refresh();
        } catch (err) {
            Alert.alert('Fout', err instanceof ApiError ? err.message : 'Bijwerken is mislukt.');
        } finally {
            setBusy(null);
        }
    }

    const loading = verlof.loading || gebruikers.loading;

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            {loading ? (
                <CenteredLoader />
            ) : (
                <ScrollView contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={verlof.refreshing} onRefresh={verlof.refresh} />}>
                    <ErrorBanner message={verlof.error || gebruikers.error} />
                    {perAanvraag.length === 0 ? (
                        <EmptyState title="Geen openstaande verlofaanvragen" />
                    ) : (
                        perAanvraag.map((v: any) => (
                            <Card key={v.uuid} style={{ marginBottom: 10 }}>
                                <View style={styles.rowBetween}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.naam}>{naamMap[v.gebruiker_uuid] || 'Onbekend'}</Text>
                                        <Text style={styles.periode}>
                                            {formatShortDate(v.van)} — {formatShortDate(v.tot)}
                                        </Text>
                                        {v.notitie ? <Text style={styles.notitie}>{v.notitie}</Text> : null}
                                    </View>
                                    <Badge label="In afwachting" tone="warning" />
                                </View>
                                <View style={styles.actionsRow}>
                                    <PrimaryButton title="Afwijzen" variant="outline" onPress={() => beslis(v.uuid, 'afgewezen')} loading={busy === v.uuid} />
                                    <View style={{ width: 10 }} />
                                    <PrimaryButton title="Goedkeuren" onPress={() => beslis(v.uuid, 'goedgekeurd')} loading={busy === v.uuid} />
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
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    naam: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
    periode: { fontSize: 13, color: '#334155', marginTop: 4 },
    notitie: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    actionsRow: { flexDirection: 'row', marginTop: 12 },
});
