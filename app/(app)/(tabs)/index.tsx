import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AbonnementBanner } from '../../../src/components/AbonnementBanner';
import { ShiftDetailsModal } from '../../../src/components/ShiftDetailsModal';
import { groepeerPerWeek, ShiftRow, WeekHeader } from '../../../src/components/ShiftRow';
import { IconButton, TopBar } from '../../../src/components/TopBar';
import { Card, CardHeader, CenteredLoader, EmptyState, ErrorBanner, HeroCard, IconTile, ProgressBar, TileTone } from '../../../src/components/ui';
import { useAppStatus } from '../../../src/contexts/AppStatusContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { settingAan, useOrgSettings } from '../../../src/hooks/useOrgSettings';
import { addDays, formatUren, parseServerDate, startOfWeek } from '../../../src/lib/format';
import { AuthApi, PlanningApi } from '../../../src/lib/services';
import { colors, hasRole, PLANNER_PLUS, roleLabels } from '../../../src/lib/theme';

export default function HomeScreen() {
    const { user } = useAuth();
    const isPlannerPlus = hasRole(user?.rol, PLANNER_PLUS);
    const status = useAppStatus();
    const settings = useOrgSettings();
    const [selectedShift, setSelectedShift] = useState<any | null>(null);
    const [contractUren, setContractUren] = useState(0);

    const rooster = useAsyncData(() => PlanningApi.mijnRooster(user!.uuid) as Promise<any[]>, [user?.uuid]);

    useEffect(() => {
        if (!user) return;
        AuthApi.getUser(user.uuid)
            .then((res: any) => setContractUren(parseFloat(res?.instellingen?.contracturen) || 0))
            .catch(() => {});
    }, [user?.uuid]);

    useFocusEffect(
        useCallback(() => {
            status.refresh();
        }, [status.refresh])
    );

    // Komende 4 weken (t/m zondag van week 4), zoals rooster.html.
    const weken = useMemo(() => {
        if (!rooster.data) return [];
        const nu = new Date();
        const grens = addDays(startOfWeek(nu), 28);
        const komend = rooster.data
            .filter((s: any) => {
                const e = parseServerDate(s.eind_tijd);
                const b = parseServerDate(s.start_tijd);
                return e && b && e >= nu && b < grens;
            })
            .sort((a: any, b: any) => (parseServerDate(a.start_tijd)!.getTime() - parseServerDate(b.start_tijd)!.getTime()));
        return groepeerPerWeek(komend);
    }, [rooster.data]);

    const weekUren = useMemo(() => {
        const ma = startOfWeek(new Date());
        const zo = addDays(ma, 7);
        return (rooster.data || [])
            .filter((s: any) => {
                const d = parseServerDate(s.start_tijd);
                return d && d >= ma && d < zo;
            })
            .reduce((acc: number, s: any) => acc + (parseFloat(s.uren) || 0), 0);
    }, [rooster.data]);

    const perc = contractUren ? Math.min(weekUren / contractUren, 1) : 0;
    const teamZichtbaar = settingAan(settings?.rooster_zichtbaar, false) || isPlannerPlus;
    const vandaag = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <TopBar
                eyebrow={vandaag}
                title={`Hoi ${user?.voornaam || ''}!`}
                subtitle={user ? roleLabels[user.rol] : ''}
                right={
                    <>
                        <IconButton name="swap-horizontal-outline" badge={status.ruilBadge} onPress={() => router.push('/(app)/(tabs)/ruilbeurs')} />
                        <IconButton name="notifications-outline" badge={status.ongelezenBerichten} onPress={() => router.push('/(app)/berichten')} />
                    </>
                }
            />
            {rooster.loading ? (
                <CenteredLoader />
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={rooster.refreshing}
                            onRefresh={() => {
                                rooster.refresh();
                                status.refresh();
                            }}
                        />
                    }
                >
                    <AbonnementBanner />
                    <ErrorBanner message={rooster.error} />

                    <HeroCard>
                        <Text style={styles.heroEyebrow}>Uren deze week</Text>
                        <View style={styles.heroRow}>
                            <Text style={styles.heroValue}>{weekUren.toFixed(1)}</Text>
                            <Text style={styles.heroOf}>/ {contractUren ? formatUren(contractUren) : '–'} uur</Text>
                            <Text style={styles.heroPerc}>{contractUren ? `${Math.round(perc * 100)}%` : '–'}</Text>
                        </View>
                        <ProgressBar
                            value={perc}
                            color={contractUren && weekUren > contractUren ? '#34d399' : '#3b82f6'}
                            track="rgba(255,255,255,0.12)"
                        />
                        <Text style={styles.heroHint}>{contractUren ? 'Ten opzichte van je contracturen' : 'Er zijn nog geen contracturen ingesteld'}</Text>
                    </HeroCard>

                    <View style={styles.grid}>
                        {teamZichtbaar ? (
                            <QuickAction icon="people-outline" tone="purple" label="Team rooster" onPress={() => router.push('/(app)/beheer/team-rooster')} />
                        ) : null}
                        <QuickAction icon="calendar-outline" tone="blue" label="Alle diensten" onPress={() => router.push('/(app)/(tabs)/rooster')} />
                        <QuickAction icon="airplane-outline" tone="emerald" label="Verlof" onPress={() => router.push('/(app)/(tabs)/verlof')} />
                        <QuickAction icon="swap-horizontal-outline" tone="amber" label="Ruilbeurs" badge={status.ruilBadge} onPress={() => router.push('/(app)/(tabs)/ruilbeurs')} />
                    </View>

                    {isPlannerPlus ? (
                        <Pressable onPress={() => router.push('/(app)/beheer')}>
                            <Card style={styles.beheerCard}>
                                <IconTile name="briefcase" tone="dark" size={40} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.beheerTitle}>Beheer</Text>
                                    <Text style={styles.beheerSub}>
                                        {status.beheerOpen > 0
                                            ? `${status.beheerOpen} ${status.beheerOpen === 1 ? 'zaak wacht' : 'zaken wachten'} op je`
                                            : 'Planning, ruil/verlof en medewerkers'}
                                    </Text>
                                </View>
                                {status.beheerOpen > 0 ? (
                                    <View style={styles.countPill}>
                                        <Text style={styles.countPillText}>{status.beheerOpen}</Text>
                                    </View>
                                ) : null}
                                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                            </Card>
                        </Pressable>
                    ) : null}

                    <Card style={{ marginTop: 14 }}>
                        <CardHeader
                            icon="calendar-number-outline"
                            title="Komende diensten"
                            subtitle="De komende 4 weken"
                            right={
                                <Pressable onPress={() => router.push('/(app)/(tabs)/rooster')} hitSlop={8}>
                                    <Text style={styles.link}>Alles</Text>
                                </Pressable>
                            }
                        />
                        {weken.length === 0 ? (
                            <EmptyState icon="cafe-outline" title="Je bent vrij!" subtitle="Er staan op dit moment geen komende diensten voor je ingepland." />
                        ) : (
                            weken.map((week, i) => (
                                <View key={week.maandag.toISOString()} style={i > 0 ? { paddingTop: 14 } : undefined}>
                                    <WeekHeader maandag={week.maandag} aantal={week.items.length} uren={week.uren} />
                                    {week.items.map((item: any) => (
                                        <ShiftRow key={`${item.uuid}-${item.start_tijd}`} item={item} onPress={() => setSelectedShift(item)} />
                                    ))}
                                </View>
                            ))
                        )}
                    </Card>
                </ScrollView>
            )}

            <ShiftDetailsModal
                visible={!!selectedShift}
                shift={selectedShift}
                onClose={() => setSelectedShift(null)}
                onChanged={() => {
                    rooster.refresh();
                    status.refresh();
                }}
                ownShift
            />
        </View>
    );
}

function QuickAction({
    icon,
    label,
    onPress,
    tone,
    badge,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    tone: TileTone;
    badge?: number;
}) {
    return (
        <Pressable onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed && { opacity: 0.85 }]}>
            <IconTile name={icon} tone={tone} size={40} />
            <Text style={styles.quickLabel}>{label}</Text>
            {badge ? (
                <View style={[styles.countPill, { position: 'absolute', top: 12, right: 12 }]}>
                    <Text style={styles.countPillText}>{badge}</Text>
                </View>
            ) : null}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    heroEyebrow: { fontSize: 10, fontWeight: '900', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 1.4 },
    heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6, marginBottom: 14 },
    heroValue: { fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: -1.5 },
    heroOf: { fontSize: 15, fontWeight: '700', color: '#94a3b8', flex: 1 },
    heroPerc: { fontSize: 15, fontWeight: '900', color: '#fff' },
    heroHint: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 10 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
    quickAction: {
        flexGrow: 1,
        flexBasis: '45%',
        backgroundColor: '#fff',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: colors.line,
        padding: 14,
        gap: 10,
    },
    quickLabel: { fontSize: 14, fontWeight: '900', color: colors.ink, letterSpacing: -0.2 },
    beheerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
    beheerTitle: { fontSize: 15, fontWeight: '900', color: colors.ink },
    beheerSub: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
    countPill: { backgroundColor: '#ef4444', borderRadius: 999, minWidth: 22, height: 22, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
    countPillText: { color: '#fff', fontSize: 11, fontWeight: '900' },
    link: { fontSize: 12, fontWeight: '900', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.8 },
});
