import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { settingAan, useOrgSettings } from '../hooks/useOrgSettings';
import { ApiError } from '../lib/api';
import { formatDayLabel, formatTime, formatUren, isVerlofStatus, parseServerDate, statusLabel, toServerDateTime } from '../lib/format';
import { PlanningApi } from '../lib/services';
import { colors } from '../lib/theme';
import { Badge, DateField, InfoBanner, PrimaryButton, Sheet, TextField } from './ui';

type Props = {
    visible: boolean;
    shift: any | null;
    onClose: () => void;
    onChanged?: () => void;
    ownShift: boolean;
    medewerkerNaam?: string;
};

type Modus = 'acties' | 'splitsen' | 'ziek';

export function ShiftDetailsModal({ visible, shift, onClose, onChanged, ownShift, medewerkerNaam }: Props) {
    const settings = useOrgSettings();
    const [busy, setBusy] = useState(false);
    const [modus, setModus] = useState<Modus>('acties');
    const [splitStart, setSplitStart] = useState(new Date());
    const [splitEind, setSplitEind] = useState(new Date());
    const [reden, setReden] = useState('');

    useEffect(() => {
        if (visible) {
            setModus('acties');
            setReden('');
        }
    }, [visible, shift?.uuid]);

    if (!shift) return null;

    const status = String(shift.status || '').toLowerCase();
    const isVerlof = isVerlofStatus(status);
    const st = statusLabel(shift.status);
    const eind = parseServerDate(shift.eind_tijd);
    const isVerstreken = !!eind && eind < new Date();
    const magZiekmelden =
        ownShift &&
        settingAan(settings?.ziekmelden_toegestaan) &&
        !isVerstreken &&
        !['ziek', 'verlof', 'geannuleerd', 'verwijderd'].some((s) => status.includes(s));
    const kanRuilen = ownShift && !isVerstreken && (!status || status === 'ingepland' || status === 'bevestigd');

    function close() {
        setModus('acties');
        onClose();
    }

    async function uitvoeren(actie: () => Promise<unknown>, succes: string, fout: string) {
        setBusy(true);
        try {
            await actie();
            onChanged?.();
            close();
            if (succes) Alert.alert('Gelukt', succes);
        } catch (err) {
            Alert.alert('Mislukt', err instanceof ApiError ? err.message : fout);
        } finally {
            setBusy(false);
        }
    }

    function volledigRuilen() {
        Alert.alert('Dienst op de ruilbeurs zetten?', "Collega's kunnen deze dienst dan overnemen.", [
            { text: 'Annuleren', style: 'cancel' },
            {
                text: 'Zet op beurs',
                onPress: () =>
                    uitvoeren(() => PlanningApi.updateStatus(shift.uuid, 'te ruil'), 'Dienst staat nu op de ruilbeurs.', 'Plaatsen op de beurs is mislukt.'),
            },
        ]);
    }

    function haalVanBeurs() {
        Alert.alert('Dienst van de ruilbeurs halen?', 'Hij verdwijnt van de beurs en je staat weer ingepland om hem zelf te werken.', [
            { text: 'Annuleren', style: 'cancel' },
            {
                text: 'Haal van beurs',
                onPress: () => uitvoeren(() => PlanningApi.updateStatus(shift.uuid, 'ingepland'), '', 'Van de beurs halen is mislukt.'),
            },
        ]);
    }

    function openSplit() {
        setSplitStart(parseServerDate(shift.start_tijd) || new Date());
        setSplitEind(parseServerDate(shift.eind_tijd) || new Date());
        setModus('splitsen');
    }

    function metDatum(tijd: Date): Date {
        const basis = parseServerDate(shift.start_tijd) || new Date();
        const d = new Date(basis);
        d.setHours(tijd.getHours(), tijd.getMinutes(), 0, 0);
        return d;
    }

    function deelOverdragen() {
        const van = metDatum(splitStart);
        const tot = metDatum(splitEind);
        const s = parseServerDate(shift.start_tijd)!;
        const e = parseServerDate(shift.eind_tijd)!;
        if (tot <= van) return Alert.alert('Ongeldige tijden', 'De eindtijd moet na de starttijd liggen.');
        if (van < s || tot > e) return Alert.alert('Ongeldige tijden', 'Het deel moet binnen je dienst vallen.');
        if (van.getTime() === s.getTime() && tot.getTime() === e.getTime()) return volledigRuilen();
        uitvoeren(
            () => PlanningApi.flexSplitsen(shift.uuid, toServerDateTime(van), toServerDateTime(tot)),
            `Het deel van ${formatTime(toServerDateTime(van))} tot ${formatTime(toServerDateTime(tot))} staat op de ruilbeurs.`,
            'Splitsen is mislukt.'
        );
    }

    function ziekmelden() {
        uitvoeren(() => PlanningApi.ziekmelden(shift.uuid, reden.trim()), 'Je bent ziek gemeld voor deze dienst. Beterschap!', 'Ziekmelden is mislukt.');
    }

    function aanbiedenAanCollega() {
        close();
        router.push({ pathname: '/(app)/(tabs)/ruilbeurs', params: { aanbieden: shift.uuid } });
    }

    const titel = medewerkerNaam || formatDayLabel(shift.start_tijd);

    return (
        <Sheet
            visible={visible}
            onClose={close}
            title={titel.charAt(0).toUpperCase() + titel.slice(1)}
            subtitle={
                medewerkerNaam
                    ? `${formatDayLabel(shift.start_tijd)} · ${formatTime(shift.start_tijd)} – ${formatTime(shift.eind_tijd)}`
                    : `${formatTime(shift.start_tijd)} – ${formatTime(shift.eind_tijd)}`
            }
        >
            <View style={styles.badges}>
                <Badge label={isVerstreken && !isVerlof && status !== 'ziek' ? 'Gewerkt' : st.label} tone={isVerstreken && !isVerlof ? 'default' : st.tone} />
                {shift.uren || shift.totaal_uren ? <Badge label={`${formatUren(shift.uren ?? shift.totaal_uren)} uur`} tone="default" icon="stopwatch-outline" /> : null}
            </View>

            {!isVerlof ? (
                <View style={styles.infoGrid}>
                    <InfoCell icon="location-outline" label="Locatie" value={shift.locatie_naam || 'Geen locatie'} />
                    <InfoCell icon="layers-outline" label="Afdeling" value={shift.afdeling_naam || 'Algemeen'} />
                    <InfoCell icon="cafe-outline" label="Pauze" value={`${shift.pauze_minuten || 0} min`} />
                </View>
            ) : null}
            {shift.notitie ? <Text style={styles.notitie}>{shift.notitie}</Text> : null}

            {ownShift && modus === 'acties' ? (
                <View style={{ marginTop: 16, gap: 10 }}>
                    {status === 'te ruil' ? (
                        <PrimaryButton title="Van de beurs halen" icon="arrow-undo-outline" variant="secondary" onPress={haalVanBeurs} loading={busy} />
                    ) : null}
                    {status === 'wacht_op_planner' ? (
                        <InfoBanner tone="amber" icon="hourglass-outline" message="Deze dienst wacht op goedkeuring van de planner." />
                    ) : null}
                    {isVerlof ? (
                        <InfoBanner message="Dit is een verlof-item. Bekijk of wijzig het via het tabblad Verlof." />
                    ) : null}
                    {kanRuilen ? (
                        <>
                            <PrimaryButton title="Op de ruilbeurs zetten" icon="swap-horizontal" onPress={volledigRuilen} loading={busy} />
                            <PrimaryButton title="Aanbieden aan collega" icon="person-add-outline" variant="outline" onPress={aanbiedenAanCollega} />
                            <PrimaryButton title="Deel van de dienst ruilen" icon="cut-outline" variant="secondary" onPress={openSplit} />
                        </>
                    ) : null}
                    {magZiekmelden ? (
                        <PrimaryButton title="Ziek melden" icon="medkit-outline" variant="danger" onPress={() => setModus('ziek')} />
                    ) : null}
                </View>
            ) : null}

            {modus === 'splitsen' ? (
                <View style={styles.box}>
                    <Text style={styles.boxTitle}>Welk deel wil je ruilen?</Text>
                    <Text style={styles.boxText}>De rest van de dienst blijft gewoon van jou.</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                        <DateField label="Vanaf" mode="time" value={splitStart} onChange={setSplitStart} style={{ flex: 1 }} />
                        <DateField label="Tot" mode="time" value={splitEind} onChange={setSplitEind} style={{ flex: 1 }} />
                    </View>
                    <PrimaryButton title="Zet deel op ruilbeurs" onPress={deelOverdragen} loading={busy} />
                    <PrimaryButton title="Terug" variant="secondary" onPress={() => setModus('acties')} style={{ marginTop: 8 }} />
                </View>
            ) : null}

            {modus === 'ziek' ? (
                <View style={styles.box}>
                    <Text style={styles.boxTitle}>Ziek melden</Text>
                    <Text style={styles.boxText}>Deze dienst wordt gemarkeerd als ziek en je planner krijgt een melding.</Text>
                    <TextField
                        value={reden}
                        onChangeText={setReden}
                        placeholder="Toelichting (optioneel)..."
                        multiline
                        maxLength={255}
                        style={{ minHeight: 80, textAlignVertical: 'top', marginTop: 10 }}
                    />
                    <PrimaryButton title="Ja, ziek melden" variant="dangerSolid" onPress={ziekmelden} loading={busy} />
                    <PrimaryButton title="Annuleren" variant="secondary" onPress={() => setModus('acties')} style={{ marginTop: 8 }} />
                </View>
            ) : null}
        </Sheet>
    );
}

function InfoCell({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
    return (
        <View style={styles.infoCell}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <Ionicons name={icon} size={11} color={colors.subtle} />
                <Text style={styles.infoLabel}>{label}</Text>
            </View>
            <Text style={styles.infoValue} numberOfLines={1}>
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 14 },
    infoGrid: { flexDirection: 'row', gap: 8 },
    infoCell: { flex: 1, backgroundColor: colors.inputBg, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: colors.line },
    infoLabel: { fontSize: 9, fontWeight: '900', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
    infoValue: { fontSize: 13, fontWeight: '800', color: colors.ink },
    notitie: { fontSize: 13, color: colors.textMuted, marginTop: 12, fontStyle: 'italic' },
    box: { marginTop: 16, backgroundColor: colors.inputBg, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: colors.line },
    boxTitle: { fontSize: 15, fontWeight: '900', color: colors.ink },
    boxText: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
