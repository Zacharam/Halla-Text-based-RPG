// scripts/Halla/Halla/systems/world.js
// World fáze: pořadí systémů po tahu (env, eventy, boss, roaming, endingy)
// + advanceWorldOneTurn + estimateDistanceToBoss.

(function (global) {
    "use strict";
    // Sjednocení s ostatními soubory: bezpečná reference na Halla namespace
    global.Halla = global.Halla || {};
    var Halla = global.Halla;

    // --------------------------------------
    //   BFS: VZDÁLENOST (pro "naslouchej bossovi")
    // --------------------------------------

    Halla.estimateDistanceToBoss = function (fromRoom, toRoom) {
        // Využívá novou univerzální BFS funkci z utils.js
        if (!Halla.runBFS) return -1;
        var bfsResult = Halla.runBFS(fromRoom);
        var distance = bfsResult.distances[toRoom];
        return (typeof distance !== "undefined") ? distance : -1;
    };

    // --------------------------------------
    //   WORLD PHASES REGISTRY
    // --------------------------------------

    Halla.initWorldPhases = function () {
        // POZOR: V QtScript může přímé přiřazení nového objektu (`= {}`) nebo pole (`= []`)
        // někdy přepsat celý Halla namespace. Použijeme bezpečnější metody.

        // 1. Vyčistíme stávající objekt
        for (var key in Halla.WORLD_PHASES) {
            if (Halla.WORLD_PHASES.hasOwnProperty(key)) {
                delete Halla.WORLD_PHASES[key];
            }
        }

        // 2. Naplníme ho bezpečně, bez použití literálů polí
        Halla.WORLD_PHASES.roomEffects  = new Array(Halla.applyRoomEffects);
        Halla.WORLD_PHASES.randomEvents = new Array(Halla.maybeTriggerRandomEvents);
        Halla.WORLD_PHASES.boss         = new Array(Halla.updateBossAfterPlayerAction);
        Halla.WORLD_PHASES.uniqueNpc    = new Array(Halla.updateUniqueNpc); // Přidáno
        Halla.WORLD_PHASES.roaming      = new Array(Halla.moveIvcaRoaming, Halla.moveMichalRoaming);
        Halla.WORLD_PHASES.endings      = new Array(Halla.checkSpecialEndings);
    };

    Halla.runWorldPhases = function () {
        var gs = Halla.gameState;
        if (!gs) return;

        if (!Halla.WORLD_PHASES) {
            Halla.initWorldPhases();
        }

        for (var phaseName in Halla.WORLD_PHASES) {
            if (!Halla.WORLD_PHASES.hasOwnProperty(phaseName)) continue;

            var arr = Halla.WORLD_PHASES[phaseName];
            for (var i = 0; i < arr.length; i++) {
                if (typeof arr[i] === "function") {
                    arr[i]();
                }
                if (!gs.running) return;
            }
        }
    };

    // --------------------------------------
    //   ADVANCE WORLD (po tahu)
    // --------------------------------------

    Halla.advanceWorldOneTurn = function (actionType) {
        var gs = Halla.gameState;
        if (!gs) return;
        var stats = gs.stats;

        stats.turns = (stats.turns || 0) + 1;

        if (actionType === "move") {
            stats.moves = (stats.moves || 0) + 1;
        } else if (actionType === "wait") {
            stats.waits = (stats.waits || 0) + 1;
        } else if (actionType === "listen") {
            stats.listens = (stats.listens || 0) + 1;
        }

        Halla.runWorldPhases();
    };

})(this);
