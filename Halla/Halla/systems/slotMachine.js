// scripts/Halla/Halla/systems/slotMachine.js
// Výherní automat (3 spiny) – UI + logika.
// Volá se z turn.js při rozhlídnutí v chodba_ovr, pokud máš Minci.

(function () {
    // Bezpečná reference na globální jmenný prostor
    var Halla = this.Halla || (this.Halla = {});

    /**
     * Pomocný "objekt" pro správu logiky a stavu automatu.
     * Tím se zpřehlední hlavní funkce playSlotMachine.
     */
    function SlotMachineManager(parentDialog) {
        this.dlg = parentDialog;
        this.gs = Halla.gameState;
        this.balance = Halla.BALANCE;

        // UI prvky
        this.lblSymbols = null;
        this.btnSpin = null;
        this.btnClose = null;

        // Stav
        this.spinIndex = 0;
        this.frameIndex = 0;
        this.allSpins = [];
        this.isFinished = false;
    }

    /**
     * Zpoždění a překreslení UI (QCAD-safe).
     * @param {number} ms - Doba zpoždění v milisekundách.
     * @private
     */
    function _delay(ms) {
        var start = new Date().getTime();
        while (new Date().getTime() - start < ms) {
            // processEvents udržuje UI responzivní během čekání
            if (typeof QCoreApplication !== "undefined" && QCoreApplication.processEvents) {
                QCoreApplication.processEvents();
            }
        }
    }

    /**
     * Aktualizuje zobrazené symboly.
     * @param {string[]} symbols - Pole tří symbolů.
     */
    SlotMachineManager.prototype.updateSymbols = function(symbols) {
        var text = "<span style='font-size:40px;'>" + (symbols ? symbols.join("   ") : "❔   ❔   ❔") + "</span>";
        if (typeof this.lblSymbols.setText === "function") this.lblSymbols.setText(text);
        else this.lblSymbols.text = text;
    };

    /**
     * Spustí sekvenci spinů.
     */
    SlotMachineManager.prototype.start = function() {
        var self = this;
        this.btnSpin.setEnabled(false);

        // 3 samostatné točky
        for (var spin = 0; spin < self.balance.slotSpins; spin++) {
            // 1. Animační fáze
            for (var frame = 0; frame < self.balance.slotAnimFrames; frame++) {
                var randomSymbols = [];
                for (var i = 0; i < 3; i++) {
                    randomSymbols.push(Halla.randomFromArray(Halla.SLOT_SYMBOLS));
                }
                self.updateSymbols(randomSymbols);
                _delay(self.balance.slotAnimDelay);
            }

            // 2. Fáze výsledku
            var resultSymbols = [];
            for (var j = 0; j < 3; j++) {
                resultSymbols.push(Halla.randomFromArray(Halla.SLOT_SYMBOLS));
            }
            self.allSpins.push(resultSymbols);
            self.updateSymbols(resultSymbols);
            _delay(self.balance.slotResultDelay);
        }

        // 3. Ukončení
        self.isFinished = true;
        self.btnSpin.setVisible(false);
        self.btnClose.setVisible(true);
    };

    /**
     * Pomocná funkce pro respawn mince.
     */
    function respawnCoin() {
        var gs = Halla.gameState;
        if (!gs || !Halla.SPECIAL_SPAWN_ITEMS["mince"]) return;

        var spawnRooms = Halla.SPECIAL_SPAWN_ITEMS["mince"].spawnRooms;
        var newRoom = Halla.randomFromArray(spawnRooms);

        // Najdeme volnou místnost pro spawn, pokud je vybraná plná
        while (gs.itemLocations[newRoom] && gs.itemLocations[newRoom].length >= Halla.MAX_ITEMS_PER_ROOM) {
            newRoom = Halla.randomFromArray(spawnRooms);
        }

        if (gs.itemLocations[newRoom]) gs.itemLocations[newRoom].push("mince");

        Halla.showInfo(
            "Někde jinde v hale na zemi cinkne další Mince.\n" +
            "Když budeš mít štěstí, najdeš ji."
        );
    }

    /**
     * Zobrazí dialog s výsledky automatu a pozadím.
     * @param {string} summaryHtml - HTML obsah s výsledky.
     * @param {string} resultText - Závěrečný text (výhra/prohra).
     */
    function showSlotResultsDialog(summaryHtml, resultText) {
        var parent = RMainWindowQt.getMainWindow();
        var dlg = new QDialog(parent);
        dlg.setWindowTitle(Halla.GAME_TITLE + " – Výsledky");
        dlg.setFixedSize(576, 768);

        // Nastavení pozadí
        var imagePath = "scripts/Halla/Halla/data/pic/UIslotMachine.jpg";
        imagePath = imagePath.replace(/\\/g, "/");
        dlg.setStyleSheet("QDialog { background-image: url(\"" + imagePath + "\"); background-position: center; background-repeat: no-repeat; }");

        var layout = new QVBoxLayout(dlg);
        layout.addStretch(8); // Pružné odsazení shora, posune obsah níže (stejně jako u automatu)

        // Text s výsledky
        var resultsEdit = new QTextEdit(dlg);
        resultsEdit.setHtml(summaryHtml + "<br><hr><br>" + resultText);
        // Defenzivní nastavení read-only pro maximální kompatibilitu s různými verzemi QCADu
        if (typeof resultsEdit.setReadOnly === 'function') {
            resultsEdit.setReadOnly(true);
        } else {
            resultsEdit.readOnly = true; // Fallback pro starší verze
        }
        resultsEdit.setStyleSheet("background-color: rgba(0, 0, 0, 0.7); color: white; padding: 15px; border-radius: 5px; margin: 0 155px 0 165px; font-size: 14px;");
        resultsEdit.setFixedHeight(400);
        layout.addWidget(resultsEdit, 0, 0);

        // Tlačítko pro zavření
        var hbox = new QHBoxLayout();
        hbox.addStretch();
        var btnClose = new QPushButton("Zavřít", dlg);
        btnClose.setFixedWidth(150);
        btnClose.setStyleSheet("QPushButton { background-color: transparent; color: white; border: 1px solid white; padding: 6px; }");
        if (btnClose.clicked) btnClose.clicked.connect(function() { dlg.accept(); });
        hbox.addWidget(btnClose, 0, 0);
        hbox.addStretch();
        layout.addLayout(hbox);

        layout.addStretch(3); // Odsazení zespodu (stejně jako u automatu)
        dlg.exec();
    }

    Halla.playSlotMachine = function () {
        var gs = Halla.gameState;
        if (!gs) return;

        if (!Halla.hasItemInInventory("mince")) {
            Halla.showInfo(
                "Strčíš ruku do kapsy, ale žádnou Minci nenahmatáš.\n" +
                "Automat si z tebe dělá srandu."
            );
            return;
        }

        // sežere jednu Minci hned na začátku
        Halla.takeItemFromInventory("mince");
        gs.stats.itemUsed = true; // Příznak pro achievement "Přežití o suchu"

        // Udělení perku po první hře
        // Přesunuto sem, aby se perk udělil PŘED vyhodnocením prohry.
        if (!Halla.hasPerk("gambler")) {
            Halla.grantPerk("gambler", true);
            if (typeof Halla.journalAddPerk === "function") {
                Halla.journalAddPerk("gambler");
            }
            Halla.showInfo(
                "Po první zkušenosti s automatem se cítíš o něco moudřejší.\n" +
                "Získáváš perk 'Gambler' (Při prohře hrozí zranění z frustrace)."
            );
        }

        // Inkrementace počítadla pro achievement
        gs.stats.slotMachinePlays = (gs.stats.slotMachinePlays || 0) + 1;

        var parent = RMainWindowQt.getMainWindow();
        var dlg = new QDialog(parent);

        if (typeof dlg.setWindowTitle === "function") {
            dlg.setWindowTitle(Halla.GAME_TITLE + " – Výherní automat");
        }

        dlg.setFixedSize(576, 768); // Zamkneme velikost okna na rozměr pozadí

        // --- Pozadí dialogu ---
        var imagePath = "scripts/Halla/Halla/data/pic/UIslotMachine.jpg";
        imagePath = imagePath.replace(/\\/g, "/");
        dlg.setStyleSheet("QDialog { background-image: url(\"" + imagePath + "\"); background-position: center; background-repeat: no-repeat; }");

        var layout = new QVBoxLayout(dlg);
        layout.addStretch(4); // Odsazení shora (větší hodnota = větší posun dolů)

        // Pole se symboly (nyní je první)
        var lblSymbols = new QLabel(dlg);
        if (typeof lblSymbols.setAlignment === "function") lblSymbols.setAlignment(RS.AlignHCenter);
        // Styl pro symboly
        lblSymbols.setStyleSheet("background-color: rgba(0, 0, 0, 0.7); color: white; padding: 20px; border-radius: 5px; margin: 20px 155px 20px 165px;");
        layout.addWidget(lblSymbols, 0, 0);

        // Úvodní text (nyní je druhý, pod symboly)
        var lblText = new QLabel(dlg);
        var txt =
            "Vojta se opírá o automat a kývne na tebe.\n" +
            "\"Tak to zkus, třeba dneska konečně vypadneš z Hally.\"\n\n" +
            "Mince je vhozená. Po stisku 'Zatočit' proběhnou tři točky za sebou.";
        if (typeof lblText.setText === "function") lblText.setText(txt);
        else lblText.text = txt;
        // Styl pro lepší čitelnost
        lblText.setStyleSheet("background-color: rgba(0, 0, 0, 0.7); color: white; padding: 10px; border-radius: 5px; margin: 0 155px 0 165px;");
        try {
            if (typeof lblText.setWordWrap === "function") lblText.setWordWrap(true);
            else lblText.wordWrap = true;
        } catch (e) {}
        layout.addWidget(lblText, 0, 0);

        var hbox = new QHBoxLayout();
        hbox.addStretch(); // Centrování tlačítek
        var btnSpin = new QPushButton("Zatočit", dlg);
        var btnClose = new QPushButton("Zavřít", dlg);
        btnSpin.setFixedWidth(120);
        btnClose.setFixedWidth(120);
        btnSpin.setStyleSheet("QPushButton { background-color: transparent; color: #00ff00; border: 1px solid #00ff00; padding: 6px; font-weight: bold; }");
        btnClose.setStyleSheet("QPushButton { background-color: transparent; color: white; border: 1px solid white; padding: 6px; }");
        hbox.addWidget(btnSpin, 0, 0);
        hbox.addWidget(btnClose, 0, 0);
        hbox.addStretch(); // Centrování tlačítek
        layout.addLayout(hbox);

        btnClose.setVisible(false);

        // Vytvoření a inicializace manažera automatu
        var manager = new SlotMachineManager(dlg);
        manager.lblSymbols = lblSymbols;
        manager.btnSpin = btnSpin;
        manager.btnClose = btnClose;
        manager.updateSymbols(null); // Zobrazí otazníky

        if (btnClose.clicked) {
            btnClose.clicked.connect(function() { dlg.accept(); });
        }

        if (btnSpin.clicked) {
            btnSpin.clicked.connect(function() { manager.start(); });
        }

        layout.addStretch(3); // Odsazení zespodu

        dlg.exec();

        if (!manager.isFinished) {
            // Hráč zavřel dialog předčasně, mince propadla
            Halla.showInfo("Odešel jsi od automatu dřív, než dotočil.\nMince ti propadla. Skill issue.");
            respawnCoin();
            return;
        }

        // vyhodnocení
        var finalWin = false;
        var summaryHtml = "Výsledky tří zatočení:<br><br>";

        for (var s = 0; s < manager.allSpins.length; s++) {
            var spinArr = manager.allSpins[s];
            if (!spinArr || spinArr.length !== 3) continue;

            var sText = spinArr.join("   ");
            var isThisWin = (spinArr[0] === spinArr[1] && spinArr[1] === spinArr[2]);

            summaryHtml += (s + 1) + ". ";
            summaryHtml += "<span style='font-size:36px;'>" + sText + "</span>";
            if (isThisWin) {
                summaryHtml += " ✦";
                finalWin = true;
            }
            summaryHtml += "<br>";
        }

        if (finalWin) {
            var winText =
                "Aspoň v jedné točce padly tři stejné symboly.<br>" +
                "Automat se rozbliká a na displeji se objeví:<br>" +
                "\"VYHRÁL JSI. JDI DOMŮ.\"";
            showSlotResultsDialog(summaryHtml, winText);

            if (typeof Halla.endGameWithSummary === "function") {
                Halla.endGameWithSummary(
                    "Tři stejné symboly v jednom ze spinů.\n" +
                    "Automat ti na displeji vypíše: \"JDI DOMŮ\".\n\n" +
                    "Rozhodneš se poprvé v životě poslechnout stroj.\n" +
                    "(Automat WIN ending)"
                );
            }
            return;
        }

        // prohra: mince se respawnne jinde
        var loseText =
            "Smůla bro.<br>" +
            "Mince mizí v útrobách automatu.";
        showSlotResultsDialog(summaryHtml, loseText);

        respawnCoin();

        // Aplikace negativního perku "Gambler"
        if (Halla.hasPerk("gambler")) {
            if (Math.random() < (Halla.BALANCE.gamblerPerkFrustrationChance || 0.33)) {
                var dmg = Halla.BALANCE.gamblerPerkFrustrationDmgMin + Math.floor(Math.random() * (Halla.BALANCE.gamblerPerkFrustrationDmgMax - Halla.BALANCE.gamblerPerkFrustrationDmgMin + 1));
                var actualDmg = Halla.changeHealth(-dmg, "Vztek na automat");

                Halla.showInfo(
                    "Prohra tě tak naštvala, že jsi praštil do automatu.\n" +
                    "Bolí to. Tebe, ne automat.\n" + actualDmg + " HP."
                );
                // Zaznamenáme pro achievement
                if (gs.stats) gs.stats.gamblerFrustration = true;
            }
        }
    };

})();
