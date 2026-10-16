import React from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, BadgeTone, Card, CardHeader, CenteredLoader, ErrorBanner, InfoBanner, PrimaryButton, ProgressBar, uiStyles } from '../../../src/components/ui';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { useRoleGuard } from '../../../src/hooks/useRoleGuard';
import { API_URL } from '../../../src/lib/config';
import { formatShortDate } from '../../../src/lib/format';
import { AbonnementApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
    beta: { label: 'Beta', tone: 'blue' },
    gratis: { label: 'Gratis', tone: 'emerald' },
    trial: { label: 'Proefperiode', tone: 'amber' },
    actief: { label: 'Actief', tone: 'emerald' },
    opgezegd: { label: 'Opgezegd', tone: 'rose' },
};

const BETAALSTATUS: Record<string, BadgeTone> = { paid: 'emerald', open: 'amber', pending: 'amber', failed: 'rose', canceled: 'rose', expired: 'rose' };

// Alleen inzien: starten/opzeggen gaat via de website (in-app-betaalregels van Apple/Google).
export default function AbonnementScreen() {
    useRoleGuard(['beheerder', 'eigenaar']);
    const { data: st, loading, refreshing, error, refresh } = useAsyncData(() => AbonnementApi.status(), []);

    if (loading) return <CenteredLoader />;

    const s = st ? STATUS[st.status || ''] || { label: st.status || 'Onbekend', tone: 'default' as BadgeTone } : null;
    const gebruikersPerc = st?.max_gebruikers ? (st.aantal_gebruikers || 0) / st.max_gebruikers : 0;

    return (
        <ScrollView contentContainerStyle={uiStyles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
            <ErrorBanner message={error} />
            {st ? (
                <>
                    {st.toegang === 'alleen_lezen' ? (
                        <InfoBanner tone="rose" icon="lock-closed" message={`Je team kan alleen nog inzien. Op ${formatShortDate(st.coulance_tot)} wordt de toegang geblokkeerd.`} />
                    ) : null}
                    {st.toegang === 'geblokkeerd' ? <InfoBanner tone="rose" icon="lock-closed" message="De toegang is geblokkeerd. Verleng het abonnement via de website." /> : null}
                    {!st.afgedwongen ? <InfoBanner message="De betaalmuur staat op dit moment uit: je organisatie heeft volledige toegang." /> : null}

                    <Card>
                        <CardHeader icon="card-outline" title="Je abonnement" right={s ? <Badge label={s.label} tone={s.tone} /> : null} />
                        <Row label="Geldig tot" value={st.geldig_tot ? formatShortDate(st.geldig_tot) : 'Onbeperkt'} />
                        {st.dagen_over != null ? <Row label="Dagen over" value={String(st.dagen_over)} /> : null}
                        {st.prijs_per_maand ? <Row label="Prijs" value={`€ ${Number(st.prijs_per_maand).toLocaleString('nl-NL', { minimumFractionDigits: 2 })} per maand`} /> : null}
                        <Row label="Automatische incasso" value={st.automatische_incasso ? 'Aan' : 'Uit'} />
                        <View style={{ marginTop: 14 }}>
                            <View style={uiStyles.rowBetween}>
                                <Text style={styles.label}>Gebruikers</Text>
                                <Text style={styles.value}>
                                    {st.aantal_gebruikers ?? 0}
                                    {st.max_gebruikers ? ` van ${st.max_gebruikers}` : ''}
                                </Text>
                            </View>
                            {st.max_gebruikers ? (
                                <View style={{ marginTop: 8 }}>
                                    <ProgressBar value={gebruikersPerc} color={gebruikersPerc >= 1 ? colors.danger : colors.primary} />
                                </View>
                            ) : null}
                        </View>
                    </Card>

                    {st.betaal_info ? (
                        <Card style={{ marginTop: 14 }}>
                            <CardHeader icon="information-circle-outline" tone="slate" title="Betaalinformatie" />
                            <Text style={uiStyles.body}>{st.betaal_info}</Text>
                        </Card>
                    ) : null}

                    {st.betalingen && st.betalingen.length > 0 ? (
                        <Card style={{ marginTop: 14 }}>
                            <CardHeader icon="receipt-outline" tone="emerald" title="Betalingen" />
                            {st.betalingen.map((b, i) => (
                                <View key={b.mollie_id || i} style={[styles.betaling, i > 0 && styles.betalingBorder]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.value}>{b.omschrijving}</Text>
                                        <Text style={uiStyles.muted}>{formatShortDate(b.betaald_op || b.aangemaakt_op)}</Text>
                                    </View>
                                    <Text style={styles.value}>€ {b.bedrag}</Text>
                                    <Badge label={b.status} tone={BETAALSTATUS[b.status] || 'default'} />
                                </View>
                            ))}
                        </Card>
                    ) : null}

                    <Card style={{ marginTop: 14 }}>
                        <Text style={uiStyles.body}>
                            Je abonnement starten, verlengen of opzeggen doe je via de website. Daar staan ook je facturen.
                        </Text>
                        <PrimaryButton
                            title="Beheer via de website"
                            icon="open-outline"
                            variant="dark"
                            style={{ marginTop: 14 }}
                            onPress={() => Linking.openURL(`${API_URL}/abonnement.html`)}
                        />
                    </Card>
                </>
            ) : null}
        </ScrollView>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <View style={[uiStyles.rowBetween, { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line }]}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    label: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
    value: { fontSize: 14, color: colors.ink, fontWeight: '800' },
    betaling: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
    betalingBorder: { borderTopWidth: 1, borderTopColor: colors.line },
});
