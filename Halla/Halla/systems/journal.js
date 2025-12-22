// scripts/Halla/Halla/systems/journal.js
// Deník: místnosti, NPC, perky + UI dialog.
// Neřeší logiku hry, jen evidenci a zobrazení.

(function (global) {
    "use strict";
    // Sjednocení s ostatními soubory: bezpečná reference na Halla namespace
    global.Halla = global.Halla || {};
    var Halla = global.Halla;

    // --------------------------------------
    //   INIT / ENSURE
    // --------------------------------------

    Halla.ensureJournal = function () {
        if (!Halla.gameState) return;

        if (!Halla.gameState.journal) {
            var newJournal = new Object();
            newJournal.rooms = new Object();
            newJournal.npcs = new Object();
            newJournal.perks = new Object();
            Halla.gameState.journal = newJournal;
        }
    };

    // --------------------------------------
    //   ZÁPISY
    // --------------------------------------

    Halla.journalDiscoverRoom = function (roomId) {
        if (!Halla.gameState) return;
        Halla.ensureJournal();

        if (!Halla.gameState.journal.rooms[roomId]) {
            var newRoomEntry = new Object();
            newRoomEntry.discovered = true;
            newRoomEntry.notes = (Halla.rooms[roomId] ? Halla.rooms[roomId].description : "");
            Halla.gameState.journal.rooms[roomId] = newRoomEntry;
        }
    };

    Halla.journalAddNPC = function (id, notes) {
        if (!Halla.gameState) return;
        Halla.ensureJournal();
        
        var newNpcEntry = new Object();
        newNpcEntry.met = true;
        newNpcEntry.notes = notes || "";
        Halla.gameState.journal.npcs[id] = newNpcEntry;
    };

    Halla.journalAddPerk = function (id) {
        if (!Halla.gameState) return;
        Halla.ensureJournal();

        var newPerkEntry = new Object();
        newPerkEntry.obtained = true;
        // Popis perku se vždy bere z centrální konfigurace pro konzistenci.
        newPerkEntry.desc = (Halla.PERK_DESCRIPTIONS && Halla.PERK_DESCRIPTIONS[id]) || "Neznámý perk.";
        Halla.gameState.journal.perks[id] = newPerkEntry;
    };

    // --------------------------------------
    //   UI: DIALOG DENÍKU
    // --------------------------------------

    Halla.showJournalDialog = function () {
        if (!Halla.gameState) return;
        Halla.ensureJournal();

        var parent = RMainWindowQt.getMainWindow();
        var dlg = new QDialog(parent);
        dlg.setFixedSize(768, 576); // Zamkneme velikost okna na rozměr pozadí

        if (typeof dlg.setWindowTitle === "function") {
            dlg.setWindowTitle(Halla.GAME_TITLE + " – Deník Hally");
        }

        // --- Pozadí dialogu ---
        var imagePath = "scripts/Halla/Halla/data/pic/UIjournal.jpg";
        imagePath = imagePath.replace(/\\/g, "/");
        dlg.setStyleSheet("QDialog { background-image: url(\"" + imagePath + "\"); background-position: center; background-repeat: no-repeat; }");

        var layout = new QVBoxLayout(dlg);
        layout.addStretch(1); // Odsazení shora

        var tabs = new QTabWidget(dlg);
        // Margin pro odsazení od okrajů
        tabs.setStyleSheet(
            "QTabWidget { margin: 0 80px; }" +
            "QTabWidget::pane { border: 1px solid #555; background-color: transparent; }" +
            "QTabBar::tab { background-color: rgba(0, 0, 0, 0.6); color: white; padding: 10px 25px; border: 1px solid #555; border-bottom: none; border-top-left-radius: 4px; border-top-right-radius: 4px; }" +
            "QTabBar::tab:selected { background-color: rgba(0, 40, 0, 0.8); border-color: #0f0; }"
        );
        layout.addWidget(tabs, 0, 0);

        /**
         * Pomocná funkce pro vytvoření jedné záložky v deníku.
         * @param {QTabWidget} parentTabs - Rodičovský QTabWidget.
         * @param {string} title - Název záložky.
         * @param {object} data - Objekt s daty k zobrazení.
         * @param {string} emptyText - Text, který se zobrazí, pokud nejsou žádná data.
         * @param {string} noteProperty - Název vlastnosti obsahující poznámku ('notes' nebo 'desc').
         */
        function createJournalTab(parentTabs, title, data, emptyText, noteProperty) {
            var widget = new QWidget();
            var layout = new QVBoxLayout(widget);
            var textEdit = new QTextEdit(widget);
            // Oprava: Defenzivní nastavení read-only pro maximální kompatibilitu
            if (typeof textEdit.setReadOnly === 'function') {
                textEdit.setReadOnly(true);
            } else {
                textEdit.readOnly = true; // Fallback pro starší verze
            }
            // Styl pro čitelnost
            textEdit.setStyleSheet("background-color: rgba(0, 0, 0, 0.7); color: white; border: none; padding: 10px;");

            // Použití monospaced písma pro lepší zarovnání
            try {
                var font = textEdit.font;
                if (typeof font.setFamily === "function") {
                    font.setFamily(Halla.FONT_NAME || "Consolas");
                }
            } catch (e) {}

            var content = "";
            var hasEntries = false;
            for (var id in data) {
                if (!data.hasOwnProperty(id)) continue;
                hasEntries = true;
                var entry = data[id];
                var note = entry[noteProperty] || "";

                content += "• " + id + "\n";
                if (note) {
                    content += "  " + note.replace(/\n/g, "\n  ") + "\n\n";
                }
            }

            textEdit.setPlainText(hasEntries ? content : emptyText);
            layout.addWidget(textEdit, 0, 0);
            parentTabs.addTab(widget, title);
        }

        // Vytvoření jednotlivých záložek pomocí pomocné funkce
        createJournalTab(tabs, "Místnosti", Halla.gameState.journal.rooms,
            "Nic jsi zatím neobjevil.\nBuď jsi nový, nebo se bojíš chodit po hale.",
            "notes"
        );

        createJournalTab(tabs, "Postavy", Halla.gameState.journal.npcs,
            "Zatím žádné NPC.\nMožná jsi moc asociální, možná jen šťastný.",
            "notes"
        );

        createJournalTab(tabs, "Perky", Halla.gameState.journal.perks,
            "Nemáš žádné perky.\nJen čisté utrpení a výplatní páska.",
            "desc"
        );
        
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
        layout.addStretch(1); // Odsazení zespodu
        dlg.exec();
    };

})(this);
