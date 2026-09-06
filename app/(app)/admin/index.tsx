import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '../../../src/components/ui';
import { useRoleGuard } from '../../../src/hooks/useRoleGuard';
import { colors } from '../../../src/lib/theme';

const ITEMS: { icon: keyof typeof Ionicons.glyphMap; label: string; desc: string; href: any }[] = [
    { icon: 'business-outline', label: 'Organisaties', desc: 'Alle organisaties op het platform', href: '/(app)/admin/organisaties' },
    { icon: 'help-buoy-outline', label: 'Alle tickets', desc: 'Support-tickets van alle organisaties', href: '/(app)/admin/tickets' },
];

export default function AdminIndexScreen() {
    useRoleGuard(['super_admin']);
    return (
        <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: '#f8fafc' }}>
            {ITEMS.map((item) => (
                <Pressable key={item.href} onPress={() => router.push(item.href)}>
                    <Card style={styles.row}>
                        <View style={styles.iconWrap}>
                            <Ionicons name={item.icon} size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>{item.label}</Text>
                            <Text style={styles.desc}>{item.desc}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                    </Card>
                </Pressable>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
    desc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
