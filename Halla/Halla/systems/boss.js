// scripts/Halla/Halla/systems/boss.js
// Boss AI 2.0: aktivace, pohyb, rage, skip, Jindra / secondChance.
// (Ano, BFS. Ne, není to A* a stejně tě to dožene.)

(function (global) {
    "use strict";
    // Sjednocení s ostatními soubory: bezpečná reference na Halla namespace
    global.Halla = global.Halla || {};
    var Halla = global.Halla;

    // --------------------------------------
    //   PRIVATE HELPERS
    // --------------------------------------

    /**
     * Přesune bosse do náhodné sousední místnosti. Používá se pro ústup nebo bloudění.
     * @private
     */
    function _bossRandomRetreat() {
        var gs = Halla.gameState;
        if (!gs || !gs.boss || !gs.boss.room) return;

        var exits = Halla.rooms[gs.boss.room].exits || {};
        var exitRooms = [];
        for (var dir in exits) { if (exits.hasOwnProperty(dir)) exitRooms.push(exits[dir]); }
        if (exitRooms.length > 0) gs.boss.room = Halla.randomFromArray(exitRooms);
    }

    /**
     * Přinutí bosse k jednomu kroku ústupu (do nejvzdálenější sousední místnosti od hráče).
     * Veřejná funkce, aby ji mohly volat speciální eventy.
     */
    Halla.makeBossRetreat = function() {
        var gs = Halla.gameState;
        if (!gs || !gs.boss || !gs.boss.active || !gs.boss.room) return;

        var playerRoom = gs.currentRoom;
        var bossRoom = gs.boss.room;

        var exits = Halla.rooms[bossRoom].exits;
        if (!exits) {
            _bossRandomRetreat(); // Fallback if no exits defined
            return;
        }

        var exitRooms = [];
        for (var dir in exits) {
            if (exits.hasOwnProperty(dir)) {
                exitRooms.push(exits[dir]);
            }
        }

        if (exitRooms.length === 0) return; // Nowhere to run

        // Najde východ, který je nejdále od hráče
        var bfsResult = Halla.runBFS(playerRoom);
        var bestRoom = null;
        var maxDist = -1;

        for (var i = 0; i < exitRooms.length; i++) {
            var room = exitRooms[i];
            var dist = (bfsResult.distances[room] !== undefined) ? bfsResult.distances[room] : 999;
            if (dist > maxDist) {
                maxDist = dist;
                bestRoom = room;
            }
        }

        if (bestRoom) gs.boss.room = bestRoom;
        else _bossRandomRetreat(); // Fallback
    }
    // --------------------------------------
    //   ACTIVATE BOSS
    // --------------------------------------

    Halla.activateBoss = function () {
        var gs = Halla.gameState;
        if (!gs) return;

        if (gs.boss.active) return;

        gs.boss.active = true;
        gs.boss.turnCounter = 0;
        gs.boss.rage = false;
        gs.boss.demotivatedTurns = 0;

        // --- Vylepšená logika pro výběr startovní místnosti bosse ---
        var playerRoom = gs.currentRoom;
        var bfsResult = Halla.runBFS(playerRoom);
        var distances = bfsResult.distances;

        // Výpočet minimální požadované vzdálenosti
        var minDistance = Halla.BALANCE.bossMinSpawnDistance;
        var cls = Halla.getPlayerClass();
        if (cls && cls.bossSpawnDistanceMul) {
            minDistance = Math.floor(minDistance * cls.bossSpawnDistanceMul);
        }

        // Najdi všechny místnosti, které splňují minimální vzdálenost
        var suitableRooms = [];
        for (var roomName in distances) {
            if (distances.hasOwnProperty(roomName) && distances[roomName] >= minDistance) {
                suitableRooms.push(roomName);
            }
        }

        // Pokud žádná místnost nesplňuje podmínku, najdi nejvzdálenější možnou
        if (suitableRooms.length === 0) {
            var maxDist = 0;
            for (var rName in distances) {
                if (distances.hasOwnProperty(rName) && distances[rName] > maxDist) {
                    maxDist = distances[rName];
                }
            }
            // Přidej všechny místnosti s maximální vzdáleností
            for (var rName2 in distances) {
                if (distances.hasOwnProperty(rName2) && distances[rName2] === maxDist) {
                    suitableRooms.push(rName2);
                }
            }
        }

        // Pokud stále nemáme žádnou místnost (např. jen jedna místnost ve hře), konec
        if (suitableRooms.length === 0) {
            gs.boss.active = false;
            return;
        }

        // Vyber náhodnou místnost z vhodných kandidátů
        gs.boss.room = Halla.randomFromArray(suitableRooms);

        var txt =
            "Vle, vle, hmm... Něco se ve stínech Hally pohnulo.\n" +
            "Máš pocit, že už nejsi v objektu sám.";

        if (Halla.hasItem(gs.inventory, "Kočka")) {
            txt += "\nKočka zasyčí a zadívá se jedním směrem. Něco se blíží.";
        }

        Halla.showInfo(txt);
    };

    // --------------------------------------
    //   BFS PATHFINDING: boss -> hráč (o 1 krok)
    // --------------------------------------

    Halla.moveBossOneStep = function () {
        var gs = Halla.gameState;
        if (!gs) return;

        if (!gs.boss.active || !gs.boss.room) return;

        var playerRoom = gs.currentRoom;
        var bossRoom = gs.boss.room;

        if (!Halla.rooms[playerRoom] || !Halla.rooms[bossRoom]) return;
        if (playerRoom === bossRoom) return;

        // Využijeme univerzální BFS z utils.js
        if (!Halla.runBFS) return;
        var bfsResult = Halla.runBFS(playerRoom);
        var predecessors = bfsResult.predecessors;
        var distances = bfsResult.distances;

        // Pokud boss není dosažitelný z pozice hráče
        if (typeof distances[bossRoom] === "undefined") {
            // není cesta: boss bloumá random po sousedech
            _bossRandomRetreat();
            return;
        }

        // jdeme z bossRoom zpět: první krok směrem k hráči je prev[bossRoom]
        var step = bossRoom;
        if (typeof predecessors[bossRoom] !== "undefined") {
            step = predecessors[bossRoom];
        }
        gs.boss.room = step;
    };

    // --------------------------------------
    //   UPDATE PO TAHU HRÁČE
    // --------------------------------------

    Halla.updateBossAfterPlayerAction = function () {
        var gs = Halla.gameState;
        if (!gs) return;
        var BALANCE = Halla.BALANCE;

        // aktivace bosse po sebrání prvního ultimate itemu
        if (!gs.boss.active) {
            var cnt = Halla.getUltimateItemCount(gs.inventory);
            if (cnt >= 1) {
                Halla.activateBoss();
            }
        }

        if (!gs.boss.active) return;

        // --- RAGE MODE ---
        // rage mode při 3+ ultimate
        if (!gs.boss.rage && Halla.getUltimateItemCount(gs.inventory) >= BALANCE.bossRageItemCount) {
            gs.boss.rage = true;
            Halla.showInfo(
                "Cítíš, jak se atmosféra v hale změní.\n" +
                "Boss zuří. Přepnul do RAGE módu.\nVle, hmm, vle!"
            );
        }

        // základní skip
        var effectiveSkip = BALANCE.bossSkipBase;

        // class efekt
        var cls = Halla.getPlayerClass();
        if (cls && cls.bossSkipMul) effectiveSkip *= cls.bossSkipMul;

        // dočasný debuff
        if (gs.boss.demotivatedTurns && gs.boss.demotivatedTurns > 0) {
            effectiveSkip += BALANCE.bossDemotivatedBonus;
        }

        // kočka = trochu vyšší šance, že boss nic neudělá
        if (Halla.hasItem(gs.inventory, "Kočka")) {
            effectiveSkip += BALANCE.bossCatSkipBonus;
            // Nová schopnost pro Kancelářskou Krysu
            if (cls && typeof cls.catSoothingEffect === 'number') {
                effectiveSkip += cls.catSoothingEffect;
            }
        }

        if (effectiveSkip > 0.9) effectiveSkip = 0.9;

        // skip turn?
        if (Math.random() < effectiveSkip) {
            gs.boss.turnCounter++;
            if (gs.boss.demotivatedTurns && gs.boss.demotivatedTurns > 0) {
                gs.boss.demotivatedTurns--;
            }
            return;
        }

        gs.boss.turnCounter++;

        // Nová kontrola: Vynucený ústup (např. z eventu)
        if (gs.boss.retreatTurns && gs.boss.retreatTurns > 0) {
            Halla.makeBossRetreat();
            gs.boss.retreatTurns--;
            // Přeskočíme zbytek logiky pohybu pro tento tah
            return;
        }

        // kočka panic – boss se lekne a nic neudělá
        if (Halla.hasItem(gs.inventory, "Kočka") && Math.random() < BALANCE.bossCatPanicChance) {
            return;
        }

        // normální pohyb
        Halla.moveBossOneStep();

        // rage = šance na extra krok
        if (gs.boss.rage && Math.random() < BALANCE.bossRageExtraMoveChance) {
            Halla.moveBossOneStep();
        }

        // ---------------------------
        //   KONTAKT: BOSS DOSTIHL HRÁČE
        // ---------------------------
        if (gs.currentRoom !== gs.boss.room) {
            return;
        }

        // počítadlo setkání
        gs.boss.encounters = (gs.boss.encounters || 0) + 1;

        // 1) Jindra
        if (gs.hasJindra) {
            var ultCount = Halla.getUltimateItemCount(gs.inventory || []);

            if (ultCount >= BALANCE.bossJindraHeroItemCount) {
                // HERO ending
                gs.hasJindra = false;
                gs.endings.jindraHeroEnding = true;

                Halla.showInfo(
                    "Boss se na tebe vrhne, ale Jindra neváhá.\n" +
                    "Skočí před tebe, chytí bosse kolem ramen a zařve:\n" +
                    "\"MAZEJ! Tohle už dodělám!\"\n\n" +
                    "Ještě chvíli slyšíš zápas, pak ticho.\n" +
                    "Když se otočíš, Jindra už tam není.\n\n" +
                    "(Jindra HERO ending)"
                );

                if (typeof Halla.endGameWithSummary === "function") {
                    Halla.endGameWithSummary(
                        "Jindra položil svůj život, abys utekl.\n" +
                        "Máš u sebe většinu důležitých dílů, ale finále už nedáš.\n" +
                        "(Hrdinský ending – Jindra)"
                    );
                } else {
                    gs.running = false;
                }
                return;
            }

            // klasická záchrana
            gs.hasJindra = false;

            Halla.showInfo(
                "Boss se na tebe vrhne, ale Jindra ti skočí do cesty.\n" +
                "Strhne bosse stranou a křikne:\n\"Mazej! Já ho zdržím!\"\n\n" +
                "Využiješ šanci a utíkáš pryč."
            );

            // posuň bosse o náhodný krok pryč
            _bossRandomRetreat();
            return;
        }

        // 2) secondChance perk
        if (Halla.hasPerk("secondChance")) {
            // "spotřebuj" perk
            gs.playerPerks["secondChance"] = false;

            Halla.showInfo(
                "Boss tě už skoro chytil, ale náhoda (nebo Rum?) tě zachránil.\n" +
                "Druhou šanci už ale nedostaneš."
            );

            // boss odskočí pryč
            _bossRandomRetreat();
            return;
        }

        // 3) smrt bossem
        if (typeof Halla.endGameWithSummary === "function") {
            Halla.endGameWithSummary(
                "Zpoza regálu se vynoří temná silueta.\n\n" +
                "Boss tě dostihl.\nVle, vle, hmme.\nHra končí."
            );
        } else {
            gs.running = false;
            Halla.showInfo("Boss tě dostihl.\nHra končí.");
        }
    };

})(this);
