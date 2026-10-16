import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
    Avatar,
    Badge,
    Card,
    CenteredLoader,
    Chip,
    ChipRow,
    DateField,
    EmptyState,
    ErrorBanner,
    FieldLabel,
    PasswordField,
    PrimaryButton,
    SearchField,
    Segmented,
    Sheet,
    TextField,
} from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useRoleGuard } from '../../../src/hooks/useRoleGuard';
import { ApiError } from '../../../src/lib/api';
import { normaliseer, parseServerDate, toIsoDate } from '../../../src/lib/format';
import { schoonId } from '../../../src/lib/planning';
import { AuthApi, OrganisatieApi, PlanningApi } from '../../../src/lib/services';
import { colors, PLANNER_PLUS, roleLabels } from '../../../src/lib/theme';
import { parseInstellingen } from '../../../src/lib/verlof';

const WEEKDAGEN = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
const BEHEER_ROLLEN = ['eigenaar', 'beheerder', 'super_admin', 'planner'];

type Form = {
    voornaam: string;
    achternaam: string;
    email: string;
    wachtwoord: string;
    telefoon: string;
    rol: string;
    locatie: string;
    afdeling: string;
    contracturen: string;
    uurloon: string;
    personeelsnr: string;
    verlofsaldo: string;
    startdatum: Date | null;
    vaste: Record<string, string>;
};

const leegForm = (): Form => ({
    voornaam: '',
    achternaam: '',
    email: '',
    wachtwoord: '',
    telefoon: '',
    rol: 'medewerker',
    locatie: '',
    afdeling: '',
    contracturen: '',
    uurloon: '',
    personeelsnr: '',
    verlofsaldo: '',
    startdatum: null,
    vaste: {},
});

export default function MedewerkersScreen() {
    useRoleGuard(PLANNER_PLUS);
    const { user } = useAuth();
    const [staff, setStaff] = useState<any[] | null>(null);
    const [locaties, setLocaties] = useState<any[]>([]);
    const [afdelingen, setAfdelingen] = useState<any[]>([]);
    const [zoek, setZoek] = useState('');
    const [filter, setFilter] = useState<'all' | 'beheer'>('all');
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [dossier, setDossier] = useState<any | null>(null);
    const [volgende, setVolgende] = useState<string | null | undefined>(undefined);
    const [formModus, setFormModus] = useState<'nieuw' | 'bewerk' | null>(null);
    const [bewerkUuid, setBewerkUuid] = useState<string | null>(null);
    const [form, setForm] = useState<Form>(leegForm());
    const [bezig, setBezig] = useState(false);

    const laad = useCallback(
        async (isRefresh = false) => {
            if (!user) return;
            if (isRefresh) setRefreshing(true);
            try {
                const [s, l] = await Promise.all([PlanningApi.medewerkers(user.org_uuid) as Promise<any[]>, OrganisatieApi.locaties(user.org_uuid) as Promise<any[]>]);
                setStaff(s || []);
                setLocaties(l || []);
                setError('');
            } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Kon medewerkers niet laden.');
                setStaff((x) => x || []);
            } finally {
                setRefreshing(false);
            }
        },
        [user]
    );

    useEffect(() => {
        laad();
    }, [laad]);

    useEffect(() => {
        if (!form.locatie) return setAfdelingen([]);
        (OrganisatieApi.afdelingen(form.locatie) as Promise<any[]>).then((r) => setAfdelingen(r || [])).catch(() => setAfdelingen([]));
    }, [form.locatie]);

    const lijst = useMemo(() => {
        const t = normaliseer(zoek.trim());
        return (staff || []).filter((m) => {
            if (filter === 'beheer' && !BEHEER_ROLLEN.includes(String(m.rol).toLowerCase())) return false;
            return !t || normaliseer(`${m.voornaam} ${m.achternaam} ${m.email}`).includes(t);
        });
    }, [staff, zoek, filter]);

    function set<K extends keyof Form>(k: K, v: Form[K]) {
        setForm((f) => ({ ...f, [k]: v }));
    }

    async function openDossier(m: any) {
        setDossier(m);
        setVolgende(undefined);
        try {
            const items = (await PlanningApi.mijnRooster(m.uuid)) as any[];
            const next = (items || [])
                .filter((s) => (parseServerDate(s.start_tijd) || new Date(0)) > new Date())
                .sort((a, b) => (parseServerDate(a.start_tijd)?.getTime() || 0) - (parseServerDate(b.start_tijd)?.getTime() || 0))[0];
            setVolgende(next ? parseServerDate(next.start_tijd)!.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null);
        } catch {
            setVolgende(null);
        }
    }

    function openNieuw() {
        setForm(leegForm());
        setBewerkUuid(null);
        setFormModus('nieuw');
    }

    function openBewerk(m: any) {
        const inst = parseInstellingen(m.instellingen);
        const vaste: Record<string, string> = {};
        WEEKDAGEN.forEach((d) => (vaste[d] = inst.vaste_uren?.[d] ? String(inst.vaste_uren[d]) : ''));
        setForm({
            voornaam: m.voornaam || '',
            achternaam: m.achternaam || '',
            email: m.email || '',
            wachtwoord: '',
            telefoon: m.telefoon || '',
            rol: m.rol || 'medewerker',
            locatie: schoonId(m.locatie_uuid),
            afdeling: schoonId(m.afdeling_uuid),
            contracturen: inst.contracturen ? String(inst.contracturen) : '',
            uurloon: inst.uurloon ? String(inst.uurloon) : '',
            personeelsnr: inst.personeelsnr || '',
            verlofsaldo: inst.verlofsaldo ? String(inst.verlofsaldo) : '',
            startdatum: inst.startdatum ? new Date(`${inst.startdatum}T12:00:00`) : null,
            vaste,
        });
        setBewerkUuid(m.uuid);
        // iOS kan geen tweede Modal tonen terwijl de eerste nog sluit.
        if (dossier) {
            setDossier(null);
            setTimeout(() => setFormModus('bewerk'), 400);
        } else setFormModus('bewerk');
    }

    const num = (v: string) => parseFloat(v.replace(',', '.')) || 0;

    async function bewaar() {
        if (!form.voornaam.trim() || !form.achternaam.trim() || !form.email.trim()) return Alert.alert('Nog niet compleet', 'Voornaam, achternaam en e-mail zijn verplicht.');
        setBezig(true);
        try {
            if (formModus === 'nieuw') {
                if (form.wachtwoord.length < 8) {
                    Alert.alert('Wachtwoord', 'Kies een wachtwoord van minimaal 8 tekens.');
                    return;
                }
                await AuthApi.registerMedewerker({
                    voornaam: form.voornaam.trim(),
                    achternaam: form.achternaam.trim(),
                    email: form.email.trim().toLowerCase(),
                    wachtwoord: form.wachtwoord,
                    telefoon: form.telefoon.trim(),
                    locatie_uuid: form.locatie || null,
                    afdeling_uuid: form.afdeling || null,
                    org_uuid: user!.org_uuid,
                    rol: 'medewerker',
                    instellingen: { startdatum: form.startdatum ? toIsoDate(form.startdatum) : '' },
                });
                Alert.alert('Toegevoegd', `${form.voornaam} is toegevoegd aan het team.`);
            } else if (bewerkUuid) {
                const m = (staff || []).find((x) => x.uuid === bewerkUuid);
                const oud = parseInstellingen(m?.instellingen);
                Object.keys(oud).forEach((k) => !Number.isNaN(Number(k)) && delete oud[k]);
                const vaste: Record<string, number> = {};
                WEEKDAGEN.forEach((d) => (vaste[d] = num(form.vaste[d] || '')));
                await AuthApi.updateInstellingen({
                    uuid: schoonId(bewerkUuid),
                    voornaam: form.voornaam.trim(),
                    achternaam: form.achternaam.trim(),
                    email: form.email.trim().toLowerCase(),
                    rol: form.rol,
                    locatie_uuid: form.locatie || null,
                    afdeling_uuid: form.afdeling || null,
                    wachtwoord: form.wachtwoord || undefined,
                    instellingen: {
                        ...oud,
                        contracturen: num(form.contracturen),
                        uurloon: num(form.uurloon),
                        personeelsnr: form.personeelsnr.trim(),
                        verlofsaldo: num(form.verlofsaldo),
                        startdatum: form.startdatum ? toIsoDate(form.startdatum) : oud.startdatum || '',
                        vaste_uren: vaste,
                    },
                });
            }
            setFormModus(null);
            laad(true);
        } catch (err) {
            Alert.alert('Opslaan mislukt', err instanceof ApiError ? err.message : 'Probeer het opnieuw.');
        } finally {
            setBezig(false);
        }
    }

    function verwijder(m: any) {
        Alert.alert('Medewerker verwijderen?', `Weet je zeker dat je ${m.voornaam} ${m.achternaam} wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`, [
            { text: 'Annuleren', style: 'cancel' },
            {
                text: 'Verwijderen',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await AuthApi.deleteMedewerker(schoonId(m.uuid));
                        setDossier(null);
                        laad(true);
                    } catch (err) {
                        Alert.alert('Verwijderen mislukt', err instanceof ApiError ? err.message : 'Probeer het opnieuw.');
                    }
                },
            },
        ]);
    }

    if (staff === null) return <CenteredLoader />;

    const magEigenaar = user?.rol === 'eigenaar' || user?.rol === 'super_admin';
    const inst = dossier ? parseInstellingen(dossier.instellingen) : {};
    const zelf = (m: any) => schoonId(m?.uuid) === schoonId(user?.uuid);

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <Pressable onPress={openNieuw} hitSlop={8} style={styles.headerKnop}>
                            <Ionicons name="person-add-outline" size={18} color={colors.primary} />
                        </Pressable>
                    ),
                }}
            />
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => laad(true)} />} keyboardShouldPersistTaps="handled">
                <ErrorBanner message={error} />
                <View style={styles.teller}>
                    <Text style={styles.tellerGetal}>{staff.length}</Text>
                    <Text style={styles.tellerLabel}>{staff.length === 1 ? 'collega in je team' : "collega's in je team"}</Text>
                    <PrimaryButton small title="Toevoegen" icon="add" onPress={openNieuw} />
                </View>
                <SearchField value={zoek} onChangeText={setZoek} placeholder="Zoek op naam of e-mail..." style={{ marginBottom: 10 }} />
                <Segmented
                    value={filter}
                    onChange={setFilter}
                    options={[
                        { value: 'all', label: 'Iedereen' },
                        { value: 'beheer', label: 'Beheerders' },
                    ]}
                    style={{ marginBottom: 12 }}
                />
                <Card style={{ padding: 6 }}>
                    {lijst.length === 0 ? (
                        <EmptyState icon="people-outline" title="Geen medewerkers gevonden" />
                    ) : (
                        lijst.map((m, i) => (
                            <Pressable key={m.uuid} onPress={() => openDossier(m)} style={({ pressed }) => [styles.rij, i > 0 && styles.border, pressed && { backgroundColor: colors.inputBg }]}>
                                <Avatar naam={`${m.voornaam} ${m.achternaam}`} size={42} />
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={styles.naam} numberOfLines={1}>
                                            {m.voornaam} {m.achternaam}
                                        </Text>
                                        {BEHEER_ROLLEN.includes(String(m.rol)) ? <Badge label={roleLabels[m.rol] || m.rol} tone="purple" /> : null}
                                    </View>
                                    <Text style={styles.sub} numberOfLines={1}>
                                        {m.email}
                                    </Text>
                                    {m.locatie_naam || m.afdeling_naam ? (
                                        <Text style={styles.meta} numberOfLines={1}>
                                            {[m.locatie_naam, m.afdeling_naam].filter(Boolean).join(' · ')}
                                        </Text>
                                    ) : null}
                                </View>
                                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                            </Pressable>
                        ))
                    )}
                </Card>
            </ScrollView>

            {/* Dossier */}
            <Sheet
                visible={!!dossier}
                onClose={() => setDossier(null)}
                title={dossier ? `${dossier.voornaam} ${dossier.achternaam}` : ''}
                subtitle={dossier ? roleLabels[dossier.rol] || dossier.rol : ''}
                footer={
                    dossier ? (
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            {!zelf(dossier) ? <PrimaryButton title="Verwijder" variant="danger" icon="trash-outline" onPress={() => verwijder(dossier)} style={{ flex: 1 }} /> : null}
                            <PrimaryButton title="Bewerken" icon="create-outline" onPress={() => openBewerk(dossier)} style={{ flex: 2 }} />
                        </View>
                    ) : undefined
                }
            >
                {dossier ? (
                    <View style={{ gap: 12 }}>
                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                            {volgende === undefined ? <Badge label="Laden..." /> : volgende ? <Badge label={`Volgende: ${volgende}`} tone="emerald" icon="calendar" /> : <Badge label="Geen diensten gepland" />}
                        </View>
                        <Pressable onPress={() => Linking.openURL(`mailto:${dossier.email}`)} style={styles.contact}>
                            <Ionicons name="mail-outline" size={16} color={colors.primary} />
                            <Text style={styles.contactTekst}>{dossier.email}</Text>
                        </Pressable>
                        {dossier.telefoon ? (
                            <Pressable onPress={() => Linking.openURL(`tel:${dossier.telefoon}`)} style={styles.contact}>
                                <Ionicons name="call-outline" size={16} color={colors.primary} />
                                <Text style={styles.contactTekst}>{dossier.telefoon}</Text>
                            </Pressable>
                        ) : null}
                        <View style={styles.statGrid}>
                            {[
                                ['Contract', `${inst.contracturen || 0} u/wk`],
                                ['Verlofsaldo', `${inst.verlofsaldo || 0} u`],
                                ['Uurloon', inst.uurloon ? `€ ${parseFloat(inst.uurloon).toFixed(2).replace('.', ',')}` : '-'],
                                ['In dienst', inst.startdatum ? new Date(`${inst.startdatum}T12:00:00`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'],
                                ['Personeelsnr', inst.personeelsnr || '-'],
                                ['Locatie', dossier.locatie_naam || 'Geen'],
                                ['Afdeling', dossier.afdeling_naam || 'Geen'],
                            ].map(([l, w]) => (
                                <View key={l} style={styles.stat}>
                                    <Text style={styles.statLabel}>{l}</Text>
                                    <Text style={styles.statWaarde} numberOfLines={1}>
                                        {w}
                                    </Text>
                                </View>
                            ))}
                        </View>
                        <FieldLabel>Vaste uren per week</FieldLabel>
                        <View style={styles.weekGrid}>
                            {WEEKDAGEN.map((d) => {
                                const u = parseFloat(inst.vaste_uren?.[d]) || 0;
                                return (
                                    <View key={d} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                                        <Text style={styles.statLabel}>{d}</Text>
                                        <View style={[styles.dagVak, u > 0 && styles.dagVakAan]}>
                                            <Text style={[styles.dagVakTekst, u > 0 && { color: colors.primaryDark }]}>{u > 0 ? `${u}u` : '-'}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                ) : null}
            </Sheet>

            {/* Toevoegen / bewerken */}
            <Sheet
                visible={!!formModus}
                onClose={() => setFormModus(null)}
                title={formModus === 'nieuw' ? 'Nieuwe collega' : 'Medewerker bewerken'}
                footer={<PrimaryButton title={formModus === 'nieuw' ? 'Toevoegen' : 'Opslaan'} icon="checkmark" onPress={bewaar} loading={bezig} />}
            >
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                        <TextField label="Voornaam" value={form.voornaam} onChangeText={(v) => set('voornaam', v)} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <TextField label="Achternaam" value={form.achternaam} onChangeText={(v) => set('achternaam', v)} />
                    </View>
                </View>
                <TextField label="E-mailadres" value={form.email} onChangeText={(v) => set('email', v)} autoCapitalize="none" keyboardType="email-address" />
                {formModus === 'nieuw' ? <TextField label="Telefoon" value={form.telefoon} onChangeText={(v) => set('telefoon', v)} keyboardType="phone-pad" /> : null}
                <PasswordField
                    label={formModus === 'nieuw' ? 'Wachtwoord' : 'Nieuw wachtwoord (optioneel)'}
                    value={form.wachtwoord}
                    onChangeText={(v) => set('wachtwoord', v)}
                    hint={formModus === 'nieuw' ? 'Minimaal 8 tekens. Deel het veilig met je collega.' : 'Laat leeg om het huidige wachtwoord te houden.'}
                />

                {formModus === 'bewerk' && !zelf({ uuid: bewerkUuid }) ? (
                    <>
                        <FieldLabel>Rol</FieldLabel>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                            {['medewerker', 'planner', 'beheerder', 'eigenaar']
                                .filter((r) => r !== 'eigenaar' || magEigenaar || form.rol === 'eigenaar')
                                .map((r) => (
                                    <Chip key={r} label={roleLabels[r]} active={form.rol === r} onPress={() => set('rol', r)} />
                                ))}
                        </View>
                    </>
                ) : null}

                <FieldLabel>Locatie</FieldLabel>
                <ChipRow style={{ marginBottom: 14 }}>
                    <Chip label="Geen" active={!form.locatie} onPress={() => setForm((f) => ({ ...f, locatie: '', afdeling: '' }))} />
                    {locaties.map((l) => (
                        <Chip key={l.uuid} label={l.naam} active={schoonId(l.uuid) === form.locatie} onPress={() => setForm((f) => ({ ...f, locatie: schoonId(l.uuid), afdeling: '' }))} />
                    ))}
                </ChipRow>
                {form.locatie ? (
                    <>
                        <FieldLabel>Afdeling</FieldLabel>
                        <ChipRow style={{ marginBottom: 14 }}>
                            <Chip label="Geen" active={!form.afdeling} onPress={() => set('afdeling', '')} />
                            {afdelingen.map((a) => (
                                <Chip key={a.uuid} label={a.naam} active={schoonId(a.uuid) === form.afdeling} onPress={() => set('afdeling', schoonId(a.uuid))} />
                            ))}
                        </ChipRow>
                    </>
                ) : null}

                {form.startdatum ? (
                    <DateField label="Startdatum" value={form.startdatum} onChange={(d) => set('startdatum', d)} />
                ) : (
                    <PrimaryButton small variant="secondary" title="Startdatum instellen" icon="calendar-outline" onPress={() => set('startdatum', new Date())} style={{ marginBottom: 14, alignSelf: 'flex-start' }} />
                )}

                {formModus === 'bewerk' ? (
                    <>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                                <TextField label="Contracturen" value={form.contracturen} onChangeText={(v) => set('contracturen', v)} keyboardType="decimal-pad" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <TextField label="Verlofsaldo" value={form.verlofsaldo} onChangeText={(v) => set('verlofsaldo', v)} keyboardType="decimal-pad" />
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                                <TextField label="Uurloon (€)" value={form.uurloon} onChangeText={(v) => set('uurloon', v)} keyboardType="decimal-pad" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <TextField label="Personeelsnr" value={form.personeelsnr} onChangeText={(v) => set('personeelsnr', v)} />
                            </View>
                        </View>
                        <FieldLabel>Vaste uren per dag</FieldLabel>
                        <View style={styles.weekGrid}>
                            {WEEKDAGEN.map((d) => (
                                <View key={d} style={{ flex: 1 }}>
                                    <TextField
                                        label={d}
                                        value={form.vaste[d] || ''}
                                        onChangeText={(v) => setForm((f) => ({ ...f, vaste: { ...f.vaste, [d]: v } }))}
                                        keyboardType="decimal-pad"
                                        style={{ paddingHorizontal: 4, textAlign: 'center' }}
                                    />
                                </View>
                            ))}
                        </View>
                    </>
                ) : null}
            </Sheet>
        </View>
    );
}

const styles = StyleSheet.create({
    headerKnop: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    teller: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    tellerGetal: { fontSize: 28, fontWeight: '900', color: colors.ink, letterSpacing: -1 },
    tellerLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.textMuted },
    rij: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 16 },
    border: { borderTopWidth: 1, borderTopColor: colors.line },
    naam: { fontSize: 15, fontWeight: '900', color: colors.ink, flexShrink: 1 },
    sub: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 1 },
    meta: { fontSize: 11, fontWeight: '700', color: colors.subtle, marginTop: 2 },
    contact: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.primarySoft, borderRadius: 14, padding: 12 },
    contactTekst: { fontSize: 14, fontWeight: '800', color: colors.primaryDark },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    stat: { flexBasis: '31%', flexGrow: 1, backgroundColor: colors.inputBg, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: colors.line },
    statLabel: { fontSize: 9, fontWeight: '900', color: colors.subtle, textTransform: 'uppercase', letterSpacing: 1 },
    statWaarde: { fontSize: 14, fontWeight: '900', color: colors.ink, marginTop: 3 },
    weekGrid: { flexDirection: 'row', gap: 5 },
    dagVak: { alignSelf: 'stretch', paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.line },
    dagVakAan: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
    dagVakTekst: { fontSize: 12, fontWeight: '900', color: '#cbd5e1' },
});
