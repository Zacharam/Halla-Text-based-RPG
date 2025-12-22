// scripts/Halla/Halla/systems/roaming.js
// Roaming NPC: Ivča (náhodné přemístění mezi definovanými místnostmi).

(function () {
    "use strict";
    // Sjednocení s ostatními soubory: bezpečná reference na Halla namespace
    var Halla = (this.Halla = this.Halla || {});

    Halla.moveIvcaRoaming = function () {
        var gs = Halla.gameState;
        if (!gs) return;

        if (!Halla.IVCA_ROOMS || Halla.IVCA_ROOMS.length === 0) {
            return;
        }

        // pokud ještě nemá pozici, nastav náhodně
        if (!gs.ivcaRoom) {
            // Aktualizováno, aby odpovídalo novému API funkce randomFromArray
            gs.ivcaRoom = Halla.randomFromArray(Halla.IVCA_ROOMS);
            return;
        }

        // Ivča má šanci, že se vůbec nepohne
        if (Math.random() > Halla.BALANCE.ivcaMoveChance) {
            return;
        }

        // kandidáti (všechno kromě aktuální)
        var current = gs.ivcaRoom;
        var candidates = [];
        for (var i = 0; i < Halla.IVCA_ROOMS.length; i++) {
            if (Halla.IVCA_ROOMS[i] !== current) {
                candidates.push(Halla.IVCA_ROOMS[i]);
            }
        }

        if (candidates.length === 0) {
            // Toto by se nemělo stát, pokud je v IVCA_ROOMS více než 1 místnost.
            // Pro jistotu se vrátíme k plnému seznamu.
            candidates = Halla.IVCA_ROOMS;
        }

        // Vyber novou místnost pomocí existující utility
        gs.ivcaRoom = Halla.randomFromArray(candidates);
    };

})();

(function (global) {
    "use strict";
    var Halla = global.Halla = global.Halla || {};

    /**
     * Pohne s Michalem. Snaží se utéct co nejdál od hráče.
     */
    Halla.moveMichalRoaming = function() {
        var gs = Halla.gameState;
        if (!gs || !gs.running || !gs.hasMichal || !gs.michalRoom) return;

        var michalCurrentRoom = gs.michalRoom;
        var playerRoom = gs.currentRoom;

        // Pokud je Michal ve stejné místnosti, nepohne se (čeká na encounter).
        if (michalCurrentRoom === playerRoom) return;

        var exits = Halla.rooms[michalCurrentRoom].exits;
        if (!exits) return;

        var bfsResult = Halla.runBFS(playerRoom);
        var bestExit = null;
        var maxDist = -1;

        for (var dir in exits) {
            var nextRoom = exits[dir];
            var dist = bfsResult.distances[nextRoom] !== undefined ? bfsResult.distances[nextRoom] : 999;
            if (dist > maxDist) {
                maxDist = dist;
                bestExit = nextRoom;
            }
        }

        if (bestExit) gs.michalRoom = bestExit;
    };
})(this);
