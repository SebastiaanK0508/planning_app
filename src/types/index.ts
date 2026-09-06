export type Rol = 'medewerker' | 'planner' | 'beheerder' | 'eigenaar' | 'super_admin';

export interface User {
    uuid: string;
    voornaam: string;
    achternaam: string;
    email: string;
    rol: Rol;
    org_uuid: string;
    locatie_uuid: string | null;
    afdeling_uuid: string | null;
    instellingen?: Record<string, unknown>;
    profielfoto_url?: string | null;
}

export interface Shift {
    uuid: string;
    gebruiker_uuid: string;
    org_uuid: string;
    datum: string;
    start_tijd: string;
    eind_tijd: string;
    functie?: string | null;
    locatie_uuid?: string | null;
    afdeling_uuid?: string | null;
    status?: string;
    notitie?: string | null;
    voornaam?: string;
    achternaam?: string;
    locatie_naam?: string;
    afdeling_naam?: string;
    in_ruilbeurs?: boolean | number;
}

export interface VerlofAanvraag {
    uuid: string;
    gebruiker_uuid: string;
    start_datum: string;
    eind_datum: string;
    reden?: string | null;
    status: 'in_behandeling' | 'goedgekeurd' | 'afgewezen' | string;
    uren?: number | null;
    voornaam?: string;
    achternaam?: string;
    aangemaakt_op?: string;
}

export interface RuilVerzoek {
    id: number;
    dienst_uuid: string;
    van_gebruiker_uuid: string;
    naar_gebruiker_uuid?: string | null;
    status: string;
    datum?: string;
    start_tijd?: string;
    eind_tijd?: string;
    voornaam?: string;
    achternaam?: string;
    aangemaakt_op?: string;
}

export interface Bericht {
    uuid: string;
    org_uuid: string;
    afzender_uuid?: string;
    titel: string;
    inhoud: string;
    aangemaakt_op: string;
    gelezen?: boolean | number;
    afzender_naam?: string;
}

export interface Locatie {
    uuid: string;
    naam: string;
    adres?: string | null;
    org_uuid: string;
}

export interface Afdeling {
    uuid: string;
    naam: string;
    locatie_uuid: string;
}

export interface Medewerker {
    uuid: string;
    voornaam: string;
    achternaam: string;
    email: string;
    rol: Rol;
    actief?: boolean | number;
    locatie_uuid?: string | null;
    afdeling_uuid?: string | null;
}

export interface Ticket {
    uuid: string;
    org_uuid?: string;
    onderwerp: string;
    status: string;
    aangemaakt_op: string;
    gebruiker_naam?: string;
}
