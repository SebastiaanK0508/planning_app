import { Stack } from 'expo-router';
import { colors } from '../../src/lib/theme';

export default function AppLayout() {
    return (
        <Stack
            screenOptions={{
                headerTintColor: colors.primary,
                headerTitleStyle: { fontWeight: '700' },
                headerBackTitle: '',
            }}
        >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="verlof/nieuw" options={{ title: 'Verlof aanvragen', presentation: 'modal' }} />
            <Stack.Screen name="berichten/index" options={{ title: 'Berichten' }} />
            <Stack.Screen name="berichten/nieuw" options={{ title: 'Nieuw bericht', presentation: 'modal' }} />
            <Stack.Screen name="profiel/index" options={{ title: 'Mijn profiel' }} />
            <Stack.Screen name="profiel/wachtwoord" options={{ title: 'Wachtwoord wijzigen' }} />
            <Stack.Screen name="beheer/index" options={{ title: 'Beheer' }} />
            <Stack.Screen name="beheer/team-rooster" options={{ title: 'Team rooster' }} />
            <Stack.Screen name="beheer/planning" options={{ title: 'Rooster maken' }} />
            <Stack.Screen name="beheer/medewerkers" options={{ title: 'Medewerkers' }} />
            <Stack.Screen name="beheer/locaties" options={{ title: 'Locaties & afdelingen' }} />
            <Stack.Screen name="beheer/instellingen" options={{ title: 'Instellingen' }} />
            <Stack.Screen name="beheer/verlof-beheer" options={{ title: 'Verlofaanvragen' }} />
            <Stack.Screen name="beheer/ruil-beheer" options={{ title: 'Ruilverzoeken' }} />
            <Stack.Screen name="beheer/maandoverzicht" options={{ title: 'Maandoverzicht' }} />
            <Stack.Screen name="admin/index" options={{ title: 'Platformbeheer' }} />
            <Stack.Screen name="admin/organisaties" options={{ title: 'Organisaties' }} />
            <Stack.Screen name="admin/tickets" options={{ title: 'Alle tickets' }} />
            <Stack.Screen name="support/index" options={{ title: 'Support' }} />
            <Stack.Screen name="support/nieuw" options={{ title: 'Nieuw ticket', presentation: 'modal' }} />
            <Stack.Screen name="support/[uuid]" options={{ title: 'Ticket' }} />
        </Stack>
    );
}
