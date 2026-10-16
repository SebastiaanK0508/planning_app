import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { addDays, formatUren, parseServerDate, toIsoDate, weekNummer } from './format';
import { bepaalDagdeel, schoonId, splitDatumTijd } from './planning';

// Huisstijl van pdf-stijl.js (web): donkere kopbalk met WEBPLANNING.NL, blauw/paars accent,
// eyebrow + titel, tabellen in de app-kleuren. Hier als HTML voor expo-print.

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function pagina(opties: { eyebrow: string; titel: string; meta: [string, string][]; inhoud: string; liggend?: boolean }) {
    const meta = opties.meta.map(([l, w]) => `<div class="meta"><span>${esc(l)}</span><b>${esc(w)}</b></div>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><style>
        @page { size: A4 ${opties.liggend ? 'landscape' : 'portrait'}; margin: 0; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, Helvetica, Arial, sans-serif; color: #334155; font-size: 10px; }
        .kop { background: #0f172a; color: #fff; padding: 14px 28px; font-weight: 900; font-size: 13px; letter-spacing: 1px; }
        .kop span { color: #60a5fa; }
        .accent { height: 4px; background: linear-gradient(90deg, #4361ee, #7209b7); }
        .inhoud { padding: 22px 28px; }
        .eyebrow { color: #2563eb; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; font-size: 9px; }
        h1 { margin: 4px 0 12px; color: #0f172a; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
        .metas { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
        .meta { background: #f8fafc; border: 1px solid #eef1f6; border-radius: 10px; padding: 7px 11px; }
        .meta span { display: block; font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 800; }
        .meta b { color: #0f172a; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #0f172a; color: #fff; text-align: left; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.8px; padding: 7px 8px; }
        td { padding: 6px 8px; border-bottom: 1px solid #eef1f6; vertical-align: top; }
        tr:nth-child(even) td { background: #f8fafc; }
        tfoot td { background: #eff6ff !important; color: #1d4ed8; font-weight: 900; border-top: 2px solid #2563eb; }
        .r { text-align: right; }
        .badge { display: inline-block; border-radius: 99px; padding: 1px 7px; font-size: 8px; font-weight: 800; text-transform: uppercase; background: #eff6ff; color: #1d4ed8; }
        .badge.verlof { background: #ecfdf5; color: #047857; } .badge.ziek { background: #fff1f2; color: #be123c; } .badge.ruil { background: #fffbeb; color: #b45309; }
        .cel div { margin-bottom: 3px; padding: 3px 5px; border-radius: 5px; border-left: 3px solid #2563eb; background: #eff6ff; font-weight: 700; color: #0f172a; }
        .cel div.ochtend { border-color: #f59e0b; background: #fef3e2; } .cel div.middag { border-color: #0f9d75; background: #e5f7f0; }
        .cel div.avond { border-color: #7c5cfc; background: #f1edff; } .cel div.heledag { border-color: #2563eb; background: #eff6ff; }
        .cel div.verlof { border-color: #e6467a; background: #fdeaf1; color: #be185d; }
        .cel div.concept { border-style: dashed; opacity: .7; }
        .feest { color: #e11d48; font-size: 8px; font-weight: 800; }
        .voet { margin-top: 18px; color: #94a3b8; font-size: 8px; }
    </style></head><body>
        <div class="kop">WEBPLANNING<span>.NL</span></div><div class="accent"></div>
        <div class="inhoud">
            <div class="eyebrow">${esc(opties.eyebrow)}</div>
            <h1>${esc(opties.titel)}</h1>
            <div class="metas">${meta}</div>
            ${opties.inhoud}
            <div class="voet">Gegenereerd op ${new Date().toLocaleString('nl-NL')} via WebPlanning.nl</div>
        </div>
    </body></html>`;
}

/** Maakt een PDF van de HTML en opent het deelmenu (opslaan, mailen, AirDrop, afdrukken). */
export async function deelPdf(html: string, titel: string) {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: titel, UTI: 'com.adobe.pdf' });
    } else {
        await Print.printAsync({ uri });
    }
}

function statusTekst(status: string | null | undefined) {
    const s = String(status || '').toLowerCase();
    if (s.startsWith('verlof')) return ['Verlof', 'verlof'];
    if (s.includes('ziek')) return ['Ziek', 'ziek'];
    if (s.includes('ruil') || s === 'wacht_op_planner') return ['Ruil', 'ruil'];
    return ['Ingepland', ''];
}

/** Urenoverzicht van één medewerker over een periode (mijn_rooster.html en planning.html). */
export function urenoverzichtHtml(opties: { naam: string; periode: string; items: any[]; correcties?: any[] }) {
    let totaal = 0;
    const rijen = opties.items
        .slice()
        .sort((a, b) => (parseServerDate(a.start_tijd)?.getTime() || 0) - (parseServerDate(b.start_tijd)?.getTime() || 0))
        .map((i) => {
            const start = parseServerDate(i.start_tijd)!;
            const eind = parseServerDate(i.eind_tijd)!;
            const [label, cls] = statusTekst(i.status);
            const isVerlof = cls === 'verlof';
            const uren = parseFloat(i.uren) || 0;
            if (!isVerlof) totaal += uren;
            const tijd = isVerlof ? 'Hele dag' : `${start.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} - ${eind.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
            return `<tr><td>${start.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td><td>${start.toLocaleDateString('nl-NL', { weekday: 'long' })}</td><td>${tijd}</td><td>${esc(i.locatie_naam || i.afdeling_naam || '-')}</td><td><span class="badge ${cls}">${label}</span></td><td class="r">${uren.toFixed(2)}</td></tr>`;
        })
        .join('');
    let correctieRijen = '';
    let correctieTotaal = 0;
    (opties.correcties || []).forEach((c) => {
        const min = c.type === 'minuren' || c.type === 'ziek';
        const u = parseFloat(c.uren) || 0;
        correctieTotaal += min ? -u : u;
        correctieRijen += `<tr><td>${esc(String(c.datum).split('-').reverse().join('-'))}</td><td colspan="3">${esc(CORRECTIE_LABELS[c.type] || c.type)}${c.notitie ? ` · ${esc(c.notitie)}` : ''}</td><td><span class="badge ${min ? 'ziek' : 'verlof'}">Correctie</span></td><td class="r">${min ? '-' : '+'}${u.toFixed(2)}</td></tr>`;
    });
    const eind = totaal + correctieTotaal;
    return pagina({
        eyebrow: 'Urenregistratie',
        titel: 'Urenoverzicht',
        meta: [
            ['Medewerker', opties.naam],
            ['Periode', opties.periode],
            ['Totaal gewerkt', `${eind.toFixed(2)} uur`],
        ],
        inhoud: `<table><thead><tr><th>Datum</th><th>Dag</th><th>Tijd</th><th>Locatie / Afdeling</th><th>Status</th><th class="r">Uren</th></tr></thead>
            <tbody>${rijen}${correctieRijen}</tbody>
            <tfoot><tr><td colspan="5" class="r">Totaal</td><td class="r">${eind.toFixed(2)}</td></tr></tfoot></table>`,
    });
}

export const CORRECTIE_LABELS: Record<string, string> = {
    ziek: 'Ziekte',
    overuren: 'Overuren (+)',
    minuren: 'Min-uren (-)',
    bijzonder_verlof: 'Bijzonder verlof',
};

/** Maandoverzicht van het hele team (voor de loonadministratie). */
export function teamUrenHtml(opties: { orgNaam: string; maandLabel: string; rijen: { naam: string; gepland: number; correctie: number }[] }) {
    let g = 0;
    let c = 0;
    const body = opties.rijen
        .map((r) => {
            g += r.gepland;
            c += r.correctie;
            return `<tr><td>${esc(r.naam)}</td><td class="r">${r.gepland.toFixed(2)}</td><td class="r">${r.correctie > 0 ? '+' : ''}${r.correctie.toFixed(2)}</td><td class="r"><b>${(r.gepland + r.correctie).toFixed(2)}</b></td></tr>`;
        })
        .join('');
    return pagina({
        eyebrow: 'Loonadministratie',
        titel: 'Urenoverzicht team',
        meta: [
            ['Organisatie', opties.orgNaam],
            ['Maand', opties.maandLabel],
            ['Medewerkers', String(opties.rijen.length)],
        ],
        inhoud: `<table><thead><tr><th>Medewerker</th><th class="r">Gepland</th><th class="r">Correcties</th><th class="r">Totaal</th></tr></thead><tbody>${body}</tbody>
            <tfoot><tr><td>Team totaal</td><td class="r">${g.toFixed(2)}</td><td class="r">${c > 0 ? '+' : ''}${c.toFixed(2)}</td><td class="r">${(g + c).toFixed(2)}</td></tr></tfoot></table>`,
    });
}

/** Weekrooster (medewerker x dag), zoals exportWeekOverzichtPDF op planning.html. */
export function weekoverzichtHtml(opties: {
    orgNaam: string;
    locatie: string;
    maandag: Date;
    medewerkers: any[];
    diensten: any[];
    verlof: any[];
    feestdagen: { naam: string; datum: string }[];
}) {
    const dagen = Array.from({ length: 7 }, (_, i) => addDays(opties.maandag, i));
    const kop = dagen
        .map((d) => {
            const f = opties.feestdagen.find((x) => x.datum === toIsoDate(d));
            return `<th>${d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}${f ? `<br><span class="feest">${esc(f.naam)}</span>` : ''}</th>`;
        })
        .join('');
    let weekTotaal = 0;
    const rijen = opties.medewerkers
        .map((m) => {
            let tot = 0;
            const cellen = dagen
                .map((d) => {
                    const ds = toIsoDate(d);
                    const v = opties.verlof
                        .filter((x) => schoonId(x.gebruiker_uuid) === schoonId(m.uuid) && splitDatumTijd(x.start_tijd).datum === ds)
                        .map((x) => `<div class="verlof">${x.status === 'verlof_goedgekeurd' ? 'Verlof' : 'Verlof (aanvraag)'}</div>`)
                        .join('');
                    const w = opties.diensten
                        .filter((s) => schoonId(s.gebruiker_uuid) === schoonId(m.uuid) && splitDatumTijd(s.start_tijd).datum === ds)
                        .map((s) => {
                            const a = splitDatumTijd(s.start_tijd).tijd;
                            const b = splitDatumTijd(s.eind_tijd).tijd;
                            tot += parseFloat(s.uren) || 0;
                            return `<div class="${bepaalDagdeel(a, b).key}${s.status === 'concept' ? ' concept' : ''}">${a}–${b}${s.afdeling_naam ? `<br><small>${esc(s.afdeling_naam)}</small>` : ''}</div>`;
                        })
                        .join('');
                    return `<td class="cel">${v}${w}</td>`;
                })
                .join('');
            weekTotaal += tot;
            return `<tr><td><b>${esc(m.voornaam)} ${esc(m.achternaam)}</b><br><small>${formatUren(tot)} uur</small></td>${cellen}</tr>`;
        })
        .join('');
    return pagina({
        eyebrow: 'Weekrooster',
        titel: `Week ${weekNummer(opties.maandag)}`,
        meta: [
            ['Organisatie', opties.orgNaam],
            ['Locatie', opties.locatie || 'Alle locaties'],
            ['Periode', `${dagen[0].toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })} – ${dagen[6].toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}`],
            ['Totaal', `${formatUren(weekTotaal)} uur`],
        ],
        liggend: true,
        inhoud: `<table><thead><tr><th>Medewerker</th>${kop}</tr></thead><tbody>${rijen}</tbody></table>`,
    });
}
