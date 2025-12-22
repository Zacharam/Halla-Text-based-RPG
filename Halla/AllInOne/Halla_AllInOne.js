include("scripts/EAction.js");

/**
 * @author      Michal Zachara <zachara.m@seznam.cz>
 * @version     1.1.0
 * @date        2025-11-06
 * @description Hlavní skript pro automatizaci generování výkresové dokumentace v Halla, a.s.
 *              Zahrnuje funkce pro:
 *              - Výpis vodičů
 *              - Generování razítka
 *              - Přidávání revizí
 *              - Vkládání popisu přívodního kabelu
 *              - Script je navržen tak, aby byl modulární a umožňoval uživateli vybrat konkrétní akce k provedení.
 *              - Čte ze zadaného názvu karty K2 a podle toho přizpůsobuje výstupy.
 *              - Zohledňuje různé konfigurace vodičů, typy svítidel(i nouzové) a další parametry.
 */

function Halla_AllInOne(guiAction) {
    EAction.call(this, guiAction);
}
Halla_AllInOne.prototype = new EAction();

Halla_AllInOne.prototype.beginEvent = function() {
    EAction.prototype.beginEvent.call(this);
    var di = EAction.getDocumentInterface();
    var doc = di.getDocument();
    if (!doc) {
        this.terminate();
        return;
    }

// Zapouzdření celého skriptu do IIFE pro ochranu globálního jmenného prostoru
(function() {

// ===========================================
// === GLOBÁLNÍ KONFIGURACE A POMOCNÉ FUNKCE ===
// ===========================================

var CONFIG = { 
    defaultX: 50,
    defaultY_portrait: 500,
    defaultY_landscape: 500,
    mezera: 60,            
    krokY: 15,                              
    defaultKabelX: 600,
    defaultKabelY: 150,
    velikostTextuZaklad: 14.0,
    velikostTextuRazitkoMala: 8.0,
    velikostTextuRevize: 6.0,
    velikostTextuRazitkoVelka: 15.0, 
    radekVyskaKabel: 22,
    paddingDaliBoardOstatni: 8, 
    paddingNapetoveVodice: 10, 
    defaultDriverCurrent: "250", 
    typySvitidel: { 
        "114": "Alumo", "150": "Arbo", "71": "Basi 2,0", "112": "Tress", "105": "Drami", "177": "Drop", "160": "Fini",
        "128": "Flumo", "228": "Rotao 60", "108": "Indi", "235": "Ineli", "120": "Inlio", "172": "Ixyo", "119": "Kvado",
        "123": "Legio", "28": "Lina 28", "145": "Lina145", "04": "Lina 60", "35": "Lina 35", "45": "Lina 45",
        "05": "Lina 80", "11": "Lina 80", "08": "Lina 80", "101": "Mila", "106": "Ovili", "910": "Pleki", "140": "Puri",
        "141": "Puri", "142": "Puri", "143": "Puri", "55": "Serie 03", "250": "Rofo", "107": "Rotao", "127": "Rotao",
        "227": "Rotao 60", "132": "Sant", "133": "Sant", "00": "Serie 00", "01": "Serie 01", "02": "Serie 02",
        "03": "Serie 03", "09": "Labro", "10": "Serie 10", "12": "Leira", "13": "Serie 13", "14": "Serie 14",
        "130": "Leira", "131": "Leira", "15": "Rundo 120", "16": "Serie 16", "17": "Serie 17", "18": "Serie 18",
        "19": "Serie 19", "20": "Serie 20", "21": "Gatu", "23": "Serie 23", "24": "Serie 24", "25": "Serie 25",
        "31": "Serie 31", "33": "Serie 33", "40": "Serie 40", "41": "Serie 41", "50": "Serie 50", "51": "Serie 51",
        "52": "Serie 52", "53": "Serie 53", "54": "Serie 54", "56": "Ture", "57": "Ture", "58": "Ture", "65": "Serie 65",
        "66": "Serie 66", "67": "Serie 67", "70": "Basi", "73": "Serie 73", "90": "Serie 90", "190": "Rundo 62",
        "191": "Rundo 87", "290": "Serie 290", "26": "Shift", "230": "Sineli", "245": "Stan", "104": "Step",
        "86": "Styrk", "175": "Torpi", "110": "Trend", "122": "Tress", "174": "Tulpi", "100": "Unda", "176": "Vali",
        "178": "Vali", "179": "Vali", "170": "Vima", "171": "Vima", "121": "Zuli" , "81": "Blok" ,
    },
    kabelPopisky: {
        "Bílý, Černý": [
            "POUZE ZÁVĚSNÁ VERZE (500)", "Kabel      L   - Hnědý", "(dolní zd.)  N   - Modrý",
            "             PE  - Žlutý", "             DA1 - Šedý", "             DA2 - Černý"
        ],
        "Bezbarvý": [
            "POUZE ZÁVĚSNÁ VERZE (500)", "Kabel      L   - Hnědý", "(dolní zd.)  N   - Modrý",
            "             PE  - Žlutý", "             DA1 - Bezbarvý", "             DA2 - Bílý"
            ]
    },
    // Přidána konfigurace pro výchozí typy vodičů
    wireDefaults: { 
        power: { type: "CY", crossSection: "0,75" },
        powerSystem: { type: "CYA", crossSection: "1,5" },
        powerGroundWithEyelet: { type: "CYA", crossSection: "1,0", color: "ŽZ+Očko" },
        dali: { type: "CY", crossSection: "0,5" },
        daliSystem: { type: "CYA", crossSection: "0,5" },
        board: { type: "CY", crossSection: "0,5" }
    },
    // Nové texty pro zakončení PE
    peTerminationTexts: {
        ocko: "ŽZ+Očko",
        faston: "ŽZ+Faston",
        bez: "ŽZ"
    },
    // Volitelné typy PE kabelu pro speciální PE vodič
    peWireTypes: [
        "CYA",
        "CY"
    ],
    layers: { 
        wireList: "POPIS",              // Vrstva pro výpis vodičů
        stamp: "RAZÍTKO",               // Vrstva pro razítko
        cable: "POPIS",                 // Vrstva pro popis přívodního kabelu
        wireSource: "POPIS_VODIČŮ",     // Vrstva, ze které se načítají popisky vodičů
    }, 
    wireListHeaders: { 
        prubezne: "Průběžné vodiče:",
        napetove: "Napěťové vodiče:",
        dali: "DALI vodiče:",
        board: "Board vodiče:",
        ostatni: "Ostatní vodiče:"
    }, 
    stampLayout: {
        landscape: { // Pro orientaci na šířku
            jmeno: new RVector(910, 90), datum: new RVector(1005, 90), typ: new RVector(1180, 90), 
            nazev: new RVector(1080, 70), cislo: new RVector(1200, 45), popis: new RVector(900, 160), 
            druh: new RVector(1090, 90) 
        },
        portrait:  { // Pro orientaci na výšku
            jmeno: new RVector(475, 85), datum: new RVector(570, 85), typ: new RVector(780, 85), 
            nazev: new RVector(650, 65), cislo: new RVector(750, 35), popis: new RVector(470, 300), 
            druh: new RVector(660, 85) 
        }
    }, 
    emergencyCable: {
        text: "Pro samostatnou verzi zapojit:\nProdlužovací kabel k baterii \n(101882)",
        position: new RVector(600, 220)
    },
    // Konfigurace souřadnic pro jednotlivé revize
    revisionCoords: {
        "Na šířku": {
            "1": { desc: new RVector(1290, 135), date: new RVector(1195, 135), author: new RVector(1245, 135) },
            "2": { desc: new RVector(1290, 124), date: new RVector(1195, 124), author: new RVector(1245, 124) },
            "3": { desc: new RVector(1290, 112), date: new RVector(1195, 112), author: new RVector(1245, 112) }
    },
        "Na výšku": {
            "1": { desc: new RVector(855, 130), date: new RVector(760, 130), author: new RVector(810, 130) },
            "2": { desc: new RVector(855, 118), date: new RVector(760, 118), author: new RVector(810, 118) },
            "3": { desc: new RVector(855, 105), date: new RVector(760, 105), author: new RVector(810, 105) }
        }
    }
};

// --- KONSTANTY PRO ZLEPŠENÍ ČITELNOSTI A ROBUSTNOSTI ---
var ORIENTACE_NA_SIRKU = "Na šířku";
var ORIENTACE_NA_VYSKU = "Na výšku";

var AKCE_VSE = "Všechny skripty";
var AKCE_VODICE = "Výpis vodičů";
var AKCE_RAZITKO = "Razítko";
var AKCE_KABEL = "Přívodní kabel";
var AKCE_REVIZE = "Přidat revizi";

var TYP_VYKRESU_STANDARD = "Standard";
var TYP_VYKRESU_ATYP = "Atyp";
var TYP_VYKRESU_NEKATALOG = "Nekatalog";
var TYP_VYKRESU_NEURCENO = "Neurčeno";

var LAYER_CONFIG = {
    "BUŽÍRKY":       { color: new RColor(255, 0, 0),   lineweight: RLineweight.Weight025 },
    "DETAIL":        { color: new RColor(0, 255, 0),   lineweight: RLineweight.Weight025 },
    "DODATEK":       { color: new RColor(0, 255, 0),   lineweight: RLineweight.Weight025 },
    "BOM":           { color: new RColor(0, 0, 255),   lineweight: RLineweight.Weight025 },
    "KONSTRUKCE":    { color: new RColor(192, 192, 192), lineweight: RLineweight.Weight018 },
    "POPIS":         { color: new RColor(255, 0, 0),   lineweight: RLineweight.Weight025 },
    "POPIS_VODIČŮ":  { color: new RColor(0, 75, 0),     lineweight: RLineweight.Weight025 },
    "PŘÍSTROJE":     { color: new RColor(255, 0, 255),     lineweight: RLineweight.Weight025 },
    "RAZÍTKO":       { color: new RColor(0, 0, 0),   lineweight: RLineweight.Weight025 },
    "VODIČE":        { color: new RColor(0, 0, 0),     lineweight: RLineweight.Weight030 }
};

// --- HELPER FUNKCE PRO BEZPEČNÉ DIALOGY ---
function showCustomDialog(title, prompt, inputType, options) {
    options = options || {};
    var dialog = new QDialog(EAction.getMainWindow());
    dialog.setWindowTitle(title);

    var layout = new QVBoxLayout();
    dialog.setLayout(layout);

    var label = new QLabel(prompt, dialog);
    layout.addWidget(label, 0, 0);

    var inputWidget;
    if (inputType === 'text') {
        inputWidget = new QLineEdit(dialog);
        if (options.defaultValue) inputWidget.setText(options.defaultValue);
    } else if (inputType === 'double') {
        inputWidget = new QDoubleSpinBox(dialog);
        inputWidget.setRange(options.min || -10000, options.max || 10000);
        inputWidget.decimals = options.decimals || 2; 
        if (options.defaultValue !== undefined) inputWidget.value = options.defaultValue; 
    } else if (inputType === 'item') {
        inputWidget = new QComboBox(dialog);
        if (options.items) inputWidget.addItems(options.items);
        if (options.defaultValue) {
            var defaultIndex = options.items.indexOf(options.defaultValue);
            if (defaultIndex !== -1) inputWidget.setCurrentIndex(defaultIndex);
        }
    }
    layout.addWidget(inputWidget, 0, 0);

    var buttonLayout = new QHBoxLayout();
    buttonLayout.addStretch(1);

    var okButton = new QPushButton("OK", dialog);
    okButton.clicked.connect(function() { dialog.done(1); }); // 1 = OK
    buttonLayout.addWidget(okButton, 0, 0);

    var endButton = new QPushButton("Konec", dialog);
    endButton.clicked.connect(function() { dialog.done(3); }); // 3 = End
    buttonLayout.addWidget(endButton, 0, 0);

    layout.addLayout(buttonLayout, 0);

    var result = dialog.exec();
    var value = null;

    if (result === 1) { // OK
        if (inputType === 'text') value = inputWidget.text;
        else if (inputType === 'double') value = inputWidget.value;
        else if (inputType === 'item') value = inputWidget.currentText;
    }

    return { status: result, value: value };
}

function handleDialogResult(result, defaultValue) {
    // Pokud výsledek není "OK" (status 1), ukončíme skript.
    // To zahrnuje tlačítko "Konec" (status 3) i zavření okna (status 0).
    if (result.status !== 1) {
        handleCancel();
    }
    return result.value;
}

function safeGetItem(prompt, items, defaultValue) {
    var res = showCustomDialog("Výběr", prompt, 'item', { items: items, defaultValue: defaultValue });
    return handleDialogResult(res, defaultValue);
}

function safeGetText(prompt, defaultValue) {
    var res = showCustomDialog("Zadej hodnotu", prompt, 'text', { defaultValue: defaultValue || "" });
    return handleDialogResult(res, defaultValue);
}

function safeGetDouble(title, prompt, defaultValue) {
    var res = showCustomDialog(title, prompt, 'double', { defaultValue: defaultValue });
    return handleDialogResult(res, defaultValue);
}

function handleCancel() {
    // Tato funkce se volá, když uživatel stiskne "Zrušit" v dialogu.
    // Zobrazí zprávu a ukončí skript.
    var di = EAction.getDocumentInterface();
    if (di) {
        EAction.handleUserMessage("❌ Akce byla zrušena uživatelem. Skript byl ukončen.");
    }
    throw new Error("SCRIPT_TERMINATED_BY_USER");
}

/**
 * Formátuje jméno uživatele do požadovaného tvaru. Příklad: "zacharam" -> "Zachara M"
 */
function formatJmeno(name) {
    if (!name || name.length < 2) return name;
    var firstLetter = name.charAt(0).toUpperCase();
    var middlePart = name.slice(1, -1);
    var lastLetter = name.slice(-1).toUpperCase();
    return firstLetter + middlePart + " " + lastLetter;
}

/**
 * Získá jméno přihlášeného uživatele ze systému.
 */
function getSystemUsername() {
    var process = new QProcess();
    var command, args;
    var testProcess = new QProcess();
    testProcess.start('cmd.exe', ['/C', 'exit']);
    var isWindows = testProcess.waitForStarted(200);
    if (isWindows) testProcess.waitForFinished(-1);

    if (isWindows) {
        command = 'cmd.exe';
        args = ['/C', 'echo %USERNAME%'];
    } else {
        command = '/bin/sh';
        args = ['-c', 'echo $USER'];
    }

    try {
        process.start(command, args);
        if (process.waitForFinished(1000)) {
            var output = new QTextStream(process).readAll().trim();
            if (output) return output;
        }
    } catch (e) { }
    return null;
}

/**
 * Přidá vrstvy, které chybí, dle LAYER_CONFIG.
 */
function zajistiPotrebneVrstvy(doc, di) {
    // Sestaví unikátní seznam všech požadovaných vrstev z LAYER_CONFIG i z CONFIG.layers
    var vsechnyPotrebneVrstvy = {};
    for (var nazevVrstvy in LAYER_CONFIG) {
        if (LAYER_CONFIG.hasOwnProperty(nazevVrstvy)) {
            vsechnyPotrebneVrstvy[nazevVrstvy] = true;
        }
    }
    for (var klic in CONFIG.layers) {
        if (CONFIG.layers.hasOwnProperty(klic)) {
            vsechnyPotrebneVrstvy[CONFIG.layers[klic]] = true;
        }
    }
    var pozadovaneVrstvy = Object.keys(vsechnyPotrebneVrstvy);

    var op = new RAddObjectsOperation();
    for (var i = 0; i < pozadovaneVrstvy.length; i++) {
        var nazevVrstvy = pozadovaneVrstvy[i];
        if (!doc.hasLayer(nazevVrstvy)) {
            var novaVrstva = new RLayer(doc, nazevVrstvy);
            var config = LAYER_CONFIG[nazevVrstvy]; // Zkusí najít konfiguraci pro vrstvu
            if (config) { // Pokud existuje, nastaví její vlastnosti
                if (config.color) novaVrstva.setColor(config.color);
                if (config.lineweight) novaVrstva.setLineweight(config.lineweight);
            }
            // Pokud konfigurace neexistuje, vrstva se vytvoří s výchozími vlastnostmi QCADu
            op.addObject(novaVrstva);
        }
    }
    if (!op.isEmpty()) {
        di.applyOperation(op);
    }
}

/**
 * Vloží textovou entitu.
 */
function vlozText(op, text, pozice, velikostTextu) {
    var doc = EAction.getDocument();
    var data = new RTextData(
        pozice, pozice,
        velikostTextu || CONFIG.velikostTextuZaklad, 0,
        RS.VAlignTop, RS.HAlignLeft, RS.LeftToRight, RS.Exact,
        1.0, text, "Arial", false, false, 0.0, false
    );
    op.addObject(new RTextEntity(doc, data));
}

/**
 * Vloží textovou entitu se zarovnáním dolů.
 */
function vlozTextDole(op, text, pozice, velikostTextu) {
    var doc = EAction.getDocument();
    var data = new RTextData(
        pozice, pozice,
        velikostTextu || CONFIG.velikostTextuZaklad, 0,
        RS.VAlignBottom, RS.HAlignLeft, RS.LeftToRight, RS.Exact,
        1.0, text, "Arial", false, false, 0.0, false
    );
    op.addObject(new RTextEntity(doc, data));
}


/**
 * Vloží víceřádkový textový blok a vrátí novou Y souřadnici pro další blok.
 * Tato funkce je navržena tak, aby fungovala v rámci jedné operace (RAddObjectsOperation).
 * @param {RDocument} doc - Dokument, do kterého se vkládá.
 * @param {RAddObjectsOperation} op - Operace pro přidání objektů.
 * @param {string} text - Text k vložení.
 * @param {RVector} pozice - Počáteční pozice pro vložení textu (levý horní roh).
 * @param {number} velikostTextu - Velikost písma.
 * @param {number} mezeraPodBlokem - Mezera, která se má přidat pod tento blok.
 * @returns {number} Nová Y souřadnice pro začátek dalšího bloku.
 */
function vlozTextBlok(op, text, pozice, velikostTextu, mezeraPodBlokem) {
    // Pokud je text prázdný nebo obsahuje jen hlavičku bez obsahu, nic nevkládáme.
    var radky = text.trim().split('\n');
    if (radky.length <= 1) {
        return pozice.y; // Pokud není co vložit, vrátíme původní Y
    }

    var doc = EAction.getDocument();
    var data = new RTextData(
        pozice, pozice,
        velikostTextu, 0,
        RS.VAlignTop, RS.HAlignLeft, RS.LeftToRight, RS.Exact,
        1.0, text, "Arial", false, false, 0.0, false
    );
    var textEntity = new RTextEntity(doc, data);
    op.addObject(textEntity);

    // Získáme přesné rozměry textového bloku
    var bbox = textEntity.getBoundingBox();
    
    // Pokud je bounding box platný, použijeme jeho výšku. Jinak použijeme záložní odhad.
    var vyskaBloku = bbox.isValid() ? bbox.getHeight() : (radky.length * CONFIG.krokY);
    return pozice.y - vyskaBloku - mezeraPodBlokem;
}

// ===========================================
// === FUNKCE PRO VÝPIS VODIČŮ              ===
// ===========================================

function _vypisVodice_collectAndClassifyEntities() {
    var alfanumericke = {};
    var ciselne = {};
    var peKeys = {};
    
    var doc = EAction.getDocument(); // Získání aktuálního dokumentu
    var entityIds = doc.queryAllEntities();
    for (var i = 0; i < entityIds.length; i++) {
        var e = doc.queryEntity(entityIds[i]);
        if (e.getType() === RS.EntityText && e.getLayerName() === CONFIG.layers.wireSource) {
            // Rozdělí text podle čárek i podle nových řádků, aby se správně zpracovaly víceřádkové popisky.
            var parts = e.getPlainText().trim().split(/,|\n/);
            for (var j = 0; j < parts.length; j++) {
                var klic = parts[j].trim().toUpperCase();
                if (klic.length === 0) continue;

                if (/^\d+$/.test(klic)) {
                    if (!ciselne[klic]) ciselne[klic] = 0;
                    ciselne[klic]++;
                } else {
                    // Zajistíme, že každý klíč bude v objektu pouze jednou,
                    // čímž se zabrání duplicitám, pokud je stejný vodič
                    // ve výkresu vícekrát.
                    if (!alfanumericke.hasOwnProperty(klic)) {
                        alfanumericke[klic] = true;
                    }
                    if (klic.startsWith("PE")) peKeys[klic] = true;
                }
            }
        }
    }
    return { alfanumericke: alfanumericke, ciselne: ciselne, peKeys: Object.keys(peKeys) };
}

function _vypisVodice_selectPrubezneVodice(allAlphaKeys) {
    var selectableWires = allAlphaKeys.filter(function(wire) {
        return !(/^[A-Z][\+\-]$/.test(wire) || /^5\d$/.test(wire));
    }).sort();

    if (selectableWires.length === 0) {
        QMessageBox.information(EAction.getMainWindow(), "Informace", "Nebyly nalezeny žádné alfanumerické vodiče pro výběr průběžných.");
        return [];
    }
    
    // Používáme ověřenou implementaci dialogu, která funguje spolehlivě v QCAD prostředí.
    // Drobné rozdíly v API volání (např. windowTitle vs setWindowTitle) mají vliv na stabilitu.
    var dialog = new QDialog(EAction.getMainWindow());
    dialog.windowTitle = "Výběr průběžných vodičů";

    var layout = new QVBoxLayout();
    dialog.setLayout(layout);

    var label = new QLabel("Zaškrtněte vodiče, které jsou průběžné:", dialog);
    layout.addWidget(label, 0, 0);

    var checkboxes = [];
    for (var i = 0; i < selectableWires.length; i++) {
        var checkbox = new QCheckBox(selectableWires[i], dialog);
        layout.addWidget(checkbox, 0, 0);
        checkboxes.push(checkbox);
    }

    var buttonLayout = new QHBoxLayout();
    buttonLayout.addStretch(1);

    var okButton = new QPushButton("Hotovo", dialog);
    okButton.clicked.connect(function() { dialog.accept(); });
    buttonLayout.addWidget(okButton, 0, 0);

    var cancelButton = new QPushButton("Konec", dialog);
    cancelButton.clicked.connect(function() { dialog.reject(); });
    buttonLayout.addWidget(cancelButton, 0, 0);

    layout.addLayout(buttonLayout, 0);

    if (dialog.exec()) {
        var selectedItems = [];
        for (var i = 0; i < checkboxes.length; i++) {
            // Používáme checkState() === Qt.Checked, což je spolehlivější než isChecked()
            if (checkboxes[i].checkState() === Qt.Checked) {
                selectedItems.push(checkboxes[i].text);
            }
        }
        return selectedItems;
    }
    handleCancel();
    return null; 
}

// --- NOVÉ: dialog pro výběr PE vodiče + zakončení (očko / faston / bez) ---
function _vypisVodice_selectPeWireAndTermination(peKeys) {
    if (!peKeys || peKeys.length === 0) {
        return { wire: "", termination: "", peType: "" };
    }

    var noPeOption = "Žádný PE vodič se zakončením";
    var items = peKeys.slice(0).sort();
    items.push(noPeOption);

    // Seznam typů PE kabelu – z CONFIGu nebo fallback
    var peTypeItems = (CONFIG.peWireTypes && CONFIG.peWireTypes.length > 0)
        ? CONFIG.peWireTypes
        : [ "CYA", "CY" ];

    while (true) {
        var dialog = new QDialog(EAction.getMainWindow());
        dialog.windowTitle = "PE vodič";

        var layout = new QVBoxLayout();
        dialog.setLayout(layout);

        var label = new QLabel("Zvolte PE vodič, typ zakončení a typ kabelu:", dialog);
        layout.addWidget(label, 0, 0);

        // Výběr konkrétního PE vodiče (PE1, PE2...)
        var combo = new QComboBox(dialog);
        combo.addItems(items);
        layout.addWidget(combo, 0, 0);

        // Výběr typu zakončení
        var termLabel = new QLabel("Typ zakončení PE vodiče:", dialog);
        layout.addWidget(termLabel, 0, 0);

        var cbOcko = new QCheckBox("s očkem", dialog);
        var cbFaston = new QCheckBox("faston", dialog);
        var cbBez = new QCheckBox("bez zakončení", dialog);

        layout.addWidget(cbOcko, 0, 0);
        layout.addWidget(cbFaston, 0, 0);
        layout.addWidget(cbBez, 0, 0);

        // Výběr typu PE kabelu (CYA / CY / …)
        var typeLabel = new QLabel("Typ PE kabelu:", dialog);
        layout.addWidget(typeLabel, 0, 0);

        var typeCombo = new QComboBox(dialog);
        typeCombo.addItems(peTypeItems);
        layout.addWidget(typeCombo, 0, 0);

        var note = new QLabel("Vyber právě jednu možnost zakončení.", dialog);
        layout.addWidget(note, 0, 0);

        var buttonLayout = new QHBoxLayout();
        buttonLayout.addStretch(1);

        var okButton = new QPushButton("Hotovo", dialog);
        okButton.clicked.connect(function() { dialog.accept(); });
        buttonLayout.addWidget(okButton, 0, 0);

        var cancelButton = new QPushButton("Konec", dialog);
        cancelButton.clicked.connect(function() { dialog.reject(); });
        buttonLayout.addWidget(cancelButton, 0, 0);

        layout.addLayout(buttonLayout, 0);

        if (!dialog.exec()) {
            handleCancel();
            return { wire: "", termination: "", peType: "" };
        }

        var selectedWire = combo.currentText;
        if (selectedWire === noPeOption) {
            return { wire: "", termination: "", peType: "" };
        }

        var count = 0;
        var term = "";

        if (cbOcko.checkState() === Qt.Checked) { term = "ocko"; count++; }
        if (cbFaston.checkState() === Qt.Checked) { term = "faston"; count++; }
        if (cbBez.checkState() === Qt.Checked)   { term = "bez"; count++; }

        if (count !== 1) {
            QMessageBox.warning(
                EAction.getMainWindow(),
                "Upozornění",
                "Vyber právě jednu možnost zakončení PE vodiče."
            );
        } else {
            var peType = typeCombo.currentText;
            return {
                wire: selectedWire,
                termination: term,
                peType: peType
            };
        }
    }
}
function _vypisVodice_getSpecialWireConfig(nazevK2, peKeys, prubezneVodice) {
    var isSystem = /^\/?\d+S/i.test(nazevK2);

    var config = {
        zemniciPE: "",
        peTermination: "",
        peType: "",
        systemoveVodiceKlice: [],
        isSystem: isSystem
    };

    // PE vodič + typ zakončení + typ kabelu pouze u samostatných svítidel
    if (!isSystem && peKeys.length > 0) {
        var peChoice = _vypisVodice_selectPeWireAndTermination(peKeys);
        config.zemniciPE = peChoice.wire;
        config.peTermination = peChoice.termination;
        config.peType = peChoice.peType;
    }

    config.systemoveVodiceKlice = prubezneVodice;
    return config;
}

function _vypisVodice_getWireInfo(klic, config) {
    function _getBarvaNapetovehoVodice(k) {
        if (k.startsWith("N")) return "M";
        if (k.startsWith("PE")) return "ŽZ";
        return "Č";
    }

        if (klic.startsWith("L") || klic.startsWith("N") || klic.startsWith("PE")) {

        // Speciální PE vodič s volbou zakončení (očko / faston / bez)
        // a volbou typu kabelu (CYA / CY / ...)
        if (config.zemniciPE && klic === config.zemniciPE) {
            var wcGround = CONFIG.wireDefaults.powerGroundWithEyelet;

            var barvaPE;
            if (config.peTermination === "faston") {
                barvaPE = CONFIG.peTerminationTexts
                    ? CONFIG.peTerminationTexts.faston
                    : "ŽZ+Faston";
            } else if (config.peTermination === "bez") {
                barvaPE = CONFIG.peTerminationTexts
                    ? CONFIG.peTerminationTexts.bez
                    : "ŽZ";
            } else {
                // default = očko
                barvaPE = CONFIG.peTerminationTexts
                    ? CONFIG.peTerminationTexts.ocko
                    : "ŽZ+Očko";
            }

            // typ kabelu pro PE z dialogu, fallback na default z CONFIGu
            var peType = config.peType || wcGround.type;

            // výstup např.: CYA;1,0;ŽZ+Faston
            return {
                type: "napetove",
                suffix: peType + ";" + wcGround.crossSection + ";" + barvaPE
            };
        }
    
        var isThroughWire = config.systemoveVodiceKlice.indexOf(klic) !== -1;

        if (isThroughWire) {
            var wc1 = CONFIG.wireDefaults.powerSystem;
            return { type: "prubezne", suffix: wc1.type + ";" + wc1.crossSection + ";" + _getBarvaNapetovehoVodice(klic) };
        } else {
            var wc2 = CONFIG.wireDefaults.power;
            return { type: "napetove", suffix: wc2.type + ";" + wc2.crossSection + ";" + _getBarvaNapetovehoVodice(klic) };
        }
    }
    // Oprava: Zkontrolujeme, zda je DALI vodič průběžný, PŘED obecným zpracováním DALI.
    if (klic.startsWith("DA")) { // Používáme startsWith pro konzistenci
        var isThroughWireDali = config.systemoveVodiceKlice.indexOf(klic) !== -1;
        if (isThroughWireDali) {
            var wcDaliSys = CONFIG.wireDefaults.daliSystem;
            var cislo1 = parseInt(klic.replace(/[^0-9]/g, ""), 10);
            // Lichý (odd) = Šedá, Sudý (even) = Bílá
            var barva1 = (cislo1 % 2 !== 0) ? "Š" : "B";
            return { type: "prubezne", suffix: wcDaliSys.type + ";" + wcDaliSys.crossSection + ";" + barva1 };
        }
        var cislo2 = parseInt(klic.replace(/[^0-9]/g, ""), 10);
        var barva2 = isNaN(cislo2) ? "B" : (cislo2 % 2 === 0 ? "B-Ž" : "B-Š");
        var wcDali = CONFIG.wireDefaults.dali;
        return { type: "dali", suffix: wcDali.type + ";" + wcDali.crossSection + ";" + barva2 };
    }
    if (klic.endsWith("+") || klic.endsWith("-") || /^\d+$/.test(klic)) {
        var wcBoard = CONFIG.wireDefaults.board;
        var suffixBoard = klic.endsWith("+") ? (wcBoard.type + ";" + wcBoard.crossSection + ";B-H") : (wcBoard.type + ";" + wcBoard.crossSection + ";B");
        return { type: "board", suffix: suffixBoard };
    }
    if (config.unknownWireCache[klic]) {
        return { type: "ostatni", suffix: config.unknownWireCache[klic] };
    }
    var zadano = safeGetText("Zadej typ pro vodič '" + klic + "' (např. CY;0,5;R):", "CY;0,5;?");
    var suffix = zadano;
    config.unknownWireCache[klic] = suffix;
    return { type: "ostatni", suffix: suffix };
}

function _vypisVodice_processAndCategorize(alfanumericke, ciselne, specialConfig) {
    var zpracovaneVodice = { prubezne: [], napetove: [], dali: [], board: [], ostatni: [] };
    var maxDelky = { prubezne: 0, napetove: 0, dali: 0, board: 0, ostatni: 0 };
    var unknownWireCache = {}; // Cache pro neznámé vodiče

    // Přidá ručně zadaný zemnící vodič, pokud ještě neexistuje
    if (specialConfig.zemniciPE && !alfanumericke[specialConfig.zemniciPE]) {
        alfanumericke[specialConfig.zemniciPE] = true;
    }

    var vsechnyKlice = Object.keys(alfanumericke).sort();
    for (var i = 0; i < vsechnyKlice.length; i++) {
        var k = vsechnyKlice[i];
                var result = _vypisVodice_getWireInfo(k, {
            zemniciPE: specialConfig.zemniciPE,
            peTermination: specialConfig.peTermination,
            peType: specialConfig.peType,
            isSystem: specialConfig.isSystem,
            systemoveVodiceKlice: specialConfig.systemoveVodiceKlice,
            unknownWireCache: unknownWireCache
        });

        // 'result' již nemůže být null, protože handleCancel() by ukončil skript
        zpracovaneVodice[result.type].push({ klic: k, suffix: result.suffix });
        if (k.length > maxDelky[result.type]) {
            maxDelky[result.type] = k.length;
        }
    }

    var keysNum = Object.keys(ciselne).sort();
    for (var i = 0; i < keysNum.length; i++) {
        var klic = keysNum[i];
        var count = Math.floor(ciselne[klic] / 2);
        if (count > 0) {
            var wireConf = CONFIG.wireDefaults.board;
            var suffix = wireConf.type + ";" + wireConf.crossSection + ";B";
            var finalKlic = count + "x" + klic;
            zpracovaneVodice.board.push({ klic: finalKlic, suffix: suffix });
            if (finalKlic.length > maxDelky.board) {
                maxDelky.board = finalKlic.length;
            }
        }
    }

    return { zpracovaneVodice: zpracovaneVodice, maxDelky: maxDelky };
}

function _vypisVodice_buildOutputStrings(zpracovaneVodice, maxDelky) {
    function _pridejZarovnanyRadek(text, klic, suffix, maxDelka, paddingValue) {
        var padding = "";
        var numSpaces = maxDelka - klic.length + paddingValue;
        if (numSpaces < 1) numSpaces = 1; // Zajistí minimálně jednu mezeru
        for (var i = 0; i < numSpaces; i++) {
            padding += " ";
        }
        return text + klic + ":" + padding + "- " + suffix + "\n";
    }

    var headers = CONFIG.wireListHeaders;
    var textBlocks = {};
    textBlocks.prubezne = headers.prubezne ? headers.prubezne + "\n" : "";
    textBlocks.napetove = headers.napetove ? headers.napetove + "\n" : "";
    textBlocks.dali = headers.dali ? headers.dali + "\n" : "";
    textBlocks.board = headers.board ? headers.board + "\n" : "";
    textBlocks.ostatni = headers.ostatni ? headers.ostatni + "\n" : "";

    for (var i = 0; i < zpracovaneVodice.napetove.length; i++) {
        var v = zpracovaneVodice.napetove[i];
        textBlocks.napetove = _pridejZarovnanyRadek(textBlocks.napetove, v.klic, v.suffix, maxDelky.napetove, CONFIG.paddingNapetoveVodice);
    }

    // Seřadíme průběžné vodiče, aby L, N, PE byly první, následované DA
    zpracovaneVodice.prubezne.sort(function(a, b) {
        var getOrder = function(key) {
            if (key.startsWith("L")) return 1;
            if (key.startsWith("N")) return 2;
            if (key.startsWith("PE")) return 3;
            if (key.startsWith("DA")) return 4;
            return 5; // Ostatní
        };
        var orderA = getOrder(a.klic);
        var orderB = getOrder(b.klic);

        if (orderA !== orderB) {
            return orderA - orderB;
        }
        return a.klic.localeCompare(b.klic); // Pokud jsou stejného typu, seřadíme je abecedně
    });

    for (var i = 0; i < zpracovaneVodice.prubezne.length; i++) {
        var v = zpracovaneVodice.prubezne[i];
        textBlocks.prubezne = _pridejZarovnanyRadek(textBlocks.prubezne, v.klic, v.suffix, maxDelky.prubezne, CONFIG.paddingNapetoveVodice);
    }
    for (var i = 0; i < zpracovaneVodice.dali.length; i++) {
        var v = zpracovaneVodice.dali[i];
        textBlocks.dali = _pridejZarovnanyRadek(textBlocks.dali, v.klic, v.suffix, maxDelky.dali, CONFIG.paddingDaliBoardOstatni);
    }
    for (var i = 0; i < zpracovaneVodice.board.length; i++) {
        var v = zpracovaneVodice.board[i];
        textBlocks.board = _pridejZarovnanyRadek(textBlocks.board, v.klic, v.suffix, maxDelky.board, CONFIG.paddingDaliBoardOstatni);
    }
    for (var i = 0; i < zpracovaneVodice.ostatni.length; i++) {
        var v = zpracovaneVodice.ostatni[i];
        textBlocks.ostatni = _pridejZarovnanyRadek(textBlocks.ostatni, v.klic, v.suffix, maxDelky.ostatni, CONFIG.paddingDaliBoardOstatni);
    }

    return textBlocks;
}

// ===========================================
// === FUNKCE PRO RAZÍTKO                   ===
// ===========================================

function _razitko_getInitialData() {
    var jmenoRaw = getSystemUsername();
    if (!jmenoRaw) {
        jmenoRaw = safeGetText("Nepodařilo se načíst jméno ze systému.\nZadejte ho ručně:", "");
    }
    var now = new Date();
    function pad(n) { return n < 10 ? "0" + n : n; }
    return {
        autor: formatJmeno(jmenoRaw),
        datum: pad(now.getDate()) + "." + pad(now.getMonth() + 1) + "." + now.getFullYear()
    };
}

function _razitko_parseK2Name(nazevK2) {
    // Regex upraven tak, aby zachytil všechny písmenné modifikátory (např. 'SZ')
    var matches = nazevK2.match(/^\/?(\d+)([A-Z]*)?-/);
    if (matches) {
        var kodSvitidla = matches[1];
        var kodTypu = matches[2] || ""; // Zajistí, že kodTypu je vždy string
        return {
            // Podmínka upravena tak, aby hledala přítomnost 'Z' v modifikátoru
            typSvitidla: (nazevK2.startsWith('/') && kodTypu.indexOf('Z') !== -1) ? TYP_VYKRESU_ATYP :
                         (nazevK2.startsWith('/') ? TYP_VYKRESU_NEKATALOG : TYP_VYKRESU_STANDARD),
            rodinaSvitidla: CONFIG.typySvitidel[kodSvitidla] || null
        };
    }
    return { typSvitidla: null, rodinaSvitidla: null };
}

function _razitko_getDriverSettings(nazevK2) {
    // Funkce nyní vrací pole nalezených driverů, aby se dynamicky generoval text v razítku.
    var foundDrivers = [];
    var parts = nazevK2.split('-');

    function askForValue(driverType, defaultValue) {
        var val = safeGetText("Zadej hodnotu pro " + driverType + " (mA):", defaultValue || "");
        return val;
    }

    if (parts.length > 2 && parts[2]) {
        var driverPart = parts[2].toUpperCase();

        // Konfigurace pro rozpoznávání typů driverů v kódu K2
        var driverTypes = [
            { code: "GE", name: "GEE/GED", regex: /(\d+)GE/ },
            { code: "GG", name: "GGE/GGD", regex: /(\d+)GG/ },
            { code: "GH", name: "GHE/GHD", regex: /(\d+)GH/ },
            { code: "GI", name: "GIE/GID", regex: /(\d+)GI/ }  // Přidán nový typ GI
        ];

        for (var i = 0; i < driverTypes.length; i++) {
            var driver = driverTypes[i];
            // Zkontroluje, zda kód K2 obsahuje označení driveru (např. "GE")
            if (driverPart.indexOf(driver.code) !== -1) {
                // Vždy použijeme výchozí hodnotu z konfigurace, protože číslo v K2 kódu není proud.
                var result = askForValue(driver.name, CONFIG.defaultDriverCurrent);
                foundDrivers.push({ type: driver.name, value: result });
            }
        }
    }
    return foundDrivers;
}

function _razitko_generateDescriptionText(foundDrivers) {
    if (!foundDrivers || foundDrivers.length === 0) {
        return "";
    }

    // Dynamicky sestaví řádky pouze pro nalezené drivery.
    var driverLines = foundDrivers.map(function(driver) {
        // Formátování pro zarovnání, např. "GEE/GED    -    1050 mA"
        return driver.type + "    -    " + driver.value + " mA";
    }).join("\n");

    return "Nastavte pomocí PC\n\n" +
           driverLines +
           "\n\n" +
           "Program T4T ; Přípravek NFC/Dali Magic\n" +
           "Program Helvar Configurator ; programátor NFC/Helvar\n" +
           "Program deviceCONFIGURATOR ; programátor NFC/Tridonic";
}

function _razitko_finalizeData(doc, data) {
    var finalData = {
        autor: data.autor,
        datum: data.datum,
        nazevK2: data.nazevK2,
        popisText: data.popisText,
        typSvitidla: data.typSvitidla,
        rodinaSvitidla: data.rodinaSvitidla
    };

    var plnaCestaSouboru = doc.getFileName();
    if (plnaCestaSouboru) {
        finalData.cisloK2 = plnaCestaSouboru.replace(/^.*[\\/]/, '').replace(/\.(dxf|dwg)$/i, '');
    } else {
        var cislo = safeGetText("Soubor není uložen. Zadejte číslo zboží K2:", "");
        finalData.cisloK2 = cislo;
    }

    if (!finalData.typSvitidla) {
        var typManual = safeGetItem("Typ výkresu", ["Standardní", "Atyp", "Nekatalog"], "Standardní");
        finalData.typSvitidla = { "Standardní": TYP_VYKRESU_STANDARD, "Atyp": TYP_VYKRESU_ATYP, "Nekatalog": TYP_VYKRESU_NEKATALOG }[typManual];
    }

    if (!finalData.rodinaSvitidla) {
        // ES5-kompatibilní způsob, jak získat unikátní a seřazený seznam druhů svítidel.
        // Skriptovací engine QCADu nepodporuje moderní 'Set' nebo 'Object.values'.
        var allValues = [];
        for (var key in CONFIG.typySvitidel) {
            if (CONFIG.typySvitidel.hasOwnProperty(key)) {
                allValues.push(CONFIG.typySvitidel[key]);
            }
        }
        var uniqueMap = {};
        var druhySv = [];
        for (var i = 0; i < allValues.length; i++) {
            if (!uniqueMap[allValues[i]]) {
                uniqueMap[allValues[i]] = true;
                druhySv.push(allValues[i]);
            }
        }
        druhySv.sort();
        var rodina = safeGetItem("Nepodařilo se rozpoznat druh svítidla. Vyberte z nabídky:", druhySv, druhySv[0]);
        finalData.rodinaSvitidla = rodina;
    }

    return finalData;
}

function _razitko_insertTexts(di, orientace, data) {
    var doc = di.getDocument();
    di.setCurrentLayer(CONFIG.layers.stamp);
    
    var pos = orientace === ORIENTACE_NA_SIRKU ? CONFIG.stampLayout.landscape : CONFIG.stampLayout.portrait;
    var op = new RAddObjectsOperation();
    vlozText(op, data.autor, pos.jmeno, CONFIG.velikostTextuRazitkoMala);
    vlozText(op, data.datum, pos.datum, CONFIG.velikostTextuRazitkoMala);
    vlozText(op, data.typSvitidla, pos.typ, CONFIG.velikostTextuRazitkoMala);
    vlozText(op, data.nazevK2, pos.nazev, CONFIG.velikostTextuRazitkoVelka);
    vlozText(op, data.cisloK2, pos.cislo, CONFIG.velikostTextuRazitkoVelka);
    vlozTextDole(op, data.popisText, pos.popis, CONFIG.velikostTextuZaklad);
    vlozText(op, data.rodinaSvitidla, pos.druh, CONFIG.velikostTextuRazitkoMala);
    di.applyOperation(op);
}

// ===========================================
// === HLAVNÍ FUNKCE JEDNOTLIVÝCH AKCÍ      ===
// ===========================================

function main_vypisVodice(di, orientace, nazevK2) {
    var doc = di.getDocument();
    di.setCurrentLayer(CONFIG.layers.wireList);

    var poziceX = safeGetDouble("Souřadnice X", "Zadej X souřadnici:", CONFIG.defaultX);
    if (poziceX === null) handleCancel();

    var poziceYDefault = (orientace === ORIENTACE_NA_VYSKU ? CONFIG.defaultY_portrait : CONFIG.defaultY_landscape);
    var poziceY = safeGetDouble("Souřadnice Y", "Zadej Y souřadnici:", poziceYDefault);
    if (poziceY === null) handleCancel();

    var collectedEntities = _vypisVodice_collectAndClassifyEntities();
    if (collectedEntities === null) return false;
    var allAlphaKeys = Object.keys(collectedEntities.alfanumericke);

    var prubezneVodice = []; // Výchozí hodnota - žádné průběžné vodiče
    var isSystem = /^\/?\d+S/i.test(nazevK2);

    if (isSystem) {
        // Pokud je svítidlo systémové, zobrazíme dialog pro výběr
        prubezneVodice = _vypisVodice_selectPrubezneVodice(allAlphaKeys);
        // Zrušení je nyní ošetřeno uvnitř _vypisVodice_selectPrubezneVodice
    }

    var specialConfig = _vypisVodice_getSpecialWireConfig(nazevK2, collectedEntities.peKeys, prubezneVodice);

    var processedData = _vypisVodice_processAndCategorize(
        collectedEntities.alfanumericke,
        collectedEntities.ciselne,
        specialConfig
    );
    if (!processedData) {
        EAction.handleUserMessage("❌ Chyba: Zpracování vodičů selhalo nebo bylo zrušeno.");
        return false;
    }

    var outputStrings = _vypisVodice_buildOutputStrings(processedData.zpracovaneVodice, processedData.maxDelky);

    var op = new RAddObjectsOperation();
    var currentY = poziceY;
    var sectionSpacing = CONFIG.mezera;

    // Použijeme novou funkci, která dynamicky vypočítá pozici dalšího bloku
    currentY = vlozTextBlok(op, outputStrings.prubezne, new RVector(poziceX, currentY), CONFIG.velikostTextuZaklad, sectionSpacing);
    currentY = vlozTextBlok(op, outputStrings.napetove, new RVector(poziceX, currentY), CONFIG.velikostTextuZaklad, sectionSpacing);
    currentY = vlozTextBlok(op, outputStrings.dali, new RVector(poziceX, currentY), CONFIG.velikostTextuZaklad, sectionSpacing);
    currentY = vlozTextBlok(op, outputStrings.board, new RVector(poziceX, currentY), CONFIG.velikostTextuZaklad, sectionSpacing);
    // Poslední blok nepotřebuje mezeru pod sebou
    vlozTextBlok(op, outputStrings.ostatni, new RVector(poziceX, currentY), CONFIG.velikostTextuZaklad, 0);

    di.applyOperation(op);
    EAction.handleUserMessage("✅ Výpis vodičů byl úspěšně vygenerován.");
    return true;
}

function main_razitko(di, orientace, nazevK2) {
    var doc = di.getDocument();
    var initialData = _razitko_getInitialData();

    var parsedName = _razitko_parseK2Name(nazevK2);

    var driverSettings = _razitko_getDriverSettings(nazevK2);
    var popisText = _razitko_generateDescriptionText(driverSettings);

    var dataForFinalizing = {
        autor: initialData.autor,
        datum: initialData.datum,
        nazevK2: nazevK2,
        popisText: popisText,
        typSvitidla: parsedName.typSvitidla,
        rodinaSvitidla: parsedName.rodinaSvitidla
    };

    var finalData = _razitko_finalizeData(doc, dataForFinalizing);

    _razitko_insertTexts(di, orientace, finalData);
    EAction.handleUserMessage("✅ Razítko bylo úspěšně vygenerováno.");
    return true;
}

function main_revize(di, orientace) {
    var doc = di.getDocument();
    di.setCurrentLayer(CONFIG.layers.stamp);

    var revNumber = safeGetItem("Zvolte číslo revize", ["1", "2", "3"], "1");
    if (revNumber === null) handleCancel();

    var popis = safeGetText("Popis změny pro revizi č. " + revNumber, "");
    if (popis === null) {
        handleCancel();
    }
    if (popis.trim() === "") {
        QMessageBox.information(EAction.getMainWindow(), "Zrušeno", "Vytvoření revize bylo zrušeno, protože popis je prázdný.");
        return false;
    }

    var jmenoRaw = getSystemUsername() || "Neznámý";
    var autor = formatJmeno(jmenoRaw);

    var now = new Date();
    function pad(n) { return n < 10 ? "0" + n : n; }
    var datum = pad(now.getDate()) + "." + pad(now.getMonth() + 1) + "." + now.getFullYear();
    
    var coords = CONFIG.revisionCoords[orientace][revNumber];
    if (!coords) {
        QMessageBox.warning(EAction.getMainWindow(), "Chyba", "Konfigurace souřadnic pro danou revizi a orientaci nebyla nalezena.");
        return false;
    }

    var op = new RAddObjectsOperation();
    var velikostTextu = CONFIG.velikostTextuRevize;

    vlozText(op, popis, coords.desc, velikostTextu);
    vlozText(op, datum, coords.date, velikostTextu);
    vlozText(op, autor, coords.author, velikostTextu);

    di.applyOperation(op);

    EAction.handleUserMessage("✅ Revize č. " + revNumber + " byla úspěšně přidána.");
    return true;
}

/**
 * Vloží text s informací o prodlužovacím kabelu pro nouzové baterie,
 * pokud jsou splněny specifické podmínky (samostatné, závěsné, nouzové svítidlo).
 * @param {RDocument} doc - Aktuální dokument.
 * @param {RDocumentInterface} di - Rozhraní dokumentu.
 * @param {string} nazevK2 - Kód produktu (název karty K2).
 */
function main_nouzovyKabel(di, nazevK2) {
    var doc = di.getDocument();
    // Podmínka 1: Není systémové (je samostatné)
    var isSystem = /^\/?\d+S/i.test(nazevK2);
    if (isSystem) {
        return false; // Není samostatné, nic neděláme
    }

    // Podmínka 2: Je závěsné (obsahuje -5...)
    var pendantMatch = nazevK2.match(/-(\d)/);
    var isPendant = pendantMatch && pendantMatch[1] === '5';
    if (!isPendant) {
        return false; // Není závěsné, nic neděláme
    }

    // Podmínka 3: Je nouzové (obsahuje segment /M, /M3, atd.)
    var isEmergency = /\/M/i.test(nazevK2);
    if (!isEmergency) {
        return false; // Není nouzové, nic neděláme
    }

    // Všechny podmínky splněny, vložíme text
    var emergencyConfig = CONFIG.emergencyCable;
    di.setCurrentLayer(CONFIG.layers.cable);
    var op = new RAddObjectsOperation();
    vlozText(op, emergencyConfig.text, emergencyConfig.position, CONFIG.velikostTextuZaklad);
    di.applyOperation(op);
    return true; // Vrací true, pokud byl text vložen
}

function main_kabel(di, nazevK2) {
    var doc = di.getDocument();
    di.setCurrentLayer(CONFIG.layers.cable);
    var kabelVyber = null;
    var lastCommaIndex = nazevK2.lastIndexOf(',');
    if (lastCommaIndex !== -1 && lastCommaIndex < nazevK2.length - 1) {
        var charAfterComma = nazevK2.substring(lastCommaIndex + 1).trim().toUpperCase();
        if (charAfterComma === 'B' || charAfterComma === 'W') kabelVyber = "Bílý, Černý";
        else if (charAfterComma === 'S') kabelVyber = "Bezbarvý";
    }

    if (!kabelVyber) {
        kabelVyber = safeGetItem("Volba kabelu", ["Bílý, Černý", "Bezbarvý"], "Bílý, Černý");
        if (kabelVyber === null) handleCancel();
    }

    var x = safeGetDouble("Souřadnice X", "Zadej X souřadnici:", CONFIG.defaultKabelX);
    if (x === null) handleCancel();
    var y = safeGetDouble("Souřadnice Y", "Zadej Y souřadnici:", CONFIG.defaultKabelY);
    if (y === null) handleCancel();

    var startPos = new RVector(x, y);
    var op = new RAddObjectsOperation();
    var radekVyska = CONFIG.radekVyskaKabel;

    var radky = CONFIG.kabelPopisky[kabelVyber];
    if (!radky) {
        QMessageBox.warning(EAction.getMainWindow(), "Chyba konfigurace", "Popisky pro kabel '" + kabelVyber + "' nebyly nalezeny v CONFIGu.");
        return; // Zde je return v pořádku, jedná se o chybu konfigurace, ne o zrušení uživatelem.
    }

    for (var i = 0; i < radky.length; i++) {
        var pozice = startPos.operator_add(new RVector(0, -i * radekVyska));
        vlozText(op, radky[i], pozice, CONFIG.velikostTextuZaklad); // Odstraněn 'doc'
    }
    di.applyOperation(op);
    EAction.handleUserMessage("✅ Popis přívodního kabelu byl úspěšně vygenerován.");
}

// ===========================================
// === HLAVNÍ SPOUŠTĚCÍ FUNKCE (MAIN)       ===
// ===========================================
function main() {
    var di = EAction.getDocumentInterface();
    var doc = di.getDocument();
    zajistiPotrebneVrstvy(doc, di);

    try {
        var orientace = safeGetItem("Orientace výkresu", [ORIENTACE_NA_SIRKU, ORIENTACE_NA_VYSKU], ORIENTACE_NA_SIRKU);
        if (!orientace) handleCancel();

        var nazevK2 = safeGetText("Zadej název karty K2 / přiřazený kód (např. 04-500K-20GED/830, W):", "");
        if (nazevK2 === "") nazevK2 = "neznamy";

        var akceVyber = safeGetItem("Zvolte akci", [AKCE_VSE, AKCE_VODICE, AKCE_RAZITKO, AKCE_KABEL, AKCE_REVIZE], AKCE_VSE);
        if (!akceVyber) handleCancel();

        switch (akceVyber) {
            case AKCE_VSE:
                main_razitko(di, orientace, nazevK2);

                main_vypisVodice(di, orientace, nazevK2);

                // Automaticky přidá popis pro nouzový kabel, pokud jsou splněny podmínky
                main_nouzovyKabel(di, nazevK2);

                var kabelCheckMatches = nazevK2.match(/-(\d)/);
                if (kabelCheckMatches && kabelCheckMatches[1] === '5') {
                    var addKabelChoice = safeGetItem("Přívodní kabel", ["Ano", "Ne"], "Ano");
                    if (addKabelChoice === "Ano") {
                        main_kabel(di, nazevK2);
                    }
                }
                // Souhrnná zpráva pro AKCE_VSE
                EAction.handleUserMessage("✅ Všechny požadované akce byly dokončeny.");
                break;
            case AKCE_VODICE:
                main_vypisVodice(di, orientace, nazevK2);
                break;
            case AKCE_RAZITKO:
                main_razitko(di, orientace, nazevK2);
                break;
            case AKCE_KABEL:
                main_kabel(di, nazevK2);
                break;
            case AKCE_REVIZE:
                main_revize(di, orientace);
                break;
            default:
                QMessageBox.warning(EAction.getMainWindow(), "Chyba", "Neznámá volba akce. Nic nebylo spuštěno.");
                break;
        }
    } catch (e) {
        if (e.message !== "SCRIPT_TERMINATED_BY_USER") {
            // Pokud nastala jiná chyba, vypíšeme ji pro ladění
            EAction.handleUserMessage("❌ Vyskytla se neočekávaná chyba: " + e.message);
            qDebug(e.stack);
        }
        // Pokud je to naše chyba "zrušení", skript tiše skončí.
    }
}

// Spuštění hlavní funkce
main();

})();


    this.terminate();
};

// Entry point
function main(guiAction) {
    new Halla_AllInOne(guiAction);
}
