include("scripts/EAction.js");
/**
 * @author      Michal Zachara <zachara.m@seznam.cz>
 * @version     1.2.0
 * @date        2025-11-06
 * @description Skript pro vkládání předdefinovaných textových hlášek do výkresu QCAD.
 *              Postup:
 *              - Uživatel si vybere jednu z předdefinovaných hlášek z rozbalovacího seznamu.
 *              - Následně zadá souřadnice X,Y, kam má být text vložen.
 *              - Text je vložen na vrstvu 'POPIS' (pokud neexistuje, je vytvořena červená vrstva).
 *              - Skript umožňuje vkládat více hlášek za sebou, dokud uživatel akci nezruší.
 */

/**
 * Vytvoří a přidá textovou entitu do operace.
 * @param {RDocument} doc Aktivní dokument.
 * @param {RAddObjectsOperation} op Operace pro přidání objektů.
 * @param {string} text Text k vložení.
 * @param {RVector} pozice Pozice pro vložení textu.
 * @param {string} vrstva Název cílové vrstvy.
 * @param {number} velikostTextu Velikost písma.
 * @param {string} [font="Arial"] Název písma.
 */
function vlozText(doc, op, text, pozice, vrstva, velikostTextu) {
    var data = new RTextData(
        pozice, pozice,
        velikostTextu || 14.0,
        0,
        RS.VAlignBottom, RS.HAlignLeft,
        RS.LeftToRight,
        RS.Exact,
        1.0,
        text.trim(),
        "Consolas",
        false, false,
        0.0, false
    );
    data.setLayerName(vrstva);
    var entita = new RTextEntity(doc, data);
    op.addObject(entita);
}

// ===========================================
// === HLAVNÍ TŘÍDA A LOGIKA SKRIPTU ===
// ===========================================
function Halla_VlozText(guiAction) {
    EAction.call(this, guiAction);
}
Halla_VlozText.prototype = new EAction();

/**
 * Zobrazí informativní zprávu uživateli.
 * @param {string} text
 */
Halla_VlozText.prototype.info = function(text) {
    EAction.handleUserMessage(text);
};

/**
 * Zobrazí varovnou zprávu uživateli.
 * @param {string} text
 */
Halla_VlozText.prototype.warn = function(text) {
    EAction.handleUserWarning(text);
};

Halla_VlozText.prototype.beginEvent = function() {
    EAction.prototype.beginEvent.call(this);

    var di = EAction.getDocumentInterface();
    var doc = di.getDocument();
    var appWin = EAction.getMainWindow();
    if (!doc) {
        this.terminate();
        return;
    }

    // --- Konfigurace ---
    var LAYER_NAME = "POPIS";
    var LAYER_COLOR = new RColor(255, 0, 0);
    var TEXT_SIZE = 14.0;
    var SETTINGS_KEY = "Halla/VlozText/CustomTexts";
    var ADD_NEW_TEXT_OPTION = "[ Zadat vlastní text... ]";
    var DELETE_TEXT_OPTION = "[ Smazat vlastní text... ]";
    // --- Konec konfigurace ---    

    // Pokud vrstva neexistuje → založit červenou
    if (!doc.hasLayer(LAYER_NAME)) {
        var layer = new RLayer(doc, LAYER_NAME);
        layer.setColor(LAYER_COLOR);
        var opLayer = new RAddObjectOperation(layer);
        di.applyOperation(opLayer);
    }
    doc.setCurrentLayer(LAYER_NAME);

    // Základní seznam předdefinovaných textů
    var hlasky = [
        "Ve verzi s boardy 280 vždy přijde půlboard nakonec",
        "PŘI ROZPŮLENÍ LED BOARDU JE NUTNÉ PROPÁJET PLOŠKY",
        "Nastavit v CASAMBI profil 21588 bDW (1pB - DALI/BC/Dim)",
        "Pro závěsnou verzi, připojit přívodní kabel",
        "DRIVER s Casambi Ready(BT) - DALI zkoušet přes Casambi aplikaci",
        "Tisk na A3",
        "Tisk na A4"
    ];

    // Načtení uživatelsky přidaných textů z nastavení
    var customHlaskyJson = RSettings.getStringValue(SETTINGS_KEY, "[]");
    var customHlasky = [];
    try {
        customHlasky = JSON.parse(customHlaskyJson);
    } catch (e) {
        this.warn("Nepodařilo se načíst vlastní texty.");
        customHlasky = [];
    }

    while (true) {
        // Spojení základních, vlastních a speciální volby pro dialog
        var plnySeznam = customHlasky.concat(hlasky);
        // Přidání volby pro mazání, jen pokud existují vlastní texty
        if (customHlasky.length > 0) {
            plnySeznam.push(DELETE_TEXT_OPTION);
        }
        plnySeznam.push(ADD_NEW_TEXT_OPTION);

        // Výběr textu
        var vyber = QInputDialog.getItem(appWin, "Výběr hlášky", "Vyber text k vložení:", plnySeznam, 0, false);
        if (!vyber) {
            break; // Uživatel zrušil dialog
        }

        // Zpracování speciálních akcí (přidání/mazání)
        if (vyber === ADD_NEW_TEXT_OPTION) {
            var novyText = QInputDialog.getText(appWin, "Zadat vlastní text", "Napiš nový text:", "");
            if (novyText && novyText.trim() !== "") {
                var upravenyText = novyText.trim();
                // Přidání nového textu do seznamu (pokud tam ještě není) a uložení
                if (customHlasky.indexOf(upravenyText) === -1 && hlasky.indexOf(upravenyText) === -1) {
                    customHlasky.unshift(upravenyText); // Přidáme ho na začátek pro příští spuštění
                    RSettings.setValue(SETTINGS_KEY, JSON.stringify(customHlasky));
                }
            }
            continue; // Po akci se vrátíme na začátek a znovu zobrazíme dialog
        }
        else if (vyber === DELETE_TEXT_OPTION) {
            var textKeSmazani = QInputDialog.getItem(appWin, "Smazat vlastní text", "Vyberte text, který chcete smazat:", customHlasky, 0, false);
            if (textKeSmazani) {
                var index = customHlasky.indexOf(textKeSmazani);
                if (index > -1) {
                    customHlasky.splice(index, 1);
                    RSettings.setValue(SETTINGS_KEY, JSON.stringify(customHlasky));
                    this.info("✅ Vlastní text byl smazán.");
                }
            }
            continue; // Po smazání se vrátíme na začátek cyklu
        }

        // Pokud se nejedná o speciální akci, 'vyber' je text k vložení
        var textKVlozeni = vyber;

        // Zadání souřadnic
        var vstup = QInputDialog.getText(appWin, "Umístění textu", "Zadej souřadnice bodu ve formátu x,y:");
        if (!vstup) {
            // Uživatel zrušil zadávání souřadnic, ukončíme skript
            break;
        }

        var souradnice = vstup.trim().split(",").map(parseFloat);
        if (souradnice.length !== 2 || souradnice.some(isNaN)) {
            this.warn("❌ Zadejte souřadnice ve formátu x,y");
            continue;
        }

        var pozice = new RVector(souradnice[0], souradnice[1]);

        var op = new RAddObjectsOperation();
        vlozText(doc, op, textKVlozeni, pozice, LAYER_NAME, TEXT_SIZE);
        di.applyOperation(op);
        this.info("✅ Text '" + textKVlozeni.substring(0, 20) + "...' byl vložen.");

        // Dotaz, zda pokračovat
        var volba = QInputDialog.getItem(appWin, "Pokračovat?", "Vložit další text?", ["Ano", "Ne"], 0, false);
        if (volba !== "Ano") {
            break;
        }
    }

    this.terminate();
};

// Entry point pro QCAD
function main(guiAction) {
    new Halla_VlozText(guiAction);
}
