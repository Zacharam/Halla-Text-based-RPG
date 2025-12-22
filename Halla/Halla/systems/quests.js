// scripts/Halla/Halla/systems/quests.js
// Quest systém: registry + init + triggery (questové).
// (Ano, pořád je to "systém", ne příběh. Příběh je HR oddělení.)

(function (global) {
    "use strict";
    // Sjednocení s ostatními soubory: bezpečná reference na Halla namespace
    global.Halla = global.Halla || {};
    var Halla = global.Halla;
    // --------------------------------------
    //   QUEST API
    // --------------------------------------

    Halla.addQuest = function (id, data) {
        var gs = Halla.gameState;
        if (!gs) return;
        if (!gs.activeQuests[id]) {
            // POZOR: V QtScript může přímé přiřazení nového objektu ({})
            // někdy přepsat celý Halla namespace. Použijeme bezpečnější metodu.
            var newQuest = new Object(); // Create a new object safely
            newQuest.status = "active";  // Populate its properties
            // POZOR: `data || {}` je také nebezpečné. Nahradíme to explicitním checkem.
            newQuest.data = data ? data : new Object();
            gs.activeQuests[id] = newQuest; // Assign the reference
        }
    };

    Halla.completeQuest = function (id) {
        var gs = Halla.gameState;
        if (!gs || !gs.activeQuests || !gs.activeQuests[id]) return;
        gs.activeQuests[id].status = "done";
    };

    Halla.isQuestDone = function (id) {
        var gs = Halla.gameState;
        if (!gs) return false;
        return (gs.activeQuests &&
                gs.activeQuests[id] &&
                gs.activeQuests[id].status === "done");
    };

    // --------------------------------------
    //   INIT QUESTŮ
    // --------------------------------------

    Halla.initQuests = function () {
        var gs = Halla.gameState;
        if (!gs) return;
        // POZOR: V QtScript může přímé přiřazení nového objektu ({})
        // někdy přepsat celý Halla namespace. Použijeme bezpečnější metodu.
        gs.activeQuests = new Object();

        Halla.addQuest("tom_pen", null); // Pass null instead of an empty object literal
        var kubaCigaraData = new Object();
        kubaCigaraData.done = false;
        Halla.addQuest("kuba_cigara", kubaCigaraData);
        
        // Umístění Propisky bylo přesunuto do state.js -> resetGame pro centralizaci.
    };

    // --------------------------------------
    //   UDÁLOSTI PŘI VSTUPU DO MÍSTNOSTI
    // --------------------------------------
    Halla.handleRoomEntryEvents = function () {
        var gs = Halla.gameState;
        if (!gs) return;

        var roomId = gs.currentRoom;

        // --- ZÁKLADNÍ AKCE ---
        // Zápis objevené místnosti do deníku
        if (typeof Halla.journalDiscoverRoom === "function") {
            Halla.journalDiscoverRoom(roomId);
        }

        // Počítadlo návštěv u Pepíka (pro secret ending)
        if (roomId === "pepik") {
            gs.endings.pepikVisitCount = (gs.endings.pepikVisitCount || 0) + 1;
        }

        // --- QUESTY A PERKY ---
        // Quest: Tom a jeho ztracená propiska
        if (roomId === "kancl_tom" && !Halla.isQuestDone("tom_pen")) {
            if (Halla.hasItemInInventory("Propiska")) {
                Halla.takeItemFromInventory("Propiska");
                gs.stats.itemUsed = true; // Příznak pro achievement "Přežití o suchu"

                Halla.completeQuest("tom_pen");
                Halla.grantPerk("secondChance", true);
                if (typeof Halla.journalAddPerk === "function") {
                    Halla.journalAddPerk("secondChance");
                }

                Halla.showInfo(
                    "Tom si od tebe vzal Propisku.\n" +
                    "Poděkoval ti suchým 'dík'.\n\n" +
                    "Získáváš perk: Jednorázová druhá šance, když tě chytí boss."
                );
            }
        }

        // Quest: Kuba & Kuba a jejich závislost
        if (roomId === "kurarna" && !Halla.isQuestDone("kuba_cigara")) {
            if (Halla.hasItemInInventory("Krabička cigaret") &&
                Halla.hasItemInInventory("Zapalovač")) {

                Halla.completeQuest("kuba_cigara");

                var actualHeal = (typeof Halla.changeHealth === "function")
                    ? Halla.changeHealth(10, "Cigáro s Kubou a Kubou")
                    : 0;

                Halla.showInfo(
                    "Kuba a Kuba si od tebe berou cigára.\n" +
                    "Abys neurazil, dáš si taky jedno.\n+" + actualHeal +
                    " HP a v kurárně tě berou jako svého."
                );

                if (typeof Halla.journalAddNPC === "function") {
                    Halla.journalAddNPC(
                        "Kuba & Kuba",
                        "Dva Kuby z kuřárny, co s tebou sdílí nikotin a existenciální krizi."
                    );
                }
            }
        }

        // Perk: OVR mindset v tajné místnosti
        if (roomId === "tajna_mistnost" && !Halla.hasPerk("OVRmind")) {
            Halla.grantPerk("OVRmind", true);
            if (typeof Halla.journalAddPerk === "function") {
                Halla.journalAddPerk("OVRmind");
            }

            Halla.showInfo(
                "Chvíli civíš na hromadu papírů a podpisů.\n" +
                "Uvnitř tebe něco umřelo, ale jsi odolnější.\n" +
                "Získáváš perk: OVR mindset (menší damage z prostředí)."
            );
        }

        // --- SETKÁNÍ S NPC ---
        // Setkání s Jindrou
        if (!gs.hasJindra && gs.jindraRoom === roomId) {
            gs.hasJindra = true;

            Halla.showInfo(
                "Nacházíš Jindru.\nChvíli na tebe kouká, pak jen pokrčí rameny:\n" +
                "\"Tak jo, jdu s tebou.\"\n\n" +
                "Jindra se k tobě přidává a bude tě bránit před bossem."
            );

            if (typeof Halla.journalAddNPC === "function") {
                Halla.journalAddNPC(
                    "Jindra",
                    "NPC, co tě může zachránit před bossem. Dělá hero endingy."
                );
            }
        }

        // Setkání s Ivčou
        if (gs.ivcaRoom && roomId === gs.ivcaRoom) {
            gs.ivcaBuffTurns = Halla.BALANCE.ivcaBuffTurns;

            Halla.showInfo(
                "Potkáváš Ivču.\n" +
                "Chvíli si tě měří pohledem a pak si jen povzdechne:\n" +
                "\"Ty to dneska nedáš… tak na pár směn tě podržím.\"\n\n" +
                "Získáváš dočasnou redukci environmentálního poškození o 50 %\n" +
                "(platí pro následující " + Halla.BALANCE.ivcaBuffTurns + " tahy)."
            );

            if (typeof Halla.journalAddNPC === "function") {
                Halla.journalAddNPC(
                    "Ivča",
                    "Roaming NPC, co ti umí na chvíli snížit damage z prostředí."
                );
            }
        }
    };

})(this);
