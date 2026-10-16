import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatShortDate } from '../lib/format';
import { categorieIcoon, prioriteitTone, ticketStatusTone } from '../lib/support';
import { colors } from '../lib/theme';
import { Badge } from './ui';

export function TicketRow({ ticket: t, onPress, toonBedrijf }: { ticket: any; onPress: () => void; toonBedrijf?: boolean }) {
    return (
        <Pressable onPress={onPress} style={({ pressed }) => [styles.rij, pressed && { backgroundColor: colors.inputBg }]}>
            <View style={styles.badges}>
                <Badge label={t.status} tone={ticketStatusTone(t.status)} />
                <Badge label={t.prioriteit || 'Medium'} tone={prioriteitTone(t.prioriteit)} />
                <View style={styles.cat}>
                    <Ionicons name={categorieIcoon(t.categorie)} size={12} color={colors.subtle} />
                    <Text style={styles.catText}>{t.categorie || 'Algemeen'}</Text>
                </View>
            </View>
            <Text style={styles.onderwerp} numberOfLines={1}>
                {t.onderwerp}
            </Text>
            {t.omschrijving ? (
                <Text style={styles.omschrijving} numberOfLines={2}>
                    {t.omschrijving}
                </Text>
            ) : null}
            <Text style={styles.meta}>
                {[t.voornaam ? `${t.voornaam} ${t.achternaam || ''}`.trim() : null, toonBedrijf ? t.bedrijfsnaam : null, formatShortDate(t.datum_aangemaakt)]
                    .filter(Boolean)
                    .join(' · ')}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    rij: { padding: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', marginBottom: 10 },
    badges: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
    cat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    catText: { fontSize: 11, fontWeight: '700', color: colors.subtle },
    onderwerp: { fontSize: 15, fontWeight: '900', color: colors.ink, letterSpacing: -0.2 },
    omschrijving: { fontSize: 13, color: colors.textMuted, marginTop: 3, lineHeight: 18 },
    meta: { fontSize: 11, color: colors.subtle, fontWeight: '700', marginTop: 8 },
});
