// scripts/Halla/Halla/systems/playerEffects.js
// Centrální funkce pro aplikaci efektů na hráče (změna zdraví).

(function (global) {
    "use strict";
    global.Halla = global.Halla || {};
    var Halla = global.Halla;

    /**
     * Bezpečně změní zdraví hráče, aktualizuje UI a zkontroluje smrt.
     * @param {number} amount - Množství, o které se má zdraví změnit. Kladné pro léčení, záporné pro poškození.
     * @param {string} [source=""] - Volitelný zdroj změny pro logování nebo zprávy.
     * @returns {number} Skutečná změna zdraví po aplikaci omezení (0 až maxHealth).
     */
    Halla.changeHealth = function (amount, source) {
        var gs = Halla.gameState;
        if (!gs || amount === 0) return 0;

        var oldHealth = gs.health;
        gs.health += amount;

        // Omezení zdraví v rozsahu 0 až maxHealth
        if (gs.health > gs.maxHealth) gs.health = gs.maxHealth;
        if (gs.health < 0) gs.health = 0;

        var actualChange = gs.health - oldHealth;

        // Zaznamenáme změnu pro replay (resetuje se v recordReplayFrame)
        if (typeof gs.currentTurnHealthDelta === "undefined") gs.currentTurnHealthDelta = 0;
        gs.currentTurnHealthDelta += actualChange;

        // Aktualizace UI pouze pokud došlo ke skutečné změně
        if (actualChange !== 0 && typeof Halla.updateHealthHearts === "function") {
            Halla.updateHealthHearts();
        }

        // Kontrola smrti
        if (gs.health <= 0) {
            if (typeof Halla.endGameWithSummary === "function") {
                var deathMessage = source ? "Zemřel jsi kvůli: " + source : "Totálně jsi vyhořel.";
                Halla.endGameWithSummary(deathMessage);
            } else {
                gs.running = false;
            }
        }

        return actualChange;
    };

})(this);