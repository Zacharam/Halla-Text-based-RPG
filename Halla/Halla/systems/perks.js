// scripts/Halla/Halla/systems/perks.js
// Perky: udělení + kontrola.
// Zápis do deníku řeší journal.js, ale voláme ho odsud (proto include pořadí).

(function (global) {
    "use strict";
    // Sjednocení s ostatními soubory: bezpečná reference na Halla namespace
    global.Halla = global.Halla || {};
    var Halla = global.Halla;

    // --------------------------------------
    //   GRANT / CHECK
    // --------------------------------------

    /**
     * Udělí hráči perk. Tento perk se uloží do runtime registru.
     * Tato funkce NEZAŘIZUJE zápis do deníku. To musí zařídit volající kód.
     * @param {string} name - Název perku.
     * @param {*} [data=true] - Volitelná data asociovaná s perkem.
     */
    Halla.grantPerk = function (name, data) {
        var gs = Halla.gameState;
        if (!gs) return;
        gs.playerPerks[name] = (typeof data === "undefined") ? true : data;
    };

    /**
     * Zkontroluje, zda má hráč aktivní daný perk.
     * @param {string} name - Název perku.
     * @returns {boolean} True, pokud hráč perk má.
     */
    Halla.hasPerk = function (name) {
        var gs = Halla.gameState;
        if (!gs) return false;
        // Dvojitý vykřičník převede jakoukoliv "truthy" hodnotu na true a "falsy" na false.
        return !!(gs.playerPerks && gs.playerPerks[name]);
    };

    /**
     * Zkontroluje, zda se aktivuje perk Štvanice (extra tah).
     */
    Halla.checkStvanicePerk = function() {
        if (Halla.hasPerk("stvanice")) {
            var chance = (Halla.BALANCE && Halla.BALANCE.michalPerkDoubleMoveChance) ? Halla.BALANCE.michalPerkDoubleMoveChance : 0.15;
            if (Math.random() < chance) {
                Halla.showInfo("Díky perku 'Štvanice' jsi tak rychlý, že máš tah navíc!");
                return true;
            }
        }
        return false;
    };

})(this);
