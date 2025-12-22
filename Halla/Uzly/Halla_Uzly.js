include("scripts/EAction.js");
/**
 * @author      Michal Zachara <zachara.m@seznam.cz>
 * @version     1.0.0
 * @date        2025-11-06
 * @description Skript pro detekci a vkládání uzlů (průsečíků) mezi čárovými entitami ve vrstvě 'VODIČE'.
 *              Postup:
 *              - Vyhledá všechny čárové entity na vrstvě 'VODIČE'.
 *              - Pro každou dvojici čar vypočítá jejich průsečíky.
 *              - Pokud je průsečík platný a leží na obou čarách, je zaznamenán jako unikátní uzel.
 *              - Na každém unikátním uzlu je vytvořena nová entita bodu (RPointEntity) s nastavenou tloušťkou čáry.
 *              - Tyto nové uzly jsou vloženy do výkresu na vrstvu 'VODIČE'.
 */
// --- Konstanty ---
var KONSTANTY = {
    VRSTVA_VODICE: "VODIČE",
    TYP_ENTITY_LINE: RS.EntityLine,
    TOLERANCE: 1e-6
};

// Pomocná funkce
function addUniqueJunction(point, map) {
    var key = point.x.toFixed(5) + "," + point.y.toFixed(5);
    if (!map[key]) {
        map[key] = point;
    }
}

// ===========================================
// === HLAVNÍ TŘÍDA A LOGIKA SKRIPTU ===
// ===========================================
function Halla_Uzly(guiAction) {
    EAction.call(this, guiAction);
}
Halla_Uzly.prototype = new EAction();

/**
 * Zobrazí informativní zprávu uživateli.
 * @param {string} text Zpráva k zobrazení.
 */
Halla_Uzly.prototype.info = function(text) {
    EAction.handleUserMessage(text);
};

/**
 * Zobrazí varovnou zprávu uživateli.
 * @param {string} text Zpráva k zobrazení.
 */
Halla_Uzly.prototype.warn = function(text) {
    EAction.handleUserWarning(text);
};

Halla_Uzly.prototype.beginEvent = function() {
    EAction.prototype.beginEvent.call(this);

    var di = EAction.getDocumentInterface();
    var doc = di.getDocument();
    if (!doc) {
        this.terminate();
        return;
    }

    // zapamatuj původní aktivní vrstvu
    var origLayer = doc.queryCurrentLayer();
    var origName  = origLayer ? origLayer.getName() : null;

    var layerName = KONSTANTY.VRSTVA_VODICE;

    if (!doc.hasLayer(layerName)) {
        this.warn("❌ Vrstva '" + layerName + "' nebyla nalezena.");
        this.terminate();
        return;
    }

    var ids = doc.queryLayerEntities(doc.queryLayer(layerName).getId());
    var lines = [];
    for (var i = 0; i < ids.length; i++) {
        var e = doc.queryEntity(ids[i]);
        if (e && e.getType() === KONSTANTY.TYP_ENTITY_LINE) {
            lines.push(e);
        }
    }

    if (lines.length < 2) {
        this.info("ℹ️ Ve vrstvě '" + layerName + "' nejsou alespoň dvě čáry.");
        this.terminate();
        return;
    }

    var uniqueJunctions = {};

    // najít průsečíky
    for (var i = 0; i < lines.length; i++) {
        for (var j = i + 1; j < lines.length; j++) {
            var shapeA = new RLine(lines[i].getStartPoint(), lines[i].getEndPoint());
            var shapeB = new RLine(lines[j].getStartPoint(), lines[j].getEndPoint());
            var intersections = shapeA.getIntersectionPoints(shapeB);

            for (var k = 0; k < intersections.length; k++) {
                var p = intersections[k];
                var onA = Math.abs(
                    p.getDistanceTo(shapeA.getStartPoint()) +
                    p.getDistanceTo(shapeA.getEndPoint()) -
                    shapeA.getLength()
                ) < KONSTANTY.TOLERANCE;
                var onB = Math.abs(
                    p.getDistanceTo(shapeB.getStartPoint()) +
                    p.getDistanceTo(shapeB.getEndPoint()) -
                    shapeB.getLength()
                ) < KONSTANTY.TOLERANCE;

                if (onA && onB) addUniqueJunction(p, uniqueJunctions);
            }
        }
    }

    var op = new RAddObjectsOperation(false); // Vytvoříme operaci bez automatického přidávání do undo/redo
    doc.setCurrentLayer(layerName);
    var count = 0;
    for (var key in uniqueJunctions) {
        if (!uniqueJunctions.hasOwnProperty(key)) continue;
        var pt = uniqueJunctions[key];
        // Vytvoření entity bodu přímo z RVector objektu
        var entity = new RPointEntity(doc, new RPointData(pt));
        // Nastavení tloušťky čáry na 0.50 mm (ISO)
        entity.setLineweight(RLineweight.Weight050);
        op.addObject(entity);
        count++;
    }

    if (count > 0) {
        di.applyOperation(op);
        this.info("✅ Vloženo " + count + " uzlů do vrstvy '" + layerName + "'.");
    } else {
        this.info("ℹ️ Nebyly nalezeny žádné nové křižovatky vodičů.");
    }

    if (origName) doc.setCurrentLayer(origName);

    this.terminate();
};

// Entry point pro QCAD
function main(guiAction) {
    return new Halla_Uzly(guiAction);
}