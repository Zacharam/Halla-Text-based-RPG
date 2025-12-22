// scripts/Halla/Halla/core/ui.js
// Obsahuje pomocné funkce pro tvorbu UI dialogů, zobrazování zpráv a HUD.

(function (global) {
    "use strict";
    // Sjednocení s ostatními soubory: bezpečná reference na Halla namespace
    global.Halla = global.Halla || {};
    var Halla = global.Halla;

    // --------------------------------------
    //   BASIC UI HELPERY
    // --------------------------------------

    Halla.showInfo = function (text) {
        QMessageBox.information(null, Halla.GAME_TITLE, text);
    };

    Halla.showWarning = function (text) {
        QMessageBox.warning(null, Halla.GAME_TITLE, text);
    };

    
    // --------------------------------------
    //   DIALOG: PŘÍKAZY (pohyb + seznam akcí)
    // --------------------------------------

    Halla.getGameCommandDialog = function (desc, choices, room) {
        var parent = RMainWindowQt.getMainWindow();
        var dlg = new QDialog(parent);

        dlg.setWindowTitle(Halla.GAME_TITLE);
        dlg.setFixedSize(576, 768); // Zamkneme velikost okna

        // --- Pozadí dialogu ---
        // Krok 1: Zobrazíme pouze pozadí, abychom ověřili, že načítání cesty funguje.
        // Použijeme stejný přístup jako u výběru postav, který funguje.
        var imagePath = "scripts/Halla/Halla/data/pic/UImain.jpg";
        imagePath = imagePath.replace(/\\/g, "/"); // QCAD preferuje lomítka
        // setStyleSheet nepadá, pokud soubor neexistuje, obrázek se prostě nezobrazí.
        dlg.setStyleSheet("QDialog { background-image: url(\"" + imagePath + "\"); background-position: center; background-repeat: no-repeat; }");

        var layout = new QVBoxLayout(dlg);

        // Přidáme mezeru nad popis místnosti, aby nebyl nalepený na horním okraji.
        layout.addSpacing(20);

        // Krok 2: Přidáme zpět popis místnosti
        var label = new QLabel(dlg);
        label.setText(desc);
        // Poloprůhledné pozadí pro lepší čitelnost textu
        label.setStyleSheet("background-color: rgba(0, 0, 0, 0.7); color: white; padding: 10px; border-radius: 5px; margin: 0 110px;");
        try {
            if (typeof label.setWordWrap === 'function') label.setWordWrap(true);
            else label.wordWrap = true;
            if (typeof label.setFixedHeight === 'function') {
                label.setFixedHeight(250); // Nastavíme pevnou výšku pro popis
            }
        } catch (e) { /* ignore */ }
        layout.addWidget(label, 0, 0);

        // Přidáme mezeru pod popis místnosti
        layout.addSpacing(100); // Posunuto dolů (větší hodnota)

        // Zde můžeš přidat layout.addStretch(); pro posunutí tlačítek níže
        // layout.addStretch();

        // --- Krok 3: Přidáme zpět pohybová tlačítka ---
        // Nový přístup: Dvě tlačítka pro každý směr (zelené/červené), která se překrývají.
        var moveLayout = new QGridLayout();
        var moveButtons = {};
        // Nastavíme mezery mezi tlačítky na 0, aby byly blíže u sebe
        moveLayout.setHorizontalSpacing(0);
        moveLayout.setVerticalSpacing(0);

        var directions = ["Up", "Down", "Left", "Right"];
        var symbols = {"Up": "▲", "Down": "▼", "Left": "◄", "Right": "►"};
        var positions = {"Up": [0, 2], "Down": [2, 2], "Left": [1, 1], "Right": [1, 3]};

        for (var i = 0; i < directions.length; i++) {
            var dir = directions[i];
            var symbol = symbols[dir];
            var pos = positions[dir];

            // Zelené (aktivní) tlačítko
            var btnGreen = new QPushButton(symbol, dlg);
            btnGreen.setStyleSheet("background-color: transparent; border: none; color: #00ff00; font-size: 24px; font-weight: bold;");
            btnGreen.setFixedSize(50, 50);
            moveLayout.addWidget(btnGreen, pos[0], pos[1], 1, 1, 0);

            // Červené (neaktivní) tlačítko
            var btnRed = new QPushButton(symbol, dlg);
            btnRed.setStyleSheet("background-color: transparent; border: none; color: #ff0000; font-size: 24px;");
            btnRed.setFixedSize(50, 50);
            moveLayout.addWidget(btnRed, pos[0], pos[1], 1, 1, 0);

            moveButtons[dir] = { green: btnGreen, red: btnRed };
        }

        // Uložíme si reference na zelená tlačítka pro připojení signálů
        var btnUp = moveButtons.Up.green;
        var btnDown = moveButtons.Down.green;
        var btnLeft = moveButtons.Left.green;
        var btnRight = moveButtons.Right.green;

        // Krajním sloupcům (0 a 4) nastavíme stretch, aby se prostředek vycentroval
        moveLayout.setColumnStretch(0, 21); // Mírně silnější levá pružina
        moveLayout.setColumnStretch(4, 20); // Mírně slabší pravá pružina

        layout.addLayout(moveLayout);

        layout.addSpacing(72); // Zmenšíme pevnou mezeru

        // --- Krok 4: Přidáme zbytek akcí a seznam předmětů ---
        var itemChoices = [];
        var actionChoices = [];
        for (var i = 0; i < choices.length; i++) {
            if (choices[i].indexOf("vezmi ") === 0) {
                itemChoices.push(choices[i]);
            } else {
                actionChoices.push(choices[i]);
            }
        }

        var result = { value: null };

        function createActionHandler(command) {
            return function() {
                result.value = command;
                dlg.accept();
            };
        }

        // --- Nový layout pro spodní část (Konec | Akce | Předměty) ---
        var bottomLayout = new QHBoxLayout();
        
        // --- Levý sloupec: Speciální akce (Použít, Konec) ---
        var leftColumn = new QVBoxLayout();
        leftColumn.addStretch(); // Odsune tlačítka dolů

        // Tlačítka pro konzumaci předmětů
        var consumables = ["Láhev rumu", "Mega kafe"];
        for (var c = 0; c < consumables.length; c++) {
            var itemName = consumables[c];
            // Zkontroluje, zda je dynamický item v "inventáři" hráče
            if (Halla.gameState.dynamicItemLocations && Halla.gameState.dynamicItemLocations[itemName] === "inventory") {
                var btnUse = new QPushButton("Vypít " + itemName, dlg);
                if (btnUse.clicked) btnUse.clicked.connect(createActionHandler("vypit " + itemName));
                if (typeof btnUse.setStyleSheet === 'function') {
                    // Světle modrá pro odlišení
                    btnUse.setStyleSheet("QPushButton { background-color: transparent; color: #add8e6; border: 1px solid #add8e6; padding: 4px; }");
                }
                if (typeof btnUse.setFixedWidth === 'function') btnUse.setFixedWidth(120);
                leftColumn.addWidget(btnUse, 0, 0);
            }
        }

        var btnEnd = new QPushButton("Konec", dlg);
        if (btnEnd.clicked) btnEnd.clicked.connect(createActionHandler("konec"));
        if (typeof btnEnd.setStyleSheet === 'function') {
            btnEnd.setStyleSheet("QPushButton { background-color: transparent; color: white; border: 1px solid white; padding: 4px; }");
        }
        if (typeof btnEnd.setFixedWidth === 'function') btnEnd.setFixedWidth(120);
        leftColumn.addWidget(btnEnd, 0, 0);
        bottomLayout.addLayout(leftColumn, 1);

        // Přidáme pružinu, která odsune prostřední sloupec od levého
        bottomLayout.addStretch(1);

        // --- Prostřední sloupec: Běžné akce ---
        var centerColumn = new QVBoxLayout();
        var actionsLabel = new QLabel("<b><font color='white'>Akce:</font></b>", dlg);
        centerColumn.addWidget(actionsLabel, 0, 0);
        
        for (var j = 0; j < actionChoices.length; j++) {
            var actionCmd = actionChoices[j];
            // Přeskočíme tlačítko Konec a Vypít, které jsou jinde
            if (actionCmd === "konec" || actionCmd.indexOf("vypit") === 0) {
                continue;
            }
            var btn = new QPushButton(actionCmd.charAt(0).toUpperCase() + actionCmd.slice(1), dlg);
            if (btn.clicked) btn.clicked.connect(createActionHandler(actionCmd));
            if (typeof btn.setStyleSheet === 'function') {
                btn.setStyleSheet("QPushButton { background-color: transparent; color: white; border: 1px solid white; padding: 4px; }");
            }
            if (typeof btn.setFixedWidth === 'function') btn.setFixedWidth(120);
            centerColumn.addWidget(btn, 0, 0);
        }
        centerColumn.addStretch();
        bottomLayout.addLayout(centerColumn, 1);

        // Přidáme pružinu, která odsune pravý sloupec od prostředního
        bottomLayout.addStretch(1);

        // --- Pravý sloupec: Předměty ---
        var rightColumn = new QVBoxLayout();
        
        // Vytvoříme "placeholder", který zajistí, že sloupec bude mít vždy stejnou šířku.
        var placeholder = new QWidget();
        var COLUMN_WIDTH = 100; // Šířka sloupce pro předměty
        if (typeof placeholder.setFixedWidth === 'function') placeholder.setFixedWidth(COLUMN_WIDTH);

        // Předměty (pokud jsou)
        if (itemChoices.length > 0) {
            var itemsLabel = new QLabel("<b><font color='white'>Předměty k sebrání:</font></b>", dlg);
            rightColumn.addWidget(itemsLabel, 0, 0);

            var list = new QListWidget(dlg);
            // Nastavíme průhledné pozadí a bílý text pro seznam předmětů
            if (typeof list.setStyleSheet === 'function') {
                list.setStyleSheet("QListWidget { background-color: transparent; color: white; border: none; }");
            }
            if (typeof list.setFixedWidth === 'function') list.setFixedWidth(COLUMN_WIDTH);
            for (var k = 0; k < itemChoices.length; k++) {
                list.addItem(itemChoices[k].substring(6));
            }
            if (typeof list.setCurrentRow === 'function') list.setCurrentRow(0);
            rightColumn.addWidget(list, 1, 0);

            var btnTake = new QPushButton("Vzít vybrané", dlg);
            if (typeof btnTake.setStyleSheet === 'function') {
                btnTake.setStyleSheet("QPushButton { background-color: transparent; color: white; border: 1px solid white; padding: 4px; }");
            }
            if (typeof btnTake.setFixedWidth === 'function') btnTake.setFixedWidth(COLUMN_WIDTH);
            if (btnTake.clicked) btnTake.clicked.connect(function() {
                var selectedItem = list.currentItem();
                if (selectedItem) { result.value = "vezmi " + selectedItem.text(); dlg.accept(); }
            });
            rightColumn.addWidget(btnTake, 0, 0);
        } else {
            // Pokud nejsou žádné itemy, přidáme jen placeholder, aby se layout nerozpadl
            rightColumn.addWidget(placeholder, 0, 0);
        }
        rightColumn.addStretch();
        bottomLayout.addLayout(rightColumn, 2); // Širší sloupec pro předměty

        layout.addLayout(bottomLayout);

        // Přidáme "pružinu", která nasaje všechen volný prostor a natlačí obsah nahoru.
        layout.addStretch();

        // --- Dostupnost východů ---
        room = room || {};
        var exits = room.exits || {};

        function styleMoveButton(btn, available) {
            // Tato funkce se již nepoužívá, logika je nahrazena přepínáním viditelnosti
        }

        var canUp    = exits.hasOwnProperty("nahoru");
        var canDown  = exits.hasOwnProperty("dolu");
        var canLeft  = exits.hasOwnProperty("doleva");
        var canRight = exits.hasOwnProperty("doprava");

        // Připojení handlerů pouze na zelená (aktivní) tlačítka
        if (btnUp.clicked) btnUp.clicked.connect(createActionHandler("jdi nahoru"));
        if (btnDown.clicked) btnDown.clicked.connect(createActionHandler("jdi dolu"));
        if (btnLeft.clicked) btnLeft.clicked.connect(createActionHandler("jdi doleva"));
        if (btnRight.clicked) btnRight.clicked.connect(createActionHandler("jdi doprava"));

        // Nastavení viditelnosti podle dostupnosti směrů
        moveButtons.Up.green.setVisible(canUp);       moveButtons.Up.red.setVisible(!canUp);
        moveButtons.Down.green.setVisible(canDown);   moveButtons.Down.red.setVisible(!canDown);
        moveButtons.Left.green.setVisible(canLeft);   moveButtons.Left.red.setVisible(!canLeft);
        moveButtons.Right.green.setVisible(canRight); moveButtons.Right.red.setVisible(!canRight);

        dlg.exec();
        // Vracíme zvolenou akci, nebo null, pokud hráč dialog zavřel
        return result.value; 
    };

    // --------------------------------------
    //   DIALOG: ANO/NE (obecná potvrzovačka)
    // --------------------------------------

    Halla.askYesNo = function (title, questionText, yesText, noText) {
        var parent = RMainWindowQt.getMainWindow();
        var dlg = new QDialog(parent);

        if (typeof dlg.setWindowTitle === "function") {
            dlg.setWindowTitle(title || Halla.GAME_TITLE);
        }

        dlg.setFixedSize(420, 180); // Zamkneme velikost okna

        var vbox = new QVBoxLayout(dlg);

        var lbl = new QLabel(dlg);
        if (typeof lbl.setText === "function") lbl.setText(questionText || "Jsi si jistý?");
        else lbl.text = questionText || "Jsi si jistý?";

        try {
            if (typeof lbl.setWordWrap === "function") lbl.setWordWrap(true);
            else lbl.wordWrap = true;
        } catch (e) {}

        vbox.addWidget(lbl, 0, 0);

        var hbox = new QHBoxLayout(dlg);
        var btnYes = new QPushButton(yesText || "Ano", dlg);
        var btnNo  = new QPushButton(noText  || "Ne", dlg);

        hbox.addWidget(btnYes, 0, 0);
        hbox.addWidget(btnNo,  0, 0);
        vbox.addLayout(hbox, 0);

        var out = { yes: false };

        if (btnYes.clicked) {
            btnYes.clicked.connect(function () {
                out.yes = true;
                dlg.accept();
            });
        }
        if (btnNo.clicked) {
            btnNo.clicked.connect(function () {
                out.yes = false;
                dlg.reject();
            });
        }

        dlg.exec();
        return out.yes;
    };

// --------------------------------------
//   UI AKCE BEZ TAHU (boss se nehýbe)
// --------------------------------------

Halla.noTurn = function () {
    return { advanceTurn: false, actionType: null };
};

Halla.runUiAction = function (fn) {
    try {
        if (typeof fn === "function") fn();
    } catch (e) {
        // radši ticho než crash, jsme v QCADu…
        try {
            if (typeof Halla.showWarning === "function") {
                Halla.showWarning("UI akce spadla: " + e);
            }
        } catch (e2) {}
    }
    return Halla.noTurn();
};

    // --- SRDÍČKA / HP BAR ---
    Halla.updateHealthHearts = function () {
        try {
            var di = EAction.getDocumentInterface(); if (!di) return;
            var doc = di.getDocument(); if (!doc) return;
            var gs = Halla.gameState; if (!gs) return;

            var layerName = Halla.LAYER_HEARTS;
            var layerId = -1;

            // Vytvoření vrstvy (používáme robustní ensureLayerAndGetId z mapRender, pokud je dostupné)
            if (Halla.ensureLayerAndGetId) {
                layerId = Halla.ensureLayerAndGetId(layerName, new RColor(255, 0, 0));
            } else {
                // Záložní kód pro případ, že mapRender.js není načtený
                if (!doc.hasLayer(layerName)) {
                    var layer = new RLayer(doc, layerName);
                    layer.setColor(new RColor(255, 0, 0)); // Používáme starší, ale kompatibilnější metodu
                    var op = new RAddObjectOperation(layer, false);
                    di.applyOperation(op);
                }
                layerId = doc.getLayerId(layerName);
            }

            if (layerId < 0) return;

            // Smazání starých srdíček
            // Vracíme se k původní, robustnější metodě mazání objektů,
            // protože di.deleteObjects() nemusí být ve všech verzích QCADu spolehlivé.
            var ids = doc.queryLayerEntities(layerId);
            if (typeof isNull !== 'undefined' && !isNull(ids) && ids.length > 0) {
                var delOp = new RDeleteObjectsOperation();
                for (var i = 0; i < ids.length; i++) {
                    var e = doc.queryEntity(ids[i]);
                    if (!isNull(e)) delOp.deleteObject(e);
                }
                di.applyOperation(delOp);
            }

            if (gs.health === undefined) gs.health = Halla.BASE_MAX_HEALTH || 100;

            var heartsCount = Math.ceil(gs.health / 20);
            if (heartsCount <= 0) return;

            var addOp = new RAddObjectsOperation();

            // Pozice srdíček se počítá relativně k počátku mapy (MAP_ORIGIN),
            // stejně jako v původním skriptu.
            var startX = (Halla.MAP_ORIGIN_X || 0) + 72;
            var startY = (Halla.MAP_ORIGIN_Y || 0) - 22;

            for (var j = 0; j < heartsCount; j++) {
                var pos = new RVector(startX + j * 3, startY); // Pevný rozestup jako v originále
                // Používáme plně specifikovaný konstruktor RTextData pro maximální kompatibilitu,
                // podobně jako v původním skriptu.
                var textData = new RTextData(
                    pos, pos,                // insertion point, alignment point
                    (Halla.HEART_FONT_SIZE || 3),   // height
                    0,                       // angle
                    RS.VAlignTop, RS.HAlignLeft, // v-align, h-align
                    RS.LeftToRight, RS.Exact, // text direction, line spacing style
                    1.0,                     // line spacing factor
                    "♥",                     // text
                    "Arial",                 // font
                    false, false, 0.0, false  // bold, italic, angle, simple
                );
                textData.setLayerId(layerId);
                // Barva je již součástí vrstvy, ale pro jistotu ji můžeme nastavit i zde
                // textData.setColor(new RColor(255, 0, 0));
                var textEntity = new RTextEntity(doc, textData);
                addOp.addObject(textEntity, false);
            }

            di.applyOperation(addOp);
        } catch (e) {
            EAction.handleUserMessage("Chyba při aktualizaci srdíček: " + e);
        }
    };

    // --------------------------------------
    //   DIALOG: ÚVODNÍ OBRAZOVKA
    // --------------------------------------

    Halla.showIntroDialog = function () {
        var parent = RMainWindowQt.getMainWindow();
        var dlg = new QDialog(parent);
        dlg.setFixedSize(768, 576); // Stejná velikost jako výběr postavy

        if (typeof dlg.setWindowTitle === "function") {
            dlg.setWindowTitle(Halla.GAME_TITLE);
        }

        // --- Pozadí dialogu ---
        var imagePath = "scripts/Halla/Halla/data/pic/UIintro.jpg";
        imagePath = imagePath.replace(/\\/g, "/");
        dlg.setStyleSheet("QDialog { background-image: url(\"" + imagePath + "\"); background-position: center; background-repeat: no-repeat; }");

        var layout = new QVBoxLayout(dlg);
        layout.addStretch(); // Odsune tlačítko dolů

        // --- Tlačítko pro start ---
        var hbox = new QHBoxLayout();
        hbox.addStretch();
        var btnStart = new QPushButton("Vstoupit do Hally", dlg);
        btnStart.setFixedWidth(200);
        btnStart.setStyleSheet("QPushButton { background-color: rgba(0, 0, 0, 0.6); color: white; border: 1px solid white; padding: 8px; font-size: 16px; }");
        if (btnStart.clicked) {
            btnStart.clicked.connect(function() {
                dlg.accept();
            });
        }
        hbox.addWidget(btnStart, 0, 0); // Přidány chybějící parametry stretch a alignment
        hbox.addStretch();
        layout.addLayout(hbox);

        // --- Text s cílem hry ---
        var objectiveLabel = new QLabel("Cíl hry: Sestrojit ultimátní svítidlo a přežít den!", dlg);
        objectiveLabel.setStyleSheet("color: #ccc; font-size: 12px; background-color: transparent;");
        if (typeof objectiveLabel.setAlignment === 'function') {
            // Zarovnáme text na střed
            objectiveLabel.setAlignment(RS.AlignHCenter);
        }
        layout.addWidget(objectiveLabel, 0, RS.AlignHCenter);

        layout.addSpacing(50); // Mezera pod tlačítkem

        // Spuštění hudby v menu
        // if (Halla.Sound && Halla.Sound.playMusic) Halla.Sound.playMusic("music_menu");

        dlg.exec();
    };

    // --------------------------------------
    //   DIALOG: VÍTĚZNÁ OBRAZOVKA
    // --------------------------------------

    Halla.showWinDialog = function (title, message) {
        var parent = RMainWindowQt.getMainWindow();
        var dlg = new QDialog(parent);
        dlg.setFixedSize(834, 448); // Nová velikost podle obrázku

        if (typeof dlg.setWindowTitle === "function") {
            dlg.setWindowTitle(title || Halla.GAME_TITLE + " – Vítězství");
        }

        // --- Obrázek na pozadí ---
        // Očekává se soubor UIwin.jpg ve složce data/pic/
        var imagePath = "scripts/Halla/Halla/data/pic/UIwin.jpg";
        imagePath = imagePath.replace(/\\/g, "/");
        dlg.setStyleSheet("QDialog { background-image: url(\"" + imagePath + "\"); background-position: center; background-repeat: no-repeat; }");

        var layout = new QVBoxLayout(dlg);
        layout.addSpacing(60); // Pevná mezera shora, posune obsah výše

        // --- Rozdělení zprávy na titulek a tělo ---
        var parts = message.split("\n\n");
        var titleText = parts.length > 1 ? parts[0] : message;
        var bodyText = parts.length > 1 ? parts.slice(1).join("\n\n") : "";

        // --- Layout pro titulek (pro centrování) ---
        var titleLayout = new QHBoxLayout();
        titleLayout.addStretch(); // Pružina vlevo

        // --- Titulek (KONEC: VÍTĚZSTVÍ) ---
        var titleLabel = new QLabel(dlg);
        titleLabel.setText(titleText);
        titleLabel.setStyleSheet("background-color: transparent; color: #00ff00; font-size: 22px; font-weight: bold;");
        if (typeof titleLabel.setAlignment === 'function') {
            titleLabel.setAlignment(RS.AlignHCenter);
        }
        titleLayout.addWidget(titleLabel, 0, 0); // Oprava: Přidány chybějící parametry
        titleLayout.addStretch(); // Pružina vpravo
        layout.addLayout(titleLayout);

        layout.addStretch(1); // Hlavní pružina, která odsune zbytek dolů

        // --- Tlačítko pro zavření (nyní dole) ---
        var hbox = new QHBoxLayout();
        hbox.addStretch();
        var btnClose = new QPushButton("Zavřít", dlg);
        btnClose.setFixedWidth(120);
        btnClose.setStyleSheet("QPushButton { background-color: transparent; color: white; border: 1px solid white; padding: 6px; }");
        if (btnClose.clicked) btnClose.clicked.connect(function() { dlg.accept(); });
        hbox.addWidget(btnClose, 0, 0);
        hbox.addStretch();
        layout.addLayout(hbox);
        
        // --- Tělo zprávy (zbytek textu) ---
        if (bodyText) {
            var bodyLayout = new QHBoxLayout();
            // Pružiny odstraníme a šířku budeme řídit pomocí marginu

            var bodyLabel = new QLabel(dlg);
            bodyLabel.setText(bodyText);
            bodyLabel.setStyleSheet("background-color: transparent; color: #dddddd; font-size: 14px; margin: 0 80px;");
            if (typeof bodyLabel.setAlignment === 'function') {
                bodyLabel.setAlignment(RS.AlignHCenter);
            }
            if (typeof bodyLabel.setWordWrap === 'function') bodyLabel.setWordWrap(true);

            bodyLayout.addWidget(bodyLabel, 0, 0); // Oprava: Přidány chybějící parametry
            layout.addLayout(bodyLayout);
        }

        // Malá mezera na spodním okraji
        layout.addSpacing(20);

        dlg.exec();
    };

})(this);
