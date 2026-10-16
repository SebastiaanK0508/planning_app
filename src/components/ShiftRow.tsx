import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { addDays, formatTime, formatUren, isSameDay, isVerlofStatus, parseServerDate, shortDayMonth, startOfWeek, statusLabel, weekNummer } from '../lib/format';
import { colors } from '../lib/theme';
import { Badge } from './ui';

/** Rij met datumblok links, zoals renderShiftRij() op rooster.html / mijn_rooster.html. */
export function ShiftRow({ item, onPress }: { item: any; onPress: () => void }) {
    const start = parseServerDate(item.start_tijd) || new Date();
    const eind = parseServerDate(item.eind_tijd) || start;
    const nu = new Date();
    const isVandaag = isSameDay(start, nu);
    const isVerlof = isVerlofStatus(item.status);
    const verleden = eind < nu && !isVerlof && item.status !== 'ziek';
    const st = verleden ? { label: 'Gewerkt', tone: 'default' as const } : statusLabel(item.status);
    const heleDag = isVerlof && formatTime(item.start_tijd) === '00:00' && formatTime(item.eind_tijd) === '23:59';

    return (
        <Pressable onPress={onPress} style={({ pressed }) => [styles.row, isVandaag && styles.rowToday, verleden && { opacity: 0.55 }, pressed && { backgroundColor: colors.inputBg }]}>
            <View style={[styles.dateBlock, isVandaag && styles.dateBlockToday]}>
                <Text style={[styles.dateDow, isVandaag && styles.dateTextToday]}>
                    {start.toLocaleDateString('nl-NL', { weekday: 'short' }).replace('.', '')}
                </Text>
                <Text style={[styles.dateDay, isVandaag && styles.dateTextToday]}>{start.getDate()}</Text>
                <Text style={[styles.dateMonth, isVandaag && styles.dateTextToday]}>
                    {start.toLocaleDateString('nl-NL', { month: 'short' }).replace('.', '')}
                </Text>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.topLine}>
                    <Text style={styles.time}>{heleDag ? 'Hele dag' : `${formatTime(item.start_tijd)} – ${formatTime(item.eind_tijd)}`}</Text>
                    {isVandaag ? <Badge label="Vandaag" tone="blue" /> : null}
                </View>
                <View style={styles.metaLine}>
                    {isVerlof ? (
                        <Text style={styles.meta} numberOfLines={1}>
                            {item.notitie || 'Verlof'}
                        </Text>
                    ) : (
                        <>
                            <Meta icon="location-outline" text={item.locatie_naam || 'Geen locatie'} />
                            <Meta icon="cafe-outline" text={`${item.pauze_minuten || 0} min`} />
                        </>
                    )}
                    <Meta icon="stopwatch-outline" text={`${formatUren(item.uren)} u`} strong />
                </View>
                <Badge label={st.label} tone={st.tone} />
            </View>
            <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
        </Pressable>
    );
}

function Meta({ icon, text, strong }: { icon: keyof typeof Ionicons.glyphMap; text: string; strong?: boolean }) {
    return (
        <View style={styles.metaItem}>
            <Ionicons name={icon} size={12} color={strong ? colors.primary : '#cbd5e1'} />
            <Text style={[styles.meta, strong && { color: colors.text }]} numberOfLines={1}>
                {text}
            </Text>
        </View>
    );
}

/** Groepeert items per week (ma–zo) in chronologische volgorde. */
export function groepeerPerWeek(items: any[]): { maandag: Date; items: any[]; uren: number }[] {
    const weken: { maandag: Date; items: any[]; uren: number }[] = [];
    items.forEach((s) => {
        const d = parseServerDate(s.start_tijd);
        if (!d) return;
        const maandag = startOfWeek(d);
        let week = weken[weken.length - 1];
        if (!week || week.maandag.getTime() !== maandag.getTime()) {
            week = { maandag, items: [], uren: 0 };
            weken.push(week);
        }
        week.items.push(s);
        week.uren += Number(s.uren) || 0;
    });
    return weken;
}

export function WeekHeader({ maandag, aantal, uren }: { maandag: Date; aantal: number; uren: number }) {
    const verschil = Math.round((maandag.getTime() - startOfWeek(new Date()).getTime()) / (7 * 864e5));
    const label = verschil === 0 ? 'Deze week' : verschil === 1 ? 'Volgende week' : verschil === -1 ? 'Vorige week' : `Week ${weekNummer(maandag)}`;
    const wk = Math.abs(verschil) <= 1 ? `wk ${weekNummer(maandag)} · ` : '';
    return (
        <View style={styles.weekHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flex: 1 }}>
                <Text style={styles.weekLabel}>{label}</Text>
                <Text style={styles.weekRange} numberOfLines={1}>
                    {wk}
                    {shortDayMonth(maandag)} – {shortDayMonth(addDays(maandag, 6))}
                </Text>
            </View>
            <Text style={styles.weekTotal}>
                {aantal} {aantal === 1 ? 'dienst' : 'diensten'} · {formatUren(uren)} u
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 18, borderWidth: 1, borderColor: 'transparent' },
    rowToday: { borderColor: colors.primaryBorder, backgroundColor: 'rgba(239,246,255,0.5)' },
    dateBlock: {
        width: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        backgroundColor: colors.inputBg,
        borderWidth: 1,
        borderColor: colors.line,
    },
    dateBlockToday: { backgroundColor: colors.primary, borderColor: colors.primary },
    dateDow: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, color: colors.text, opacity: 0.8 },
    dateDay: { fontSize: 22, fontWeight: '900', color: colors.ink, letterSpacing: -0.5, lineHeight: 26 },
    dateMonth: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', color: colors.text, opacity: 0.7 },
    dateTextToday: { color: '#fff' },
    topLine: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    time: { fontSize: 16, fontWeight: '900', color: colors.ink, letterSpacing: -0.3 },
    metaLine: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 2 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
    meta: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    weekHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        paddingHorizontal: 4,
        paddingBottom: 8,
        marginBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
    },
    weekLabel: { fontSize: 14, fontWeight: '900', color: colors.ink, letterSpacing: -0.2 },
    weekRange: { fontSize: 12, fontWeight: '600', color: colors.subtle, flexShrink: 1 },
    weekTotal: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
});
