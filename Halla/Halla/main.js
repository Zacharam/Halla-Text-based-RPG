include("scripts/EAction.js");

// ----------------------------------
// Helpers
// ----------------------------------

/**
 * Načte skript a ohlásí případnou chybu.
 * V moderních verzích QCADu (Pro) se `include()` postará o správný kontext
 * a zpřístupní vestavěné C++ třídy (R..., Q...) načítaným souborům.
 * @param {string} path Cesta k souboru.
 * @returns {boolean} True, pokud se soubor úspěšně načetl.
 */
function includeScript(path) {
    try {
        // V moderních verzích QCADu je toto jediný spolehlivý způsob,
        // jak načíst skript a předat mu přístup k vestavěným třídám.
        include(path);
        EAction.handleUserMessage("OK include: " + path);
        return true;
    } catch (e) {
        EAction.handleUserMessage("FAIL include: " + path + "\n" + e);
        return false;
    }
}

// ----------------------------------
// Base (tvoje struktura: scripts/Halla/Halla)
// ----------------------------------
var BASE = "scripts/Halla/Halla";

// ----------------------------------
// Získání document interface HNED NA ZAČÁTKU
// ----------------------------------
var di = EAction.getDocumentInterface();
if (di) {
    EAction.documentInterface = di;
}

// Načteme namespace jako první, aby byl objekt Halla vždy k dispozici.
includeScript(BASE + "/core/namespace.js");

var scriptFiles = [
    // 1) CORE (pevné pořadí je klíčové)
    "/core/config.js",
    "/core/rooms.js",
    "/core/utils.js", 
    "/core/ui.js",
    "/core/state.js",

    // 2) SYSTEMS (pořadí je méně kritické, ale logicky uspořádané)
    "/systems/playerEffects.js", // Obsahuje klíčovou funkci changeHealth
    "/systems/inventory.js",
    "/systems/journal.js",
    "/systems/perks.js",
    "/systems/quests.js",
    "/systems/events.js",
    "/systems/roomEffects.js",
    "/systems/boss.js",
    "/systems/endings.js",
    "/systems/roaming.js",
    "/systems/world.js",
    "/systems/ambient.js",
    "/systems/summary.js",
    "/systems/slotMachine.js",
    "/systems/uniqueNpc.js", // Nový systém pro unikátní NPC
    "/systems/replay.js",    // Replay systém

    // 2.5) RENDER (až po všech datech a základních systémech)
    "/systems/mapRender.js",

    // 3) TURN (až úplně nakonec, spouští herní logiku)
    "/core/turn.js"
];

for (var i = 0; i < scriptFiles.length; i++) {
    if (!includeScript(BASE + scriptFiles[i])) {
        // Pokud některý skript selže, zastavíme další načítání
        return; // Ukončíme provádění main.js
    }
}

/**
 * Funkce, která se zavolá na začátku každého tahu.
 * Zahrnuje logiku, která se má provést před akcí hráče.
 */
function onTurnStart() {
    // Stará funkce handleNpcEncounters byla odstraněna, logika je nyní v handleRoomEntryEvents
    // Volání checkSpecialEndings bylo přesunuto do world.js (runWorldPhases), aby se nespouštělo duplicitně.
}

// ----------------------------------
// ENTRY POINT
// ----------------------------------

// Di je již nastaveno na začátku
if (di) {
    // Přímé spuštění hry. V tomto bodě by měl být globální objekt 'Halla'
    // plně inicializován všemi předchozími 'include' příkazy.
    // Nepoužíváme žádné další zapouzdření, abychom se vyhnuli problémům se scope.

    if (typeof Halla === "undefined" || typeof Halla.gameLoop !== "function") {
        var msg = "CHYBA: Globální objekt Halla nebo Halla.gameLoop() nebyly nalezeny.\n" +
                  "Zkontrolujte, zda se soubory 'core/namespace.js' a 'core/turn.js' správně načetly.";
        EAction.handleUserMessage(msg);
    } else {
        try {
            // Zobrazíme úvodní dialog ještě před resetem hry
            if (typeof Halla.showIntroDialog === "function") {
                Halla.showIntroDialog();
            }

            // Vždy resetujeme hru na začátku, abychom zajistili čistý start
            // bez nutnosti restartovat QCAD.
            if (Halla.resetGame) {
                Halla.resetGame();
            } else {
                Halla.showWarning("CHYBA: Funkce Halla.resetGame() nebyla nalezena.");
                return;
            }

            // Pokud po resetu nemáme platný gameState (hráč zrušil výběr postavy), ukončíme hru.
            if (!Halla.isGameInProgress()) {
                Halla.showInfo("Hra byla ukončena.");
                return;
            }

            // --- NOVÉ: Počáteční vykreslení mapy ---
            // Vykreslíme mapu hned po resetu, aby byla vidět před prvním dialogem.
            if (typeof Halla.drawAsciiMapToCanvas === "function") {
                var mapLines = Halla.generateAsciiMap();
                if (mapLines) Halla.drawAsciiMapToCanvas(mapLines);
            }
            // --- Konec nového bloku ---

            // Spustíme herní smyčku, která už bude pracovat s čerstvým nebo existujícím stavem
            if (Halla.gameLoop) {
                Halla.gameLoop({
                    onTurnStart: onTurnStart
                });
            }

        } catch (e) {
            var errorMsg = "SCRIPT EXCEPTION:\n" +
                           "Message: " + e.message + "\n" +
                           "File: " + e.fileName + ":" + e.lineNumber;
            EAction.handleUserMessage(errorMsg);
        }
    }

} else {
    EAction.handleUserMessage("Žádný otevřený dokument – Šmudlo, nejdřív něco otevři.");
}
