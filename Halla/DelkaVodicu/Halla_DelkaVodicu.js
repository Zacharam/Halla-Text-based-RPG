include("scripts/EAction.js");
/**
 * @author      Michal Zachara <zachara.m@seznam.cz>
 * @version     1.2.0
 * @date        2025-11-06
 * @description Skript pro výpočet potřebné délky vodičů na základě vybraných čar ve výkresu QCAD.
 *              Postup:
 *              1. Sečte délky všech vybraných čar, které se nacházejí na vrstvě 'VODIČE' a jsou typu Line.
 *              2. Vyzve uživatele k zadání souřadnic pro vložení výsledku a výběru typu spoje (např. 'Obyčejný', 'Průběžný').
 *              3. Na základě typu spoje a celkové změřené délky aplikuje specifický vzorec pro výpočet finální délky.
 *                 Vzorec zahrnuje násobitel a dynamickou redukci pro delší vodiče.
 *              4. Výslednou délku zaokrouhlí na desítky milimetrů.
 *              5. Vloží text s výslednou délkou (např. "L=1230") na pevnou pozici ve výkresu.
 */
// --- Konstanty ---
// Globální konfigurační konstanty pro skript.
var KONSTANTY = {
    // Název vrstvy, na které se hledají vodiče.
    VRSTVA_VODICE: "VODIČE",
    TYP_ENTITY: RS.EntityLine,
    PRAH_DELKY_MM: 100,
    INTERVAL_DELKY_MM: 100,
    REŽIM_LADĚNÍ: true, // Nastav na 'true' pro zobrazení detailních výpočtů
    ZOBRAZIT_INFO_DIALOG: true, // Nastav na 'false' pro vypnutí informačního okna na konci
    VYSKA_TEXTU: 15.0, 
    FONT_TEXTU: "Arial",
    FAKTOR_ZAOKROUHLENI: 10
};

// --- Konfigurace typů spojů a násobitelů ---
// Definuje různé typy spojů a jejich vliv na výpočet délky vodiče.
var KONFIG_SPOJU = {
    // Každý typ spoje má svůj násobek a faktor snížení pro dynamický výpočet.
    "Obyčejný": { nasobek: 1.025, snizeni: 0.010 }, // Více ohybů, menší redukce (snížen násobek)
    "Průběžný": { nasobek: 1.03, snizeni: 0.020 }, // Přímá cesta, agresivnější redukce (snížen násobek)
    "Ocas":     { nasobek: 1.01,  snizeni: 0 }      // Délka je přesně to, co je naměřeno (pevný přídavek odstraněn)
};

/**
 * Zobrazí informativní zprávu uživateli.
 * @param {string} text Zpráva k zobrazení.
 */
function info(text) {
    // Původní EAction.handleUserMessage(text) zobrazuje zprávu pouze v příkazovém řádku.
    // Pro zobrazení modálního dialogového okna použijeme QMessageBox.information.
    // První argument je rodičovské okno, druhý je titulek okna a třetí je samotný text.
    QMessageBox.information(EAction.getMainWindow(), "Výsledek výpočtu", text);
}

/**
 * Zobrazí varovnou zprávu uživateli.
 * @param {string} text Zpráva k zobrazení.
 */
function warn(text) {
    EAction.handleUserWarning(text);
}

// ---------- Pomocné funkce (beze změny) ----------

/**
 * Zobrazí dialog pro zadání číselné hodnoty a bezpečně ji vrátí.
 * @param {string} title - Titulek dialogu.
 * @param {string} prompt - Text výzvy.
 * @param {number} defaultValue - Výchozí hodnota.
 * @returns {number|null} Zadaná hodnota nebo null při zrušení.
 */
function safeGetDouble(title, prompt, defaultValue) {
    var result = QInputDialog.getDouble(EAction.getMainWindow(), title, prompt, defaultValue, -10000, 10000, 2, 0);
    return (result === undefined || result === null || isNaN(result)) ? null : result;
}

function ziskejVyberSpoje() {
    // Zobrazí dialog pro výběr typu spoje z předdefinovaných možností.
    //
    // Vrátí objekt s konfigurací vybraného spoje (násobek, klíč, přídavek, snížení)
    // nebo `null`, pokud uživatel dialog zruší.
    //
    var hlavniTypy = Object.keys(KONFIG_SPOJU);
    var vybranyTyp = QInputDialog.getItem(
        EAction.getMainWindow(), "Výběr typu spoje", "Zvol typ spoje:", hlavniTypy, 0, false
    );
    // Pokud uživatel dialog zruší, tiše ukončíme akci.
    if (vybranyTyp === null) {
        return null;
    }

    var config = KONFIG_SPOJU[vybranyTyp];
    
    // Zobrazit poznámku, pokud existuje
    if (config.poznamka) { // I když teď žádná není, ponecháme pro budoucí použití
        QMessageBox.information(EAction.getMainWindow(), "Poznámka k typu spoje", config.poznamka);
    }

    var nasobek = config.nasobek;
    var pridavek = config.pridavek || 0;
    var snizeni = config.snizeni !== undefined ? config.snizeni : 0;

    if (nasobek === undefined) {
        warn("⚠️ Chyba konfigurace: Nedefinovaný násobitel pro: " + vybranyTyp);
        return null;
    }
    return { nasobek: nasobek, klic: vybranyTyp, pridavek: pridavek, snizeni: snizeni };
}

function zpracujVybraneEntity(doc, selection) {
    // Zpracuje vybrané entity a vypočítá celkovou délku vodičů.
    //
    // Filtruje entity, které jsou typu Line a nacházejí se na vrstvě 'VODIČE'.
    // Vrátí objekt s celkovou délkou a počtem vodičů, nebo `null` při chybě výběru.
    //
    if (selection.length === 0) {
        warn("❌ Nejsou vybrané žádné entity.\n\nProsím, nejprve vyberte vodiče (čáry) a poté spusťte skript znovu.");
        return null;
    }
    var totalLength = 0, pocetVodicu = 0;
    for (var i = 0; i < selection.length; i++) {
        var entity = doc.queryEntity(selection[i]);
        if (entity && entity.getType() === KONSTANTY.TYP_ENTITY && entity.getLayerName() === KONSTANTY.VRSTVA_VODICE) {
            totalLength += entity.getLength();
            pocetVodicu++;
        }
    }
    if (pocetVodicu === 0) {
        var msg = "❌ Ve výběru nebyly nalezeny žádné platné vodiče.\n\n" +
                  "Ujistěte se, že vybrané entity jsou:\n" +
                  "  •  Jednoduché čáry (Line)\n" +
                  "  •  Na vrstvě '" + KONSTANTY.VRSTVA_VODICE + "'";
        warn(msg);
        return null;
    }
    return { celkovaDelka: totalLength, pocet: pocetVodicu };
}

function vypocitejDynamickyNasobek(zakladniNasobek, delka, faktorSnizeni) {
    // Vypočítá dynamický násobek na základě délky vodiče a faktoru snížení.
    //
    // Pro delší vodiče se násobek postupně snižuje, aby se zohlednila efektivita.
    //
    var intervaly = Math.max(0, Math.floor((delka - KONSTANTY.PRAH_DELKY_MM) / KONSTANTY.INTERVAL_DELKY_MM));
    var dynamickyNasobek = zakladniNasobek - faktorSnizeni * intervaly;
    return Math.max(0, dynamickyNasobek);
}

function vytvorVystupniText(data) {
    // Formátuje výslednou délku do textového řetězce pro vložení do výkresu.
    //
    return "L=" + data.delkaZaokrouhlena;
}

function vlozTextDoVykresu(doc, di, text, pozice) {
    var textData = new RTextData(
        pozice, pozice, KONSTANTY.VYSKA_TEXTU, 0,
        RS.VAlignBottom, RS.HAlignLeft, RS.LeftToRight, RS.Exact,
        1.0, text, KONSTANTY.FONT_TEXTU, false, true, 0.0, false
    );
    var textEntity = new RTextEntity(doc, textData);
    var op = new RAddObjectsOperation();
    op.addObject(textEntity);
    di.applyOperation(op);
}

// ===========================================
// === HLAVNÍ TŘÍDA A LOGIKA SKRIPTU ===
// ===========================================
function Halla_DelkaVodicu(guiAction) {
    EAction.call(this, guiAction);
}
Halla_DelkaVodicu.prototype = new EAction();

Halla_DelkaVodicu.prototype.beginEvent = function() {
    EAction.prototype.beginEvent.call(this);

    // KROK 0: Získání souřadnic od uživatele
    var poziceX = safeGetDouble("Souřadnice X", "Zadej X souřadnici pro vložení textu:", 300);
    if (poziceX === null) { this.terminate(); return; }

    var poziceY = safeGetDouble("Souřadnice Y", "Zadej Y souřadnici pro vložení textu:", 500);
    if (poziceY === null) { this.terminate(); return; }

    var poziceVektoru = new RVector(poziceX, poziceY);

    var doc = EAction.getDocument();
    var di  = EAction.getDocumentInterface();

    // 1) výběr typu spoje
    var vyberSpoje = ziskejVyberSpoje();
    if (!vyberSpoje) {
        this.terminate();
        return;
    }

    // 2) vybrané vodiče
    var entityData = zpracujVybraneEntity(doc, doc.querySelectedEntities());
    if (!entityData) {
        this.terminate();
        return;
    }

    // 3) výpočet
    var dynamickyNasobek = vypocitejDynamickyNasobek(vyberSpoje.nasobek, entityData.celkovaDelka, vyberSpoje.snizeni);
    var delkaMM = (entityData.celkovaDelka * dynamickyNasobek) + vyberSpoje.pridavek;
    var delkaZaokrouhlena = Math.round(delkaMM / KONSTANTY.FAKTOR_ZAOKROUHLENI) * KONSTANTY.FAKTOR_ZAOKROUHLENI;

    // 4) Vytvoření textu
    var vyslednyText = vytvorVystupniText({ delkaZaokrouhlena: delkaZaokrouhlena });
    vlozTextDoVykresu(doc, di, vyslednyText, poziceVektoru);

    // 5) Zobrazení ladícího okna nebo stavové zprávy
    // Pokud je REŽIM_LADĚNÍ zapnutý, zobrazí se detailní výpis v dialogovém okně.
    if (KONSTANTY.REŽIM_LADĚNÍ) {
        var zpravaLadeni = "--- LADÍCÍ VÝPIS ---\n" +
                     "Typ spoje: " + vyberSpoje.klic + "\n" +
                     "Základní délka (změřená): " + entityData.celkovaDelka.toFixed(2) + " mm\n" +
                     "Původní násobek (z konfig.): " + vyberSpoje.nasobek.toFixed(4) + "\n" +
                     "Faktor snížení: " + vyberSpoje.snizeni.toFixed(4) + "\n" +
                     "Použitý násobek (dynamický): " + dynamickyNasobek.toFixed(4) + "\n" +
                     "Přídavek: " + vyberSpoje.pridavek + " mm\n" +
                     "Výsledná délka (před zaokr.): " + delkaMM.toFixed(2) + " mm\n" +
                     "--------------------------\n" +
                     "✅ Vypočtená finální délka: " + delkaZaokrouhlena + " mm (Vloženo do výkresu)";
        info(zpravaLadeni);
    }

    // Pokud je ZOBRAZIT_INFO_DIALOG zapnuté, zobrazí se jednoduchá zpráva ve stavovém řádku.
    if (KONSTANTY.ZOBRAZIT_INFO_DIALOG) {
        EAction.handleUserMessage("✅ Vypočtená délka " + delkaZaokrouhlena + " mm vložena do výkresu.");
    }

    // 6) Ukončení nástroje
    this.terminate();
};

// Entry point pro QCAD
function main(guiAction) {
    new Halla_DelkaVodicu(guiAction);
}
