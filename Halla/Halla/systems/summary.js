// scripts/Halla/Halla/systems/summary.js
// Rekapitulace runu + achievementy + bezpečné ukončení hry.

(function () {
    "use strict";
    // Sjednocení s ostatními soubory: bezpečná reference na Halla namespace
    var Halla = (this.Halla = this.Halla || {});

    // Datově řízený přístup pro achievementy
    var ACHIEVEMENTS_DEFINITIONS = [
        {
            condition: function(gs) { return !(gs.stats || {}).usedKurarnaHeal; },
            text: "Non-smoker – Ani jednou jsi nehealoval v kuřárně."
        },
        {
            condition: function(gs) { return (gs.stats || {}).kurarnaHeals >= 3; },
            text: "Chainsmoker – Kuřárna ti zachránila nervy aspoň 3×."
        },
        {
            condition: function(gs) {
                return Halla.getUltimateItemCount(gs.inventory) === Halla.ULTIMATE_ITEMS.length &&
                       !(Halla.rooms[gs.currentRoom] && Halla.rooms[gs.currentRoom].win === true);
            },
            text: "All-in worker – Nasbíral jsi všechny ultimátní díly, ale svítidlo jsi ofiko nedotáhl v dílně OVR."
        },
        {
            condition: function(gs) {
                return (gs.endings || {}).pepikVisitCount >= 1 && !(gs.endings || {}).pepikEnding;
            },
            text: "Pepíkův kámoš – Dokázal jsi odejít od Pepíka (alespoň jednou)."
        },
        {
            condition: function(gs) { return (gs.boss || {}).encounters > 0; },
            text: function(gs) { return "Boss enjoyer – Překřížil jsi cestu bossovi " + (gs.boss || {}).encounters + "×."; }
        },
        {
            condition: function(gs) { return (gs.endings || {}).jindraHeroEnding; },
            text: "Jindra HERO – Jindra tě zachránil, když jsi měl většinu ultimátních dílů."
        },
        // --- Nový achievement: Alkoholik ---
        {
            condition: function(gs) { return (gs.stats || {}).rumUsedCount >= 2; },
            text: "Alkoholik – Vypil jsi alespoň 2 lahve rumu v jednom runu."
        },
        // --- Nový achievement: Rumový Baron ---
        {
            condition: function(gs) { return (gs.stats || {}).rumUsedCount >= 5; },
            text: "Rumový Baron – Vypil jsi 5 a více lahví rumu. Jsi legenda plácku."
        },
        // --- Nový achievement: Rumový konec ---
        {
            condition: function(gs) { return (gs.endings || {}).rumEnding === true; },
            text: "Na zdraví! – Rozhodl ses, že už toho bylo dost, a vožral ses na plácku."
        },
        // --- Nové achievementy ---
        {
            condition: function(gs) { return gs.health < 10 && gs.health > 0; },
            text: "Na Káru – Dokončil jsi hru s méně než 10 HP."
        },
        {
            condition: function(gs) { return (gs.stats || {}).turns < 15; },
            text: "Speedrunner – Dokončil jsi hru za méně než 15 tahů."
        },
        // --- Nový achievement: 100+ tahů ---
        {
            condition: function(gs) { return (gs.stats || {}).turns >= 100; },
            text: "Věčný zaměstnanec Kuba Holý – Vydržel jsi v Halle 100 a více kol."
        },
        // --- Nový achievement: 500+ tahů ---
        {
            condition: function(gs) { return (gs.stats || {}).turns >= 500; },
            text: "Fosílie Kuby Vítka – Vydržel jsi v Halle 500 a více kol."
        },
        {
            // Tento achievement se udělí, pokud byl spuštěn konec s útěkem,
            // ale hra neskončila (hráč se rozhodl zůstat).
            condition: function(gs) { return (gs.endings || {}).choseToStay === true; },
            text: "Pragmatický útěk – Zvažoval jsi útěk, ale nakonec jsi zůstal. S následky."
        },
        // --- Nové achievementy ---
        {
            condition: function(gs) { return Object.keys(gs.journal.rooms).length >= 10; },
            text: "První kroky – Objevil jsi alespoň 10 místností."
        },
        {
            condition: function(gs) { return Halla.getUltimateItemCount(gs.inventory) === Halla.ULTIMATE_ITEMS.length; },
            text: "Sběratel – Sebral jsi všechny Ultimate Itemy."
        },
        {
            condition: function(gs) {
                return (gs.boss || {}).encounters === 0 && gs.running === false;
            },
            text: "Tichý lovec – Dokončil jsi hru, aniž by tě boss dostihl."
        },
        {
            condition: function(gs) {
                return gs.journal && gs.journal.rooms && gs.journal.rooms.tajna_mistnost && gs.journal.rooms.tajna_mistnost.discovered;
            },
            text: "Kancelářský špion – Objevil jsi tajnou místnost."
        },
        // --- Nový achievement: Unikátní setkání ---
        {
            condition: function(gs) {
                return gs.uniqueNpc && gs.uniqueNpc.encountered && (Object.keys(gs.uniqueNpc.encountered).length === Object.keys(Halla.UNIQUE_NPCS).length);
            },
            text: "Sociální motýl – Potkal jsi všechny unikátní postavy v jednom runu."
        },
        {
            condition: function(gs) { return Halla.hasPerk("stvanice"); },
            text: "Štvanice na Michala – Dohonil jsi prchajícího Michala."
        },
        // --- Nový achievement: Gamblerství ---
        {
            condition: function(gs) { return (gs.stats || {}).slotMachinePlays >= 3; },
            text: "Gamblerství – Zahrál sis na automatu alespoň 3x."
        },
        // --- Nový achievement: Vztek ---
        {
            condition: function(gs) { return (gs.stats || {}).gamblerFrustration === true; },
            text: "Vztekloun – Zranil ses o automat z frustrace."
        },
        // --- Nový achievement: Minimalista ---
        {
            condition: function(gs) {
                return gs.running === false && !(gs.stats || {}).pickedJunkItem;
            },
            text: "Minimalista – Dokončil jsi hru, aniž bys sebral jediný zbytečný předmět."
        },
        // --- Nový achievement: Přežití o suchu ---
        {
            condition: function(gs) {
                // Hra musí skončit a příznak itemUsed nesmí být nastaven.
                return gs.running === false && !(gs.stats || {}).itemUsed;
            },
            text: "Přežití o suchu – Dokončil jsi hru bez použití jediného předmětu."
        },
        // --- Nový achievement: Mistr Hally ---
        {
            condition: function(gs) {
                if (!gs.playerPerks || !Halla.PERK_DESCRIPTIONS) return false;

                var totalPerkCount = 0;
                for (var id in Halla.PERK_DESCRIPTIONS) {
                    if (Halla.PERK_DESCRIPTIONS.hasOwnProperty(id)) {
                        totalPerkCount++;
                    }
                }

                var obtainedPerkCount = 0;
                for (var perkId in gs.playerPerks) {
                    if (gs.playerPerks.hasOwnProperty(perkId) && gs.playerPerks[perkId]) {
                        obtainedPerkCount++;
                    }
                }
                return obtainedPerkCount >= totalPerkCount;
            },
            text: "Mistr Hally – Získal jsi všechny dostupné perky v jedné hře."
        },
        // --- Nový achievement: Sabotér ---
        {
            condition: function(gs) { return (gs.endings || {}).sabotageEnding === true; },
            text: "Sabotér – Vyřešil jsi problém s mikrovlnkou jednou provždy."
        },
        // --- Nový achievement: Korporátní Společník ---
        {
            condition: function(gs) { return (gs.endings || {}).corporatePartnerEnding === true; },
            text: "Korporátní Společník – Přijal jsi nabídku, která se neodmítá, a stal se partnerem ve startupu."
        }
    ];

    Halla.collectAchievements = function () {
        var gs = Halla.gameState;
        if (!gs) return ["Žádný specifický achievement – prostě další den v práci."];

        var a = [];
        for (var i = 0; i < ACHIEVEMENTS_DEFINITIONS.length; i++) {
            try {
                var def = ACHIEVEMENTS_DEFINITIONS[i];
                if (def.condition(gs)) {
                    a.push(typeof def.text === 'function' ? def.text(gs) : def.text);
                }
            } catch (e) {
                // Ignorujeme chybu v konkrétním achievementu, aby to neshodilo celý summary
            }
        }

        if (a.length === 0) {
            a.push("Žádný specifický achievement – prostě další den v práci.");
        }

        return a;
    };

    Halla.buildSummaryText = function () {
        var gs = Halla.gameState;
        if (!gs) return "REKAPITULACE: (žádný gameState, gratuluju, rozbil jsi realitu)\n";

        var stats = gs.stats || new Object();
        var endings = gs.endings || new Object();
        var boss = gs.boss || new Object();

        var t = "";
        t += "REKAPITULACE RUNU:\n";
        t += "- Odehraná kola: " + (stats.turns || 0) + "\n";
        t += "- Pohyby (jdi ...): " + (stats.moves || 0) + "\n";
        t += "- Čekání (cekej): " + (stats.waits || 0) + "\n";
        t += "- Naslouchání bossovi: " + (stats.listens || 0) + "\n";
        t += "- Sebrané itemy: " + (stats.itemsPicked || 0) + "\n";
        t += "- Návštěvy Pepíka: " + (endings.pepikVisitCount || 0) + "\n";
        t += "- Setkání s bossem v jedné místnosti: " + (boss.encounters || 0) + "\n";

        var ach = Halla.collectAchievements();
        t += "\nACHIEVEMENTY:\n";
        for (var i = 0; i < ach.length; i++) {
            t += "• " + ach[i] + "\n";
        }

        return t;
    };

    Halla.endGameWithSummary = function (msg) {
        var gs = Halla.gameState;
        if (!gs) return;

        // Zaznamenáme finální snímek pro replay PŘED ukončením hry.
        if (typeof Halla.recordReplayFrame === "function") {
            Halla.recordReplayFrame();
        }

        if (gs) gs.running = false;

        var summary = Halla.buildSummaryText();

        // Pokud je zpráva, zobraz ji nejprve v jednoduchém dialogu
        if (msg && msg.length > 0) {
            Halla.showInfo(msg);
        }

        // Poté vždy zobraz nový, stylový dialog s rekapitulací
        if (typeof Halla.showSummaryDialog === "function") {
            Halla.showSummaryDialog(summary);
        }
    };

    // --------------------------------------
    //   DIALOG: REKAPITULACE (SUMMARY)
    // --------------------------------------

    Halla.showSummaryDialog = function (summaryText) {
        var showAgain = true;
        while (showAgain) {
            showAgain = false; // Předpokládáme, že se znovu neotevře, pokud to nezměníme
            var replayRequested = false;

            try {
                var parent = RMainWindowQt.getMainWindow();
                var dlg = new QDialog(parent);
                // Vertikální rozlišení
                dlg.setFixedSize(448, 832);

                if (typeof dlg.setWindowTitle === "function") {
                    dlg.setWindowTitle(Halla.GAME_TITLE + " – Rekapitulace");
                }

                // --- Obrázek na pozadí ---
                var imagePath = "scripts/Halla/Halla/data/pic/Uisummary.jpg";
                imagePath = imagePath.replace(/\\/g, "/");
                dlg.setStyleSheet("QDialog { background-image: url(\"" + imagePath + "\"); background-position: center; background-repeat: no-repeat; }");

                var layout = new QVBoxLayout(dlg);
                layout.addStretch(1); // Horní pružina

                // --- Text rekapitulace ---
                var summaryEdit = new QTextEdit(dlg);
                summaryEdit.setPlainText(summaryText);
                if (typeof summaryEdit.setReadOnly === 'function') {
                    summaryEdit.setReadOnly(true);
                }
                summaryEdit.setStyleSheet("background-color: transparent; color: #dddddd; border: none; padding: 15px; font-family: 'Consolas', 'Courier New', monospace; font-size: 14px; margin: 0 40px;");
                layout.addWidget(summaryEdit, 2, 0);

                // --- Tlačítka ---
                var hbox = new QHBoxLayout();
                hbox.addStretch();

                // Tlačítko pro Replay
                var btnReplay = new QPushButton("Přehrát záznam", dlg);
                btnReplay.setFixedWidth(150);
                btnReplay.setStyleSheet("QPushButton { background-color: transparent; color: #ffff00; border: 1px solid #ffff00; padding: 6px; margin-right: 10px; }");
                // Místo skrývání dialogu ho zavřeme (accept) a nastavíme příznak
                if (btnReplay.clicked) btnReplay.clicked.connect(function() { replayRequested = true; dlg.accept(); });
                hbox.addWidget(btnReplay, 0, 0);

                var btnClose = new QPushButton("Ukončit", dlg);
                btnClose.setFixedWidth(150);
                btnClose.setStyleSheet("QPushButton { background-color: transparent; color: white; border: 1px solid white; padding: 6px; }");
                if (btnClose.clicked) btnClose.clicked.connect(function() { dlg.accept(); });
                hbox.addWidget(btnClose, 0, 0);
                hbox.addStretch();
                layout.addLayout(hbox);

                layout.addStretch(1); // Spodní pružina

                dlg.exec(); // Blokuje, dokud se nezavře
                
                if (typeof dlg.deleteLater === "function") dlg.deleteLater();

                // Pokud byl vyžádán replay, přehrajeme ho a pak znovu otevřeme dialog (další iterace while)
                if (replayRequested) {
                    if (typeof Halla.playReplay === "function") {
                        Halla.playReplay();
                    }
                    showAgain = true;
                }

            } catch (e) {
                if (typeof Halla.showWarning === "function") {
                    Halla.showWarning("Chyba při zobrazení rekapitulace: " + e);
                }
                showAgain = false;
            }
        }
    };

})();
