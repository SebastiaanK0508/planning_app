import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Card, CenteredLoader, ErrorBanner, PrimaryButton, TextField } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { ApiError } from '../../../src/lib/api';
import { OrganisatieApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

export default function InstellingenScreen() {
    const { user } = useAuth();
    const { data, loading, error, reload, setData } = useAsyncData(() => OrganisatieApi.settings(user!.org_uuid) as Promise<any>, [user?.org_uuid]);
    const [saving, setSaving] = useState<string | null>(null);
    const [saveError, setSaveError] = useState('');

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

    return (
        <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: '#f8fafc' }}>
            <ErrorBanner message={error || saveError} />

            <Card style={{ marginBottom: 16 }}>
                <Text style={styles.cardTitle}>Organisatie</Text>
                <TextField label="Naam" defaultValue={data.naam} onSubmitEditing={(e) => saveKey('naam', e.nativeEvent.text)} />
                <TextField label="BTW-nummer" defaultValue={data.btw_nummer || ''} onSubmitEditing={(e) => saveKey('btw_nummer', e.nativeEvent.text)} />
            </Card>

            <Card>
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
});
