
// scripts/Halla/Halla/core/config.js

(function (global) {
    "use strict";
    var Halla = (global.Halla = global.Halla || {});

        // --- Herní Konstanty ---
        Halla.GAME_TITLE = "Halla";
        Halla.BASE_MAX_HEALTH = 100;

        // --- Předměty ---
        Halla.ULTIMATE_ITEMS = ["Šasi", "Zdroj", "Dokumentace", "Board", "Kabely", "difuzor", "BT jednotka"];
        Halla.ITEM_DISPLAY_NAMES = {
            "Šasi": "Šasi", "Zdroj": "Zdroj", "Dokumentace": "Dokumentace", "Board": "Board", "Kabely": "Kabely", "difuzor": "Difuzor", "BT jednotka": "BT Jednotka",
            "mince": "Mince", "Propiska": "Propiska", "Láhev rumu": "Láhev rumu", "Kočka": "Kočka",
            "ID karta": "ID karta", "Kámen": "Kámen", "Krabička cigaret": "Krabička cigaret",
            "Zapalovač": "Zapalovač", "Diplom": "Diplom", "Mega kafe": "Mega kafe",

            "Prošlá bageta": "Prošlá bageta", "Sponka na papír": "Sponka na papír", "Záhadný klíč": "Záhadný klíč", "Ohnutý plech": "Ohnutý plech",
            "Mrtvá myš": "Mrtvá myš", "Ponožka": "Ponožka", "Prázdná plechovka": "Prázdná plechovka", "Staré noviny": "Staré noviny",
            "Zlomená tužka": "Zlomená tužka", "Flekatý hrnek": "Flekatý hrnek", "Vyschlý fix": "Vyschlý fix", "Zrezivělý šroubek": "Zrezivělý šroubek",
            "Kus polystyrenu": "Kus polystyrenu", "Zmačkaný papír": "Zmačkaný papír", "Prázdná PET lahev": "Prázdná PET lahev", "Ožužlané párátko": "Ožužlané párátko",
            "Stará baterie": "Stará baterie", "Zbytek izolepy": "Zbytek izolepy", "Ulomený zub z pily": "Ulomený zub z pily", "Chuchvalec prachu": "Chuchvalec prachu",
            "Rozbité brýle": "Rozbité brýle", "Stará žvýkačka": "Stará žvýkačka", "Chuchvalec vlasů": "Chuchvalec vlasů", "Zaschlý štětec": "Zaschlý štětec",
            "Kus hadru": "Kus hadru","Krabice": "Krabice", "Prázdná krabička od sirek": "Prázdná krabička od sirek", "Zrezivělý hřebík": "Zrezivělý hřebík", "Pomačkaný kelímek": "Pomačkaný kelímek",
            "Roztrhaná účtenka": "Roztrhaná účtenka", "Zbytek sendviče": "Zbytek sendviče", "Ulepená izolepa": "Ulepená izolepa", "Prázdná baterie": "Prázdná baterie",
            "Rozbitý USB kabel": "Rozbitý USB kabel", "Zmačkaná vizitka": "Zmačkaná vizitka", "Kus drátu": "Kus drátu", "Stará propiska": "Stará propiska",
            "Pomačkaná plechovka": "Pomačkaná plechovka", "Rozbitý disk": "Rozbitý disk", "Zrezivělá matka": "Zrezivělá matka", "Kus molitanu": "Kus molitanu",
            "Zmačkaný obal od sušenek": "Zmačkaný obal od sušenek", "Prázdná tuba od lepidla": "Prázdná tuba od lepidla", "Ožužlaná tužka": "Ožužlaná tužka",
            "Stará žárovka": "Stará žárovka", "Zbytek provázku": "Zbytek provázku", "Ulomený kus plastu": "Ulomený kus plastu", "Zaschlý čajový sáček": "Zaschlý čajový sáček",
            "Pomačkaný papírek": "Pomačkaný papírek"
        };
        Halla.JUNK_ITEMS = [
            "Prošlá bageta", "Sponka na papír", "Záhadný klíč", "Ohnutý plech", "Mrtvá myš", "Ponožka", "Prázdná plechovka", "Staré noviny", "Zlomená tužka", "Flekatý hrnek",
            "Vyschlý fix", "Zrezivělý šroubek", "Kus polystyrenu", "Zmačkaný papír", "Prázdná PET lahev", "Ožužlané párátko", "Stará baterie", "Zbytek izolepy", "Ulomený zub z pily", "Chuchvalec prachu",
            "Rozbité brýle", "Stará žvýkačka", "Chuchvalec vlasů", "Zaschlý štětec", "Kus hadru", "Prázdná krabička od sirek", "Zrezivělý hřebík", "Pomačkaný kelímek",
            "Roztrhaná účtenka", "Zbytek sendviče", "Ulepená izolepa", "Prázdná baterie", "Rozbitý USB kabel", "Zmačkaná vizitka", "Kus drátu", "Stará propiska",
            "Pomačkaná plechovka", "Rozbitý disk", "Zrezivělá matka", "Kus molitanu", "Zmačkaný obal od sušenek", "Prázdná tuba od lepidla", "Ožužlaná tužka",
            "Stará žárovka", "Zbytek provázku", "Ulomený kus plastu", "Zaschlý čajový sáček", "Pomačkaný papírek"
        ];

        Halla.MAX_ITEMS_PER_ROOM = 4;

        Halla.SPECIAL_SPAWN_ITEMS = {
            "Propiska": { spawnRooms: ["kancl", "kancl_sachta", "chodba_ovr"] },
            "mince":    { spawnRooms: ["placek", "parkoviste", "parkoviste_ovr", "kurarna", "denni_mistnost"] },
            "ID karta": { spawnRooms: ["placek", "parkoviste", "parkoviste_ovr", "kurarna"] },
            "Kočka":    { spawnRooms: ["temna_mistnost"] },
            "Krabička cigaret": { spawnRooms: ["kurarna", "parkoviste_ovr", "denni_mistnost"] },
            "Zapalovač": { spawnRooms: ["kurarna", "parkoviste_ovr", "denni_mistnost", "kancl"] },
            "Diplom": { spawnRooms: ["kancl_tom", "zasedacka_ovr", "kancl"] },
            "Kámen": { spawnRooms: ["placek", "parkoviste", "parkoviste_ovr"] }
        };


        // --- Speciální Místnosti ---
        // Nová kategorie pro dynamické/respawnující se předměty
        Halla.DYNAMIC_ITEMS = {
            "Láhev rumu": {
                spawnRooms: ["kuchynka_ovr", "denni_mistnost", "kancl_tom", "zasedacka_ovr", "sklad", "kancl", "mistrovna", "placek"]
            },
            "Mega kafe": {
                spawnRooms: ["tajna_mistnost"]
            }
        };
        Halla.IVCA_ROOMS = ["zasedacka_ovr", "kuchynka_ovr", "kancl_sachta"];
        Halla.SLOT_SYMBOLS = ["🍋", "🍊", "⭐", "🔔", "🍑", "🍒", "💎"];

        // --- Mapa a UI ---
        Halla.MAP_ORIGIN_X = 0;
        Halla.MAP_ORIGIN_Y = 0;
        Halla.MAP_TEXT_HEIGHT = 1.0;
        Halla.PLAYER_TEXT_HEIGHT = 1.0;
        Halla.HEART_FONT_SIZE = 3.0;
        Halla.FONT_NAME = "Consolas"; // Nová konstanta pro font
        Halla.LAYER_PREFIX = "Halla_"; // Ponecháme pro případné budoucí použití
        Halla.LAYER_PLAYER = "Halla_Player";
        Halla.LAYER_BG = "Halla_BG";
        Halla.LAYER_BOSS = "Halla_Boss";
        Halla.LAYER_HEARTS = "HUD_SRDICKA"; // Přejmenováno z LAYER_UI a opraven název
        Halla.ANIMATION_FRAMES = 10;
        Halla.MAP_SYMBOLS = {
            player: "🧐", // Steampunk dobrodruh
            player_cat: "🐈", // Hráč s kočkou
            player_jindra: "👬​", // Symbolizuje mechanickou pomoc
            player_ivca: "👫", // Symbolizuje ochranný buff
            boss: "😈", // Mechanický boss
            boss_rage: "👿", // Rozzuřený boss
            michal: "👻", // Nepolapitelný Michal
            unique_npc: "🎩" // Výchozí pro unikátní NPC
        };

        // --- Nové konstanty pro unikátní NPC ---
        Halla.LAYER_UNIQUE_NPC = "Halla_Unique_NPC";
        Halla.UNIQUE_NPCS = {
            "honza":    { name: "Honza",    char: "😎", line: "Honza se na tebe jen unaveně podívá a řekne: 'Tohle musí být hotový do pátku...'" },
            "david":    { name: "David",    char: "👨", line: "David kolem tebe projde a zamumlá si pro sebe: 'Zase pondělí, co?'" },
            "martin":   { name: "Martin",   char: "👨‍🦱", line: "Martin se opírá o zeď a povzdechne si: 'Ty tu dnes budeš se mnou déle?'" },
            "misa":     { name: "Míša",     char: "👩‍💻", line: "Míša se na tebe usměje a prohodí: 'Hlavně se z toho nezbláznit.'" },
            "filip":    { name: "Filip",    char: "👨‍🎤", line: "Filip pospíchá na poradu: 'Ahoj, jak to jde?'" },
            "kristyna": { name: "Kristýna", char: "🙋‍♀️", line: "Kristýna si upraví účes a řekne: 'Dáme kafe?'" },
            "capino":   { name: "Čapíno",   char: "🤴", line: "Čapíno se zjeví a zase zmizí. Zanechá za sebou jen vůni čaje. Jako by z Tater." }
        };


        // --- Balancování Hry ---
        Halla.BALANCE = {
            // Boss
            bossMinSpawnDistance: 2,      // Těžší: Boss startuje blíže
            bossRageItemCount: 4,         // Těžší: Boss se rozzuří dříve
            bossJindraHeroItemCount: 4,
            bossSkipBase: 0.15,           // Těžší: Boss méně často přeskakuje tah
            bossDemotivatedBonus: 0.3,
            bossCatSkipBonus: 0.1,
            bossCatPanicChance: 0.15,
            bossRageExtraMoveChance: 0.20,  // Sníženo: Menší šance na dvojitý pohyb v rage módu
            // Eventy
            auditChance: 0.08, // Těžší: Větší šance na audit
            auditDmgMin: 5,
            auditDmgMax: 15,
            kocmanChance: 0.08,
            kocmanHealMin: 10,
            kocmanHealMax: 25,
            zkratChance: 0.08, // Těžší: Větší šance na zkrat
            zkratDmgMin: 8,
            zkratDmgMax: 18,
            zkratPerkChance: 0.5,
            // Roaming
            ivcaMoveChance: 0.4,
            ivcaBuffTurns: 2,             // Těžší: Kratší trvání Ivčina buffu
            ivcaBuffDmgMul: 0.5,
            // Místnosti
            michalEndingChance: 0.15, // Šance na konec hry po dopadení Michala
            michalPerkDoubleMoveChance: 0.15, // Šance na tah zdarma s perkem "Štvanice"
            roomHealBaseMul: 1.0,
            coffeeBoostHealMul: 1.5,
            // Nové: Rozsah pro náhodné léčení a poškození z místností
            roomDefaultHealMin: 5,            // Beze změny
            roomDefaultHealMax: 30,           // Těžší: Nižší maximální heal (bylo 20)
            roomDefaultDmgMin: 5,             // Těžší: Vyšší minimální damage (bylo 3)
            roomDefaultDmgMax: 20,            // Těžší: Vyšší maximální damage (bylo 15)
            kurarnaHealBase: 20,
            kurarnaHealMul: 1.0,
            ovrMindDmgMul: 0.7,
            lightFootDodgeChance: 0.20,       // Sníženo: Šance na vyhnutí se poškození z prostředí
            // Předměty
            rumHealAmount: 25,                // Sníženo: Rum léčí méně, protože je snazší ho najít (bylo 30)
            megaKafeHealAmount: 60,
            // Endings
            pepikEndingVisitCount: 3,
            // Replay
            replaySpeed: 50,                  // Rychlost přehrávání v ms (nižší = rychlejší)
            // Automat
            slotSpins: 3,
            slotAnimFrames: 15,
            slotAnimDelay: 50,
            slotResultDelay: 1000,
            gamblerPerkFrustrationChance: 0.33, // Šance, že se hráč zraní o automat
            gamblerPerkFrustrationDmgMin: 5,
            gamblerPerkFrustrationDmgMax: 15,
            // Nový perk "Šroťák"
            scroungerPerkChance: 0.25,        // Šance na nalezení extra harampádí
            scroungerPerkRequirement: 5,      // Počet různých harampádí pro získání perku
            // Nový perk "Stopař"
            trackerPerkRequirement: 10,       // Počet naslouchání pro získání perku
            // Ambient
            ambientMessageChance: 0.2,
            // Unikátní NPC
            uniqueNpcSpawnChance: 0.15, // Šance na spawn každý tah, pokud žádný není
            uniqueNpcLifetime: 10       // Počet tahů, než NPC zmizí
        };

        // --- Třídy Hráče ---
        Halla.PLAYER_CLASSES = {
            "vyrobni_barbar": {
                label: "Výrobní Barbar",
                desc: "Vydrží víc, ale je trochu nešikovný.",
                maxHealthMul: 1.2,
                envDamageMul: 1.1,
                moreEvents: true,
                bossSpawnDistanceMul: 0.8, // Boss se objeví blíže
                rumResistChance: 0.25,      // Šance, že se nespotřebuje rum
                bossVisibilityMod: 5       // Boss je vidět každý 5. tah
            },
            "kancelarska_krysa": {
                label: "Kancelářská Krysa",
                desc: "Lépe slyší bosse a má větší štěstí na heal.",
                maxHealthMul: 0.9,
                healMul: 1.2,
                betterListen: true,
                bossSpawnDistanceMul: 1.5, // Boss se objeví dále
                catSoothingEffect: 0.15,    // Extra šance na skip bosse s kočkou
                bossVisibilityMod: 3       // Boss je vidět každý 3. tah
            },
            "systemovy_inzenyr": {
                label: "Systémový Inženýr",
                desc: "Boss ho častěji ignoruje.",
                maxHealthMul: 1.0,
                bossSkipMul: 1.25,
                bossSpawnDistanceMul: 1.0, // Standardní vzdálenost
                zkratResistChance: 0.75,    // Šance na odvrácení poškození ze zkratu
                bossVisibilityMod: 4       // Boss je vidět každý 4. tah
            }
        };

        // --- Popisy perků pro deník ---
        Halla.PERK_DESCRIPTIONS = {
            "secondChance": "Jednorázová záchrana před bossem.",
            "OVRmind": "Snížený damage z prostředí.",
            "coffeeBoost": "Zvýšený heal z místností.",
            "cableWizard": "Ochrana před příštím zkratem.",
            "stvanice": "Dohonil jsi Michala. Díky tomu se občas pohneš dvakrát za tah.",
            "gambler": "První zkušenost s automatem v tobě zanechala frustraci. Občas si při prohře ublížíš.",
            "lightFoot": "Máš šanci vyhnout se poškození z prostředí.",
            "srotak": "Tvé oči, zvyklé na hledání pokladů v chaosu Hally, občas najdou něco navíc.",
            "stopar": "Tvůj sluch, zostřený neustálým strachem, dokáže přesněji určit polohu blížícího se nebezpečí."
        };

        // --- Ambientní hlášky ---
        Halla.AMBIENT_MESSAGES = [
            "Zaslechl jsi vzdálené 'vle, vle, hmm...'",
            "Někde spadla krabice. Nebo člověk. Nebo Pepa.",
            "Projel kolem tebe ještěr s prázdnýma paletama.",
            "Z vedlejší místnosti se ozývá tichý pláč.",
            "Cítíš vůni spálené elektroniky a beznaděje.",
            "Vzpomněl sis na vtip, ale pak sis uvědomil, kde jsi, a zase tě to přešlo.",
            "Zaslechl jsi, jak někdo říká 'To se musí stihnout do pátku'. Byl pátek večer.",
            "Někde v dálce se ozval zvuk rozbíjejícího se skla. Asi další difuzor.",
            "Zhasla a zase se rozsvítila světla. Asi jen testují nouzové osvětlení. Snad.",
            "Kolem tebe prošel někdo s prázdným výrazem. Ani tě nepozdravil.",
            "Na zdi visí motivační plakát 'Týmová práce!'. Působí spíš demotivačně.",
            "Zaslechl jsi tiché klepání na zeď. Asi jen myši. Nebo něco horšího.",
            "Vzduch je těžký. Cítíš, jak se ti lepí na plíce.",
            "Z reproduktorů se ozývá monotónní hlášení, kterému nikdo nerozumí. Zní to jako 'vle, vle, hmm...'",
            "Na schodech spí osamělí Vojta. Nechceš vědět, co se stalo. Dáš selfie a jdeš dál.",
            "Z kuchyňky se line vůně něčeho, co kdysi mohlo být jídlo.",
            "Slyšíš, jak se někdo v kanclu vedle směje. Zní to spíš jako pláč.",
            "Na zemi je rozsypaný toner. Černý prach apokalypsy.",
            "Z tiskárny vyjel papír s jediným nápisem: 'ENTER THE VOID'.\nProč to sakra vypadá jako vytisknuté z krve?"
        ];

        // --- Nové texty pro poškození z prostředí ---
        Halla.ROOM_DAMAGE_MESSAGES = [
            "Zakopl jsi o poházené díly.",
            "Praštil ses do hlavy o nízko visící kabel.",
            "Nadýchal ses toxických výparů z pájení.",
            "Dostal jsi ránu od špatně uzemněného zařízení.",
            "V téhle díře na tebe padá deprese a kus omítky.",
            "Uklouzl jsi na neznámé tekutině na podlaze.",
            "Z regálu na tebe spadla krabice plná starých dokumentů.",
            "Všudypřítomný prach a špína ti dráždí plíce.",
            "Ostrý plech ti rozřízl kalhoty a trochu i nohu.",
            "Monotónní zvuk strojů ti způsobuje migrénu."
        ];

})(this);