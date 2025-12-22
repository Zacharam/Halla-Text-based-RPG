include("scripts/EAction.js");
include("scripts/File/File.js");
/**
 * @author      Michal Zachara <zachara.m@seznam.cz>
 * @version     1.3.0
 * @date        2025-11-06
 * @description Skript pro generování tabulek ve výkresu QCAD.
 *              Postup:
 *              - Umožňuje uživateli definovat rozměry tabulky (řádky, sloupce, šířka buněk).
 *              - Podporuje různé styly tabulek (jednoduchý, dvojité záhlaví, stínovaný).
 *              - Nabízí volitelné číslování řádků a automatickou šířku sloupců dle obsahu.
 *              - Umožňuje importovat data tabulky z CSV souboru a exportovat stávající tabulku do CSV.
 *              - Vkládá vygenerovanou tabulku jako textové entity na vrstvu 'TABULKA'.
 */
if (typeof QProcess === "undefined") {
    QProcess = Java.type("java.lang.ProcessBuilder");
}
if (typeof QFile === "undefined") {
    var QFile = Java.type("java.io.File");
}
if (typeof QTextCodec === "undefined") {
    var QTextCodec = null;
}

// ===========================================
// === GLOBÁLNÍ KONFIGURACE A POMOCNÉ FUNKCE ===
// ===========================================

// --- KONFIGURAČNÍ PROMĚNNÉ ---
// Debug flag: přepněte na 'true' pro zobrazení diagnostických zpráv v dialogu (Script Logger).
var DEBUG = false;
var exportedOrImported = false;

function debugMsg(msg) {
    if (DEBUG) {
        EAction.handleUserMessage("🐞 Debug: " + msg);
    }
}

function debugDecodings(ba) {
    /**
     * Pomocná funkce pro ladění dekódování QByteArray.
     * Vypíše prvních pár bajtů a pokusí se dekódovat pomocí různých kódování.
     */
    if (!DEBUG) return;
    try {
        var hex = "";
        var len = Math.min(64, ba.length);
        for (var i = 0; i < len; ++i) {
            hex += ("0" + ((ba[i] & 0xFF).toString(16))).slice(-2) + " ";
        }
        debugMsg("BA len=" + ba.length + " first " + len + " bytes: " + hex);

        var codecs = ["UTF-8", "Windows-1250", "CP1250", "ISO-8859-2", "ISO8859-2", "UTF-16LE", "UTF-16BE", "ISO-8859-1"];
        for (var i = 0; i < codecs.length; ++i) { // Prochází seznam kódování
            var name = codecs[i];
            try {
                var c = (typeof QTextCodec !== "undefined" && QTextCodec.codecForName) ? QTextCodec.codecForName(name) : null;
                var s;
                if (c) {
                    s = c.toUnicode(ba);
                } else if (ba.toString) {
                    s = ba.toString(); // Fallback pro Java String
                } else {
                    s = String(ba);
                }
                var hasRep = (s && s.indexOf && s.indexOf("\uFFFD") !== -1);
                debugMsg("Decode " + name + ": hasReplacement=" + hasRep + " -> " + (s ? s.substring(0,200) : ""));
            } catch (e) {
                debugMsg("Decode " + name + " failed: " + String(e));
            }
        }
    } catch (e) {
        debugMsg("debugDecodings error: " + String(e));
    }
}

/**
 * Dekóduje QByteArray (výstup procesu, obsah souboru) do JavaScript stringu.
 * Pokusí se o detekci kódování (BOM, heuristika pro UTF-16), poté zkusí preferovaná
 * kódování (Windows-1250, UTF-8) a nakonec fallback přes toString.
 * Cílem je správně zpracovat české znaky z různých zdrojů.
 *
 * @param {QByteArray} ba - Vstupní QByteArray k dekódování.
 * @returns {string} Dekódovaný řetězec.
 */
function decodeBytes(ba) { // Hlavní funkce pro dekódování bajtů
    if (!ba) return "";

    /**
     * Zkontroluje, zda řetězec obsahuje náhradní znaky (U+FFFD), což indikuje chybu dekódování.
     * @param {string} s - Řetězec ke kontrole.
     */
    function hasReplacement(s) {
        return (s === null) || (s.indexOf && s.indexOf("\uFFFD") !== -1);
    }
    try { // Pokus o dekódování s detekcí kódování
        // převedeme první bajty pro detekci BOM / UTF-16 heuristiky
        var b0 = (ba.length > 0) ? (ba[0] & 0xFF) : -1;
        var b1 = (ba.length > 1) ? (ba[1] & 0xFF) : -1;
        var b2 = (ba.length > 2) ? (ba[2] & 0xFF) : -1;

        var tryCodecs = [];

        // BOM detekce
        if (b0 === 0xFF && b1 === 0xFE) { // UTF-16LE BOM
            tryCodecs.push("UTF-16LE");
        } else if (b0 === 0xFE && b1 === 0xFF) { // UTF-16BE BOM
            tryCodecs.push("UTF-16BE");
        } else if (b0 === 0xEF && b1 === 0xBB && b2 === 0xBF) { // UTF-8 BOM
            // UTF-8 BOM
            tryCodecs.push("UTF-8");
        } else {
            // Heuristika pro UTF-16 (mnoho nul na sudých/lichých pozicích)
            var zerosEven = 0, zerosOdd = 0, inspect = Math.min(64, ba.length);
            for (var i = 0; i < inspect; ++i) {
                if ((ba[i] & 0xFF) === 0) {
                    if ((i & 1) === 0) zerosEven++; else zerosOdd++;
                }
            }
            if (zerosEven > zerosOdd && zerosEven > inspect/6) {
                tryCodecs.push("UTF-16BE");
            } else if (zerosOdd > zerosEven && zerosOdd > inspect/6) {
                tryCodecs.push("UTF-16LE");
            }
        }

        // preferované encodery: Windows-1250 (české) před UTF-8
        var fallbackList = ["Windows-1250", "CP1250", "ISO-8859-2", "ISO8859-2", "UTF-8", "ISO-8859-1"]; // Seznam fallback kódování
        for (var i = 0; i < fallbackList.length; ++i) {
            if (tryCodecs.indexOf(fallbackList[i]) === -1) tryCodecs.push(fallbackList[i]);
        }

        if (typeof QTextCodec !== "undefined" && typeof QTextCodec.codecForName === "function") {
            for (var j = 0; j < tryCodecs.length; ++j) {
                try {
                    var name = tryCodecs[j]; // Aktuální kódování k vyzkoušení
                    var codec = QTextCodec.codecForName(name);
                    if (!codec) continue;
                    var s = codec.toUnicode(ba);
                    if (s && !hasReplacement(s)) { // Pokud dekódování proběhlo bez náhradních znaků, je to úspěch
                        return s;
                    }
                    // Pokud nemá náhradní znaky, stále můžeme použít (jako poslední možnost)
                    if (s && j === tryCodecs.length - 1) return s;
                } catch (e) {
                    debugMsg("codec try failed: " + tryCodecs[j] + " -> " + String(e));
                }
            }
        }
    } catch (e) {
        debugMsg("decodeBytes: " + String(e)); // Zaznamenání chyby při dekódování
    }
    // Poslední náhradní pokusy, pokud se nepodařilo dekódovat pomocí QTextCodec
    try {
        if (ba.toString) return ba.toString(); // Pokus o převod na Java String
    } catch (e) {}
    return String(ba);
}

// ===========================================
// === HLAVNÍ TŘÍDA A LOGIKA SKRIPTU ===
// ===========================================
function Halla_Tabulka(guiAction) {
    EAction.call(this, guiAction);
}
Halla_Tabulka.prototype = new EAction();

/**
 * Zobrazí informativní zprávu uživateli.
 * @param {string} text Zpráva k zobrazení.
 */
Halla_Tabulka.prototype.info = function(text) {
    EAction.handleUserMessage(text);
};

/**
 * Zobrazí varovnou zprávu uživateli.
 * @param {string} text Zpráva k zobrazení.
 */
Halla_Tabulka.prototype.warn = function(text) {
    EAction.handleUserWarning(text);
};

/**
 * Spustí logiku pro generování, import nebo export tabulky.
 * Zobrazí dialog pro nastavení tabulky, umožňuje import/export CSV
 * a následně generuje tabulku do výkresu.
 *
 * @returns {void}
 */
Halla_Tabulka.prototype.beginEvent = function() {
    EAction.prototype.beginEvent.call(this);

    var self = this; // Zachycení kontextu 'this' pro použití v callback funkcích
    var di  = EAction.getDocumentInterface();
    var doc = di ? di.getDocument() : null;

    // --- Globální proměnné pro data tabulky ---
    // Tyto proměnné uchovávají data tabulky pro import/export v rámci běhu akce.
    var headers = [];
    var rows = [];

    // Komponenta pro výběr kódování CSV.
    var encodingComboBox = null;

    /**
     * --- Pomocné funkce pro dekódování CSV ---
     *
     * Dekóduje QByteArray pomocí zadaného názvu kódování.
     * @param {string} name - Název kódování (např. "UTF-8", "Windows-1250").
     * @param {QByteArray} ba - QByteArray k dekódování.
     * @returns {string|null} Dekódovaný řetězec nebo null, pokud dekódování selže.
     */
    function decodeByName(name, ba) {
        if (!ba) return "";
        try {
            if (typeof QTextCodec !== "undefined" && QTextCodec.codecForName) {
                var codec = QTextCodec.codecForName(name);
                if (codec) { // Pokud je kodek dostupný
                    // Pokud je kódování UTF-8 a má BOM, odstraníme ho.
                    // QTextCodec.toUnicode by ho měl zpracovat, ale pro jistotu.
                    if (name === "UTF-8" && ba.length >= 3 &&
                        (ba[0] & 0xFF) === 0xEF && (ba[1] & 0xFF) === 0xBB && (ba[2] & 0xFF) === 0xBF) {
                        // Vytvoříme novou QByteArray bez BOM
                        var baWithoutBOM = new QByteArray();
                        for (var i = 3; i < ba.length; i++) baWithoutBOM.append(ba[i]);
                        return codec.toUnicode(baWithoutBOM);
                    } // Jinak dekódujeme přímo
                    return codec.toUnicode(ba);
                }
            }
        } catch (e) {
            debugMsg("decodeByName: " + String(e));
        }
        return null;
    }

    /**
     * Získá aktuálně vybrané kódování z rozbalovacího seznamu.
     * @returns {string} Název vybraného kódování nebo "Auto".
     */
    function getSelectedEncoding() {
        try {
            return (encodingComboBox && encodingComboBox.currentText) ? encodingComboBox.currentText : "Auto";
        } catch (e) {
            return "Auto";
        }
    }

    // --- Kontrola dostupnosti dokumentu ---
    if (!di || !doc) {
        self.warn("❌ Skript nelze spustit, protože není otevřen žádný aktivní výkres.");
        this.terminate();
        return;
    }

    /**
     * Vloží textovou entitu do dokumentu.
     * Tato funkce je lokální a používá se pro generování tabulky.
     *
     * @param {RDocument} doc - Dokument, do kterého se vkládá.
     * @param {RAddObjectsOperation} op - Operace pro přidání objektů.
     * @param {string} text - Text k vložení.
     * @param {RVector} pozice - Pozice textu.
     * @param {string} vrstva - Název vrstvy.
     * @param {number} velikostTextu - Velikost písma.
     * @param {string} font - Název fontu.
     */
    function vlozText(doc, op, text, pozice, vrstva, velikostTextu, font) { // Pomocná funkce pro vkládání textu
        var data = new RTextData(
            pozice, pozice,
            velikostTextu || 8.0, 0,
            RS.VAlignTop, RS.HAlignLeft, RS.LeftToRight, RS.Exact,
            1.0, text, font || "Consolas",
            false, false, 0.0, false
        );
        // Nastavení vrstvy pro textovou entitu
        var layerId = doc.getLayerId(vrstva);
        data.setLayerName(vrstva);
        if (layerId !== RObject.INVALID_ID) {
            data.setLayerId(layerId);
        }
        var entita = new RTextEntity(doc, data);
        if (layerId !== RObject.INVALID_ID) {
            entita.setLayerId(layerId);
        }

        op.addObject(entita, false);
    }
// --- Zajištění vrstvy TABULKA ---
    // Pokud vrstva 'TABULKA' neexistuje, vytvoří ji s modrou barvou.
    var layerName = "TABULKA";
    if (!doc.hasLayer(layerName)) { // Kontrola existence vrstvy
        var layer = new RLayer(doc, layerName);
        layer.setColor(new RColor(0, 0, 255));
        di.applyOperation(new RAddObjectOperation(layer));
    }

    // --- Dialog pro nastavení tabulky ---
    // Vytvoří a zobrazí dialogové okno pro uživatelské nastavení tabulky.
    var dialog = new QDialog(); // Vytvoření dialogového okna
    dialog.windowTitle = "Nastavení tabulky";

    var mainLayout = new QVBoxLayout();
    dialog.setLayout(mainLayout);

    var formLayout = new QFormLayout();
    mainLayout.addLayout(formLayout);

    // Nastavení pro počet řádků a šířku sloupce
    var row1Layout = new QHBoxLayout();
    var rowsSpinBox = new QSpinBox();
    rowsSpinBox.minimum = 1;
    rowsSpinBox.maximum = 100;
    rowsSpinBox.value   = 3;
    row1Layout.addWidget(new QLabel("Počet řádků:"), 0, 0);
    row1Layout.addWidget(rowsSpinBox, 0, 0);
    row1Layout.addStretch(1);
    var colWidthSpinBox = new QSpinBox();
    colWidthSpinBox.minimum = 5;
    colWidthSpinBox.maximum = 100;
    colWidthSpinBox.value   = 5;
    row1Layout.addWidget(new QLabel("Počet znaků v buňce:"), 0, 0);
    row1Layout.addWidget(colWidthSpinBox, 0, 0);
    mainLayout.addLayout(row1Layout);

    // Nastavení pro počet sloupců a řádků v buňce
    var row2Layout = new QHBoxLayout();
    var colsSpinBox = new QSpinBox();
    colsSpinBox.minimum = 1;
    colsSpinBox.maximum = 20;
    colsSpinBox.value   = 3;
    row2Layout.addWidget(new QLabel("Počet sloupců:"), 0, 0);
    row2Layout.addWidget(colsSpinBox, 0, 0);
    row2Layout.addStretch(1);
    var cellRowsSpinBox = new QSpinBox();
    cellRowsSpinBox.minimum = 1;
    cellRowsSpinBox.maximum = 10;
    cellRowsSpinBox.value   = 1;
    row2Layout.addWidget(new QLabel("Počet řádků v buňce:"), 0, 0);
    row2Layout.addWidget(cellRowsSpinBox, 0, 0);
    mainLayout.addLayout(row2Layout);

    // Vstup pro souřadnice
    var coordsLineEdit = new QLineEdit();
    coordsLineEdit.text = "10,-10";
    formLayout.addRow("Souřadnice X,Y:", coordsLineEdit);

    // Výběr stylu tabulky
    var styleComboBox = new QComboBox();
    styleComboBox.addItem("Jednoduchý");
    styleComboBox.addItem("Dvojité záhlaví");
    styleComboBox.addItem("Dvojitý");
    styleComboBox.addItem("Stínovaný");
    styleComboBox.currentIndex = 0;
    formLayout.addRow("Styl tabulky:", styleComboBox);

    // Checkbox pro číslování řádků
    var numberRowsCheckBox = new QCheckBox("Číslovat řádky (1, 2, 3, ...)", dialog);
    numberRowsCheckBox.checked = true;
    formLayout.addRow("", numberRowsCheckBox);

    // Checkbox pro automatickou šířku sloupců
    var autoWidthCheckBox = new QCheckBox("Automatická šířka", dialog);
    autoWidthCheckBox.checked = true;
    autoWidthCheckBox.toolTip = "Pokud je zapnuto, šířka sloupce se přizpůsobí obsahu (ale nebude menší než zadaná hodnota).\nPokud je vypnuto, použije se striktně zadaná šířka.";
    formLayout.addRow("", autoWidthCheckBox);

    // Volba kódování CSV (Auto nebo explicitní)
    encodingComboBox = new QComboBox();
    encodingComboBox.addItem("Auto");
    encodingComboBox.addItem("UTF-8");
    encodingComboBox.addItem("Windows-1250");
    encodingComboBox.addItem("ISO-8859-2");
    encodingComboBox.addItem("UTF-16LE");
    encodingComboBox.addItem("UTF-16BE");
    encodingComboBox.currentIndex = 0;
    formLayout.addRow("Kódování CSV:", encodingComboBox);

    // Zobrazení náhledového obrázku
    var imagePath = "scripts/Halla/Tabulka/vzor.png";
    var imageLabel = new QLabel();
    var pixmap = new QPixmap(imagePath);
    if (!pixmap.isNull()) {
        var scaledPixmap = pixmap.scaledToWidth(400, Qt.SmoothTransformation);
        imageLabel.setPixmap(scaledPixmap);
        mainLayout.addWidget(imageLabel, 0, Qt.AlignCenter);
    }

    // Informační text pro uživatele
    var fontInfoLabel = new QLabel(
        "<b>Poznámka:</b> Pro správné zobrazení tabulky je nutné použít neproporcionální písmo (např. Courier New, Consolas, atd.).<br>" +
        "<b>Import/Export:</b> CSV soubory jsou čteny a ukládány v UTF-8 kódování s Windows konci řádků (CRLF).<br>" +
        "Podporovaný oddělovač: středník (;) nebo čárka (,)."
    );
    mainLayout.addWidget(fontInfoLabel, 0, 0);

    /**
     * Pokusí se načíst existující tabulku z vrstvy 'TABULKA' ve výkresu.
     * Analyzuje textové entity a rekonstruuje hlavičky a řádky tabulky.
     *
     * @returns {object} Objekt s hlavičkami (headers), řádky (rows) a stavem úspěšnosti (success).
     */
    function readTableFromDrawing() {
        /**
         * Zkontroluje, zda je entita textového typu.
         * @param {REntity} entity - Entita ke kontrole.
         * @returns {boolean} True, pokud je entita textová, jinak false.
         */
        function isTextEntity(entity) {
            if (!entity || typeof entity.getType !== 'function') return false;
            var type = entity.getType();
            return type === RS.EntityText || type === RS.EntityMText;
        }

        var result = { headers: [], rows: [], success: false };
        try {
            var layerName = "TABULKA";
            var layerId = doc.getLayerId(layerName);
            if (layerId === RObject.INVALID_ID) return result;

            var entityIdsOnLayer = doc.queryLayerEntities(layerId);
            var textEntities = [];

            for (var i = 0; i < entityIdsOnLayer.length; i++) {
                var entity = doc.queryEntity(entityIdsOnLayer[i]);
                if (entity && isTextEntity(entity)) {
                    textEntities.push(entity);
                }
            }

            if (textEntities.length === 0) return result;

            var fullText = "";
            if (textEntities.length === 1) {
                var textData = textEntities[0].getData();
                if (textData && textData.getText) {
                    fullText = textData.getText();
                }
            } else {
                textEntities.sort(function(a, b) { return b.getPosition().y - a.getPosition().y; });
                fullText = textEntities.map(function(e) { return e.getData().getText(); }).join("\n");
            }

            if (!fullText) return result;

            // Nahradíme QCAD specifické značky pro nový odstavec (\P) za standardní znak nového řádku.
            // To je klíčové pro správné parsování víceřádkových textových entit.
            fullText = fullText.replace(/\\P/g, '\n');

            var lines = fullText.split("\n");
            var tableLines = [];

            // Zpracujeme pouze řádky, které vypadají jako datové řádky tabulky
            // (začínají a končí svislým oddělovačem).
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                if (!line || line.trim().length === 0) continue; // Přeskočíme prázdné řádky

                var trimmedLine = line.trim();
                // Spolehlivější metoda pro odfiltrování oddělovacích čar:
                // Datový řádek musí obsahovat alespoň jeden znak, který NENÍ součástí rámečku.
                // Tím se efektivně ignorují všechny typy oddělovacích čar.
                var nonBorderChars = trimmedLine.replace(/[┌┐└┘┬┴┼├┤─═╔╗╚╝╦╩╬╠╣│║]/g, '');
                if (nonBorderChars.trim().length > 0) {
                    tableLines.push(line);
                }
            }

            // Odstranění případného prázdného řádku na konci, který může vzniknout
            // při rozdělení textu končícího na \n.
            if (tableLines.length > 0 && tableLines[tableLines.length - 1].trim() === "") {
                tableLines.pop();
            }
            if (tableLines.length === 0) return result;

            var headerLine = tableLines[0];
            result.headers = headerLine.split(/[│║]/).slice(1, -1).map(function(c) { return c.trim(); });

            for (var k = 1; k < tableLines.length; k++) {
                var cells = tableLines[k].split(/[│║]/).slice(1, -1).map(function(c) { return c.trim(); });
                if (cells.length > 0) result.rows.push(cells);
            }

            if (result.headers.length > 0) result.success = true;
        } catch (e) {
            debugMsg("Chyba při čtení z výkresu: " + String(e));
        }
        return result;
    }

    // ===========================================
    // === EXPORT CSV ===
    // ===========================================
    /**
     * Exportuje data tabulky z aktuálního výkresu do CSV souboru.
     * Nejprve se pokusí načíst tabulku z vrstvy 'TABULKA'.
     * @returns {boolean} True, pokud byl export úspěšný, jinak false.
     */
    function exportCSV() {
        var sep = ";"; // Výchozí oddělovač CSV

        // 1) Vždy se pokus o načtení tabulky z výkresu
        var drawingData = readTableFromDrawing();
        if (!drawingData.success || !drawingData.headers.length) {
            self.warn("❌ Na vrstvě 'TABULKA' jsem nenašel žádnou platnou tabulku k exportu.");
            return false;
        }

        var finalHeaders = drawingData.headers;
        var finalRows    = drawingData.rows;

        // Funkce pro vyčištění textu buňky před exportem.
        // Odstraní znaky rámečků a speciální QCAD formátovací značky jako \P.
        function cleanCellForExport(str) {
            if (typeof str !== 'string') return '';
            // Odstraní rámečky a nahradí \P za mezeru (pro případ, že by se tam dostal).
            return str.replace(/[╠╬═┼─┤├╣║]/g, "").replace(/\\P/g, " ");
        }

        // 2) Sestavení CSV obsahu s vyčištěnými buňkami
        var content = finalHeaders.map(cleanCellForExport).join(sep) + "\r\n";
        for (var ri = 0; ri < finalRows.length; ri++) {
            content += finalRows[ri].map(cleanCellForExport).join(sep) + "\r\n";
        }

        // 3) Výchozí cesta – vedle DWG, jako <nazev>_tabulka.csv, nebo home
        var initialPath = QDir.homePath() + QDir.separator + "tabulka_export.csv";
        var curDoc = EAction.getDocument();
        if (curDoc && curDoc.getFileName && curDoc.getFileName().length > 0) {
            var fi = new QFileInfo(curDoc.getFileName());
            initialPath = fi.absolutePath() + QDir.separator + fi.completeBaseName() + "_tabulka.csv";
        }

        var appWin = EAction.getMainWindow(); // Hlavní okno aplikace
        var ret = File.getSaveFileName(appWin, "Uložit CSV soubor", initialPath, ["CSV (*.csv)"]);
        if (isNull(ret) || ret.length === 0 || ret[0] === "") {
            // uživatel klikl Storno
            return false;
        }

        var fileName = ret[0];

        // 4) Zápis souboru pomocí Qt streamu (UTF-8)
        var file = new QFile(fileName);
        // Otevřeme soubor v binárním režimu (bez QIODevice.Text), abychom měli plnou kontrolu
        // nad koncovkami řádků. Tím zajistíme, že se vždy zapíše CRLF (\r\n).
        var openMode = QIODevice.WriteOnly;
        if (!file.open(openMode)) {
            self.warn("❌ Nelze otevřít soubor pro zápis: " + fileName);
            return false;
        }

        var ts = new QTextStream(file);
        // Nastavíme kódování na UTF-8 a zapíšeme BOM (Byte Order Mark),
        // aby programy jako Excel správně rozpoznaly kódování.
        ts.setCodec("UTF-8");
        ts.setGenerateByteOrderMark(true);
        ts.writeString(content);
        file.close();

        self.info("✅ CSV soubor byl uložen z výkresu do: " + fileName);
        return true;
    }

    // ===========================================
    // === IMPORT CSV ===
    // ===========================================
    /**
     * Importuje data tabulky z CSV souboru a předvyplní jimi dialog.
     * Zpracovává různé oddělovače (středník, čárka) a kódování.
     */
    function importCSV() {
        var fileName = QFileDialog.getOpenFileName( // Dialog pro výběr souboru
            EAction.getMainWindow(),
            "Import CSV",
            "",
            "CSV Files (*.csv);;All Files (*)"
        );
        if (fileName && typeof fileName === "object" && fileName.length) {
            fileName = fileName[0];
        }
        if (!fileName) {
            return;
        }

        var file = new QFile(fileName);
        if (!file.open(QIODevice.ReadOnly)) { // Pokus o otevření souboru
            self.warn("❌ Nepodařilo se otevřít soubor pro čtení: " + fileName);
            return;
        }

        try {
            var ba = file.readAll();
            file.close();
            debugDecodings(ba); // Ladící výpis dekódování

            var selEnc = getSelectedEncoding();
            var content;
            if (selEnc && selEnc !== "Auto") {
                content = decodeByName(selEnc, ba) || decodeBytes(ba);
            } else {
                content = decodeBytes(ba);
            }

            if (!content || content.length === 0) {
                self.warn("❌ CSV soubor je prázdný nebo se nepodařilo přečíst obsah.");
                return;
            }

            var lines = content.split("\n").map(function(l){ // Normalizace řádků
                return l.replace(/\uFEFF/g, "").replace(/\r/g, "").trim();
            }).filter(function(l){
                return l.length > 0;
            });
            if (lines.length === 0) {
                self.warn("❌ CSV soubor je prázdný po normalizaci.");
                // Resetuje data tabulky
                headers = [];
                rows = [];
                rowsSpinBox.value = 1;
                colsSpinBox.value = 1;
                cellRowsSpinBox.value = 1;
                return;
            }

            var sep = (lines[0].indexOf(";") !== -1) ? ";" : ((lines[0].indexOf(",") !== -1) ? "," : ";"); // Detekce oddělovače

            // Robustnější CSV parser, který zvládá uvozovky
            function parseCsvLine(line, separator) {
                var fields = [];
                var currentField = '';
                var inQuotes = false;
                for (var i = 0; i < line.length; i++) {
                    var char = line[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === separator && !inQuotes) {
                        fields.push(currentField.trim());
                        currentField = '';
                    } else {
                        currentField += char;
                    }
                }
                fields.push(currentField.trim());
                return fields;
            }

            var parsed = lines.map(function(line) { // Parsrování všech řádků
                return parseCsvLine(line, sep);
            });
            // Extrakce hlaviček a datových řádků
            headers = parsed[0].slice(0);
            var dataRows = parsed.slice(1);

            var maxCols = headers.length;
            for (var i = 0; i < dataRows.length; ++i) {
                if (dataRows[i].length > maxCols) maxCols = dataRows[i].length;
            }
            while (headers.length < maxCols) headers.push("Sloupec" + (headers.length + 1));
            for (var j = 0; j < dataRows.length; ++j) {
                while (dataRows[j].length < maxCols) dataRows[j].push("");
            }
            // Aktualizace dialogových prvků
            rows = dataRows;
            rowsSpinBox.value = rows.length;
            colsSpinBox.value = maxCols;

            numberRowsCheckBox.checked = false; // Vypnutí číslování řádků po importu

            try {
                var maxCellLines = 1;
                for (var ri4 = 0; ri4 < rows.length; ++ri4) {
                    for (var ci4 = 0; ci4 < rows[ri4].length; ++ci4) {
                        var cell = rows[ri4][ci4] || "";
                        var parts = cell.split("\n");
                        if (parts.length > maxCellLines) maxCellLines = parts.length;
                    }
                }
                cellRowsSpinBox.value = Math.max(cellRowsSpinBox.minimum, Math.min(cellRowsSpinBox.maximum, maxCellLines));
            } catch (e) {
                debugMsg("auto-size: " + String(e));
            }

            self.info(
                "✅ CSV importováno: " + fileName +
                " (oddělovač '" + sep + "'). Řádků: " + rows.length +
                ", sloupců: " + maxCols + ". Nastaveno šířka buňky=" + colWidthSpinBox.value +
                ", řádků v buňce=" + cellRowsSpinBox.value + "."
            );

        } catch (e) {
            self.warn("❌ Chyba při importu CSV: " + String(e));
        }
    }

    // ===========================================
    // === TLAČÍTKA DIALOGU ===
    // ===========================================

    var buttonLayout = new QHBoxLayout();
    buttonLayout.addStretch(1);
    // Proměnné pro uložení hodnot z dialogu po stisknutí OK
    // Proměnné pro uložení hodnot z dialogu
    var numRows, numCols, coordsStr, cellRows, colWidth, styleIndex, numberRows, autoWidth;
    
    var okButton = new QPushButton("OK");
    okButton.clicked.connect(function() {
        numRows    = rowsSpinBox.value;
        numCols    = colsSpinBox.value;
        coordsStr  = coordsLineEdit.text;
        cellRows   = cellRowsSpinBox.value;
        colWidth   = colWidthSpinBox.value;
        styleIndex = styleComboBox.currentIndex;
        numberRows = numberRowsCheckBox.checked;
        autoWidth  = autoWidthCheckBox.checked;
        dialog.accept();
    }); // Tlačítko OK
    buttonLayout.addWidget(okButton, 0, 0);

    var cancelButton = new QPushButton("Zrušit");
    cancelButton.clicked.connect(function() { dialog.reject(); });
    buttonLayout.addWidget(cancelButton, 0, 0); // Tlačítko Zrušit
    
    var importButton = new QPushButton("Import CSV");
    importButton.clicked.connect(function() { importCSV(); });
    buttonLayout.addWidget(importButton, 0, 0);

    var exportButton = new QPushButton("Export CSV");
    exportButton.clicked.connect(function() {
        // Pokud je export úspěšný, funkce vrátí true.
        if (exportCSV()) {
            dialog.close();
            self.terminate();
        }
    });
    buttonLayout.addWidget(exportButton, 0, 0); // Tlačítko Export CSV

    mainLayout.addLayout(buttonLayout, 0);

    var dialogResult = dialog.exec();

    if (!dialogResult) {
        self.info("ℹ️ Akce zrušena.");
        this.terminate();
        return;
    }

    // --- Zpracování výsledků dialogu a generování tabulky ---
    // Zde se zpracovávají uživatelské vstupy z dialogu a připravují se data pro generování tabulky.
    // Zde se zpracovávají uživatelské vstupy z dialogu a připravují se data pro generování tabulky.

    // Odsud dál už je jen generování tabulky do výkresu
    var CONFIG = {
        fontName: "Consolas",
        padding: 1,
        drawRowSeparators: true,
        rowSeparatorChar: '─'
    };

    // --- Inicializace hlaviček a řádků ---
    // Zajišťuje, že `headers` a `rows` mají správný počet prvků // Zajišťuje, že `headers` a `rows` mají správný počet prvků
    // na základě uživatelského vstupu nebo importovaných dat.
    var r, c;

    if (headers.length === 0) {
        headers = [];
        for (c = 0; c < numCols; ++c) {
            headers.push("Sloupec" + (c + 1));
        }
    } else {
        var tempHeaders = headers.slice(0, numCols);
        while (tempHeaders.length < numCols) tempHeaders.push("Sloupec" + (tempHeaders.length + 1));
        headers = tempHeaders;
    }

    if (rows.length === 0) {
        rows = [];
        for (r = 0; r < numRows; ++r) {
            var rowData0 = [];
            for (c = 0; c < numCols; ++c) rowData0.push("");
            rows.push(rowData0);
        }
    } else {
        var tempRows = rows.slice(0, numRows);
        while (tempRows.length < numRows) {
            var newRow = [];
            for (c = 0; c < numCols; ++c) newRow.push("");
            tempRows.push(newRow);
        }
        rows = tempRows;

        for (r = 0; r < rows.length; ++r) {
            while (rows[r].length < numCols) rows[r].push("");
            if (rows[r].length > numCols) rows[r] = rows[r].slice(0, numCols);
        }
    }

    if (numberRows && numCols > 0) {
        for (r = 0; r < rows.length; ++r) { // Číslování řádků
            rows[r][0] = String(r + 1);
        }
        headers[0] = "Řádek";
    }

    // --- Výpočet šířek sloupců ---
    // Dynamicky vypočítá šířku každého sloupce na základě obsahu nebo použije pevnou šířku.
    var colWidths = []; // Pole pro uložení šířek sloupců
    if (autoWidth) {
        for (c = 0; c < numCols; ++c) {
            var maxLen = 0;
            var h = headers[c] || "";
            var hParts = String(h).split("\n");
            for (var hi = 0; hi < hParts.length; ++hi) {
                if ((hParts[hi] || "").length > maxLen) maxLen = (hParts[hi] || "").length;
            }
            for (var ri5 = 0; ri5 < rows.length; ++ri5) {
                var cell2 = rows[ri5][c] || "";
                var parts2 = String(cell2).split("\n");
                for (var pi = 0; pi < parts2.length; ++pi) {
                    if ((parts2[pi] || "").length > maxLen) maxLen = (parts2[pi] || "").length;
                }
            }
            var desiredTotal = Math.max(colWidth, maxLen + 2);
            colWidths.push(desiredTotal - 2 * CONFIG.padding);
        }
    } else {
        for (c = 0; c < numCols; ++c) {
            colWidths.push(colWidth - 2 * CONFIG.padding);
        }
    }

    // --- Definice znaků pro kreslení rámečku tabulky ---
    // Obsahuje ASCII znaky pro různé styly rámečků.
    var box = { // Definice znaků pro rámeček tabulky
        h: '─', v: '│',
        topLeft: '┌', topRight: '┐',
        bottomLeft: '└', bottomRight: '┘',
        topSeparator: '┬',
        bottomSeparator: '┴',
        middleSeparator: '┼',
        leftSeparator: '├',
        rightSeparator: '┤',

        dh: '═', dv: '║',
        topLeftD: '╔', topRightD: '╗',
        bottomLeftD: '╚', bottomRightD: '╝',
        topSeparatorD: '╦',
        bottomSeparatorD: '╩',
        leftSeparatorD: '╠', rightSeparatorD: '╣',
        middleSeparatorD: '╬'
    };

    // --- Pomocné funkce pro generování ASCII tabulky ---
    /**
     * Opakuje znak `ch` `count`krát.
     * @param {string} ch - Znak k opakování. // Opakuje znak `ch` `count`krát.
     * @param {number} count - Počet opakování.
     */
    function repeatChar(ch, count) {
        var s = "";
        for (var i = 0; i < count; ++i) {
            s += ch;
        }
        return s;
    }

    /**
     * Zarovná řetězec doprava a doplní mezerami na danou délku.
     * @param {string} str - Vstupní řetězec.
     * @param {number} len - Požadovaná délka.
     */
    function padRight(str, len) {
        str = String(str);
        while (str.length < len) {
            str += " ";
        }
        if (str.length > len) {
            str = str.substring(0, len);
        }
        return str;
    }

    var fullPadding = CONFIG.padding * 2;
    var paddingStr  = repeatChar(" ", CONFIG.padding);

    /**
     * Formátuje jeden řádek tabulky s danými šířkami sloupců a vertikálním oddělovačem.
     * @param {Array<string>} rowData - Data pro řádek.
     * @param {Array<number>} widths - Šířky jednotlivých sloupců.
     * @param {string} vChar - Vertikální oddělovač.
     */

    function formatRow(rowData, widths, vChar) {
        var out = "";
        for (var i = 0; i < widths.length; ++i) {
            if (i > 0) {
                out += vChar;
            }
            out += paddingStr + padRight(rowData[i] || "", widths[i]) + paddingStr;
        }
        return out;
    }

    /**
     * Formátuje prázdný řádek tabulky (pro víceřádkové buňky).
     * @param {Array<number>} widths - Šířky jednotlivých sloupců.
     * @param {string} vChar - Vertikální oddělovač.
     */
    function formatEmptyRow(widths, vChar) {
        var out = "";
        for (var i = 0; i < widths.length; ++i) {
            if (i > 0) {
                out += vChar;
            }
            out += paddingStr + padRight("", widths[i]) + paddingStr;
        }
        return out;
    }

    /**
     * Vytvoří oddělovací čáru tabulky (horní, dolní, mezi hlavičkou a daty, mezi řádky).
     * @param {string} left - Levý rohový znak.
     * @param {string} middle - Znak pro oddělovač mezi sloupci.
     * @param {string} right - Pravý rohový znak.
     * @param {string} hChar - Horizontální znak pro výplň.
     */
    function createSeparator(left, middle, right, hChar) {
        var out = left;
        for (var i = 0; i < colWidths.length; ++i) {
            if (i > 0) {
                out += middle;
            }
            out += repeatChar(hChar, colWidths[i] + fullPadding);
        }
        out += right;
        return out;
    }

    // --- Volba stylu rámečku tabulky ---
    // Nastaví znaky pro rámeček na základě vybraného stylu. // Nastaví znaky pro rámeček na základě vybraného stylu.
    var topBorder, headerSeparator, bottomBorder, rowSeparator;
    var headerVChar, dataVChar;

    if (styleIndex === 2) {
        topBorder       = createSeparator(box.topLeftD,  box.topSeparatorD,    box.topRightD, box.dh);
        headerSeparator = createSeparator(box.leftSeparatorD, box.middleSeparatorD, box.rightSeparatorD, box.dh);
        bottomBorder    = createSeparator(box.bottomLeftD, box.bottomSeparatorD, box.bottomRightD, box.dh);
        rowSeparator    = createSeparator(box.leftSeparatorD, box.middleSeparatorD, box.rightSeparatorD, box.dh);
        headerVChar     = box.dv;
        dataVChar       = box.dv;

    } else if (styleIndex === 1) {
        topBorder       = createSeparator(box.topLeftD,  box.topSeparatorD,    box.topRightD, box.dh);
        headerSeparator = createSeparator(box.leftSeparatorD, box.middleSeparatorD, box.rightSeparatorD, box.dh);
        bottomBorder    = createSeparator(box.bottomLeft,  box.bottomSeparator,  box.bottomRight, box.h);
        rowSeparator    = createSeparator(box.leftSeparator, box.middleSeparator, box.rightSeparator, CONFIG.rowSeparatorChar);
        headerVChar     = box.dv;
        dataVChar       = box.v;

    } else if (styleIndex === 3) {
        topBorder       = createSeparator('▓', '▓', '▓', '▓');
        headerSeparator = createSeparator('▒', '▒', '▒', '▒');
        bottomBorder    = createSeparator('░', '░', '░', '░');
        rowSeparator    = createSeparator('░', '░', '░', '░');
        headerVChar     = '░';
        dataVChar       = '░';

    } else {
        topBorder       = createSeparator(box.topLeft,  box.topSeparator,    box.topRight, box.h);
        headerSeparator = createSeparator(box.leftSeparator, box.middleSeparator, box.rightSeparator, box.h);
        bottomBorder    = createSeparator(box.bottomLeft,  box.bottomSeparator,  box.bottomRight, box.h);
        rowSeparator    = createSeparator(box.leftSeparator, box.middleSeparator, box.rightSeparator, CONFIG.rowSeparatorChar);
        headerVChar     = box.v;
        dataVChar       = box.v;
    }

    // --- Sestavení finálního textu tabulky ---
    // Kombinuje všechny části (rámečky, hlavičky, data) do jednoho textového bloku. // Kombinuje všechny části (rámečky, hlavičky, data) do jednoho textového bloku.
    var textLines = [];
    textLines.push(topBorder);
    textLines.push(headerVChar + formatRow(headers, colWidths, headerVChar) + headerVChar);
    textLines.push(headerSeparator);

    for (r = 0; r < rows.length; ++r) {
        textLines.push(dataVChar + formatRow(rows[r], colWidths, dataVChar) + dataVChar);

        for (var rr2 = 1; rr2 < cellRows; ++rr2) {
            textLines.push(dataVChar + formatEmptyRow(colWidths, dataVChar) + dataVChar);
        }

        if (CONFIG.drawRowSeparators && r < rows.length - 1) {
            textLines.push(rowSeparator);
        }
    }

    textLines.push(bottomBorder);

    var text = textLines.join("\n");

    // --- Určení pozice vložení textu ---
    // Zpracuje zadané souřadnice nebo použije výchozí. // Zpracuje zadané souřadnice nebo použije výchozí.
    var parts = coordsStr.split(",");
    var pozice;
    if (parts.length === 2 &&
        !isNaN(parseFloat(parts[0])) &&
        !isNaN(parseFloat(parts[1]))) {

        pozice = new RVector(parseFloat(parts[0]), parseFloat(parts[1]));
    } else {
        self.warn("⚠️ Neplatný formát souřadnic. Používám výchozí pozici 10,-10.");
        pozice = new RVector(10, -10);
    }

    // --- Vložení tabulky do výkresu ---
    // Vytvoří textovou entitu a přidá ji do dokumentu. // Vytvoří textovou entitu a přidá ji do dokumentu.
    var op = new RAddObjectsOperation(false);
    vlozText(doc, op, text, pozice, layerName, 8.0, CONFIG.fontName);

    di.applyOperation(op);

    this.info(
        "✅ Tabulka byla vytvořena ve vrstvě 'TABULKA' (modrá)." +
        (numberRows ? " Řádky jsou očíslované." : " Bez číslování řádků.")
    );

    // --- Aktualizace pohledu ---
    // Zajistí, že se nově vložená tabulka okamžitě zobrazí. // Zajistí, že se nově vložená tabulka okamžitě zobrazí.
    var view = EAction.getMainWindow().activeGraphicsView;
    if (view) {
        view.viewport().update();
    }

    this.terminate();
};

// Entry point pro QCAD
function main(guiAction) {
    return new Halla_Tabulka(guiAction);
}