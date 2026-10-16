// Gegenereerd uit planning/frontend/kennisbank.html. Blokken: t = p (alinea) of li (opsommingsteken), **vet**.
export type KbBlok = { t: "p" | "li"; x: string };
export type KbArtikel = { vraag: string; blokken: KbBlok[] };
export type KbSectie = { id: string; titel: string; icoon: string; artikelen: KbArtikel[] };

export const KENNISBANK: KbSectie[] = [
    {
        "id": "aan-de-slag",
        "titel": "Aan de slag",
        "icoon": "rocket-outline",
        "artikelen": [
            {
                "vraag": "Hoe log ik in en wat doe ik als ik mijn wachtwoord vergeten ben?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Je logt in met het e-mailadres en wachtwoord dat je beheerder voor je heeft aangemaakt. Ben je je wachtwoord kwijt, klik dan op de link **\"Wachtwoord vergeten\"** op het inlogscherm. Je ontvangt een e-mail waarmee je een nieuw wachtwoord kunt instellen."
                    },
                    {
                        "t": "p",
                        "x": "Heb je geen toegang meer tot je e-mailadres, neem dan contact op met je planner of beheerder — die kan je account resetten via het medewerkersbeheer."
                    }
                ]
            },
            {
                "vraag": "Wat betekenen de verschillende rollen (medewerker, planner, beheerder, eigenaar)?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "WebPlanning kent een aantal rollen die bepalen welke onderdelen je te zien krijgt in het menu:"
                    },
                    {
                        "t": "li",
                        "x": "**Medewerker** — ziet zijn/haar eigen rooster, kan verlof aanvragen, diensten ruilen op de ruilbeurs en berichten lezen."
                    },
                    {
                        "t": "li",
                        "x": "**Planner** — heeft daarnaast toegang tot Weekbeheer & Planning en Ruil-/Verlofbeheer om het rooster van het team te maken en aanvragen te behandelen."
                    },
                    {
                        "t": "li",
                        "x": "**Beheerder / Eigenaar** — heeft volledige toegang tot Medewerkers, Locaties en Instellingen om de organisatie in te richten."
                    },
                    {
                        "t": "li",
                        "x": "**Super admin** — beheert WebPlanning zelf: organisaties, gebruikers, aanvragen en support op platformniveau."
                    },
                    {
                        "t": "p",
                        "x": "Je ziet in de zijbalk alleen de onderdelen waarvoor jouw rol rechten heeft."
                    }
                ]
            },
            {
                "vraag": "Hoe navigeer ik door WebPlanning op mobiel en desktop?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Op een groot scherm vind je links de vaste menubalk, ingedeeld in de groepen **Persoonlijk**, en (afhankelijk van je rol) **Beheer**, **Organisatie** en **System Admin**."
                    },
                    {
                        "t": "p",
                        "x": "Op mobiel staat onderin een balk met je belangrijkste snelkoppelingen en een knop **\"Menu\"** die alle overige onderdelen in een uitklapmenu toont. Een rood bolletje op een icoon geeft aan dat er iets nieuws op je wacht, bijvoorbeeld een ongelezen bericht of een openstaand ruilverzoek."
                    }
                ]
            },
            {
                "vraag": "Waar zie ik welke versie van WebPlanning ik gebruik en wat er nieuw is?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Onderaan de menubalk (desktop) staat altijd het huidige versienummer. Wil je weten wat er precies is veranderd, ga dan naar **Persoonlijk &rarr; Profiel** en klik op de kaart **\"WebPlanning\"** onderaan — die opent de **Updates & Changelog**-pagina met alle nieuwe functies, verbeteringen en bugfixes per versie."
                    }
                ]
            }
        ]
    },
    {
        "id": "rooster-planning",
        "titel": "Rooster & Planning",
        "icoon": "calendar-outline",
        "artikelen": [
            {
                "vraag": "Waar vind ik mijn eigen rooster?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Onder **Persoonlijk &rarr; Mijn Rooster** zie je jouw ingeplande diensten. Klik op een dienst voor de details (tijden, locatie en eventuele opmerkingen). Via **\"Inzetbaarheid\"** geef je aan op welke dagen en dagdelen je beschikbaar bent — de planner houdt hier rekening mee bij het maken van het rooster."
                    }
                ]
            },
            {
                "vraag": "Wat is het verschil tussen \"Mijn Rooster\" en \"Team Rooster\"?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "**Mijn Rooster** toont alleen jouw eigen diensten. **Team Rooster** geeft een overzicht van alle medewerkers naast elkaar, met kleurcodering per dagdeel en filters op afdeling of locatie, zodat je in één oogopslag ziet wie wanneer werkt. Dit teamoverzicht is voor iedereen toegankelijk, niet alleen voor planners."
                    }
                ]
            },
            {
                "vraag": "Hoe maak of wijzig ik het weekrooster van mijn team?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Ga naar **Beheer &rarr; Planning** (Weekbeheer & Planning). Hier plan je per week diensten in voor je medewerkers, gebaseerd op hun functie, locatie en opgegeven beschikbaarheid. Klik op een dienst voor de details of om deze aan te passen."
                    }
                ]
            },
            {
                "vraag": "Hoe voeg ik een uren-correctie toe?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "In **Planning** kun je onder **\"Uren & Overzicht\"** individuele urencorrecties toevoegen, bijvoorbeeld voor een compensatie-uur of een handmatige aanpassing van iemands saldo. Klik op **\"Nieuwe Correctie Toevoegen\"**, kies de medewerker en vul het aantal uren (positief of negatief) en een omschrijving in. Bestaande correcties zie je terug in de **\"Lijst Correcties\"** per maand en kun je daar ook weer verwijderen."
                    }
                ]
            },
            {
                "vraag": "Kan ik mijn gewerkte uren downloaden als PDF?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Ja. Ga naar **Persoonlijk &rarr; Mijn Rooster &rarr; Volledige maand** en klik rechtsboven op **\"Download PDF\"**. Kies een periode (standaard de vorige maand) en je krijgt een overzicht met per dienst de datum, dag, tijd, locatie, status en het aantal uren, plus het totaal — handig om zelf te bewaren of aan te leveren voor je administratie."
                    }
                ]
            },
            {
                "vraag": "Kan ik het hele weekrooster als overzichtelijke PDF downloaden om te printen?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Ja, via de knop **\"Weekoverzicht PDF\"** bovenaan de planningspagina (naast de knop \"PDF\"). Kies zelf de periode via de kalender — één week of meerdere achter elkaar — en vink aan welke medewerkers erin moeten staan. Je krijgt per week een duidelijk rooster-grid met alle medewerkers naast elkaar en maandag t/m zondag erboven, met kleurcodering per dagdeel (ochtend/middag/avond) en voor verlof. Ideaal om te printen of op te hangen."
                    }
                ]
            },
            {
                "vraag": "Hoe download ik als planner een urenoverzicht van een medewerker of van iedereen?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Ga naar **Beheer &rarr; Planning &rarr; Uren & Overzicht**. Onder het tabblad **\"Individuele Correcties\"** kies je een medewerker en een maand en klik je op **\"Download PDF\"** naast het totaal voor een overzicht van die ene medewerker."
                    },
                    {
                        "t": "p",
                        "x": "Wil je de uren van **iedereen** in één keer, ga dan naar het tabblad **\"Compleet Team Overzicht\"**, kies de maand en klik op **\"Download PDF\"**. Je krijgt dan één document met per medewerker de geplande uren, correcties en het eindtotaal, plus een teamtotaal onderaan — bruikbaar voor de loonadministratie."
                    },
                    {
                        "t": "p",
                        "x": "Wil je juist een **vrij te kiezen periode** (niet per se een hele kalendermaand) en zelf bepalen welke medewerkers erin komen, gebruik dan de knop **\"Download PDF\"** bovenaan op de hoofdpagina van **Planning** (naast \"Afdrukken\"). Je kiest daar een van/tot-datum en vinkt de gewenste medewerkers aan (standaard iedereen); je krijgt dan per medewerker een gedetailleerde lijst met diensten en tijden, net als bij de individuele download, maar dan voor je eigen gekozen selectie in één bestand."
                    },
                    {
                        "t": "p",
                        "x": "Alle drie de PDF's zijn voorzien van het WebPlanning-logo, zodat ze herkenbaar zijn als een officiële export."
                    }
                ]
            }
        ]
    },
    {
        "id": "verlof",
        "titel": "Verlof",
        "icoon": "airplane-outline",
        "artikelen": [
            {
                "vraag": "Hoe vraag ik verlof aan?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Ga naar **Persoonlijk &rarr; Verlof** en dien een nieuwe aanvraag in met de gewenste periode en een eventuele toelichting. Je aanvraag krijgt de status in behandeling totdat een planner of beheerder deze goedkeurt of afwijst. Onder **\"Mijn Historie\"** zie je al je eerdere aanvragen en je resterende verlofsaldo."
                    }
                ]
            },
            {
                "vraag": "Kan ik een verlofaanvraag weer intrekken?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Ja. Zolang een aanvraag nog niet (volledig) is verwerkt kun je deze zelf intrekken via de knop bij de aanvraag. Er verschijnt een bevestigingsvraag (\"Aanvraag Intrekken?\") zodat je dit niet per ongeluk doet."
                    }
                ]
            },
            {
                "vraag": "Hoe behandel ik verlofaanvragen van medewerkers?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Onder **Beheer &rarr; Ruil/Verlof** vind je alle openstaande **Verlofaanvragen** van je team. Je kunt deze per stuk goedkeuren of afwijzen. Bij **\"Team Verlofsaldo & Historie\"** zie je per medewerker het opgebouwde en opgenomen verlof, en via **\"Verlofuren Aanpassen\"** kun je het saldo handmatig corrigeren, bijvoorbeeld bij indiensttreding halverwege het jaar."
                    }
                ]
            },
            {
                "vraag": "Hoe meld ik me ziek?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Klik in **Persoonlijk &rarr; Mijn Rooster** op de dienst waarvoor je je ziek wilt melden en kies in het venster **\"Dienst Beheren\"** voor **\"Ziek melden\"**. Je kunt optioneel een korte toelichting toevoegen. De dienst krijgt direct de status **Ziek** en je planner of beheerder ziet de melding meteen terug in Ruil/Verlof-beheer."
                    },
                    {
                        "t": "p",
                        "x": "De knop **\"Ziek melden\"** verschijnt alleen bij nog niet verstreken diensten en alleen als jouw organisatie deze functie heeft ingeschakeld. Zie je de knop niet, vraag dan je beheerder om **\"Zelf Ziekmelden\"** aan te zetten bij Organisatie &rarr; Instellingen, of meld je zoals gebruikelijk telefonisch of via een bericht."
                    }
                ]
            }
        ]
    },
    {
        "id": "ruilbeurs",
        "titel": "Ruilbeurs",
        "icoon": "swap-horizontal",
        "artikelen": [
            {
                "vraag": "Hoe bied ik een dienst aan op de ruilbeurs?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Ga naar **Persoonlijk &rarr; Ruilbeurs** en kies bij een van jouw geplande diensten voor **\"Dienst aanbieden\"**. Andere medewerkers zien de dienst dan verschijnen bij **\"Beschikbare Diensten\"** en kunnen deze (deels) overnemen. Je kunt een dienst ook rechtstreeks aan een collega aanbieden via een **\"Direct Voorstel\"**."
                    }
                ]
            },
            {
                "vraag": "Wat is het verschil tussen een dienst overnemen, gedeeltelijk overnemen en een direct voorstel?",
                "blokken": [
                    {
                        "t": "li",
                        "x": "**Dienst overnemen** — je neemt een volledige dienst van een collega over die op de beurs staat."
                    },
                    {
                        "t": "li",
                        "x": "**Gedeeltelijk overnemen** — je neemt alleen een deel van de uren van een dienst over; de rest blijft bij de oorspronkelijke medewerker of gaat opnieuw de beurs op."
                    },
                    {
                        "t": "li",
                        "x": "**Direct Voorstel** — je stuurt zelf een ruil- of overname-voorstel naar een specifieke collega, zonder dat de dienst eerst openbaar op de beurs staat."
                    }
                ]
            },
            {
                "vraag": "Moet een ruil altijd door de planner worden goedgekeurd?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Dat hangt af van de organisatie-instelling **\"Ruilen Goedkeuren\"** (in te stellen door een beheerder onder Instellingen). Staat deze aan, dan moet elke ruil eerst goedgekeurd worden door een planner of beheerder voordat deze definitief is — te herkennen aan de status **\"Goedkeuring Planner\"** in je ruiloverzicht."
                    }
                ]
            },
            {
                "vraag": "Waar zie ik inkomende uitnodigingen en de status van mijn eigen verzoeken?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Op de ruilbeurspagina staan drie overzichten: **\"Inkomende Uitnodigingen\"** (voorstellen van collega's aan jou), **\"Jouw Uitgaande Verzoeken\"** (wat jij hebt aangevraagd) en **\"Jouw Aanbiedingen op de Beurs\"** (jouw diensten die nog openstaan). Onder **\"Jouw Status\"** zie je in één oogopslag of er actie van jou nodig is."
                    }
                ]
            },
            {
                "vraag": "Hoe beheer ik als planner alle ruilverzoeken van het team?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Onder **Beheer &rarr; Ruil/Verlof**, tabblad **\"Ruilverzoeken\"**, zie je alle ruilaanvragen die goedkeuring nodig hebben. Onder **\"Recente Acties\"** vind je een logboek van eerder afgehandelde ruil- en verlofzaken."
                    }
                ]
            }
        ]
    },
    {
        "id": "berichten",
        "titel": "Berichten & Mededelingen",
        "icoon": "chatbubbles-outline",
        "artikelen": [
            {
                "vraag": "Hoe verstuur ik een bericht naar een collega?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Ga naar **Persoonlijk &rarr; Berichten** en klik op **\"Nieuw Bericht\"**. Ongelezen berichten worden aangegeven met een rood bolletje op het Berichten-icoon in de navigatie, zowel op desktop als mobiel."
                    }
                ]
            },
            {
                "vraag": "Hoe stuur ik een mededeling naar het hele team?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Onder **Beheer &rarr; Mededelingen** kun je een bericht plaatsen dat zichtbaar is voor (een deel van) je organisatie, bijvoorbeeld voor belangrijke aankondigingen. Dit is iets anders dan de een-op-een Berichten van medewerkers onderling."
                    }
                ]
            }
        ]
    },
    {
        "id": "account",
        "titel": "Profiel & Beveiliging",
        "icoon": "person-circle-outline",
        "artikelen": [
            {
                "vraag": "Hoe wijzig ik mijn gegevens of wachtwoord?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Ga naar **Persoonlijk &rarr; Profiel**. Hier pas je je persoonlijke gegevens aan en kun je onder het kopje **\"Beveiliging\"** je wachtwoord wijzigen."
                    },
                    {
                        "t": "p",
                        "x": "Gebruik een uniek wachtwoord van minimaal 8 tekens en deel dit nooit met collega's, ook niet als jullie hetzelfde apparaat gebruiken."
                    }
                ]
            },
            {
                "vraag": "Ik zie verkeerde contract- of contactgegevens, wat nu?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Contract-, salaris- en contactgegevens worden beheerd door je planner of beheerder via **Medewerkers**. Neem contact met hen op, of open een support ticket als je er samen niet uitkomt."
                    }
                ]
            },
            {
                "vraag": "Hoe zet ik pushmeldingen aan en wanneer krijg ik die?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Ga naar **Persoonlijk &rarr; Profiel** en zet de schakelaar bij **\"Push Notificaties\"** aan. Je browser vraagt dan om toestemming voor meldingen — sta dit toe om ze te ontvangen. De schakelaar geldt per apparaat/browser; log je ook op je telefoon in, zet 'm daar apart aan."
                    },
                    {
                        "t": "p",
                        "x": "Je krijgt op dit moment een pushmelding bij:"
                    },
                    {
                        "t": "li",
                        "x": "Een **nieuw gepubliceerd rooster** met jouw diensten."
                    },
                    {
                        "t": "li",
                        "x": "De **uitslag van je verlofaanvraag** (goedgekeurd of afgewezen)."
                    },
                    {
                        "t": "li",
                        "x": "Een **nieuwe ziekmelding** van een collega (alleen voor planners/beheerders)."
                    },
                    {
                        "t": "p",
                        "x": "Zie je geen pushmeldingen terwijl de schakelaar aan staat, controleer dan of je browser meldingen voor WebPlanning niet stiekem blokkeert (via het slotje in de adresbalk)."
                    }
                ]
            }
        ]
    },
    {
        "id": "organisatie",
        "titel": "Organisatiebeheer",
        "icoon": "business-outline",
        "artikelen": [
            {
                "vraag": "Hoe voeg ik een nieuwe medewerker toe?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Ga naar **Organisatie &rarr; Medewerkers** en maak een nieuw personeelsdossier aan. Per medewerker vul je onder andere in: **Persoonsgegevens**, **Contact & Accountveiligheid**, **Functie & Locatie**, **Contract & Salaris** en de **Standaard Beschikbaarheid (Uren)**. Deze beschikbaarheid gebruikt de planner als uitgangspunt bij het inplannen van diensten."
                    }
                ]
            },
            {
                "vraag": "Hoe beheer ik locaties?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Onder **Organisatie &rarr; Locaties** richt je de vestigingen of afdelingen van je organisatie in. Medewerkers en diensten worden aan een locatie gekoppeld, zodat het rooster en de bezetting per locatie inzichtelijk zijn."
                    }
                ]
            },
            {
                "vraag": "Welke instellingen kan ik voor mijn organisatie aanpassen?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Onder **Organisatie &rarr; Instellingen** vind je onder meer:"
                    },
                    {
                        "t": "li",
                        "x": "**Bedrijfsgegevens** — naam, adres en algemene organisatie-informatie."
                    },
                    {
                        "t": "li",
                        "x": "**Standaard Openingstijden** en **Feest- & Sluitingsdagen** — bepalen wanneer er standaard wel of niet gepland wordt."
                    },
                    {
                        "t": "li",
                        "x": "**Rooster Zichtbaar** — regelt hoever medewerkers vooruit hun rooster mogen inzien."
                    },
                    {
                        "t": "li",
                        "x": "**Ruilen Goedkeuren** — bepaalt of ruilverzoeken eerst door een planner goedgekeurd moeten worden."
                    },
                    {
                        "t": "li",
                        "x": "**E-mail Meldingen** en **Push Notificaties** — welke gebeurtenissen een melding versturen."
                    },
                    {
                        "t": "li",
                        "x": "**App Permissies & Functies** en **Financieel & Administratie** — overige organisatie-brede opties."
                    }
                ]
            },
            {
                "vraag": "Wat betekent de instelling \"Zelf Ziekmelden\" en hoe zet ik hem aan?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Onder **Organisatie &rarr; Instellingen** staat de schakelaar **\"Zelf Ziekmelden\"**. Zet je deze aan, dan verschijnt bij medewerkers in **Mijn Rooster** op elke nog niet verstreken dienst de knop **\"Ziek melden\"**, waarmee ze die dienst zelf op status **Ziek** kunnen zetten — zonder dat jij als planner dit handmatig hoeft te verwerken."
                    },
                    {
                        "t": "p",
                        "x": "Alle ziekmeldingen kun je terugvinden onder **Beheer &rarr; Ruil/Verlof**, in het paneel **\"Ziekmeldingen\"**. Is een melding per ongeluk gedaan of is de collega toch inzetbaar, dan zet je de dienst daar met één klik terug naar een normale ingeplande dienst. Wil je de dienst laten overnemen door een collega, gebruik dan de ruilbeurs om een vervanger te vinden."
                    },
                    {
                        "t": "p",
                        "x": "Staat de schakelaar uit, dan blijft ziekmelden zoals gebruikelijk lopen via een telefoontje of bericht aan de planner."
                    }
                ]
            },
            {
                "vraag": "Wat is het dashboard en wat zie ik daar?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Het **Dashboard** geeft een snel overzicht van je organisatie: **Bezetting Vandaag**, wie er **Verlof Vandaag** heeft, wat er **Binnenkort** en **Toekomstig Verlof** op de planning staat, de **Urenverdeling** en eventuele **Systeem Meldingen**."
                    }
                ]
            },
            {
                "vraag": "Hoelang blijft onze data bewaard, en kan ik oude data opschonen?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Onder **Organisatie &rarr; Instellingen**, bij **\"Data & Bewaartermijn\"**, stel je in hoeveel maanden afgeronde diensten, verlofaanvragen en urencorrecties in WebPlanning bewaard blijven — van **1 tot maximaal 12 maanden**, standaard 6."
                    },
                    {
                        "t": "p",
                        "x": "WebPlanning is bedoeld om te plannen, niet om als langetermijnarchief voor je administratie te dienen. Heb je gegevens voor langer nodig (bijvoorbeeld voor je eigen wettelijke bewaarplicht), download dan op tijd een **PDF-overzicht** via Mijn Rooster of Planning. Wat er van jou als organisatie wordt verwacht op het gebied van bewaarplicht staat in onze voorwaarden."
                    },
                    {
                        "t": "p",
                        "x": "Verwijderen gebeurt **nooit automatisch**. Klik op **\"Bekijk wat verwijderd zou worden\"** om te zien hoeveel diensten, verlofaanvragen en correcties ouder zijn dan de ingestelde termijn. Ben je het daarmee eens, klik dan op **\"Nu definitief opschonen\"** en typ ter bevestiging **VERWIJDEREN**. Deze actie kan niet ongedaan worden gemaakt."
                    }
                ]
            }
        ]
    },
    {
        "id": "systeembeheer",
        "titel": "Systeembeheer",
        "icoon": "shield-checkmark-outline",
        "artikelen": [
            {
                "vraag": "Hoe voeg ik een nieuwe organisatie/klant toe aan WebPlanning?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Nieuwe klanten worden geregistreerd via de configuratiepagina (bedrijfsnaam en beheer-e-mailadres); daarna beheer je alle aangesloten organisaties centraal onder **System Admin &rarr; Admin Dashboard &rarr; Organisaties**."
                    }
                ]
            },
            {
                "vraag": "Waar beheer ik gebruikers en binnenkomende aanvragen op platformniveau?",
                "blokken": [
                    {
                        "t": "li",
                        "x": "**Gebruikers Beheer** — overzicht en beheer van alle accounts binnen alle organisaties."
                    },
                    {
                        "t": "li",
                        "x": "**Aanvragen** — inbox met binnengekomen leads/aanvragen van (potentiële) klanten, waarop je kunt reageren."
                    },
                    {
                        "t": "li",
                        "x": "**Superadmin Support** — alle support tickets van alle organisaties, om te beantwoorden of door te zetten."
                    }
                ]
            }
        ]
    },
    {
        "id": "support",
        "titel": "Support & Tickets",
        "icoon": "headset-outline",
        "artikelen": [
            {
                "vraag": "Ik vind mijn antwoord hier niet, wat nu?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Ga naar Support en open een nieuw ticket. Kies een duidelijk **Onderwerp**, de juiste **Categorie** (Algemeen, Technisch, Facturatie of Feature Aanvraag) en geef in de **Omschrijving** zoveel mogelijk detail, zodat we je sneller kunnen helpen. Geef daarnaast de juiste **Prioriteit** aan."
                    }
                ]
            },
            {
                "vraag": "Hoe volg ik de status van mijn ticket en reageer ik erop?",
                "blokken": [
                    {
                        "t": "p",
                        "x": "Al je tickets staan onder **\"Jouw Support Tickets\"** op de supportpagina, met status Open, In Behandeling, Opgelost of Gesloten. Klik op een ticket om de volledige conversatie te zien en zelf te reageren via het chatvenster onderaan."
                    }
                ]
            }
        ]
    }
];
