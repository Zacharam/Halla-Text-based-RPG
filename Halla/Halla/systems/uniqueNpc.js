// scripts/Halla/Halla/systems/uniqueNpc.js
// Systém pro unikátní, vzácné NPC, které se objevují a mizí.

(function (global) {
    "use strict";
    var Halla = global.Halla || (global.Halla = {});

    /**
     * Inicializuje stav unikátních NPC při startu hry.
     */
    Halla.initUniqueNpcs = function() {
        var gs = Halla.gameState;
        if (!gs) return;

        gs.uniqueNpc = new Object();
        gs.uniqueNpc.activeNpcId = null;
        gs.uniqueNpc.room = null;
        gs.uniqueNpc.turnsLeft = 0;
        gs.uniqueNpc.turnCounter = 0;
        gs.uniqueNpc.encountered = new Object();
        // Vytvoříme kopii seznamu NPC, ze které budeme odebírat
        gs.uniqueNpc.available = Object.keys(Halla.UNIQUE_NPCS);
    };

    /**
     * Pokusí se o spawn nového unikátního NPC.
     */
    function _spawnUniqueNpc() {
        var gs = Halla.gameState;
        if (gs.uniqueNpc.activeNpcId || gs.uniqueNpc.available.length === 0) return;

        if (Math.random() < Halla.BALANCE.uniqueNpcSpawnChance) {
            // Vyber náhodné NPC z dostupných
            var npcId = Halla.randomFromArray(gs.uniqueNpc.available);
            gs.uniqueNpc.activeNpcId = npcId;
            gs.uniqueNpc.turnsLeft = Halla.BALANCE.uniqueNpcLifetime;
            gs.uniqueNpc.turnCounter = 0;

            // Odstraň ho ze seznamu dostupných pro tento run
            var index = gs.uniqueNpc.available.indexOf(npcId);
            if (index > -1) {
                gs.uniqueNpc.available.splice(index, 1);
            }

            // Najdi pro něj startovní pozici daleko od hráče (podobně jako boss)
            var bfsResult = Halla.runBFS(gs.currentRoom);
            var suitableRooms = [];
            for (var roomName in bfsResult.distances) {
                if (bfsResult.distances[roomName] >= 3) {
                    suitableRooms.push(roomName);
                }
            }
            gs.uniqueNpc.room = Halla.randomFromArray(suitableRooms.length > 0 ? suitableRooms : Object.keys(Halla.rooms));
        }
    }

    /**
     * Pohne s NPC o jeden krok do náhodné sousední místnosti.
     */
    function _moveUniqueNpc() {
        var gs = Halla.gameState;
        if (!gs.uniqueNpc.activeNpcId || !gs.uniqueNpc.room) return;

        // NPC se jen náhodně toulá po sousedních místnostech.
        var exits = Halla.rooms[gs.uniqueNpc.room].exits;
        if (exits) {
            // Bezpečný způsob, jak získat hodnoty z objektu pro starší JS verze
            var exitRooms = [];
            for (var dir in exits) {
                if (exits.hasOwnProperty(dir)) {
                    exitRooms.push(exits[dir]);
                }
            }

            if (exitRooms.length > 0) {
                gs.uniqueNpc.room = Halla.randomFromArray(exitRooms);
            }
        }
    }

    /**
     * Hlavní update funkce, volaná každý tah.
     */
    Halla.updateUniqueNpc = function() {
        var gs = Halla.gameState;
        if (!gs || !gs.uniqueNpc) return;

        if (!gs.uniqueNpc.activeNpcId) {
            _spawnUniqueNpc();
            return; // Pokud se nespawnul, končíme
        }

        // Odpočet životnosti
        gs.uniqueNpc.turnsLeft--;
        if (gs.uniqueNpc.turnsLeft <= 0) {
            // NPC mizí
            Halla.showInfo("Vzdálená postava, kterou jsi zahlédl, zmizela ve stínech Hally.");
            gs.uniqueNpc.activeNpcId = null;
            gs.uniqueNpc.room = null;
            return;
        }

        gs.uniqueNpc.turnCounter++;
        _moveUniqueNpc();
    };

    /**
     * Zpracuje setkání hráče s unikátním NPC.
     */
    Halla.handleUniqueNpcEncounter = function() {
        var gs = Halla.gameState;
        if (!gs || !gs.uniqueNpc || !gs.uniqueNpc.activeNpcId || gs.currentRoom !== gs.uniqueNpc.room) return;

        var npcId = gs.uniqueNpc.activeNpcId;
        var npcData = Halla.UNIQUE_NPCS[npcId];

        Halla.showInfo(npcData.line);
        // Přidání zápisu do deníku
        if (typeof Halla.journalAddNPC === "function") {
            Halla.journalAddNPC(npcData.name, "Záhadná postava potkaná v hale.");
        }
        gs.uniqueNpc.encountered[npcId] = true;

        // Po setkání NPC okamžitě zmizí, aby se neopakovalo.
        gs.uniqueNpc.activeNpcId = null;
        gs.uniqueNpc.room = null;
        gs.uniqueNpc.turnsLeft = 0;
    };

})(this);