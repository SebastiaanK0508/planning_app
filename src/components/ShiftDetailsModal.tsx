import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../lib/api';
import { formatDayLabel, formatTime } from '../lib/format';
import { PlanningApi } from '../lib/services';
import { colors } from '../lib/theme';
import { PrimaryButton } from './ui';

type Props = {
    visible: boolean;
    shift: any | null;
    onClose: () => void;
    onChanged?: () => void;
    ownShift: boolean;
    medewerkerNaam?: string;
};

function statusInfo(status: string | null | undefined): { label: string; kleur: string } {
    if (status === 'te ruil') return { label: 'OP DE RUILBEURS', kleur: colors.warning };
    if (status === 'verlof_goedgekeurd' || status === 'goedgekeurd') return { label: 'VERLOF AKKOORD', kleur: colors.success };
    if (status === 'verlof_aanvraag') return { label: 'VERLOF AANVRAAG', kleur: colors.danger };
    return { label: status ? status.toUpperCase() : 'INGEPLAND', kleur: colors.primary };
}

export function ShiftDetailsModal({ visible, shift, onClose, onChanged, ownShift, medewerkerNaam }: Props) {
    const [busy, setBusy] = useState(false);
    const [splitOpen, setSplitOpen] = useState(false);
    const [splitStart, setSplitStart] = useState(new Date());
    const [splitEind, setSplitEind] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEindPicker, setShowEindPicker] = useState(false);

    if (!shift) return null;

    const isVerlof = String(shift.status || '').includes('verlof');
    const status = statusInfo(shift.status);

    function close() {
        setSplitOpen(false);
        onClose();
    }

    function openSplit() {
        if (shift.start_tijd) setSplitStart(new Date(shift.start_tijd.replace(' ', 'T')));
        if (shift.eind_tijd) setSplitEind(new Date(shift.eind_tijd.replace(' ', 'T')));
        setSplitOpen(true);
    }

    async function volledigRuilen() {
        Alert.alert('Dienst op de ruilbeurs zetten?', 'De hele dienst wordt volledig op de ruilbeurs geplaatst.', [
            { text: 'Annuleren', style: 'cancel' },
            {
                text: 'Zet op beurs',
                onPress: async () => {
                    setBusy(true);
                    try {
                        await PlanningApi.updateStatus(shift.uuid, 'te ruil');
                        onChanged?.();
                        close();
                    } catch (err) {
                        Alert.alert('Mislukt', err instanceof ApiError ? err.message : 'Plaatsen op de beurs is mislukt.');
                    } finally {
                        setBusy(false);
                    }
                },
            },
        ]);
    }

    async function haalVanBeurs() {
        Alert.alert(
            'Dienst van de ruilbeurs halen?',
            'Hij verdwijnt van de beurs en je staat weer ingepland om hem zelf te werken.',
            [
                { text: 'Annuleren', style: 'cancel' },
                {
                    text: 'Haal van beurs',
                    onPress: async () => {
                        setBusy(true);
                        try {
                            await PlanningApi.updateStatus(shift.uuid, 'ingepland');
                            onChanged?.();
                            close();
                        } catch (err) {
                            Alert.alert('Mislukt', err instanceof ApiError ? err.message : 'Van de beurs halen is mislukt.');
                        } finally {
                            setBusy(false);
                        }
                    },
                },
            ]
        );
    }

    async function deelOverdragen() {
        const van = formatTime(splitStart.toISOString());
        const tot = formatTime(splitEind.toISOString());
        if (splitEind <= splitStart) {
            Alert.alert('Ongeldige tijden', 'De eindtijd moet na de starttijd liggen.');
            return;
        }
        Alert.alert('Deel op de ruilbeurs zetten?', `Deel van ${van} tot ${tot} op de ruilbeurs zetten.`, [
            { text: 'Annuleren', style: 'cancel' },
            {
                text: 'Zet deel op beurs',
                onPress: async () => {
                    const datum = String(shift.start_tijd).substring(0, 10);
                    const pad = (n: number) => String(n).padStart(2, '0');
                    const vrij_start = `${datum} ${pad(splitStart.getHours())}:${pad(splitStart.getMinutes())}:00`;
                    const vrij_eind = `${datum} ${pad(splitEind.getHours())}:${pad(splitEind.getMinutes())}:00`;
                    setBusy(true);
                    try {
                        await PlanningApi.flexSplitsen(shift.uuid, vrij_start, vrij_eind);
                        onChanged?.();
                        close();
                    } catch (err) {
                        Alert.alert('Mislukt', err instanceof ApiError ? err.message : 'Splitsen is mislukt.');
                    } finally {
                        setBusy(false);
                    }
                },
            },
        ]);
    }

    function aanbiedenAanCollega() {
        close();
        router.push({ pathname: '/(app)/(tabs)/ruilbeurs', params: { aanbieden: shift.uuid } });
    }

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
            <View style={styles.overlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={close} />
                <View style={styles.sheet}>
                    <View style={styles.handle} />

                    <Text style={[styles.status, { color: status.kleur }]}>{status.label}</Text>
                    {medewerkerNaam ? <Text style={styles.naam}>{medewerkerNaam}</Text> : null}
                    <Text style={styles.datum}>{formatDayLabel(shift.start_tijd)}</Text>
                    <View style={styles.tijdChip}>
                        <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                        <Text style={styles.tijdChipText}>
                            {formatTime(shift.start_tijd)} - {formatTime(shift.eind_tijd)}
                            {shift.uren ? `  ·  ${shift.uren} uur` : ''}
                        </Text>
                    </View>

                    <View style={styles.infoGrid}>
                        <View style={styles.infoCell}>
                            <Text style={styles.infoLabel}>Locatie</Text>
                            <Text style={styles.infoValue} numberOfLines={1}>{shift.locatie_naam || 'Algemeen'}</Text>
                        </View>
                        <View style={styles.infoCell}>
                            <Text style={styles.infoLabel}>Afdeling</Text>
                            <Text style={styles.infoValue} numberOfLines={1}>{shift.afdeling_naam || 'Algemeen'}</Text>
                        </View>
                        <View style={styles.infoCell}>
                            <Text style={styles.infoLabel}>Pauze</Text>
                            <Text style={styles.infoValue}>{shift.pauze_minuten ? `${shift.pauze_minuten} min` : 'Geen'}</Text>
                        </View>
                    </View>
                    {shift.notitie ? <Text style={styles.notitie}>{shift.notitie}</Text> : null}

                    {ownShift ? (
                        <View style={{ marginTop: 16, gap: 10 }}>
                            {shift.status === 'te ruil' ? (
                                <PrimaryButton title="Van beurs halen" variant="outline" onPress={haalVanBeurs} loading={busy} />
                            ) : isVerlof ? (
                                <Text style={styles.disabledHint}>Dit is een verlof-item. Hier kun je geen ruilacties op uitvoeren.</Text>
                            ) : (!shift.status || shift.status === 'ingepland' || shift.status === 'bevestigd') ? (
                                <>
                                    <PrimaryButton title="Volledig ruilen (op de beurs)" onPress={volledigRuilen} loading={busy} />
                                    <PrimaryButton title="Aanbieden aan collega" variant="outline" onPress={aanbiedenAanCollega} />
                                    {!splitOpen ? (
                                        <Pressable onPress={openSplit} style={styles.splitToggle}>
                                            <Ionicons name="cut-outline" size={15} color={colors.textMuted} />
                                            <Text style={styles.splitToggleText}>Deel van de dienst overdragen</Text>
                                        </Pressable>
                                    ) : (
                                        <View style={styles.splitBox}>
                                            <View style={styles.timeRow}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.infoLabel}>Vanaf</Text>
                                                    <Pressable style={styles.dateField} onPress={() => setShowStartPicker(true)}>
                                                        <Text style={styles.dateFieldText}>{formatTime(splitStart.toISOString())}</Text>
                                                    </Pressable>
                                                </View>
                                                <View style={{ width: 10 }} />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.infoLabel}>Tot</Text>
                                                    <Pressable style={styles.dateField} onPress={() => setShowEindPicker(true)}>
                                                        <Text style={styles.dateFieldText}>{formatTime(splitEind.toISOString())}</Text>
                                                    </Pressable>
                                                </View>
                                            </View>
                                            {showStartPicker ? (
                                                <DateTimePicker
                                                    value={splitStart}
                                                    mode="time"
                                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                                    onChange={(_, selected) => {
                                                        setShowStartPicker(Platform.OS === 'ios');
                                                        if (selected) setSplitStart(selected);
                                                    }}
                                                />
                                            ) : null}
                                            {showEindPicker ? (
                                                <DateTimePicker
                                                    value={splitEind}
                                                    mode="time"
                                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                                    onChange={(_, selected) => {
                                                        setShowEindPicker(Platform.OS === 'ios');
                                                        if (selected) setSplitEind(selected);
                                                    }}
                                                />
                                            ) : null}
                                            <PrimaryButton title="Zet deel op ruilbeurs" onPress={deelOverdragen} loading={busy} />
                                        </View>
                                    )}
                                </>
                            ) : (
                                <Text style={styles.disabledHint}>Geen opties beschikbaar voor deze dienststatus.</Text>
                            )}
                        </View>
                    ) : null}

                    <PrimaryButton title="Sluiten" variant="outline" onPress={close} />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 10, gap: 4 },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 12 },
    status: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
    naam: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
    datum: { fontSize: 16, fontWeight: '800', color: '#0f172a', textTransform: 'capitalize' },
    tijdChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginTop: 8,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    tijdChipText: { fontSize: 12, fontWeight: '700', color: '#334155' },
    infoGrid: { flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
    infoCell: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: colors.border },
    infoLabel: { fontSize: 9, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    infoValue: { fontSize: 12, fontWeight: '700', color: '#334155' },
    notitie: { fontSize: 12, color: colors.textMuted, marginTop: 10, fontStyle: 'italic' },
    disabledHint: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 8 },
    splitToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 10 },
    splitToggleText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
    splitBox: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, gap: 10, borderWidth: 1, borderColor: colors.border },
    timeRow: { flexDirection: 'row' },
    dateField: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#fff',
    },
    dateFieldText: { fontSize: 14, fontWeight: '700', color: colors.primary, textAlign: 'center' },
});
