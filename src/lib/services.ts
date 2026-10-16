import { apiRequest, apiUpload } from './api';

// ---------- Auth ----------
export const AuthApi = {
    updateInstellingen: (body: Record<string, unknown>) =>
        apiRequest('/api/auth/update-instellingen', { method: 'PUT', body }),
    updateProfielfoto: (formData: FormData) =>
        apiUpload<{ success: boolean; url: string }>('/api/auth/update-profielfoto', formData, 'PUT'),
    changePassword: (huidig_wachtwoord: string, nieuw_wachtwoord: string) =>
        apiRequest('/api/auth/change-password', { method: 'PUT', body: { huidig_wachtwoord, nieuw_wachtwoord } }),
    resetPassword: (token: string, password: string) =>
        apiRequest('/api/auth/reset-password', { method: 'POST', body: { token, password } }),
    getUser: (uuid: string) => apiRequest(`/api/auth/user/${uuid}`),
    alleGebruikers: (orgUuid: string) => apiRequest(`/api/auth/alle-gebruikers/${orgUuid}`),
    registerMedewerker: (body: Record<string, unknown>) =>
        apiRequest('/api/auth/register-medewerker', { method: 'POST', body }),
    deleteMedewerker: (uuid: string) => apiRequest(`/api/auth/delete-medewerker/${uuid}`, { method: 'DELETE' }),
};

// ---------- Planning: rooster & shifts ----------
export const PlanningApi = {
    mijnRooster: (uuid: string) => apiRequest(`/api/planning/mijn-rooster/${uuid}`),
    icsToken: (uuid: string) => apiRequest(`/api/planning/ics-token/${uuid}`) as Promise<{ token: string }>,
    /** start/eind als 'YYYY-MM-DD'. concept=true geeft planners ook nog niet gepubliceerde diensten. */
    totaal: (orgUuid: string, start?: string, eind?: string, concept = false) =>
        apiRequest(`/api/planning/totaal/${orgUuid}`, { query: { start, eind, concept: concept ? 1 : undefined } }),
    getShift: (uuid: string) => apiRequest(`/api/planning/get/${uuid}`),
    addShift: (body: Record<string, unknown>) =>
        apiRequest<{ success: boolean; uuid: string }>('/api/planning/add', { method: 'POST', body }),
    updateShift: (uuid: string, body: Record<string, unknown>) =>
        apiRequest(`/api/planning/update/${uuid}`, { method: 'PUT', body }),
    /** Verwijdert een dienst (planner+) of trekt een eigen, nog lopende verlofaanvraag in. */
    deleteShift: (uuid: string) => apiRequest(`/api/planning/delete/${uuid}`, { method: 'DELETE' }),
    updateStatus: (uuid: string, status: string) =>
        apiRequest(`/api/planning/update-status/${uuid}`, { method: 'PUT', body: { status } }),
    ziekmelden: (uuid: string, reden: string) =>
        apiRequest(`/api/planning/shift/${uuid}/ziekmelden`, { method: 'POST', body: { reden } }),
    ziekmeldingen: (orgUuid: string) => apiRequest(`/api/planning/ziekmeldingen/${orgUuid}`),
    ziekmeldingAnnuleren: (uuid: string) => apiRequest(`/api/planning/ziekmelding/${uuid}/annuleren`, { method: 'PUT' }),
    flexSplitsen: (uuid: string, vrij_start: string, vrij_eind: string) =>
        apiRequest<{ success: boolean; nieuw_blok_uuid?: string }>(`/api/planning/flex-splitsen/${uuid}`, {
            method: 'PUT',
            body: { vrij_start, vrij_eind },
        }),
    publiceerWeek: (body: { start_datum: string; eind_datum: string; locatie_uuid: string | null }) =>
        apiRequest<{ success: boolean; gepubliceerde_diensten: number; mails_verzonden?: number }>('/api/planning/publiceer-week', {
            method: 'POST',
            body,
        }),
    medewerkers: (orgUuid: string) => apiRequest(`/api/planning/medewerkers/${orgUuid}`),
    gebruikerInfo: (uuid: string) => apiRequest(`/api/planning/gebruiker-info/${uuid}`),
    ruilVerlofOpenAantal: (orgUuid: string) =>
        apiRequest<{ aantal: number }>(`/api/planning/ruil-verlof-open-aantal/${orgUuid}`),
    // maand als 'YYYY-MM'
    maandoverzichtTeam: (orgUuid: string, maand: string) =>
        apiRequest(`/api/planning/maandoverzicht-team/${orgUuid}`, { query: { maand } }),
    maandSpecificatie: (orgUuid: string, gebruikerUuid: string, maand: string) =>
        apiRequest(`/api/planning/maand-specificatie/${orgUuid}/${gebruikerUuid}`, { query: { maand } }),
    correcties: (orgUuid: string, gebruikerUuid: string, maand: string) =>
        apiRequest(`/api/planning/correcties/${orgUuid}/${gebruikerUuid}`, { query: { maand } }),
    addCorrectie: (body: { gebruiker_uuid: string; datum: string; type: string; uren: number; notitie?: string }) =>
        apiRequest('/api/planning/correcties/add', { method: 'POST', body }),
    deleteCorrectie: (uuid: string) => apiRequest(`/api/planning/correcties/${uuid}`, { method: 'DELETE' }),
};

// ---------- Planning: verlof ----------
export const VerlofApi = {
    aanvragen: (body: { start_datum: string; eind_datum: string; notitie?: string; gebruiker_uuid?: string }) =>
        apiRequest<{ success: boolean; uren_berekend?: number }>('/api/planning/verlof', { method: 'POST', body }),
    orgOverzicht: (orgUuid: string) => apiRequest(`/api/planning/verlof_aanvraag_laden/${orgUuid}`),
    setStatus: (uuid: string, status: string) =>
        apiRequest(`/api/planning/verlof-status/${uuid}`, { method: 'PUT', body: { status } }),
    updateUren: (uuid: string, totaal_uren: number) =>
        apiRequest(`/api/planning/verlof/update-uren/${uuid}`, { method: 'PUT', body: { totaal_uren } }),
};

// ---------- Planning: ruilbeurs ----------
export const RuilbeursApi = {
    mijnVerzonden: (userUuid: string) => apiRequest(`/api/planning/mijn-verzonden-ruilverzoeken/${userUuid}`),
    ontvangen: (userUuid: string) => apiRequest(`/api/planning/ruil-verzoeken/${userUuid}`),
    voorstel: (body: { mijn_dienst_uuid: string; doel_dienst_uuid: string; naar_gebruiker_uuid?: string }) =>
        apiRequest('/api/planning/ruil-voorstel', { method: 'POST', body }),
    directOverdragen: (body: { dienst_uuid: string; naar_gebruiker_uuid: string; van_gebruiker_uuid?: string }) =>
        apiRequest('/api/planning/direct-overdragen', { method: 'POST', body }),
    accepteren: (verzoekId: string | number) =>
        apiRequest<{ success: boolean; pendingManager?: boolean }>(`/api/planning/ruil-accepteren/${verzoekId}`, { method: 'PUT' }),
    weigeren: (verzoekId: string | number) => apiRequest(`/api/planning/ruil-weigeren/${verzoekId}`, { method: 'PUT' }),
    overnemen: (uuid: string) =>
        apiRequest<{ success: boolean; status?: string; error?: string }>(`/api/planning/overnemen/${uuid}`, { method: 'PUT' }),
    deelOvernemen: (uuid: string, vrij_start: string, vrij_eind: string) =>
        apiRequest<{ success: boolean; status?: string }>(`/api/planning/flex-splitsen-overnemen/${uuid}`, {
            method: 'PUT',
            body: { vrij_start, vrij_eind },
        }),
    /** Eigen dienst inkorten zonder hem op de beurs te zetten (voor een ruilvoorstel). */
    splitsenZonderBeurs: (uuid: string, vrij_start: string, vrij_eind: string) =>
        apiRequest<{ success: boolean; nieuw_blok_uuid?: string }>(`/api/planning/flex-splitsen-zonder-beurs/${uuid}`, {
            method: 'PUT',
            body: { vrij_start, vrij_eind },
        }),
    adminOverzicht: (orgUuid: string) => apiRequest(`/api/planning/admin/ruil-verzoeken/${orgUuid}`),
    adminBevestigen: (verzoekId: string | number) =>
        apiRequest(`/api/planning/admin/ruil-bevestigen/${verzoekId}`, { method: 'PUT' }),
};

// ---------- Planning: mededelingen (berichten) ----------
export const BerichtenApi = {
    mijnBerichten: (userUuid: string, orgUuid: string) => apiRequest(`/api/planning/mijn-berichten/${userUuid}/${orgUuid}`),
    adminOverzicht: (orgUuid: string) => apiRequest(`/api/planning/mededelingen/admin/${orgUuid}`),
    versturen: (body: {
        ontvanger_uuid?: string;
        ontvangers?: string[];
        titel: string;
        bericht: string;
        belangrijk?: boolean | number;
    }) => apiRequest('/api/planning/mededelingen/verstuur', { method: 'POST', body }),
    markeerGelezen: (bericht_uuid: string) =>
        apiRequest('/api/planning/mededelingen/markeer-gelezen', { method: 'POST', body: { bericht_uuid } }),
    leesStatus: (berichtUuid: string, orgUuid: string) =>
        apiRequest(`/api/planning/mededelingen/lees-status/${berichtUuid}/${orgUuid}`),
    verwijder: (uuid: string) => apiRequest(`/api/planning/mededelingen/verwijder/${uuid}`, { method: 'DELETE' }),
    gebruikers: (orgUuid: string) => apiRequest(`/api/planning/gebruikers/${orgUuid}`),
};

// ---------- Organisatie ----------
export const OrganisatieApi = {
    settings: (orgUuid: string) => apiRequest(`/api/organisatie/settings/${orgUuid}`),
    // De backend accepteert precies één instelling per call: { org_uuid, [key]: value }.
    updateSetting: (orgUuid: string, key: string, value: unknown) =>
        apiRequest('/api/organisatie/settings', { method: 'PUT', body: { org_uuid: orgUuid, [key]: value } }),
    dataRetentiePreview: (orgUuid: string, maanden: number) =>
        apiRequest(`/api/organisatie/data-retentie/preview/${orgUuid}`, { query: { maanden } }),
    dataRetentieOpschonen: (orgUuid: string) =>
        apiRequest('/api/organisatie/data-retentie/opschonen', { method: 'POST', body: { org_uuid: orgUuid } }),
    locaties: (orgUuid: string) => apiRequest(`/api/organisatie/locaties/${orgUuid}`),
    addLocatie: (body: Record<string, unknown>) => apiRequest('/api/organisatie/locaties/add', { method: 'POST', body }),
    updateLocatie: (uuid: string, body: Record<string, unknown>) =>
        apiRequest(`/api/organisatie/locaties/${uuid}`, { method: 'PUT', body }),
    deleteLocatie: (uuid: string) => apiRequest(`/api/organisatie/locaties/${uuid}`, { method: 'DELETE' }),
    afdelingenVanOrg: (orgUuid: string) => apiRequest(`/api/organisatie/afdelingen/org/${orgUuid}`),
    afdelingen: (locatieUuid: string) => apiRequest(`/api/organisatie/afdelingen/${locatieUuid}`),
    addAfdeling: (body: Record<string, unknown>) => apiRequest('/api/organisatie/afdelingen/add', { method: 'POST', body }),
    updateAfdeling: (uuid: string, body: Record<string, unknown>) =>
        apiRequest(`/api/organisatie/afdelingen/${uuid}`, { method: 'PUT', body }),
    deleteAfdeling: (uuid: string) => apiRequest(`/api/organisatie/afdelingen/${uuid}`, { method: 'DELETE' }),
    collegas: (orgUuid: string) => apiRequest(`/api/organisatie/collegas/${orgUuid}`),
    adminLijst: () => apiRequest('/api/organisatie/admin/lijst'),
    adminAdd: (body: Record<string, unknown>) => apiRequest('/api/organisatie/admin/add', { method: 'POST', body }),
    adminToggle: (uuid: string) => apiRequest(`/api/organisatie/admin/toggle/${uuid}`, { method: 'POST' }),
    adminDelete: (uuid: string) => apiRequest(`/api/organisatie/admin/delete/${uuid}`, { method: 'DELETE' }),
    adminUpdate: (uuid: string, body: Record<string, unknown>) =>
        apiRequest(`/api/organisatie/admin/update/${uuid}`, { method: 'PUT', body }),
};

// ---------- Support ----------
export const SupportApi = {
    alleTickets: () => apiRequest('/api/support/tickets'),
    ticketsVoorOrg: (orgUuid: string) => apiRequest(`/api/support/tickets/${orgUuid}`),
    ticket: (ticketUuid: string) => apiRequest(`/api/support/ticket/${ticketUuid}`),
    nieuwTicket: (body: { onderwerp: string; omschrijving: string; categorie?: string; prioriteit?: string }) =>
        apiRequest('/api/support/ticket', { method: 'POST', body }),
    setStatus: (ticketUuid: string, status: string) =>
        apiRequest(`/api/support/ticket/${ticketUuid}/status`, { method: 'PUT', body: { status } }),
    reply: (body: { ticket_uuid: string; bericht: string }) => apiRequest('/api/support/ticket/reply', { method: 'POST', body }),
    deleteReply: (reactieUuid: string) => apiRequest(`/api/support/ticket/reply/${reactieUuid}`, { method: 'DELETE' }),
};

// ---------- Push (Expo) ----------
export const PushApi = {
    registreerExpoToken: (token: string, platform: string) =>
        apiRequest('/api/push/expo-token', { method: 'POST', body: { token, platform } }),
    afmelden: (endpoint: string) => apiRequest('/api/push/unsubscribe', { method: 'POST', body: { endpoint } }),
};

// ---------- Abonnement ----------
export type AbonnementStatus = {
    geen_org?: boolean;
    afgedwongen?: boolean;
    org_actief?: boolean;
    status?: 'beta' | 'trial' | 'actief' | 'gratis' | 'opgezegd' | string;
    toegang?: 'vol' | 'alleen_lezen' | 'geblokkeerd' | string;
    geldig_tot?: string | null;
    dagen_over?: number | null;
    coulance_tot?: string | null;
    max_gebruikers?: number | null;
    aantal_gebruikers?: number;
    prijs_per_maand?: number | string;
    online_betalen?: boolean;
    betaal_info?: string;
    automatische_incasso?: boolean | number;
    mag_beheren?: boolean;
    betalingen?: { mollie_id: string; bedrag: string; status: string; omschrijving: string; aangemaakt_op: string; betaald_op: string | null }[];
};

export const AbonnementApi = {
    status: () => apiRequest<AbonnementStatus>('/api/abonnement/status'),
    adminInstellingen: () => apiRequest('/api/abonnement/admin/instellingen'),
    updateAdminInstellingen: (body: Record<string, unknown>) =>
        apiRequest('/api/abonnement/admin/instellingen', { method: 'PUT', body }),
    adminOrg: (orgUuid: string, body: Record<string, unknown>) =>
        apiRequest(`/api/abonnement/admin/org/${orgUuid}`, { method: 'PUT', body }),
};

// ---------- Updates (changelog) ----------
export const UpdatesApi = {
    lijst: () => apiRequest('/api/updates'),
    adminLijst: () => apiRequest('/api/updates/admin'),
    add: (body: Record<string, unknown>) => apiRequest('/api/updates', { method: 'POST', body }),
    update: (uuid: string, body: Record<string, unknown>) => apiRequest(`/api/updates/${uuid}`, { method: 'PUT', body }),
    remove: (uuid: string) => apiRequest(`/api/updates/${uuid}`, { method: 'DELETE' }),
};

// ---------- Leads (aanvragen via de website) ----------
export const LeadsApi = {
    lijst: () => apiRequest('/api/leads'),
    setStatus: (id: number | string, status: string) => apiRequest(`/api/leads/${id}/status`, { method: 'PUT', body: { status } }),
    reply: (id: number | string, bericht: string) => apiRequest(`/api/leads/${id}/reply`, { method: 'POST', body: { bericht } }),
    remove: (id: number | string) => apiRequest(`/api/leads/${id}`, { method: 'DELETE' }),
};
