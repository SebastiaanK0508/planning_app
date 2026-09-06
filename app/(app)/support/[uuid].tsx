import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Card, CenteredLoader, ErrorBanner, PrimaryButton, TextField } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { ApiError } from '../../../src/lib/api';
import { formatDateTime } from '../../../src/lib/format';
import { SupportApi } from '../../../src/lib/services';
import { colors } from '../../../src/lib/theme';

export default function TicketDetailScreen() {
    const { uuid } = useLocalSearchParams<{ uuid: string }>();
    const { user } = useAuth();
    const { data, loading, error, reload } = useAsyncData(() => SupportApi.ticket(uuid!) as Promise<any>, [uuid]);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState('');
    const isSuperAdmin = user?.rol === 'super_admin';
    const STATUSSEN = ['Open', 'In Behandeling', 'Opgelost', 'Gesloten'];

    async function handleStatus(status: string) {
        try {
            await SupportApi.setStatus(uuid!, status);
            reload();
        } catch (err) {
            setSendError(err instanceof ApiError ? err.message : 'Status wijzigen is mislukt.');
        }
    }

    async function handleReply() {
        setSendError('');
        if (!reply.trim()) return;
        setSending(true);
        try {
            await SupportApi.reply({ ticket_uuid: uuid!, bericht: reply });
            setReply('');
            reload();
        } catch (err) {
            setSendError(err instanceof ApiError ? err.message : 'Versturen is mislukt.');
        } finally {
            setSending(false);
        }
    }

    if (loading) return <CenteredLoader />;
    if (!data?.ticket) return <ErrorBanner message={error || 'Ticket niet gevonden.'} />;

    const { ticket, reacties } = data;

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: '#f8fafc' }}>
                <Card style={{ marginBottom: 16 }}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.onderwerp}>{ticket.onderwerp}</Text>
                        <Badge label={ticket.status} tone={ticket.status === 'Opgelost' ? 'success' : 'warning'} />
                    </View>
                    <Text style={styles.body}>{ticket.omschrijving}</Text>
                    <Text style={styles.meta}>
                        {ticket.voornaam} {ticket.achternaam} · {formatDateTime(ticket.datum_aangemaakt)}
                    </Text>
                    {isSuperAdmin ? (
                        <View style={styles.statusRow}>
                            {STATUSSEN.map((s) => (
                                <Pressable
                                    key={s}
                                    onPress={() => handleStatus(s)}
                                    style={[styles.statusChip, ticket.status === s && styles.statusChipActive]}
                                >
                                    <Text style={[styles.statusChipText, ticket.status === s && styles.statusChipTextActive]}>{s}</Text>
                                </Pressable>
                            ))}
                        </View>
                    ) : null}
                </Card>

                {(reacties || []).map((r: any) => {
                    const isMe = r.user_uuid?.replace?.(/-/g, '').toLowerCase() === user?.uuid;
                    return (
                        <View key={r.uuid} style={[styles.replyBubble, isMe && styles.replyBubbleMe]}>
                            <Text style={styles.replyAuthor}>
                                {r.voornaam} {r.achternaam}
                            </Text>
                            <Text style={styles.replyText}>{r.bericht}</Text>
                            <Text style={styles.replyMeta}>{formatDateTime(r.datum_aangemaakt)}</Text>
                        </View>
                    );
                })}
            </ScrollView>
            <View style={styles.replyBar}>
                <ErrorBanner message={sendError} />
                <TextField value={reply} onChangeText={setReply} placeholder="Typ een reactie..." multiline style={{ minHeight: 44 }} />
                <PrimaryButton title="Versturen" onPress={handleReply} loading={sending} />
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    onderwerp: { fontSize: 17, fontWeight: '800', color: '#0f172a', flex: 1 },
    body: { fontSize: 14, color: '#334155', marginTop: 8 },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 10 },
    replyBubble: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.border,
        maxWidth: '85%',
    },
    replyBubbleMe: { alignSelf: 'flex-end', backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
    replyAuthor: { fontSize: 12, fontWeight: '700', color: '#334155' },
    replyText: { fontSize: 14, color: '#0f172a', marginTop: 4 },
    replyMeta: { fontSize: 10, color: colors.textMuted, marginTop: 6 },
    replyBar: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border },
    statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    statusChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
    statusChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    statusChipText: { fontSize: 12, fontWeight: '600', color: '#334155' },
    statusChipTextActive: { color: '#fff' },
});
