import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';

// Donker merkpaneel + wit formulier, zoals de split-screen auth-pagina's op het web.
export function AuthShell({ eyebrow, title, subtitle, children, footer }: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    const insets = useSafeAreaInsets();
    return (
        <View style={{ flex: 1, backgroundColor: colors.ink }}>
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
                    <View style={[styles.panel, { paddingTop: insets.top + 36 }]}>
                        <View style={styles.glowBlue} />
                        <View style={styles.glowPurple} />
                        <Text style={styles.woordmerk}>
                            WEBPLANNING<Text style={{ color: '#60a5fa' }}>.NL</Text>
                        </Text>
                        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
                        <Text style={styles.title}>{title}</Text>
                        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                    </View>
                    <View style={[styles.card, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
                        {children}
                        {footer ? <View style={styles.footer}>{footer}</View> : null}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    panel: { paddingHorizontal: 24, paddingBottom: 36, overflow: 'hidden' },
    glowBlue: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: colors.primary, opacity: 0.35, top: -120, right: -90 },
    glowPurple: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: colors.purple, opacity: 0.25, bottom: -110, left: -70 },
    woordmerk: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 1.2, marginBottom: 28 },
    eyebrow: { fontSize: 10, fontWeight: '900', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 1.6, marginBottom: 8 },
    title: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -1.2, lineHeight: 36 },
    subtitle: { fontSize: 15, color: '#94a3b8', fontWeight: '600', marginTop: 10, lineHeight: 21 },
    card: { flexGrow: 1, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 28 },
    footer: { marginTop: 22, alignItems: 'center', gap: 4 },
});
