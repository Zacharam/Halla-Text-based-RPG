// scripts/Halla/Halla/data/rooms.js
// Definice všech místností + tajná místnost.
// Jen data. Když tady přidáš if(), přijdu ti rozbít klávesnici.
// (Výjimka: 2 řádky defenzivní inicializace, protože QtScript je tragédie.)


(function (global) {
    "use strict";
    // Sjednocení s ostatními soubory: bezpečná reference na Halla namespace
    global.Halla = global.Halla || {};
    var Halla = global.Halla;

    // --- DEFENZIVNÍ INIT (aby to nepadalo když map.js ještě nic nenastavil) ---
    Halla.rooms = Halla.rooms || {};
    Halla.ROOM_CHAR_POS = Halla.ROOM_CHAR_POS || {};

    // --------------------------------------
    //   DEFINICE MÍSTNOSTÍ
    // --------------------------------------

    Halla.rooms["placek"] = {
            description:
                "Plácek před firmou. Legendární startovní lokace.\n" +
                "Zde se konají osudová setkání.\n" +
                "Všude kolem je klid před bouří.",
            exits: { "doprava": "parkoviste", "dolu": "parkoviste_ovr" },
            items: []
        };
    
    Halla.rooms["parkoviste"] = {
            description:
                "Velké parkoviště. Pár aut, pár osudů.\n" +
                "Pár vraků, protože Halla už všechny propustila.",
            exits: { "doleva": "placek", "dolu": "denni_mistnost", "doprava": "pepik" },
            items: []
        };
    
    Halla.rooms["pepik"] = {
            description:
                "Pepík. Entita nejasného původu se schovává v poli.\n" +
                "Za stéblem trávy číhá nebezpečí.\n" +
                "Pepík tě napadne a vyžere ti mozek z hlavy.",
            exits: { "doleva": "parkoviste" },
            items: [],
            damage: true
        };
    
    Halla.rooms["denni_mistnost"] = {
            description:
                "Denní místnost. Gauč, kafe, vyhořelí lidi.\n" +
                "Chvilka klidu před bouří.\n" +
                "Můžeš si tu trochu odpočinout.",
            exits: { "nahoru": "parkoviste", "dolu": "mistrovna" },
            items: [],
            heal: true
        };
    
    Halla.rooms["dilna_vyroba"] = {
            description:
                "Dílna výroba. Všude svítidla a bordel.\n" +
                "Otočíš se a vidíš pana Kameníka.\n" +
                "Je čas vzít nohy na ramena.",
            exits: { "doprava": "mistrovna", "nahoru": "houston", "dolu": "vestibul_ovr" },
            items: [],
            damage: true
        };
    
    Halla.rooms["dilna_mechanicka"] = {
            description:
                "Mechanická dílna. Plechy a prsty v ohrožení.\n" +
                "Stroje tu dělají kravál.",
            exits: { "doleva": "mistrovna", "dolu": "sklad", "doprava": "kobot" },
            items: [],
            damage: true
        };
    
    Halla.rooms["houston"] = {
            description:
                "Houston. Řídící centrum chaosu.\n" +
                "Kubík se ti jen směje.",
            exits: { "dolu": "dilna_vyroba" },
            items: [],
            damage: true
        };
    
    Halla.rooms["mistrovna"] = {
            description:
                "Mistrovna. Tady se rozdávají úkoly a průšvihy.\n" +
                "Beznaděj všude kolem.\n" +
                "Hned jsi dostal pojeb!",
            exits: {
                "nahoru": "denni_mistnost",
                "doleva": "dilna_vyroba",
                "doprava": "dilna_mechanicka"
            },
            items: [],
            damage: true
        };
    
    Halla.rooms["sklad"] = {
            description:
                "Sklad. Regály, krabice, zoufalství.\n" +
                "Najdeš tu spoustu užitečných věcí.\n" +
                "Teoreticky level 100 chodeb.",
            exits: {
                "nahoru": "dilna_mechanicka",
                "doprava": "osazovacka",
                "doleva": "dilna_ovr",
                "dolu": "temna_mistnost"
            },
            items: [],
            damage: true
        };
    
    Halla.rooms["osazovacka"] = {
            description:
                "Osazovačka. Stroje jedou, lidi trpí.\n" +
                "Cvak cvak cvak.",
            exits: { "doleva": "sklad" },
            items: [],
            damage: true
        };
    
    Halla.rooms["dilna_ovr"] = {
            description:
                "Dílna OVR. Místo, kde projekty umírají.\n" +
                "Je tu tolik nepořádku, že bys tu mohl najít poklad.\n" +
                "Zde složíš ultimátní svítidlo.",
            exits: {
                "dolu": "zasedacka_ovr",
                "doprava": "sklad",
                "doleva": "vestibul_ovr"
            },
            items: [],
            damage: true,
            win: true
        };
    
    Halla.rooms["zasedacka_ovr"] = {
            description:
                "Zasedačka OVR. Kolik se sem asi vejde lidí?\n" +
                "Killingy převlečené za meetingy.",
            exits: { "nahoru": "dilna_ovr" },
            items: []
        };
    
    Halla.rooms["kuchynka_ovr"] = {
            description:
                "Kuchyňka OVR.\n" +
                "Kafe, mikrovlnka a pasivní agrese.\n" +
                "Tady si můžeš odpočinout a načerpat energii.\n" +
                "Někdo tu 'zapomněl' láhev rumu.",
            exits: {
                "nahoru": "shody_ovr",
                "doleva": "kancl_sachta",
                "doprava": "chodba_ovr"
            },
            items: [],
            heal: true
        };
    
    Halla.rooms["chodba_ovr"] = {
            description:
                "Chodba OVR.\n" +
                "Tunel mezi nadějí a rezignací. Vidíš tu pár experimentů.",
            exits: {
                "doleva": "kuchynka_ovr",
                "doprava": "temna_mistnost",
                "dolu": "kancl"
            },
            items: [],
            damage: true
        };
    
    Halla.rooms["kancl_sachta"] = {
            description:
                "Kancl nebo šachta.\n" +
                "Je tu tak stísněně, že ti někdo hodil šutrem po hlavě.",
            exits: { "doprava": "chodba_ovr" },
            items: [],
            damage: true
        };
    
    Halla.rooms["kancl"] = {
            description:
                "Random kancl.\n" +
                "Pár monitorů, hodně cynismu.\n" +
                "Spousta stolů, lidu málo.",
            exits: { "nahoru": "chodba_ovr" },
            items: [],
            damage: true
        };
    
    Halla.rooms["temna_mistnost"] = {
            description:
                "Temná místnost.\n" +
                "Nic nevidíš, ale něco slyšíš.\n" +
                "mňau.",
            exits: {
                "doleva": "chodba_ovr",
                "doprava": "kancl_tom",
                "nahoru": "sklad"
            },
            items: [],
            damage: true
        };
    
    Halla.rooms["kancl_tom"] = {
            description:
                "Tomův kancl.\n" +
                "Místo, kde se plánuje světová dominance.",
            exits: { "doleva": "temna_mistnost" },
            items: []
        };
    
    Halla.rooms["parkoviste_ovr"] = {
            description:
                "Parkoviště OVR/R&D.\n" +
                "Inovace i křápy. Vidíš tu své oblíbené místo na cigárko.",
            exits: { "nahoru": "placek", "doprava": "kurarna" },
            items: []
        };
    
    Halla.rooms["kurarna"] = {
            description:
                "Kuřárna.\n" +
                "Život se tu krátí rychleji.",
            exits: { "doleva": "parkoviste_ovr", "doprava": "vestibul_ovr" },
            items: [],
            heal: true
        };
    
    Halla.rooms["vestibul_ovr"] = {
            description:
                "Vestibul OVR.\n" +
                "Brána do jiného světa.",
            exits: {
                "doleva": "kurarna",
                "dolu": "shody_ovr",
                "nahoru": "dilna_vyroba",
                "doprava": "dilna_ovr"
            },
            items: [],
            damage: true
        };
    
    Halla.rooms["kobot"] = {
            description:
                "Kobot@Luboš.\n" +
                "Možná tě nahradí.\n" +
                "Možná tě zabije.",
            exits: { "doleva": "dilna_mechanicka" },
            items: [],
            heal: true
        };
    
    Halla.rooms["shody_ovr"] = {
            description:
                "Schody OVR.\n" +
                "Rozhodně ne do nebe.",
            exits: { "nahoru": "vestibul_ovr", "dolu": "kuchynka_ovr" },
            items: [],
            damage: true
    };

    // --------------------------------------
    //   TAJNÁ MÍSTNOST
    // --------------------------------------

    Halla.rooms["tajna_mistnost"] = {
        description:
            "Tajná místnost OVR.\n" +
            "Tohle není v půdorysu.\n" +
            "Uvnitř tebe něco umřelo.",
        exits: { "nahoru": "kuchynka_ovr" },
        items: [],
        heal: true
    };

    // --------------------------------------
    //   POZICE MÍSTNOSTÍ NA MAPĚ
    // --------------------------------------
    Halla.ROOM_CHAR_POS = {
        "placek":           { x: 19, y: 3 },
        "parkoviste":       { x: 45, y: 2 },
        "denni_mistnost":   { x: 49, y: 8 },
        "dilna_vyroba":     { x: 27, y: 13 },
        "dilna_mechanicka": { x: 66, y: 13 },
        "houston":          { x: 33, y: 8 },
        "mistrovna":        { x: 48, y: 13 },
        "sklad":            { x: 64, y: 23 },
        "osazovacka":       { x: 87, y: 23 },
        "dilna_ovr":        { x: 32, y: 18 },
        "zasedacka_ovr":    { x: 36, y: 24 },
        "kuchynka_ovr":     { x: 21, y: 31 },
        "chodba_ovr":       { x: 36, y: 31 },
        "kancl_sachta":     { x: 10, y: 32 },
        "kancl":            { x: 25, y: 37 },
        "temna_mistnost":   { x: 62, y: 32 },
        "kancl_tom":        { x: 84, y: 32 },
        "parkoviste_ovr":   { x: 3,  y: 18 },
        "kurarna":          { x: 10, y: 18 },
        "vestibul_ovr":     { x: 19, y: 18 },
        "kobot":            { x: 86, y: 14 },
        "shody_ovr":        { x: 21, y: 23 },
        "pepik":            { x: 69, y: 2 },
        "tajna_mistnost":   { x: 8, y: 25 }
    };

})(this);
