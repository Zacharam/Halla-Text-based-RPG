// C:\Aplikace\QCAD\scripts\Halla\Halla.js
(function () {
  var app = RMainWindowQt.getMainWindow();
  var mb  = app.menuBar();
  var debugMessages = []; // Pole pro sběr logovacích zpráv

  // --- Zničení starého menu a toolbaru, pokud existují ---
  // Tím zajistíme, že i všechny staré akce jsou zničeny a předejdeme problémům
  // při opakovaném spuštění skriptu. Obaleno v try-catch pro případ, že by
  // menu/toolbar při prvním spuštění neexistovaly a volání způsobilo pád.
  try {
    EAction.removeMenu("Halla");
    EAction.removeToolBar("HallaToolBar");
  } catch (e) {
    // Chybu ignorujeme, pravděpodobně menu/toolbar ještě neexistuje.
  }

  // --- Vytvoř / získej menu HALLA ----------------------------------------------
  var menu = EAction.getMenu("Halla", qsTr("&HALLA"));

  // --- Toolbar -------------------------------------------------------------------
  var tb = EAction.getToolBar("HallaToolBar", qsTr("HALLA"));
  // zkusíme explicitně nastavit velikost ikon (může pomoct viditelnosti)
  try { tb.setIconSize(new QSize(32,32)); } catch (e) {}

  // --- Absolutní basePath + logger pro ikony ------------------------------------
  var bp;
  try {
    // Preferovaná, spolehlivá metoda pro zjištění cesty ke skriptu
    bp = new QFileInfo(__FILE__).absolutePath();
  } catch (e) {
    // Záložní metoda, pokud __FILE__ není k dispozici.
    bp = QDir.fromNativeSeparators(new QFileInfo("scripts/Halla").absoluteFilePath());
  }
  function log(s){ try{ debugMessages.push(s); }catch(e){} }
  log("Base path (bp) nastaven na: " + bp);

  function setIconIfExists(action, relIconPath) {
    if (!relIconPath) return;
    var iconAbs = QDir.fromNativeSeparators(bp + "/" + relIconPath);
    if (QFile.exists(iconAbs)) {
      try {
        action.setIcon(iconAbs);
        log("OK " + iconAbs);
      } catch (e) {
        log("CHYBA pri nastavovani ikony '" + iconAbs + "': " + e.toString());
      }
    } else {
      log("NENALEZENO: " + iconAbs);
    }
  }

  // --- Helper pro akce -----------------------------------------------------------
  function addItem(options) {
    var a = new RGuiAction(options.caption, app);
    if (options.requiresDoc) a.setRequiresDocument(true);
    a.setNoState();

    if (options.script) {
      // skript voláme relativně od kořene (dopředná lomítka)
      a.setScriptFile("scripts/Halla/" + options.script);
    } else if (options.triggered) {
      a.triggered.connect(options.triggered);
    }

    if (options.shortcut) {
      try { a.setDefaultShortcut(new QKeySequence(options.shortcut)); } catch (e) {}
    }
    if (options.tooltip) {
      a.setToolTip(qsTr(options.tooltip));
    }
    setIconIfExists(a, options.icon);

    // zaregistrovat do UI
    a.addToMenu(menu);
    a.addToToolBar(tb);
    return a;
  }

  // --- Hlavní spouštěč hry ---
  addItem({
    caption: "Spustit hru HALLA",
    script: "Halla/main.js",
    tooltip: "Spustí textovou adventuru HALLA.",
    icon: "Halla/icon.png", // Ikona pro hru
    shortcut: "Ctrl+Alt+H",
    requiresDoc: true // Hra vyžaduje otevřený výkres pro kreslení mapy
  });

  // oddělovač mezi Ping a nástroji
  menu.addSeparator(); tb.addSeparator();

  // --- Nástroje ------------------------------------------------------------------
  addItem({
    caption: "AllInOne",
    script: "AllInOne/Halla_AllInOne.js",
    icon: "AllInOne/icon.png",
    tooltip: "Spustí hlavní nástroj pro zpracování razítka, výpis vodičů.",
    shortcut: "Ctrl+Alt+A",
    requiresDoc: true
  });
    // oddělovač mezi skupinami
  menu.addSeparator(); tb.addSeparator();
   addItem({
    caption: "Vyrez",
    script: "Vyrez/Halla_Vyrez.js",
    icon: "Vyrez/icon.png",
    tooltip: "Výřez vodičů mezi dvěma čarami s posunem a ZIGZAG zlomem.",
    shortcut: "Ctrl+Alt+X",
    requiresDoc: true
  });
  addItem({
    caption: "Tabulka",
    script: "Tabulka/Halla_Tabulka.js",
    icon: "Tabulka/icon.png",
    tooltip: "Nástroj pro vytvoření a vložení tabulky.",
    shortcut: "Ctrl+Alt+B",
    requiresDoc: true
  }); 
  addItem({
    caption: "DelkaVodicu",
    script: "DelkaVodicu/Halla_DelkaVodicu.js",
    icon: "DelkaVodicu/icon.png",
    tooltip: "Nástroj pro výpočet délky vodičů.",
    shortcut: "Ctrl+Alt+D",
    requiresDoc: true
  });
  addItem({
    caption: "Uzly",
    script: "Uzly/Halla_Uzly.js",
    icon: "Uzly/icon.png",
    tooltip: "Nástroj pro práci s uzly.",
    shortcut: "Ctrl+Alt+U",
    requiresDoc: true
  });
  addItem({
    caption: "VlozText",
    script: "VlozText/Halla_VlozText.js",
    icon: "VlozText/icon.png",
    tooltip: "Nástroj pro vložení textu.",
    shortcut: "Ctrl+Alt+T",
    requiresDoc: true
  });
  // oddělovač mezi skupinami
  menu.addSeparator(); tb.addSeparator();

  addItem({
    caption: "K2Insert",
    script: "K2Insert/Halla_K2Insert.js",
    icon: "K2Insert/icon.png",
    tooltip: "Přiřadí entitě vlastní vlastnosti.",
    shortcut: "Ctrl+Alt+V",
    requiresDoc: true
  });
  addItem({
    caption: "K2ExpCSV",
    script: "K2ExpCSV/Halla_K2Export.js",
    icon: "K2ExpCSV/icon.png",
    tooltip: "Vypíše vlastní vlastnosti vybraných entit.",
    shortcut: "Ctrl+Alt+Y",
    requiresDoc: true
  });
    // oddělovač mezi skupinami
  menu.addSeparator(); tb.addSeparator();

  
  addItem({
    caption: "ExportPDF",
    script: "ExportPDF/Halla_ExportPDF.js",
    icon: "ExportPDF/icon.png",
    tooltip: "Exportuje aktuální výkres do PDF souboru.",
    shortcut: "Ctrl+Alt+P",
    requiresDoc: true
  });

  // oddělovač mezi skupinami
  menu.addSeparator(); tb.addSeparator();

  // Na konci zobrazíme všechny nasbírané zprávy v jednom okně
  // Diagnostické okno - po vyřešení problému je možné tuto část smazat nebo zakomentovat.
  // if (debugMessages.length > 0) {
  //   QMessageBox.information(app, "HALLA - Diagnostika skriptu", debugMessages.join("\n"));
  // }

  // --- Zobrazení potvrzovacího dialogu (dříve v dialogPIC.js) ---
  (function() {
      print("INFO: Zobrazuji potvrzovací dialog HALLA.");

      // Použijeme cestu relativní k hlavnímu adresáři pro skripty.
      var imagePath = "scripts/Halla/halla-logo.png";

      // 1. Vytvoření hlavního dialogového okna
      var dialog = new QDialog(
          undefined,
          Qt.Dialog | Qt.WindowTitleHint | Qt.WindowSystemMenuHint | Qt.WindowCloseButtonHint
      );
      dialog.setWindowTitle("HALLA - Informace                                            @Zachara");

      // 2. Vytvoření layoutu
      var layout = new QVBoxLayout();
      dialog.setLayout(layout);

      // 3. Přidání textového popisku
      var textLabel = new QLabel("Menu a nástroje HALLA byly úspěšně načteny.");
      layout.addWidget(textLabel, 0, Qt.Alignment(0));

      // 4. Načtení a nastavení obrázku
      var imageLabel = new QLabel();
      var pixmap = new QPixmap(imagePath);

      if (pixmap.isNull()) {
          print("CHYBA: Logo '" + imagePath + "' nebylo nalezeno.");
      } else {
          var maxWidth = 400;
          var maxHeight = 300;
          if (pixmap.width() > maxWidth || pixmap.height() > maxHeight) {
              pixmap = pixmap.scaled(maxWidth, maxHeight, Qt.KeepAspectRatio, Qt.SmoothTransformation);
          }
          imageLabel.setPixmap(pixmap);
      }
      layout.addWidget(imageLabel, 0, Qt.Alignment(0));

      // 5. Přidání tlačítka "OK"
      var buttonBox = new QDialogButtonBox(QDialogButtonBox.Ok, Qt.Horizontal, dialog);
      buttonBox.accepted.connect(dialog, "accept()");
      layout.addWidget(buttonBox, 0, Qt.Alignment(0));

      // 6. Zobrazení dialogového okna
      dialog.exec();
  })();

})();
