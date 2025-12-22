include("scripts/EAction.js");
include("scripts/simple.js");
include("scripts/simple_input.js");
include("scripts/File/PrintPreview/PrintPreview.js");

// malý trim kompatibilní se starým JS
function hallaTrim(str) {
    if (isNull(str)) return "";
    str = String(str);
    while (str.length > 0 &&
           (str.charAt(0) === " " || str.charAt(0) === "\t")) {
        str = str.substring(1);
    }
    while (str.length > 0 &&
           (str.charAt(str.length-1) === " " || str.charAt(str.length-1) === "\t")) {
        str = str.substring(0, str.length-1);
    }
    return str;
}

function Halla_ExportPDF(guiAction) {
    EAction.call(this, guiAction);
}
Halla_ExportPDF.prototype = new EAction();
Halla_ExportPDF.prototype.constructor = Halla_ExportPDF;

Halla_ExportPDF.prototype.beginEvent = function() {
    EAction.prototype.beginEvent.call(this);

    var di  = EAction.getDocumentInterface();
    var doc = di ? di.getDocument() : undefined;

    if (isNull(doc)) {
        EAction.handleUserWarning("❌ Není otevřen žádný dokument.");
        this.terminate();
        return;
    }

    // 1) Dotaz na část názvu bloku
    var search = getText(
        "Hledání bloků",
        "Zadej část názvu bloků (např. \"stranka\"):",
        "stranka"
    );
    search = hallaTrim(search);
    if (search === "") {
        this.terminate();
        return;
    }
    var searchLower = search.toLowerCase();

    // 2) Najít bloky + reference, seřadit odshora dolů
    var allBlockIds = doc.queryAllBlocks();
    var refs = []; // {name, refId, bbox}
    var i, j;

    for (i = 0; i < allBlockIds.length; ++i) {
        var bid  = allBlockIds[i];
        var blk  = doc.queryBlock(bid);
        if (!blk) continue;

        var bname = blk.getName();
        if (bname.toLowerCase().indexOf(searchLower) === -1) {
            continue;
        }

        var br = doc.queryBlockReferences(bid);
        for (j = 0; j < br.length; ++j) {
            var ent = doc.queryEntity(br[j]);
            if (!ent) continue;
            var bb = ent.getBoundingBox(true);
            if (!bb.isValid()) continue;

            refs.push({
                name: bname,
                refId: br[j],
                bbox: bb
            });
        }
    }

    if (refs.length === 0) {
        EAction.handleUserWarning("ℹ️ Nenašel jsem žádné vložené bloky obsahující \"" + search + "\".");
        this.terminate();
        return;
    }

    // seřadit odshora dolů
    refs.sort(function(a, b) {
        return b.bbox.getCenter().y - a.bbox.getCenter().y;
    });

    // 3) výběr konkrétní stránky (JEN jedna stránka – žádné multipage)
    var items = [];
    for (i = 0; i < refs.length; ++i) {
        items.push(refs[i].name + " (" + (i+1) + ")");
    }

    var choice = getItem(
        "Výběr stránky",
        "Vyber stránku k tisku:",
        items.join(","),
        0,
        ","
    );
    if (choice === "") {
        this.terminate();
        return;
    }

    var index = -1;
    for (i = 0; i < items.length; ++i) {
        if (items[i] === choice) {
            index = i;
            break;
        }
    }
    if (index < 0) {
        EAction.handleUserWarning("❌ Interní chyba: vybraný blok nenalezen.");
        this.terminate();
        return;
    }

    var sel = refs[index];
    var blkId = doc.getBlockId(sel.name);
    if (blkId <= 0) {
        EAction.handleUserWarning("❌ Nelze najít blok \"" + sel.name + "\".");
        this.terminate();
        return;
    }

    // 4) marže + orientace (jen PageSettings – žádné Print/*, MultiPageSettings/*)
    var margin = getDouble(
        "Nastavení marže",
        "Zadej velikost marže (mm):",
        0.0,
        1,
        0.0,
        100.0
    );

    var ori = getItem(
        "Orientace papíru",
        "Vyber orientaci papíru:",
        "Na výšku,Na šířku",
        1,
        ","
    );

    var orientationString = (ori === "Na výšku") ? "Portrait" : "Landscape";

    doc.setVariable("PageSettings/PageOrientation", orientationString);
    doc.setVariable("PageSettings/MarginLeft",   margin);
    doc.setVariable("PageSettings/MarginRight",  margin);
    doc.setVariable("PageSettings/MarginTop",    margin);
    doc.setVariable("PageSettings/MarginBottom", margin);

    // 5) přepnout do vybraného bloku
    di.setCurrentBlock(blkId);

    // 🔴 DŮLEŽITÉ:
    // NIC už nenastavujeme:
    //  - žádné Print/MultiPage
    //  - žádné Print/Rows, Print/Columns
    //  - žádné MultiPageSettings/Rows/Columns
    // Tím pádem QCAD použije to, co máš nastavené v Drawing Preferences
    // a co sis naposledy ručně naklikal v Print Preview.

    // 6) otevřít Print Preview přes GUI akci
    var guiActionPP = EAction.getGuiAction("PrintPreview");
    if (!isNull(guiActionPP)) {
        EAction.handleUserMessage(
            "📄 Otevírám Print Preview (blok \"" + choice +
            "\", marže " + margin + " mm, " + orientationString + ")"
        );
        EAction.trigger(guiActionPP);
    } else {
        EAction.handleUserWarning("⚠️ PrintPreview akce nebyla nalezena.");
    }

    this.terminate();
};

function main(guiAction) {
    var action = new Halla_ExportPDF(guiAction);
    action.beginEvent();
    return action;
}
