include("scripts/EAction.js");
/**
 * @author      Michal Zachara <zachara.m@seznam.cz>
 * @version     1.0.0
 * @date        2025-11-06
 * @description Skript pro přiřazení nebo úpravu vlastních vlastností "Číslo K2" a "Typ" vybrané entitě.
 *              Postup:
 *              - Uživatel musí vybrat právě jednu entitu ve výkresu.
 *              - Skript vyzve uživatele k zadání hodnot pro vlastní vlastnosti "Číslo K2" a "Typ".
 *              - Tyto hodnoty jsou poté přiřazeny vybrané entitě.
 *              - Po úpravě vlastností je pohled aktualizován.
 */
function Halla_K2Insert(guiAction) {
    EAction.call(this, guiAction);
}
// ===========================================
// === HLAVNÍ TŘÍDA A LOGIKA SKRIPTU ===
// ===========================================
Halla_K2Insert.prototype = new EAction();

/**
 * Zobrazí informativní zprávu uživateli.
 * @param {string} text Zpráva k zobrazení.
 */
Halla_K2Insert.prototype.info = function(text) {
    EAction.handleUserMessage(text);
};

/**
 * Zobrazí varovnou zprávu uživateli.
 * @param {string} text Zpráva k zobrazení.
 */
Halla_K2Insert.prototype.warn = function(text) {
    EAction.handleUserWarning(text);
};

Halla_K2Insert.prototype.beginEvent = function() {
    EAction.prototype.beginEvent.call(this);

    var di = EAction.getDocumentInterface();
    var doc = di ? di.getDocument() : null;
    if (!di || !doc) {
        this.warn("❌ Skript nelze spustit, protože není otevřen žádný aktivní výkres.");
        this.terminate();
        return;
    }

    // Získání aktuálního výběru
    var selection = doc.querySelectedEntities();
    if (selection.length !== 1) {
        this.warn("❌ Vyberte prosím právě jednu entitu, které chcete přiřadit vlastnosti.");
        this.terminate();
        return;
    }

    var entityId = selection[0];
    var selectedEntity = doc.queryEntity(entityId);
    if (!selectedEntity || !selectedEntity.isValid()) {
        this.warn("❌ Chyba: Nepodařilo se najít vybranou entitu s ID: " + entityId);
        this.terminate();
        return;
    }

    // Dotaz na uživatelský vstup
    var k2Value = QInputDialog.getText(
        EAction.getMainWindow(),
        "Zadání vlastností",
        "Zadejte Číslo K2:",
        QLineEdit.Normal,
        selectedEntity.getCustomProperty("QCAD", "Číslo K2", "000000")
    );
    if (k2Value === null) {
        this.terminate();
        return;
    }

    var typValue = QInputDialog.getText(
        EAction.getMainWindow(),
        "Zadání vlastností",
        "Zadejte Typ(Název):",
        QLineEdit.Normal,
        selectedEntity.getCustomProperty("QCAD", "Typ", "Název")
    );
    if (typValue === null) {
        this.terminate();
        return;
    }

    // Vytvoření modifikované kopie
    var modifiedEntity = selectedEntity.clone();
    modifiedEntity.setCustomProperty("QCAD", "Číslo K2", k2Value);
    modifiedEntity.setCustomProperty("QCAD", "Typ", typValue);

    var op = new RModifyObjectsOperation();
    op.addObject(modifiedEntity);
    di.applyOperation(op);

    this.info("✅ Vlastnosti byly úspěšně upraveny.");

    // Aktualizace pohledu
    var view = EAction.getMainWindow().activeGraphicsView;
    if (view) view.viewport().update();

    this.terminate();
};

// Entry point pro QCAD
function main(guiAction) {
    return new Halla_K2Insert(guiAction);
}
