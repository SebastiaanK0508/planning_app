import { apiRequest, apiUpload } from './api';

// ---------- Auth ----------
export const AuthApi = {
    updateInstellingen: (body: Record<string, unknown>) =>
        apiRequest('/api/auth/update-instellingen', { method: 'PUT', body }),
    updateProfielfoto: (formData: FormData) => apiUpload('/api/auth/update-profielfoto', formData),
    changePassword: (huidig_wachtwoord: string, nieuw_wachtwoord: string) =>
        apiRequest('/api/auth/change-password', { method: 'PUT', body: { huidig_wachtwoord, nieuw_wachtwoord } }),
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
    totaal: (orgUuid: string, van: string, tot: string) =>
        apiRequest(`/api/planning/totaal/${orgUuid}`, { query: { van, tot } }),
    getShift: (uuid: string) => apiRequest(`/api/planning/get/${uuid}`),
    addShift: (body: Record<string, unknown>) => apiRequest('/api/planning/add', { method: 'POST', body }),
    updateShift: (uuid: string, body: Record<string, unknown>) =>
        apiRequest(`/api/planning/update/${uuid}`, { method: 'PUT', body }),
    deleteShift: (uuid: string) => apiRequest(`/api/planning/delete/${uuid}`, { method: 'DELETE' }),
    updateStatus: (uuid: string, status: string) =>
        apiRequest(`/api/planning/update-status/${uuid}`, { method: 'PUT', body: { status } }),
    flexSplitsen: (uuid: string, vrij_start: string, vrij_eind: string) =>
        apiRequest(`/api/planning/flex-splitsen/${uuid}`, { method: 'PUT', body: { vrij_start, vrij_eind } }),
    publiceerWeek: (body: Record<string, unknown>) =>
        apiRequest('/api/planning/publiceer-week', { method: 'POST', body }),
    medewerkers: (orgUuid: string) => apiRequest(`/api/planning/medewerkers/${orgUuid}`),
    gebruikerInfo: (uuid: string) => apiRequest(`/api/planning/gebruiker-info/${uuid}`),
    // maand als 'YYYY-MM'
    maandoverzichtTeam: (orgUuid: string, maand: string) =>
        apiRequest(`/api/planning/maandoverzicht-team/${orgUuid}`, { query: { maand } }),
    maandSpecificatie: (orgUuid: string, gebruikerUuid: string, maand: string) =>
        apiRequest(`/api/planning/maand-specificatie/${orgUuid}/${gebruikerUuid}`, { query: { maand } }),
};

// ---------- Planning: verlof ----------
export const VerlofApi = {
    aanvragen: (body: { start_datum: string; eind_datum: string; notitie?: string; gebruiker_uuid?: string }) =>
        apiRequest('/api/planning/verlof', { method: 'POST', body }),
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
    voorstel: (body: { mijn_dienst_uuid: string; doel_dienst_uuid?: string; naar_gebruiker_uuid?: string }) =>
        apiRequest('/api/planning/ruil-voorstel', { method: 'POST', body }),
    directOverdragen: (body: { dienst_uuid: string; naar_gebruiker_uuid: string; van_gebruiker_uuid?: string }) =>
        apiRequest('/api/planning/direct-overdragen', { method: 'POST', body }),
    accepteren: (verzoekId: string | number) => apiRequest(`/api/planning/ruil-accepteren/${verzoekId}`, { method: 'PUT' }),
    weigeren: (verzoekId: string | number) => apiRequest(`/api/planning/ruil-weigeren/${verzoekId}`, { method: 'PUT' }),
    overnemen: (uuid: string) => apiRequest(`/api/planning/overnemen/${uuid}`, { method: 'PUT' }),
    adminOverzicht: (orgUuid: string) => apiRequest(`/api/planning/admin/ruil-verzoeken/${orgUuid}`),
    adminBevestigen: (verzoekId: string | number) =>
        apiRequest(`/api/planning/admin/ruil-bevestigen/${verzoekId}`, { method: 'PUT' }),
};

// ---------- Planning: mededelingen (berichten) ----------
export const BerichtenApi = {
    mijnBerichten: (userUuid: string, orgUuid: string) => apiRequest(`/api/planning/mijn-berichten/${userUuid}/${orgUuid}`),
    adminOverzicht: (orgUuid: string) => apiRequest(`/api/planning/mededelingen/admin/${orgUuid}`),
    versturen: (body: { ontvanger_uuid: string; titel: string; bericht: string; belangrijk?: boolean }) =>
        apiRequest('/api/planning/mededelingen/verstuur', { method: 'POST', body }),
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
