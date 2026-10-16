import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TopBar } from '../../../src/components/TopBar';
import {
    Badge,
    BadgeTone,
    Card,
    CardHeader,
    CenteredLoader,
    EmptyState,
    ErrorBanner,
    HeroCard,
    IconTile,
    PrimaryButton,
    ProgressBar,
    Segmented,
    Sheet,
    StatTile,
} from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { useMijnInstellingen } from '../../../src/hooks/useMijnInstellingen';
import { ApiError } from '../../../src/lib/api';
import { formatTime, formatUren, isSameDay, parseServerDate } from '../../../src/lib/format';
import { PlanningApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';
import { splitsNotitie, verlofIcoon, verlofStatus } from '../../../src/lib/verlof';

type Filter = 'alle' | 'wachtend' | 'goedgekeurd';

const BADGE: Record<string, { label: string; tone: BadgeTone }> = {
    wachtend: { label: 'Wachtend', tone: 'amber' },
    goedgekeurd: { label: 'Geregeld', tone: 'emerald' },
    afgewezen: { label: 'Afgewezen', tone: 'rose' },
};

function periodeTekst(v: any, lang = false): string {
    const start = parseServerDate(v.start_tijd)!;
    const eind = parseServerDate(v.eind_tijd)!;
    const opties: Intl.DateTimeFormatOptions = lang ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short' };
    const s = start.toLocaleDateString('nl-NL', opties);
    if (!isSameDay(start, eind)) return `${s} t/m ${eind.toLocaleDateString('nl-NL', opties)}`;
    const heleDag = formatTime(v.start_tijd) === '00:00' && formatTime(v.eind_tijd) === '23:59';
    return heleDag ? s : `${s} (${formatTime(v.start_tijd)} – ${formatTime(v.eind_tijd)})`;
}

export default function VerlofScreen() {
    const { user } = useAuth();
    const { instellingen, herlaad } = useMijnInstellingen();
    const [filter, setFilter] = useState<Filter>('alle');
    const [detail, setDetail] = useState<any | null>(null);
    const [busy, setBusy] = useState(false);
    const { data, loading, refreshing, error, refresh } = useAsyncData(() => PlanningApi.mijnRooster(user!.uuid) as Promise<any[]>, [user?.uuid]);

    useFocusEffect(
        useCallback(() => {
            refresh();
            herlaad();
        }, [user?.uuid]) // eslint-disable-line react-hooks/exhaustive-deps
    );

    const items = useMemo(
        () =>
            (data || [])
                .filter((d: any) => String(d.status || '').includes('verlof'))
                .sort((a: any, b: any) => (parseServerDate(b.start_tijd)?.getTime() || 0) - (parseServerDate(a.start_tijd)?.getTime() || 0)),
        [data]
    );

    const { opgenomen, wachtend } = useMemo(() => {
        let o = 0;
        let w = 0;
        items.forEach((v: any) => {
            const st = verlofStatus(v.status);
            if (st === 'goedgekeurd') o += parseFloat(v.uren) || 0;
            if (st === 'wachtend') w += parseFloat(v.uren) || 0;
        });
        return { opgenomen: o, wachtend: w };
    }, [items]);

    const heeftSaldo = instellingen && instellingen.verlofsaldo !== undefined && instellingen.verlofsaldo !== null && instellingen.verlofsaldo !== '';
    const budget = heeftSaldo ? parseFloat(instellingen!.verlofsaldo) || 0 : 0;
    const resterend = Math.max(0, budget - opgenomen);
    const perc = budget > 0 ? resterend / budget : 0;

    const gefilterd = items.filter((v: any) => filter === 'alle' || verlofStatus(v.status) === filter);
    const telWachtend = items.filter((v: any) => verlofStatus(v.status) === 'wachtend').length;

    function intrekken(v: any) {
        Alert.alert('Aanvraag intrekken?', 'Je verlofaanvraag wordt verwijderd. Dit kan niet ongedaan worden gemaakt.', [
            { text: 'Annuleren', style: 'cancel' },
            {
                text: 'Intrekken',
                style: 'destructive',
                onPress: async () => {
                    setBusy(true);
                    try {
                        await PlanningApi.deleteShift(v.uuid);
                        setDetail(null);
                        refresh();
                        Alert.alert('Ingetrokken', 'Je aanvraag is ingetrokken.');
                    } catch (err) {
                        Alert.alert('Intrekken mislukt', err instanceof ApiError ? err.message : 'Probeer het opnieuw.');
                    } finally {
                        setBusy(false);
                    }
                },
            },
        ]);
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <TopBar icon="airplane" title="Verlof" subtitle={`${items.length} ${items.length === 1 ? 'aanvraag' : 'aanvragen'}`} />
            {loading ? (
                <CenteredLoader />
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                refresh();
                                herlaad();
                            }}
                        />
                    }
                >
                    <ErrorBanner message={error} />

                    <HeroCard>
                        <Text style={styles.heroEyebrow}>Beschikbaar verlof</Text>
                        <View style={styles.heroRow}>
                            <Text style={styles.heroValue}>{heeftSaldo ? resterend.toFixed(1) : '?'}</Text>
                            <Text style={styles.heroUnit}>{heeftSaldo ? 'uren' : 'Niet ingesteld'}</Text>
                        </View>
                        <ProgressBar value={perc} color={perc < 0.2 ? '#f43f5e' : '#3b82f6'} track="rgba(255,255,255,0.12)" />
                        {heeftSaldo ? <Text style={styles.heroHint}>van {formatUren(budget)} uur dit jaar</Text> : null}
                        <PrimaryButton
                            title="Verlof aanvragen"
                            icon="add"
                            onPress={() => router.push({ pathname: '/(app)/verlof/nieuw', params: { saldo: heeftSaldo ? String(resterend) : '' } })}
                            style={{ marginTop: 16 }}
                        />
                    </HeroCard>

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                        <StatTile icon="checkmark-done" tone="emerald" label="Opgenomen" value={`${opgenomen.toFixed(1)} u`} />
                        <StatTile icon="hourglass-outline" tone="amber" label="Wachtend" value={`${wachtend.toFixed(1)} u`} />
                    </View>

                    <Card style={{ marginTop: 14 }}>
                        <CardHeader icon="time-outline" title="Mijn aanvragen" />
                        <Segmented
                            value={filter}
                            onChange={setFilter}
                            options={[
                                { value: 'alle', label: 'Alle' },
                                { value: 'wachtend', label: 'Wachtend', count: telWachtend || undefined },
                                { value: 'goedgekeurd', label: 'Geregeld' },
                            ]}
                            style={{ marginBottom: 8 }}
                        />
                        {gefilterd.length === 0 ? (
                            <EmptyState icon="calendar-outline" title="Geen aanvragen" subtitle="Er zijn geen aanvragen in deze categorie." />
                        ) : (
                            gefilterd.map((v: any, i: number) => {
                                const { type, tekst } = splitsNotitie(v.notitie);
                                const b = BADGE[verlofStatus(v.status)];
                                return (
                                    <Pressable
                                        key={v.uuid}
                                        onPress={() => setDetail(v)}
                                        style={({ pressed }) => [styles.item, i > 0 && styles.itemBorder, pressed && { backgroundColor: colors.inputBg }]}
                                    >
                                        <IconTile name={verlofIcoon(type)} tone="blue" size={40} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.itemTitle} numberOfLines={1}>
                                                {tekst || type}
                                            </Text>
                                            <Text style={styles.itemSub} numberOfLines={1}>
                                                {periodeTekst(v)} · {(parseFloat(v.uren) || 0).toFixed(1)} u
                                            </Text>
                                        </View>
                                        <Badge label={b.label} tone={b.tone} />
                                    </Pressable>
                                );
                            })
                        )}
                    </Card>
                </ScrollView>
            )}

            <Sheet
                visible={!!detail}
                onClose={() => setDetail(null)}
                title={detail ? splitsNotitie(detail.notitie).type : ''}
                subtitle={detail ? periodeTekst(detail, true) : ''}
                footer={
                    detail && verlofStatus(detail.status) === 'wachtend' ? (
                        <PrimaryButton title="Aanvraag intrekken" icon="trash-outline" variant="danger" onPress={() => intrekken(detail)} loading={busy} />
                    ) : undefined
                }
            >
                {detail ? (
                    <View style={{ gap: 12 }}>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                            <Badge label={BADGE[verlofStatus(detail.status)].label} tone={BADGE[verlofStatus(detail.status)].tone} />
                            <Badge label={`${(parseFloat(detail.uren) || 0).toFixed(1)} uur`} icon="stopwatch-outline" />
                        </View>
                        <View style={styles.noteBox}>
                            <Text style={styles.noteLabel}>Toelichting</Text>
                            <Text style={styles.noteText}>{splitsNotitie(detail.notitie).tekst || 'Geen toelichting opgegeven.'}</Text>
                        </View>
                    </View>
                ) : null}
            </Sheet>
        </View>
    );
}

const styles = StyleSheet.create({
    heroEyebrow: { fontSize: 10, fontWeight: '900', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 1.4 },
    heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6, marginBottom: 14 },
    heroValue: { fontSize: 44, fontWeight: '900', color: '#fff', letterSpacing: -1.5 },
    heroUnit: { fontSize: 15, fontWeight: '700', color: '#94a3b8' },
    heroHint: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 8 },
    item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 14 },
    itemBorder: { borderTopWidth: 1, borderTopColor: colors.line },
    itemTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
    itemSub: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
    noteBox: { backgroundColor: colors.inputBg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.line },
    noteLabel: { fontSize: 10, fontWeight: '900', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 },
    noteText: { fontSize: 14, color: colors.text, lineHeight: 20 },
});
