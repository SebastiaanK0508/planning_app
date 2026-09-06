import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Card, CenteredLoader, EmptyState, ErrorBanner } from '../../../src/components/ui';
import { IconButton, TopBar } from '../../../src/components/TopBar';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { formatDayLabel, formatTime, statusLabel } from '../../../src/lib/format';
import { BerichtenApi, PlanningApi } from '../../../src/lib/services';
import { colors, hasRole, PLANNER_PLUS, roleLabels } from '../../../src/lib/theme';
import type { Bericht } from '../../../src/types';

export default function HomeScreen() {
    const { user } = useAuth();
    const isPlannerPlus = hasRole(user?.rol, PLANNER_PLUS);

    const rooster = useAsyncData(() => PlanningApi.mijnRooster(user!.uuid) as Promise<any[]>, [user?.uuid]);
    const berichten = useAsyncData(
        () => BerichtenApi.mijnBerichten(user!.uuid, user!.org_uuid) as Promise<Bericht[]>,
        [user?.uuid, user?.org_uuid]
    );

    const aankomend = useMemo(() => {
        if (!rooster.data) return [];
        const now = new Date();
        return rooster.data
            .filter((item: any) => item.status === 'ingepland' || item.status === 'wacht_op_planner')
            .filter((item: any) => new Date(item.start_tijd.replace(' ', 'T')) >= new Date(now.toDateString()))
            .sort((a: any, b: any) => new Date(a.start_tijd).getTime() - new Date(b.start_tijd).getTime())
            .slice(0, 4);
    }, [rooster.data]);

    const ongelezenBerichten = useMemo(
        () => (berichten.data || []).filter((b: any) => !b.is_gelezen_door_mij).length,
        [berichten.data]
    );

    const loading = rooster.loading || berichten.loading;

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <TopBar
                title={`Hoi ${user?.voornaam}!`}
                subtitle={user ? roleLabels[user.rol] : ''}
                right={<IconButton name="notifications-outline" badge={ongelezenBerichten} onPress={() => router.push('/(app)/berichten')} />}
            />
            {loading ? (
                <CenteredLoader />
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 20 }}
                    refreshControl={
                        <RefreshControl refreshing={rooster.refreshing} onRefresh={() => { rooster.refresh(); berichten.refresh(); }} />
                    }
                >
                    <ErrorBanner message={rooster.error || berichten.error} />

                    <Text style={styles.sectionTitle}>Jouw aankomende diensten</Text>
                    {aankomend.length === 0 ? (
                        <Card>
                            <EmptyState title="Geen aankomende diensten" subtitle="Er staat voorlopig niets voor je gepland." />
                        </Card>
                    ) : (
                        aankomend.map((item: any) => {
                            const st = statusLabel(item.status);
                            return (
                                <Card key={item.uuid} style={{ marginBottom: 10 }}>
                                    <View style={styles.rowBetween}>
                                        <View>
                                            <Text style={styles.dienstDag}>{formatDayLabel(item.start_tijd)}</Text>
                                            <Text style={styles.dienstTijd}>
                                                {formatTime(item.start_tijd)} - {formatTime(item.eind_tijd)}
                                            </Text>
                                            {item.locatie_naam ? <Text style={styles.dienstLocatie}>{item.locatie_naam}</Text> : null}
                                        </View>
                                        <Badge label={st.label} tone={st.tone} />
                                    </View>
                                </Card>
                            );
                        })
                    )}

                    <Pressable onPress={() => router.push('/(app)/(tabs)/rooster')} style={styles.linkRow}>
                        <Text style={styles.linkRowText}>Bekijk volledig rooster</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                    </Pressable>

                    <Text style={styles.sectionTitle}>Snelle acties</Text>
                    <View style={styles.grid}>
                        <QuickAction icon="airplane-outline" label="Verlof aanvragen" onPress={() => router.push('/(app)/verlof/nieuw')} />
                        <QuickAction icon="swap-horizontal-outline" label="Ruilbeurs" onPress={() => router.push('/(app)/(tabs)/ruilbeurs')} />
                        <QuickAction icon="chatbubble-ellipses-outline" label="Berichten" onPress={() => router.push('/(app)/berichten')} />
                        <QuickAction icon="help-buoy-outline" label="Support" onPress={() => router.push('/(app)/support')} />
                    </View>

                    {isPlannerPlus ? (
                        <>
                            <Text style={styles.sectionTitle}>Beheer</Text>
                            <Card>
                                <Pressable onPress={() => router.push('/(app)/beheer')} style={styles.managementRow}>
                                    <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
                                    <Text style={styles.managementText}>Naar het beheerpaneel</Text>
                                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                                </Pressable>
                            </Card>
                        </>
                    ) : null}
                </ScrollView>
            )}
        </View>
    );
}

function QuickAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
    return (
        <Pressable onPress={onPress} style={styles.quickAction}>
            <View style={styles.quickIconWrap}>
                <Ionicons name={icon} size={22} color={colors.primary} />
            </View>
            <Text style={styles.quickLabel}>{label}</Text>
        </Pressable>
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
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    dienstDag: { fontSize: 15, fontWeight: '700', color: '#0f172a', textTransform: 'capitalize' },
    dienstTijd: { fontSize: 14, color: '#334155', marginTop: 2 },
    dienstLocatie: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10 },
    linkRowText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    quickAction: {
        width: '47%',
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        alignItems: 'flex-start',
        gap: 10,
    },
    quickIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
    managementRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    managementText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a' },
});
