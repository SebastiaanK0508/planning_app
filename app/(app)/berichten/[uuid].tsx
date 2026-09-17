import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, CenteredLoader } from '../../../src/components/ui';
import { formatDateTime } from '../../../src/lib/format';
import { BerichtenApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

export default function BerichtDetailScreen() {
    const { data } = useLocalSearchParams<{ uuid: string; data?: string }>();
    const bericht = useMemo(() => {
        try {
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    }, [data]);

    const gemarkeerd = useRef(false);
    useEffect(() => {
        if (!bericht || bericht.is_gelezen_door_mij || gemarkeerd.current) return;
        gemarkeerd.current = true;
        BerichtenApi.markeerGelezen(bericht.uuid).catch(() => {});
    }, [bericht]);

    if (!bericht) return <CenteredLoader />;

    return (
        <ScrollView contentContainerStyle={styles.wrap}>
            {bericht.belangrijk ? <Badge label="Belangrijk" tone="warning" /> : null}
            <Text style={styles.titel}>{bericht.titel}</Text>
            <View style={styles.metaRow}>
                <Text style={styles.afzender}>{bericht.zender_naam || 'Systeem'}</Text>
                <Text style={styles.datum}>{formatDateTime(bericht.datum_geplaatst)}</Text>
            </View>
            <Text style={styles.inhoud}>{bericht.bericht}</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    wrap: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
    titel: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginTop: 8 },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    afzender: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
    datum: { fontSize: 12, color: colors.textMuted },
    inhoud: { fontSize: 15, color: '#334155', marginTop: 16, lineHeight: 22 },
});
