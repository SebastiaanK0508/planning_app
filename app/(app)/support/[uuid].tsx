import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Badge, Card, CenteredLoader, Chip, ErrorBanner, FieldLabel } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAsyncData } from '../../../src/hooks/useAsyncData';
import { ApiError } from '../../../src/lib/api';
import { formatDateTime, zelfdeUuid } from '../../../src/lib/format';
import { SupportApi } from '../../../src/lib/services';
import { categorieIcoon, prioriteitTone, TICKET_STATUSSEN, ticketStatusTone } from '../../../src/lib/support';
import { colors } from '../../../src/lib/theme';

export default function TicketDetailScreen() {
    const { uuid } = useLocalSearchParams<{ uuid: string }>();
    const { user } = useAuth();
    const { data, loading, error, reload } = useAsyncData(() => SupportApi.ticket(uuid!) as Promise<any>, [uuid]);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState('');
    const isSuperAdmin = user?.rol === 'super_admin';

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
            await SupportApi.reply({ ticket_uuid: uuid!, bericht: reply.trim() });
            setReply('');
            reload();
        } catch (err) {
            setSendError(err instanceof ApiError ? err.message : 'Versturen is mislukt.');
        } finally {
            setSending(false);
        }
    }

    function verwijder(r: any) {
        Alert.alert('Reactie verwijderen?', 'Dit kan niet ongedaan worden gemaakt.', [
            { text: 'Annuleren', style: 'cancel' },
            {
                text: 'Verwijderen',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await SupportApi.deleteReply(r.uuid);
                        reload();
                    } catch (err) {
                        Alert.alert('Mislukt', err instanceof ApiError ? err.message : 'Verwijderen is mislukt.');
                    }
                },
            },
        ]);
    }

    if (loading) return <CenteredLoader />;
    if (!data?.ticket) return <ErrorBanner message={error || 'Ticket niet gevonden.'} />;
    const { ticket, reacties } = data;

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
                <Card style={{ marginBottom: 16 }}>
                    <View style={styles.badges}>
                        <Badge label={ticket.status} tone={ticketStatusTone(ticket.status)} />
                        <Badge label={ticket.prioriteit || 'Medium'} tone={prioriteitTone(ticket.prioriteit)} />
                        <View style={styles.cat}>
                            <Ionicons name={categorieIcoon(ticket.categorie)} size={12} color={colors.subtle} />
                            <Text style={styles.catText}>{ticket.categorie || 'Algemeen'}</Text>
                        </View>
                    </View>
                    <Text style={styles.onderwerp}>{ticket.onderwerp}</Text>
                    <Text style={styles.body}>{ticket.omschrijving || 'Geen omschrijving.'}</Text>
                    <Text style={styles.meta}>
                        {[`${ticket.voornaam || ''} ${ticket.achternaam || ''}`.trim(), isSuperAdmin ? ticket.bedrijfsnaam : null, formatDateTime(ticket.datum_aangemaakt)]
                            .filter(Boolean)
                            .join(' · ')}
                    </Text>
                    {isSuperAdmin ? (
                        <>
                            <FieldLabel>Status wijzigen</FieldLabel>
                            <View style={styles.statusRow}>
                                {TICKET_STATUSSEN.map((s) => (
                                    <Chip key={s} label={s} active={ticket.status === s} onPress={() => handleStatus(s)} />
                                ))}
                            </View>
                        </>
                    ) : null}
                </Card>

                {(reacties || []).length === 0 ? (
                    <Text style={styles.leeg}>Nog geen reacties. We laten zo snel mogelijk van ons horen.</Text>
                ) : null}
                {(reacties || []).map((r: any) => {
                    const isMe = zelfdeUuid(r.user_hex, user?.uuid);
                    const isSupport = r.rol === 'super_admin';
                    return (
                        <View key={r.uuid} style={[styles.bubbleWrap, isMe ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                            <View style={styles.auteurRij}>
                                <Text style={styles.auteur}>{isMe ? 'Jij' : r.voornaam ? `${r.voornaam} ${r.achternaam || ''}` : 'Support'}</Text>
                                {isSupport && !isMe ? <Text style={styles.supportTag}>Support</Text> : null}
                                <Text style={styles.tijd}>{formatDateTime(r.datum_aangemaakt)}</Text>
                            </View>
                            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                                <Text style={[styles.bubbleText, isMe && { color: '#fff' }]}>{r.bericht}</Text>
                            </View>
                            {isMe || isSuperAdmin ? (
                                <Pressable onPress={() => verwijder(r)} hitSlop={6}>
                                    <Text style={styles.verwijder}>Verwijderen</Text>
                                </Pressable>
                            ) : null}
                        </View>
                    );
                })}
            </ScrollView>
            <View style={styles.replyBar}>
                <ErrorBanner message={sendError} />
                <View style={styles.replyRow}>
                    <TextInput
                        value={reply}
                        onChangeText={setReply}
                        placeholder="Typ je reactie..."
                        placeholderTextColor={colors.subtle}
                        multiline
                        style={styles.replyInput}
                    />
                    <Pressable onPress={handleReply} disabled={sending || !reply.trim()} style={[styles.send, (sending || !reply.trim()) && { opacity: 0.5 }]}>
                        <Ionicons name="send" size={18} color="#fff" />
                    </Pressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    badges: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
    cat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    catText: { fontSize: 11, fontWeight: '700', color: colors.subtle },
    onderwerp: { fontSize: 19, fontWeight: '900', color: colors.ink, letterSpacing: -0.4 },
    body: { fontSize: 14, color: colors.text, marginTop: 8, lineHeight: 21 },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 12, marginBottom: 6, fontWeight: '600' },
    statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    leeg: { textAlign: 'center', color: colors.subtle, fontSize: 13, fontWeight: '600', paddingVertical: 20 },
    bubbleWrap: { marginBottom: 14 },
    auteurRij: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5, marginHorizontal: 4 },
    auteur: { fontSize: 11, fontWeight: '900', color: colors.text },
    supportTag: { fontSize: 9, fontWeight: '900', color: colors.primary, backgroundColor: colors.primarySoft, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, textTransform: 'uppercase' },
    tijd: { fontSize: 10, color: colors.subtle, fontWeight: '700' },
    bubble: { maxWidth: '85%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 6 },
    bubbleThem: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 6 },
    bubbleText: { fontSize: 14, color: colors.ink, lineHeight: 20 },
    verwijder: { fontSize: 11, fontWeight: '800', color: colors.danger, marginTop: 4, marginHorizontal: 6 },
    replyBar: { padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.line },
    replyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    replyInput: {
        flex: 1,
        minHeight: 46,
        maxHeight: 120,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        backgroundColor: colors.inputBg,
        color: colors.ink,
    },
    send: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
