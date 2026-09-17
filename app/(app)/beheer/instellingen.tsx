import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Card, CenteredLoader, ErrorBanner, PrimaryButton, TextField } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { ApiError } from '../../../src/lib/api';
import { toIsoDate } from '../../../src/lib/format';
import { OrganisatieApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

const DAGEN = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
const STANDAARD_DAG = { open: '08:00', sluit: '18:00', gesloten: false };

function timeToDate(hhmm: string): Date {
    const [h, m] = (hhmm || '08:00').split(':').map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
}

function dateToTime(d: Date): string {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function InstellingenScreen() {
    const { user } = useAuth();
    const { data, loading, error, setData } = useAsyncData(() => OrganisatieApi.settings(user!.org_uuid) as Promise<any>, [user?.org_uuid]);
    const [saving, setSaving] = useState<string | null>(null);
    const [saveError, setSaveError] = useState('');
    const [picker, setPicker] = useState<{ dag: string; veld: 'open' | 'sluit' } | null>(null);
    const [nieuweDatum, setNieuweDatum] = useState(new Date());
    const [nieuweNaam, setNieuweNaam] = useState('');
    const [showNieuweDatumPicker, setShowNieuweDatumPicker] = useState(false);

    async function saveKey(key: string, value: unknown) {
        setSaveError('');
        setSaving(key);
        try {
            await OrganisatieApi.updateSetting(user!.org_uuid, key, value);
            setData((prev: any) => ({ ...prev, [key]: value }));
        } catch (err) {
            setSaveError(err instanceof ApiError ? err.message : 'Opslaan mislukt.');
        } finally {
            setSaving(null);
        }
    }

    if (loading || !data) return <CenteredLoader />;

    const openingstijden = data.openingstijden || {};
    const feestdagen: any[] = Array.isArray(data.feestdagen) ? data.feestdagen : [];

    async function updateTijd(dag: string, veld: 'open' | 'sluit', waarde: string) {
        const t = { ...openingstijden };
        const huidig = t[dag] || STANDAARD_DAG;
        t[dag] = { ...huidig, [veld]: waarde };
        await saveKey('openingstijden', t);
    }

    async function toggleDag(dag: string) {
        const t = { ...openingstijden };
        const huidig = t[dag] || STANDAARD_DAG;
        t[dag] = { ...huidig, gesloten: !huidig.gesloten };
        await saveKey('openingstijden', t);
    }

    async function addFeestdag() {
        if (!nieuweNaam.trim()) {
            setSaveError('Vul een naam in voor de feestdag.');
            return;
        }
        const lijst = [...feestdagen, { datum: toIsoDate(nieuweDatum), naam: nieuweNaam.trim() }].sort(
            (a: any, b: any) => new Date(a.datum).getTime() - new Date(b.datum).getTime()
        );
        await saveKey('feestdagen', lijst);
        setNieuweNaam('');
    }

    async function removeFeestdag(index: number) {
        const lijst = feestdagen.filter((_, i) => i !== index);
        await saveKey('feestdagen', lijst);
    }

    return (
        <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: '#f8fafc' }}>
            <ErrorBanner message={error || saveError} />

            <Card style={{ marginBottom: 16 }}>
                <Text style={styles.cardTitle}>Bedrijfsgegevens</Text>
                <TextField label="Naam" defaultValue={data.naam} onSubmitEditing={(e) => saveKey('naam', e.nativeEvent.text)} />
                <TextField
                    label="KVK-nummer"
                    defaultValue={data.kvk_nummer || ''}
                    onSubmitEditing={(e) => saveKey('kvk_nummer', e.nativeEvent.text)}
                />
                <TextField
                    label="Telefoon"
                    keyboardType="phone-pad"
                    defaultValue={data.telefoon || ''}
                    onSubmitEditing={(e) => saveKey('telefoon', e.nativeEvent.text)}
                />
                <TextField
                    label="Website"
                    autoCapitalize="none"
                    keyboardType="url"
                    defaultValue={data.website || ''}
                    onSubmitEditing={(e) => saveKey('website', e.nativeEvent.text)}
                />
                <TextField label="Adres" defaultValue={data.adres || ''} onSubmitEditing={(e) => saveKey('adres', e.nativeEvent.text)} />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                        <TextField
                            label="Postcode"
                            autoCapitalize="characters"
                            defaultValue={data.postcode || ''}
                            onSubmitEditing={(e) => saveKey('postcode', e.nativeEvent.text)}
                        />
                    </View>
                    <View style={{ flex: 2 }}>
                        <TextField
                            label="Plaats"
                            defaultValue={data.plaats || ''}
                            onSubmitEditing={(e) => saveKey('plaats', e.nativeEvent.text)}
                        />
                    </View>
                </View>
            </Card>

            <Card style={{ marginBottom: 16 }}>
                <Text style={styles.cardTitle}>Financieel & administratie</Text>
                <TextField
                    label="BTW-nummer"
                    autoCapitalize="characters"
                    defaultValue={data.btw_nummer || ''}
                    onSubmitEditing={(e) => saveKey('btw_nummer', e.nativeEvent.text)}
                />
                <TextField
                    label="IBAN"
                    autoCapitalize="characters"
                    defaultValue={data.iban_nummer || ''}
                    onSubmitEditing={(e) => saveKey('iban_nummer', e.nativeEvent.text)}
                />
                <TextField
                    label="Factuur e-mailadres"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    defaultValue={data.factuur_email || ''}
                    onSubmitEditing={(e) => saveKey('factuur_email', e.nativeEvent.text)}
                />
            </Card>

            <Card style={{ marginBottom: 16 }}>
                <Text style={styles.cardTitle}>Voorkeuren</Text>
                <SettingSwitch
                    label="Ruilen moet door planner goedgekeurd worden"
                    value={!!Number(data.ruilen_goedkeuren)}
                    onChange={(v) => saveKey('ruilen_goedkeuren', v ? 1 : 0)}
                    disabled={saving === 'ruilen_goedkeuren'}
                />
                <SettingSwitch
                    label="Ziekmelden toegestaan"
                    value={!!Number(data.ziekmelden_toegestaan)}
                    onChange={(v) => saveKey('ziekmelden_toegestaan', v ? 1 : 0)}
                    disabled={saving === 'ziekmelden_toegestaan'}
                />
                <SettingSwitch
                    label="Rooster zichtbaar voor medewerkers"
                    value={!!Number(data.rooster_zichtbaar)}
                    onChange={(v) => saveKey('rooster_zichtbaar', v ? 1 : 0)}
                    disabled={saving === 'rooster_zichtbaar'}
                />
                <SettingSwitch
                    label="E-mailmeldingen"
                    value={!!Number(data.email_notif_enabled)}
                    onChange={(v) => saveKey('email_notif_enabled', v ? 1 : 0)}
                    disabled={saving === 'email_notif_enabled'}
                />
                <SettingSwitch
                    label="Pushmeldingen"
                    value={!!Number(data.push_enabled)}
                    onChange={(v) => saveKey('push_enabled', v ? 1 : 0)}
                    disabled={saving === 'push_enabled'}
                />
            </Card>

            <Card style={{ marginBottom: 16 }}>
                <Text style={styles.cardTitle}>Standaard openingstijden</Text>
                {DAGEN.map((dag) => {
                    const dagData = openingstijden[dag] || STANDAARD_DAG;
                    return (
                        <View key={dag} style={[styles.dagRow, dagData.gesloten && styles.dagRowGesloten]}>
                            <Text style={styles.dagLabel}>{dag}</Text>
                            <View style={[styles.tijdGroep, dagData.gesloten && { opacity: 0.4 }]}>
                                <Pressable
                                    style={styles.tijdVeld}
                                    disabled={dagData.gesloten}
                                    onPress={() => setPicker({ dag, veld: 'open' })}
                                >
                                    <Text style={styles.tijdVeldText}>{dagData.open}</Text>
                                </Pressable>
                                <Text style={styles.tijdKoppel}>-</Text>
                                <Pressable
                                    style={styles.tijdVeld}
                                    disabled={dagData.gesloten}
                                    onPress={() => setPicker({ dag, veld: 'sluit' })}
                                >
                                    <Text style={styles.tijdVeldText}>{dagData.sluit}</Text>
                                </Pressable>
                            </View>
                            <Pressable
                                onPress={() => toggleDag(dag)}
                                style={[styles.statusBadge, dagData.gesloten ? styles.statusBadgeGesloten : styles.statusBadgeOpen]}
                            >
                                <Text style={[styles.statusBadgeText, { color: dagData.gesloten ? colors.danger : colors.success }]}>
                                    {dagData.gesloten ? 'Gesloten' : 'Geopend'}
                                </Text>
                            </Pressable>
                        </View>
                    );
                })}
                {picker ? (
                    <DateTimePicker
                        value={timeToDate((openingstijden[picker.dag] || STANDAARD_DAG)[picker.veld])}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_, selected) => {
                            const huidigePicker = picker;
                            setPicker(Platform.OS === 'ios' ? picker : null);
                            if (selected && huidigePicker) updateTijd(huidigePicker.dag, huidigePicker.veld, dateToTime(selected));
                        }}
                    />
                ) : null}
                {picker && Platform.OS === 'ios' ? (
                    <PrimaryButton title="Klaar" variant="outline" onPress={() => setPicker(null)} style={{ marginTop: 8 }} />
                ) : null}
            </Card>

            <Card>
                <Text style={styles.cardTitle}>Feest- & sluitingsdagen</Text>
                <View style={styles.feestdagForm}>
                    <Pressable style={styles.dateField} onPress={() => setShowNieuweDatumPicker(true)}>
                        <Ionicons name="calendar-outline" size={15} color={colors.primary} />
                        <Text style={styles.dateFieldText}>{toIsoDate(nieuweDatum)}</Text>
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <TextField placeholder="Naam van de feestdag" value={nieuweNaam} onChangeText={setNieuweNaam} />
                    </View>
                </View>
                {showNieuweDatumPicker ? (
                    <DateTimePicker
                        value={nieuweDatum}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                        onChange={(_, selected) => {
                            setShowNieuweDatumPicker(Platform.OS === 'ios');
                            if (selected) setNieuweDatum(selected);
                        }}
                    />
                ) : null}
                <PrimaryButton
                    title="Feestdag toevoegen"
                    icon="add"
                    onPress={addFeestdag}
                    loading={saving === 'feestdagen'}
                    style={{ marginTop: 4, marginBottom: feestdagen.length ? 16 : 0 }}
                />
                {feestdagen.map((f, i) => (
                    <View key={`${f.datum}-${i}`} style={styles.feestdagRij}>
                        <View style={styles.feestdagDatum}>
                            <Text style={styles.feestdagDatumText}>
                                {new Date(f.datum).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </Text>
                        </View>
                        <Text style={styles.feestdagNaam} numberOfLines={1}>
                            {f.naam}
                        </Text>
                        <Pressable onPress={() => removeFeestdag(i)} style={styles.feestdagVerwijder}>
                            <Ionicons name="trash-outline" size={17} color={colors.danger} />
                        </Pressable>
                    </View>
                ))}
            </Card>
        </ScrollView>
    );
}

function SettingSwitch({
    label,
    value,
    onChange,
    disabled,
}: {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{label}</Text>
            <Switch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: colors.primary }} />
        </View>
    );
}

const styles = StyleSheet.create({
    cardTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
    switchLabel: { fontSize: 14, color: '#334155', flex: 1, marginRight: 12 },
    dagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    dagRowGesloten: { opacity: 0.85 },
    dagLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a', width: 84 },
    tijdGroep: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' },
    tijdVeld: { backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6 },
    tijdVeldText: { fontSize: 13, fontWeight: '700', color: colors.primary },
    tijdKoppel: { color: colors.textMuted, fontWeight: '700' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    statusBadgeOpen: { backgroundColor: colors.successSoft },
    statusBadgeGesloten: { backgroundColor: colors.dangerSoft },
    statusBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
    feestdagForm: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    dateField: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 46,
        backgroundColor: '#f8fafc',
    },
    dateFieldText: { fontSize: 13, fontWeight: '700', color: colors.primary },
    feestdagRij: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    feestdagDatum: { backgroundColor: colors.primarySoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    feestdagDatumText: { fontSize: 11, fontWeight: '700', color: colors.primary },
    feestdagNaam: { flex: 1, fontSize: 13, fontWeight: '700', color: '#0f172a' },
    feestdagVerwijder: { padding: 6 },
});
