import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { LayoutAnimation, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, CardHeader, EmptyState, HeroCard, PrimaryButton, SearchField } from '../../src/components/ui';
import { KbBlok, KENNISBANK } from '../../src/data/kennisbank';
import { normaliseer } from '../../src/lib/format';
import { colors } from '../../src/lib/theme';

/** Rendert **vet** binnen een tekstblok. */
function RijkeTekst({ tekst, style }: { tekst: string; style: any }) {
    const delen = tekst.split(/\*\*(.+?)\*\*/g);
    return (
        <Text style={style}>
            {delen.map((d, i) =>
                i % 2 === 1 ? (
                    <Text key={i} style={{ fontWeight: '800', color: colors.ink }}>
                        {d}
                    </Text>
                ) : (
                    d
                )
            )}
        </Text>
    );
}

function Blok({ blok }: { blok: KbBlok }) {
    if (blok.t === 'li') {
        return (
            <View style={styles.li}>
                <View style={styles.bullet} />
                <RijkeTekst tekst={blok.x} style={[styles.tekst, { flex: 1 }]} />
            </View>
        );
    }
    return <RijkeTekst tekst={blok.x} style={[styles.tekst, { marginBottom: 8 }]} />;
}

export default function KennisbankScreen() {
    const [zoek, setZoek] = useState('');
    const [open, setOpen] = useState<string | null>(null);

    const secties = useMemo(() => {
        const t = normaliseer(zoek.trim());
        if (!t) return KENNISBANK;
        return KENNISBANK.map((s) => ({
            ...s,
            artikelen: s.artikelen.filter((a) => normaliseer(a.vraag).includes(t) || a.blokken.some((b) => normaliseer(b.x).includes(t))),
        })).filter((s) => s.artikelen.length > 0);
    }, [zoek]);

    function toggle(key: string) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpen((o) => (o === key ? null : key));
    }

    return (
        <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <HeroCard style={{ alignItems: 'center', paddingVertical: 26 }}>
                <Text style={styles.heroTitel}>Waar kunnen we je mee helpen?</Text>
                <Text style={styles.heroSub}>Zoek in de veelgestelde vragen</Text>
                <SearchField value={zoek} onChangeText={setZoek} placeholder="Bijv. verlof, ruilen, wachtwoord..." style={{ alignSelf: 'stretch', marginTop: 14 }} />
            </HeroCard>

            {secties.length === 0 ? (
                <Card style={{ marginTop: 14 }}>
                    <EmptyState icon="search" title="Niets gevonden" subtitle="Probeer een ander woord, of stel je vraag via een support-ticket." />
                </Card>
            ) : (
                secties.map((s) => (
                    <Card key={s.id} style={{ marginTop: 14 }}>
                        <CardHeader icon={s.icoon as any} title={s.titel} subtitle={`${s.artikelen.length} ${s.artikelen.length === 1 ? 'artikel' : 'artikelen'}`} />
                        {s.artikelen.map((a, i) => {
                            const key = `${s.id}-${a.vraag}`;
                            const isOpen = open === key || !!zoek.trim();
                            return (
                                <View key={key} style={[styles.artikel, i > 0 && styles.artikelBorder]}>
                                    <Pressable onPress={() => toggle(key)} style={styles.vraagRij}>
                                        <Text style={styles.vraag}>{a.vraag}</Text>
                                        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.subtle} />
                                    </Pressable>
                                    {isOpen ? (
                                        <View style={{ paddingTop: 8 }}>
                                            {a.blokken.map((b, j) => (
                                                <Blok key={j} blok={b} />
                                            ))}
                                        </View>
                                    ) : null}
                                </View>
                            );
                        })}
                    </Card>
                ))
            )}

            <Card style={{ marginTop: 14, alignItems: 'center' }}>
                <Text style={styles.nietGevonden}>Staat je vraag er niet tussen?</Text>
                <PrimaryButton title="Maak een support-ticket" icon="headset-outline" variant="dark" onPress={() => router.push('/(app)/support/nieuw')} style={{ alignSelf: 'stretch', marginTop: 12 }} />
            </Card>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    heroTitel: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: -0.6 },
    heroSub: { fontSize: 13, color: '#94a3b8', fontWeight: '600', marginTop: 4 },
    artikel: { paddingVertical: 12 },
    artikelBorder: { borderTopWidth: 1, borderTopColor: colors.line },
    vraagRij: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    vraag: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.ink, lineHeight: 20 },
    tekst: { fontSize: 14, color: colors.text, lineHeight: 21 },
    li: { flexDirection: 'row', gap: 10, marginBottom: 6, paddingLeft: 4 },
    bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 8 },
    nietGevonden: { fontSize: 15, fontWeight: '900', color: colors.ink },
});
