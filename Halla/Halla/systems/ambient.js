// scripts/Halla/Halla/systems/ambient.js
// Ambient hlášky: občasný flavor text.

(function () {
    "use strict";
    // Sjednocení s ostatními soubory: bezpečná reference na Halla namespace
    var Halla = (this.Halla = this.Halla || {});

    Halla.getAmbientMessageOrEmpty = function () {
        var messages = Halla.AMBIENT_MESSAGES;
        if (!messages || messages.length === 0) return "";

        if (Math.random() < Halla.BALANCE.ambientMessageChance) {
            // Použijeme existující utilitu pro výběr z pole
            var msg = Halla.randomFromArray(messages);
            return msg ? "\n\n" + msg : "";
        }

        return "";
    };

})();
