include("scripts/EAction.js");
include("scripts/File/File.js");
/**
 * @author      Michal Zachara <zachara.m@seznam.cz>
 * @version     1.0.0
 * @date        2025-11-06
 * @description Skript pro export dat kusovníku (BOM) z výkresu do CSV souboru a jeho vložení do výkresu.
 *              Postup:
 *              - Shromažďuje data z vybraných entit (nebo všech entit, pokud nic není vybráno).
 *              - Filtruje entity, které mají vyplněné vlastní vlastnosti "Číslo K2" a "Typ".
 *              - Seskupuje entity podle "OdkazovanýBlok", "Číslo K2" a "Typ" a počítá jejich počet.
 *              - Generuje CSV soubor s těmito daty (Pořadí, OdkazovanýBlok, CisloK2, Typ, PocetKusu).
 *              - Nabízí uživateli uložení CSV souboru.
 *              - Vkládá vygenerovaný kusovník do výkresu jako tabulku (pokud je k dispozici RTableEntity) nebo jako formátovaný text na vrstvu 'BOM'.
 */
// Pomocná funkce pro vložení textu do výkresu
function vlozText(doc, op, text, pozice, vrstva, velikostTextu, font) {
    var data = new RTextData(
        pozice, pozice,
        velikostTextu || 14.0,
        0,
        RS.VAlignTop, RS.HAlignLeft,
        RS.LeftToRight,
        RS.Exact,
        1.0,
        text,
        font || "Arial",
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
function Halla_K2Export(guiAction) {
    EAction.call(this, guiAction);
}
Halla_K2Export.prototype = new EAction();

/**
 * Zobrazí informativní zprávu uživateli.
 * @param {string} text Zpráva k zobrazení.
 */
Halla_K2Export.prototype.info = function(text) {
    EAction.handleUserMessage(text);
};

/**
 * Zobrazí varovnou zprávu uživateli.
 * @param {string} text Zpráva k zobrazení.
 */
Halla_K2Export.prototype.warn = function(text) {
    EAction.handleUserWarning(text);
};

Halla_K2Export.prototype.beginEvent = function() {
    EAction.prototype.beginEvent.call(this);

    var di = EAction.getDocumentInterface();
    var doc = di ? di.getDocument() : null;
    if (!di || !doc) {
        this.warn("❌ Skript nelze spustit, protože není otevřen žádný aktivní výkres.");
        this.terminate();
        return;
    }

    // --- Zajištění vrstvy BOM ---
    // Pokud vrstva 'BOM' neexistuje, vytvoří ji s předdefinovanými vlastnostmi.
    // Nastaví aktuální vrstvu na 'BOM'.
    var layerName = "BOM";
    if (!doc.hasLayer(layerName)) {
        var layer = new RLayer(doc, layerName);
        layer.setColor(new RColor(0, 0, 255));
        layer.setLineweight(RLineweight.Weight013);
        var linetypeId = doc.getLinetypeId("Continuous");
        if (linetypeId !== -1) {
            layer.setLinetypeId(linetypeId);
        }
        di.applyOperation(new RAddObjectOperation(layer));
    }

    // --- Sběr entit ---
    // Získá vybrané entity. Pokud žádné nejsou vybrány, použije všechny entity ve výkresu.
    // Pokud nejsou žádné entity, skript se ukončí.
    var selection = doc.querySelectedEntities();
    if (selection.length === 0) {
        selection = doc.queryAllEntities();
    }
    if (selection.length === 0) {
        this.warn("❌ Ve výkresu nejsou žádné entity.");
        this.terminate();
        return;
    }

    // --- Sběr a agregace dat ---
    // Prochází vybrané entity, extrahuje vlastní vlastnosti "Číslo K2" a "Typ"
    // a počítá počet kusů pro každou unikátní kombinaci.
    var csv = "Poradi;OdkazovanyBlok;CisloK2;Typ;PocetKusu\n";
    var blockMap = {};
    for (var i = 0; i < selection.length; ++i) {
        var entity = doc.queryEntity(selection[i]);
        if (!entity || !entity.isValid()) continue;

        var refBlockName = "";
        if (entity.getReferencedBlockId) {
            var refBlock = doc.queryBlock(entity.getReferencedBlockId());
            if (refBlock && refBlock.getName) refBlockName = refBlock.getName();
        } else if (entity.getBlockId) {
            var block = doc.queryBlock(entity.getBlockId());
            if (block && block.getName) refBlockName = block.getName();
        }

        var k2 = entity.getCustomProperty("QCAD", "Číslo K2", "");
        // Přeskočit entity, které nemají vyplněné "Číslo K2"
        if (k2 === "") {
            continue;
        }

        var typ = entity.getCustomProperty("QCAD", "Typ", "");
        var key = refBlockName + ";" + k2 + ";" + typ;
        if (!blockMap[key]) {
            blockMap[key] = { refBlockName: refBlockName, k2: k2, typ: typ, count: 1 };
        } else {
            blockMap[key].count++;
        }
    }

    // --- Generování CSV obsahu ---
    // Formátuje shromážděná data do řetězce ve formátu CSV.
    // Každý řádek obsahuje Pořadí, OdkazovanýBlok, CisloK2, Typ a PocetKusu.
    var idx = 1;
    for (var key in blockMap) {
        var rec = blockMap[key];
        csv += idx + ";" + rec.refBlockName + ";" + rec.k2 + ";" + rec.typ + ";" + rec.count + "\n";
        idx++;
    }

    // --- Uložení CSV souboru ---
    // Nabídne uživateli dialog pro uložení vygenerovaného CSV souboru.
    // Výchozí cesta je vedle aktuálního DWG souboru s názvem "_BOM.csv".
    var docFileName = doc.getFileName ? doc.getFileName() : "";
    var initialPath = QDir.homePath() + QDir.separator + "bom_export.csv";
    if (docFileName && docFileName.length > 0) {
        var fi = new QFileInfo(docFileName);
        var baseName = fi.completeBaseName();
        var dir = fi.absolutePath();
        initialPath = dir + QDir.separator + baseName + "_BOM.csv";
    }
    var appWin = EAction.getMainWindow();
    var ret = File.getSaveFileName(appWin, "Uložit CSV soubor", initialPath, ["CSV (*.csv)"]);
    if (!isNull(ret) && ret.length > 0 && ret[0] !== "") {
        var fileName = ret[0];
        var file = new QFile(fileName);
        var flags = makeQIODeviceOpenMode(QIODevice.WriteOnly, QIODevice.Text);
        if (file.open(flags)) {
            var ts = new QTextStream(file);
            if (typeof setUtf8Codec === "function") setUtf8Codec(ts);
            ts.writeString(csv);
            file.close();
            this.info("✅ CSV soubor byl uložen: " + fileName);
        } else {
            this.warn("❌ Nepodařilo se otevřít soubor pro zápis: " + fileName);
        }
    }

    // --- Vložení BOM do výkresu ---
    // Pokusí se vložit kusovník jako RTableEntity, pokud je tato třída dostupná.
    // V opačném případě vytvoří formátovaný textový blok jako fallback.
    
    doc.setCurrentLayer("BOM");
if (typeof RTableEntity !== "undefined") {
        var tableData = [["Poradi", "OdkazovanyBlok", "CisloK2", "Typ", "PocetKusu"]];
        idx = 1;
        for (var key in blockMap) {
            var rec = blockMap[key];
            tableData.push([idx.toString(), rec.refBlockName, rec.k2, rec.typ, rec.count.toString()]);
            idx++;
        }
        var tablePos = new RVector(0, 0);
        var table = new RTableEntity(doc, new RTableData(tablePos, tableData.length, tableData[0].length, 10, 40));
        for (var r = 0; r < tableData.length; ++r) {
            for (var c = 0; c < tableData[0].length; ++c) {
                table.setText(r, c, tableData[r][c]);
            }
        }
        table.setLayerName("BOM");
        di.applyOperation(new RAddObjectOperation(table));
    } else {
        // fallback na text
        var CONFIG = {
            fontName: "Courier New", // Doporučeno neproporcionální písmo
            padding: 1, // Počet mezer na každé straně textu v buňce
            drawRowSeparators: true,
            rowSeparatorChar: '─'
        };

        var headers = ["Pořadí", "Odkazovaný Blok(název bloku)", "Číslo K2", "Typ", "Počet Ks"];
        var rows = [];
        idx = 1;
        for (var key in blockMap) {
            var rec = blockMap[key];
            rows.push([idx.toString(), rec.refBlockName, rec.k2, rec.typ, rec.count.toString()]);
            idx++;
        }

        // Zjistíme maximální šířku pro každý sloupec
        var colWidths = headers.map(function(h, i) {
            var maxLen = h.length;
            for (var r = 0; r < rows.length; r++) {
                if (rows[r][i].length > maxLen) {
                    maxLen = rows[r][i].length;
                }
            }
            return maxLen;
        });

        // Pomocné funkce pro formátování
        function padRight(val, len) {
            val = String(val);
            while (val.length < len) { val += " "; }
            return val;
        }
        function repeatChar(char, len) {
            var s = "";
            for (var i = 0; i < len; i++) { s += char; }
            return s;
        }

        var box = {
            h: '─', v: '│',
            topLeft: '┌', topRight: '┐', bottomLeft: '└', bottomRight: '┘',
            topSeparator: '┬', bottomSeparator: '┴', middleSeparator: '┼',
            leftSeparator: '├', rightSeparator: '┤'
        };

        var text = "";
        var fullPadding = CONFIG.padding * 2;

        // Horní okraj
        text += box.topLeft + colWidths.map(function(w) { return repeatChar(box.h, w + fullPadding); }).join(box.topSeparator) + box.topRight + "\n";

        // Hlavička
        text += box.v + headers.map(function(h, i) {
            return repeatChar(" ", CONFIG.padding) + padRight(h, colWidths[i]) + repeatChar(" ", CONFIG.padding);
        }).join(box.v) + box.v + "\n";

        // Oddělovač pod hlavičkou
        text += box.leftSeparator + colWidths.map(function(w) { return repeatChar(box.h, w + fullPadding); }).join(box.middleSeparator) + box.rightSeparator + "\n";

        // Datové řádky
        rows.forEach(function(row, rowIndex) {
            text += box.v + row.map(function(cell, i) {
                return repeatChar(" ", CONFIG.padding) + padRight(cell, colWidths[i]) + repeatChar(" ", CONFIG.padding);
            }).join(box.v) + box.v + "\n";

            if (CONFIG.drawRowSeparators && rowIndex < rows.length - 1) {
                text += box.leftSeparator + colWidths.map(function(w) {
                    return repeatChar(CONFIG.rowSeparatorChar, w + fullPadding);
                }).join(box.middleSeparator) + box.rightSeparator + "\n";
            }
        });

        // Spodní okraj
        text += box.bottomLeft + colWidths.map(function(w) { return repeatChar(box.h, w + fullPadding); }).join(box.bottomSeparator) + box.bottomRight + "\n";

        var pozice = new RVector(5, -5);
        var op = new RAddObjectsOperation();
        // Pro správné zobrazení tabulky je nutné použít neproporcionální (monospaced) písmo
        vlozText(doc, op, text, pozice, "BOM", 8.0, CONFIG.fontName);
        di.applyOperation(op);
    }

    this.info("✅ Export vlastních vlastností a vložení tabulky dokončeno.");
    this.terminate();
};

// Entry point pro QCAD
function main(guiAction) {
    return new Halla_K2Export(guiAction);
}
