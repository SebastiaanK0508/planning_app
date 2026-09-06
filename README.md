# Webplanning — mobiele app

React Native (Expo Router) app voor Webplanning.nl. De app praat met dezelfde
Express/MySQL backend als de webapp in `../planning/backend` (zelfde
`/api/...` routes, JWT-authenticatie via `Authorization: Bearer <token>`).

## Functionaliteit

- Inloggen, wachtwoord vergeten, organisatie registreren
- Home-dashboard met aankomende diensten en snelkoppelingen
- Mijn rooster (weekweergave)
- Verlof aanvragen en overzicht van eigen aanvragen
- Ruilbeurs: diensten aanbieden aan collega's, ontvangen verzoeken accepteren/weigeren
- Berichten (mededelingen), inclusief versturen voor planner+
- Profiel: naam/e-mail bewerken, profielfoto, wachtwoord wijzigen
- Support-tickets aanmaken en beantwoorden
- Beheerpaneel (planner/beheerder/eigenaar): team-rooster, rooster maken,
  medewerkers, locaties & afdelingen, verlof- en ruilgoedkeuring,
  maandoverzicht, organisatie-instellingen
- Platformbeheer (super_admin): organisaties beheren, alle support-tickets

## Vereisten

- Node.js 20+
- Een Expo-account (gratis) — nodig voor EAS Build: https://expo.dev/signup
- Voor iOS-builds: geen Mac nodig dankzij EAS Build (bouwt in de cloud)

## Lokaal ontwikkelen

```bash
npm install
npm run start        # Expo Dev Server; scan de QR met Expo Go, of druk op i/a
```

Zet in `.env` (kopieer `.env.example`) een lokale API-URL als je tegen een
lokale backend wilt testen in plaats van productie:

```
EXPO_PUBLIC_API_URL=http://<jouw-lan-ip>:3000
```

Zonder deze variabele gebruikt de app `extra.apiUrl` uit `app.json`
(standaard `https://app.webplanning.nl`).

## Voordat je naar de stores publiceert

Er zijn nog geen Apple- of Google-developeraccounts. Dit heb je nodig:

1. **Apple Developer Program** — $99/jaar, aanmelden op
   https://developer.apple.com/programs/enroll/. Duurt soms 24-48u
   (identiteitsverificatie).
2. **Google Play Console** — eenmalig $25, aanmelden op
   https://play.google.com/console/signup.
3. **Eigen app-icoon** — `assets/icon.png`, `assets/android-icon-*.png` en
   `assets/splash-icon.png` zijn nu nog de standaard Expo-placeholders.
   Vervang deze door het echte Webplanning-logo (1024×1024 voor `icon.png`)
   voordat je een productie-build maakt.
4. **Privacyverklaring-URL** — beide stores vereisen een publiek bereikbare
   privacyverklaring. Je hebt al `privacy.html` in de webapp; zorg dat die
   op een vaste URL bereikbaar is (bv. `https://app.webplanning.nl/privacy.html`).

## Build & publicatie via EAS

```bash
npm install -g eas-cli
eas login
eas init                 # koppelt dit project aan een Expo-project, vult extra.eas.projectId in app.json
```

### Android (Google Play)

```bash
eas build --platform android --profile production
```

Dit levert een `.aab` op. Eerste keer uploaden doe je handmatig in de
[Play Console](https://play.google.com/console) (interne test → productie).
Wil je het via de CLI automatiseren, maak dan een service-account-sleutel aan
(Play Console → Instellingen → API-toegang) en zet het pad in `eas.json`
(`submit.production.android.serviceAccountKeyPath`), daarna:

```bash
eas submit --platform android --latest
```

### iOS (App Store)

```bash
eas build --platform ios --profile production
```

EAS vraagt om je Apple-ID en regelt certificaten/provisioning automatisch.
Vul in `eas.json` (`submit.production.ios`) je Apple ID, App Store Connect
App ID en Team ID in, daarna:

```bash
eas submit --platform ios --latest
```

Daarna in [App Store Connect](https://appstoreconnect.apple.com): app-
metadata (screenshots, beschrijving, privacyverklaring-URL, contactgegevens)
invullen en ter review indienen.

## Bekende beperkingen / vervolgstappen

- **Pushmeldingen**: de app vraagt toestemming en haalt een Expo push token
  op (`src/hooks/usePushRegistration.ts`), maar de backend heeft nog geen
  endpoint om dit token op te slaan. Voeg bijvoorbeeld
  `POST /api/auth/push-token` toe en koppel `expo-server-sdk` in de backend
  om daadwerkelijk pushmeldingen te versturen (bv. bij nieuwe berichten of
  ruilverzoeken).
- **Rooster maken**: de mobiele planner-flow is bewust een eenvoudige
  lijst-editor (kies medewerker + tijd) in plaats van een drag-and-drop
  weekrooster zoals op het web — dat past beter bij een telefoonscherm.
- Vervang de placeholder-iconen in `assets/` door het echte merk voordat je
  een productie-build maakt (zie hierboven).
