// scripts/Halla/Halla/systems/inventory.js
// Inventář + helpery pro itemy + random rozmístění ultimátních dílů.

(function () {
    // Bezpečná reference na globální jmenný prostor
    var Halla = this.Halla || (this.Halla = {});

    // --------------------------------------
    //   NORMALIZOVANÉ POROVNÁVÁNÍ ITEMŮ
    // --------------------------------------

    Halla.hasItem = function (inv, name) {
        // POZOR: `|| []` je v QtScript nebezpečné. Nahradíme to explicitním checkem.
        if (!inv) {
            inv = new Array();
        }
        var targetNorm = Halla.normalizeString(name);

        for (var i = 0; i < inv.length; i++) {
            // Bezpečné porovnání: zajistíme, že pracujeme se stringem,
            // a normalizujeme ho pro konzistentní porovnání.
            if (Halla.normalizeString(String(inv[i])) === targetNorm) {
                return true;
            }
        }
        return false;
    };

    Halla.hasItemInInventory = function (name) {
        if (!Halla.gameState) return false;
        // Použijeme bezpečný přístup k inventáři
        var inv = Halla.gameState.inventory;
        if (!inv) {
            inv = new Array();
        }
        return Halla.hasItem(inv, name);
    };

    Halla.giveItemToInventory = function (name) {
        if (!Halla.gameState) return;
        // Použijeme bezpečnou inicializaci pole
        if (!Halla.gameState.inventory) Halla.gameState.inventory = new Array(); // Ensure inventory array exists
        // Do inventáře ukládáme původní název pro účely zobrazení.
        // Normalizace se provádí až při porovnávání (hasItem, takeItem).
        Halla.gameState.inventory.push(String(name));
    };

    Halla.removeOneItemFromInventory = function (name) {
        if (!Halla.gameState) return false;

        var inv = Halla.gameState.inventory;
        if (!inv || inv.length === 0) return false;

        var targetNorm = Halla.normalizeString(name);

        var index = -1;
        for (var i = 0; i < inv.length; i++) {
            var currentItemNorm = Halla.normalizeString(String(inv[i]));
            if (currentItemNorm === targetNorm) {
                index = i;
                break;
            }
        }

        if (index !== -1) {
            inv.splice(index, 1);
            return true;
        }

        return false;
    };

    Halla.takeItemFromInventory = function (name) {
        return Halla.removeOneItemFromInventory(name);
    };

    /**
     * Odebere jeden předmět z konkrétní místnosti.
     * @param {string} name - Název předmětu.
     * @param {string} roomName - ID místnosti.
     * @returns {boolean} True, pokud byl předmět úspěšně odebrán.
     */
    Halla.takeItemFromRoom = function(name, roomName) {
        var gs = Halla.gameState;
        if (!gs || !gs.itemLocations || !gs.itemLocations[roomName]) return false;

        var itemsInRoom = gs.itemLocations[roomName];
        var targetNorm = Halla.normalizeString(name);
        var index = -1;

        for (var i = 0; i < itemsInRoom.length; i++) {
            if (Halla.normalizeString(itemsInRoom[i]) === targetNorm) {
                index = i;
                break;
            }
        }

        if (index !== -1) {
            itemsInRoom.splice(index, 1);
            return true;
        }
        return false;
    };

    // --------------------------------------
    //   ULTIMATE ITEM HELPERY
    // --------------------------------------

    Halla.getUltimateItemCount = function (inv) {
        // Použijeme bezpečný fallback
        if (!inv) {
            inv = new Array();
        }
        var c = 0;
        for (var i = 0; i < Halla.ULTIMATE_ITEMS.length; i++) {
            if (Halla.hasItem(inv, Halla.ULTIMATE_ITEMS[i])) c++;
        }
        return c;
    };

    Halla.getMissingUltimateItems = function (inv) {
        // Použijeme bezpečný fallback
        if (!inv) {
            inv = new Array();
        }
        var missing = new Array();
        for (var i = 0; i < Halla.ULTIMATE_ITEMS.length; i++) {
            var it = Halla.ULTIMATE_ITEMS[i];
            if (!Halla.hasItem(inv, it)) missing.push(it);
        }
        return missing;
    };

    // --------------------------------------
    //   RANDOM ROZMÍSTĚNÍ ULTIMATE ITEMŮ
    // --------------------------------------

    Halla.shuffleUltimateItems = function () {
        // Místo modifikace Halla.rooms, budeme ukládat pozice do gameState.
        if (!Halla.gameState) return;
        // POZOR: V QtScript může přímé přiřazení nového objektu ({})
        // někdy přepsat celý Halla namespace. Použijeme bezpečnější metodu.
        Halla.gameState.itemLocations = new Object();

        // seznam všech místností, kam můžeme dropnout ultimate item
        var possibleRooms = [];
        for (var key in Halla.rooms) {
            if (!Halla.rooms.hasOwnProperty(key) || key === "pepik") continue;
            possibleRooms.push(key);
        }

        // shuffle pořadí
        Halla.shuffleArray(possibleRooms);

        // přiřazení
        for (var u = 0; u < Halla.ULTIMATE_ITEMS.length; u++) {
            var itemName = Halla.ULTIMATE_ITEMS[u];
            var roomName = possibleRooms[u % possibleRooms.length];

            // Použijeme bezpečnější metodu pro inicializaci pole
            if (!Halla.gameState.itemLocations[roomName]) {
                Halla.gameState.itemLocations[roomName] = new Array();
            }
            Halla.gameState.itemLocations[roomName].push(itemName);
        }
    };

})();
