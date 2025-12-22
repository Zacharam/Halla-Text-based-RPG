// scripts/Halla/Halla/systems/endings.js
// Speciální endingy (Pepík/Rum/Escape).
// Končí přes Halla.endGameWithSummary (bude v summary.js).

(function () {
    // Bezpečná reference na globální jmenný prostor
    var Halla = this.Halla || (this.Halla = {});

    // Datově řízený přístup: definice všech speciálních konců na jednom místě.
    // Přidání nového konce znamená pouze přidání nového objektu do tohoto pole.
    var SPECIAL_ENDINGS = [
        {
            id: "pepikEnding",
            condition: function(gs) {
                return gs.currentRoom === "pepik" &&
                       gs.endings.pepikVisitCount >= Halla.BALANCE.pepikEndingVisitCount;
            },
            message: "Pepík tě nenechá odejít.\n" +
                     "Začne ti vyprávět svůj příběh. A další. A další...\n\n" +
                     "Zůstáváš u něj navždy.\n(Pepík ending)"
        },
        {
            id: "rumEnding",
            condition: function(gs) {
                return gs.currentRoom === "placek" &&
                       Halla.hasItemInInventory("Láhev rumu");
            },
            interactive: {
                question: "Vytáhneš láhev rumu a posadíš se na plácek. Chceš to dneska zabalit a prostě se opít?",
                yesText: "Ano, na zdraví!",
                noText: "Ne, ještě není konec",
                onYes: {
                    message: "Svět může shořet, Halla může vybouchnout.\n" +
                             "Tebe už to dneska nezajímá.\n\n" +
                             "Jsi opilej a pokojnej. (Rum ending)"
                },
                onNo: {
                    message: "Při schovávání lahve ti nešikovně vyklouzne z ruky a rozbije se o beton.\n" +
                             "Zůstala po ní jen lepkavá louže a pocit zmaru.",
                    action: function(gs) {
                        Halla.takeItemFromInventory("Láhev rumu");
                    }
                }
            }
        },
        {
            id: "escapedWithCatAndCigs",
            condition: function(gs) {
                return gs.currentRoom === "parkoviste_ovr" &&
                       Halla.hasItemInInventory("Kočka") &&
                       Halla.hasItemInInventory("Krabička cigaret") &&
                       Halla.hasItemInInventory("Zapalovač");
            },
            // Nová interaktivní sekce
            interactive: {
                question: "Vidíš svoje auto. Kočka se ti otírá o nohy a chce už domů.\n" +
                          "V kapse máš cigarety. Tohle je tvoje šance prostě odjet.\n\n" +
                          "Chceš utéct z práce?",
                yesText: "Ano, odjet",
                noText: "Ne, zůstat",
                onYes: {
                    message: "Sedíš v autě na parkovišti OVR.\n" +
                             "Kočka na klíně, krabička cigaret v kapse.\n" +
                             "Nastartuješ a odjíždíš pryč.\n\n" +
                             "Utíkáš z práce a sereš na to.\n(Escape ending)"
                },
                onNo: {
                    message: "Váháš příliš dlouho. Kočka ztratí trpělivost, škrábne tě a uteče.\n" +
                             "Tvá nerozhodnost rozzuřila bosse. Hra bude odteď těžší.",
                    action: function(gs) {
                        Halla.takeItemFromInventory("Kočka");
                        gs.endings.choseToStay = true; // Nový příznak pro achievement
                        if (gs.boss && !gs.boss.rage) gs.boss.rage = true;
                    }
                }
            }
        },
        {
            id: "sabotageEnding",
            condition: function(gs) {
                return gs.currentRoom === "kuchynka_ovr" &&
                       Halla.hasItemInInventory("Kámen");
            },
            interactive: {
                question: "Stojíš v kuchyňce OVR, v ruce držíš Kámen. Zíráš na mikrovlnku a napadne tě geniální/stupidní nápad...\n\nChceš hodit Kámen do mikrovlnky?",
                yesText: "Ano, hodit!",
                noText: "Ne, to je blbost",
                onYes: {
                    message: "S uspokojivým křupnutím se Kámen zaboří do dvířek mikrovlnky. Všechno zhasne.\nV Halle zavládne tma a ticho. Možná jsi to všechno rozbil. Možná jsi všechny zachránil.\n\nKaždopádně máš padla. (Sabotáž ending)"
                },
                onNo: {
                    message: "Nakonec si to rozmyslíš. Ještě bys to musel platit. Schováš Kámen zpátky do kapsy.",
                    action: function(gs) { /* Žádná akce */ }
                }
            }
        },
        {
            id: "corporatePartnerEnding",
            condition: function(gs) {
                // Konec se spustí, pokud je hráč ve stejné místnosti jako Filip a má Diplom.
                return gs.uniqueNpc && gs.uniqueNpc.activeNpcId === 'filip' &&
                       gs.currentRoom === gs.uniqueNpc.room &&
                       Halla.hasItemInInventory("Diplom");
            },
            interactive: {
                question: "Zastavíš Filipa, který pospíchá na poradu, a ukážeš mu svůj Diplom. Zastaví se a nevěřícně na něj zírá.\n'Páni... s tímhle bys mohl vést celou Hallu! Nechceš se stát mým partnerem v novém startupu na optimalizaci porad?'",
                yesText: "Ano, přijmout nabídku",
                noText: "Ne, děkuji",
                onYes: {
                    message: "S radostí přijímáš. Konečně tě někdo ocenil.\nZůstáváš s Filipem a budujete spolu impérium založené na nekonečných poradách a korporátních buzzwordech.\n\n(Korporátní Společník ending)"
                },
                onNo: {
                    message: "S díky odmítneš. Kariéra v managementu porad není nic pro tebe. Zatím.",
                    action: function(gs) {
                        // Aby se konec neopakoval, Filip zmizí.
                        gs.uniqueNpc.activeNpcId = null;
                        gs.uniqueNpc.room = null;
                    }
                }
            }
        }
    ];

    Halla.checkSpecialEndings = function () {
        var gs = Halla.gameState;
        if (!gs || !gs.running) return;

        for (var i = 0; i < SPECIAL_ENDINGS.length; i++) {
            var ending = SPECIAL_ENDINGS[i];

            // Zkontrolujeme, zda konec již nenastal a zda je splněna podmínka
            if (!gs.endings[ending.id] && ending.condition(gs)) {
                gs.endings[ending.id] = true; // Označíme konec jako "zobrazený", aby se neopakoval

                if (ending.interactive) {
                    // Interaktivní konec s volbou
                    var choice = ending.interactive;
                    if (Halla.askYesNo(Halla.GAME_TITLE, choice.question, choice.yesText, choice.noText)) {
                        Halla.endGameWithSummary(choice.onYes.message);
                    } else {
                        Halla.showInfo(choice.onNo.message);
                        if (typeof choice.onNo.action === 'function') choice.onNo.action(gs);
                    }
                } else {
                    // Standardní, automatický konec
                    Halla.endGameWithSummary(ending.message);
                }
                return; // Ukončíme po prvním spuštěném konci
            }
        }
    };

})();

(function (global) {
    "use strict";
    var Halla = global.Halla = global.Halla || {};

    /**
     * Spustí konec hry, kdy hráč odchází s Michalem.
     */
    Halla.triggerMichalEnding = function() {
        var gs = Halla.gameState;
        // Použijeme standardní ukončovací funkci, která zobrazí rekapitulaci a replay
        if (typeof Halla.endGameWithSummary === "function") {
            Halla.endGameWithSummary("KONEC: ÚTĚK S MICHALEM\n\n'Na tohle už kašlu,' řekne Michal a podívá se na tebe. 'Jdeš se mnou?'\nBez váhání souhlasíš. Společně utíkáte z Hally a už se nikdy neohlédnete.");
        } else {
            gs.running = false;
            Halla.showInfo("KONEC: ÚTĚK S MICHALEM\n\nHra skončila.");
        }
    };
})(this);
