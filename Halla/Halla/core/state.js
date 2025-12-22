// scripts/Halla/Halla/core/state.js
// Stav hry + reset.
// Tahle část je "svatá": drží gameState a spouští init věci z ostatních modulů.

(function () {
    // Bezpečná reference na globální jmenný prostor
    var Halla = this.Halla || (this.Halla = {});

    // Konstanty pro lepší čitelnost a údržbu
    var JINDRA_SPAWN_ROOMS = ["kancl", "houston"];


    // --------------------------------------
    //   STAV HRY + RUNTIME PROMĚNNÉ
    // --------------------------------------

    /**
     * Zkontroluje, zda hra již běží.
     * @returns {boolean} True, pokud existuje platný gameState.
     */
    Halla.isGameInProgress = function() {
        return Halla.gameState && Halla.gameState.running;
    };

    Halla.gameState = null;

    // runtime registry for world phases
    Halla.WORLD_PHASES = new Object(); // Použijeme new Object() pro bezpečnější inicializaci

    // --------------------------------------
    //   POMOCNÉ FUNKCE
    // --------------------------------------

    /**
     * Vrátí objekt s vlastnostmi hráčovy třídy.
     * @returns {object} Objekt třídy nebo null.
     */
    Halla.getPlayerClass = function() {
        if (!Halla.gameState || !Halla.gameState.playerClassId) return null;
        return Halla.PLAYER_CLASSES[Halla.gameState.playerClassId] || null;
    };

    // --------------------------------------
    //   UI: VOLBA POVOLÁNÍ (QCAD-safe)
    //   (NEPOUŽÍVÁ Qt.UserRole / setData)
    // --------------------------------------

Halla.choosePlayerClass = function () {
        var parent = RMainWindowQt.getMainWindow();

        var dlg = new QDialog(parent);
    dlg.setFixedSize(768, 576); // Velikost podle obrázku na pozadí

        if (typeof dlg.setWindowTitle === "function") {
            dlg.setWindowTitle(Halla.GAME_TITLE + " – Volba povolání");
        }

        // --- Pozadí dialogu ---
        var imagePath = "scripts/Halla/Halla/data/pic/UIchar.jpg";
        imagePath = imagePath.replace(/\\/g, "/");
        dlg.setStyleSheet("QDialog { background-image: url(\"" + imagePath + "\"); background-position: center; background-repeat: no-repeat; }");

        var layout = new QVBoxLayout(dlg);

    // Hlavní titulek
        var lbl = new QLabel(dlg);
        var title = "Jak dneska nastupuješ do Hally?";
        if (typeof lbl.setText === "function") lbl.setText(title);
        else lbl.text = title;
        // Styl pro dobrou čitelnost na pozadí
        lbl.setStyleSheet("background-color: rgba(0, 0, 0, 0.7); color: white; padding: 10px; border-radius: 5px; font-size: 16px; font-weight: bold;");
        try {
            if (typeof lbl.setWordWrap === "function") lbl.setWordWrap(true);
            else lbl.wordWrap = true;
            // Nově: Zarovnání titulku na střed
            if (typeof lbl.setAlignment === 'function') {
                lbl.setAlignment(RS.AlignHCenter);
            }
        } catch (e) {}
        layout.addWidget(lbl, 0, 0);

    // Horizontální layout pro sloupce s postavami
    var columnsLayout = new QHBoxLayout();
        columnsLayout.setSpacing(0); // Vynulujeme defaultní mezery, budeme řídit vlastními
        var chosenId = null;
        var isFirstColumn = true;

        for (var id in Halla.PLAYER_CLASSES) {
            if (!Halla.PLAYER_CLASSES.hasOwnProperty(id)) continue;
            if (!isFirstColumn) {
                columnsLayout.addSpacing(33); // Přidá pevnou mezeru 20px mezi sloupce
            }
            isFirstColumn = false;
            var cls = Halla.PLAYER_CLASSES[id];

        // Vertikální layout pro jeden sloupec (obrázek, popis, tlačítko)
        var column = new QVBoxLayout();

        // 1. Obrázek
        var imgLabel = new QLabel(dlg);
        // Použijeme relativní cestu, protože absolutní je nyní uložena pro pozdější použití
        var imagePath = "scripts/Halla/Halla/data/pic/" + id + ".jpg";
        imagePath = imagePath.replace(/\\/g, "/"); 

        var pixmap = new QPixmap(imagePath);
        if (!pixmap.isNull()) {
            // Zmenšíme obrázek na šířku 150px, aby bylo více místa na mezery
            imgLabel.setPixmap(pixmap.scaledToWidth(165, 1)); // Qt.KeepAspectRatio = 1
        }
        // Oprava: Defenzivní nastavení zarovnání pro maximální kompatibilitu
        if (typeof imgLabel.setAlignment === 'function') {
            imgLabel.setAlignment(RS.AlignHCenter);
        } else {
            imgLabel.alignment = RS.AlignHCenter; // Fallback pro starší verze
        }
        column.addWidget(imgLabel, 0, 0);

        // 2. Popis
        var nameLabel = new QLabel("<b>" + (cls.label || id) + "</b>", dlg);
        nameLabel.setStyleSheet("color: white;");
        if (typeof nameLabel.setAlignment === 'function') {
            nameLabel.setAlignment(RS.AlignHCenter);
        } else {
            nameLabel.alignment = RS.AlignHCenter;
        }
        column.addWidget(nameLabel, 0, 0);

        var descLabel = new QLabel(cls.desc || "Žádný popis.", dlg);
        descLabel.setStyleSheet("color: white;");
        // Oprava: Defenzivní nastavení zalamování textu
        try {
            if (typeof descLabel.setWordWrap === 'function') {
                descLabel.setWordWrap(true);
            } else {
                descLabel.wordWrap = true; // Fallback pro starší verze
            }
        } catch (e) {}
        if (typeof descLabel.setAlignment === 'function') {
            descLabel.setAlignment(RS.AlignHCenter);
        } else {
            descLabel.alignment = RS.AlignHCenter;
        }
        column.addWidget(descLabel, 1, 0); // Stretch factor 1, aby se roztáhl

        // 3. Tlačítko pro výběr
        var btnSelect = new QPushButton("Vybrat", dlg);
        btnSelect.setStyleSheet("QPushButton { background-color: transparent; color: white; border: 1px solid white; padding: 4px; }");
        (function(selectedId) {
            if (btnSelect.clicked) btnSelect.clicked.connect(function() { chosenId = selectedId; dlg.accept(); });
        })(id);
        column.addWidget(btnSelect, 0, 0);

        // Přidáme sloupec do hlavního horizontálního layoutu
        columnsLayout.addLayout(column);
        }

    layout.addStretch(2); // Pružina, která odsune postavy níže

    // Nově: Vložíme layout s postavami do "obálky" s pružinami, aby byl vycentrovaný
    var centerWrapper = new QHBoxLayout();
    centerWrapper.addStretch(12); // Zvětšená pružina vlevo pro větší odsazení
    centerWrapper.addLayout(columnsLayout);
    centerWrapper.addStretch(12); // Zvětšená pružina vpravo pro větší odsazení
    layout.addLayout(centerWrapper);

    layout.addStretch(1); // Další pružina, která odsune tlačítko "Zrušit" dolů

    // Přidáme tlačítko Zrušit pro případ, že si hráč nevybere
    var btnCancel = new QPushButton("Zrušit", dlg);
    btnCancel.setStyleSheet("QPushButton { background-color: transparent; color: white; border: 1px solid white; padding: 4px; }");
    if (btnCancel.clicked) {
        btnCancel.clicked.connect(function() {
            chosenId = null; // Zajistíme, že se nic nevybere
            dlg.reject();
        });
    }
    layout.addWidget(btnCancel, 0, RS.AlignHCenter); // Zarovnání tlačítka na střed

        dlg.exec();

        // Pokud hráč dialog zavřel křížkem, vrátíme výchozí třídu
        return chosenId || "vyrobni_barbar";
    };

    // --------------------------------------
    //   RESET HRY
    // --------------------------------------

    Halla.resetGame = function () {

        // Inicializace gameState
        var gs = new Object();
        gs.currentRoom = "placek";
        gs.inventory = new Array();
        gs.running = true; // gs.coinRoom = null; // Nahrazeno systémem itemLocations
        gs.revealedRooms = new Object();
        gs.hasJindra = false;
        gs.jindraRoom = null;
        gs.kamenikUsed = false;
        gs.hasIvca = false;
        gs.ivcaRoom = null;
        gs.ivcaBuffTurns = 0;
        gs.mapBackgroundEntityId = -1; // ID entity pro pozadí mapy
        // Michal
        gs.hasMichal = true; // Michal je ve hře od začátku
        gs.michalRoom = null;
        // gs.idCardRoom = null; // Nahrazeno systémem itemLocations

        gs.dynamicItemLocations = new Object(); // Pro rum, mega kafe atd.
        gs.mapPlayerEntityId = -1; // ID entity pro hráče/NPC/bosse
        gs.health = Halla.BASE_MAX_HEALTH;
        gs.maxHealth = Halla.BASE_MAX_HEALTH;
        gs.isTurnInProgress = false;
        gs.isFirstTurn = true; // Nový příznak pro první kolo
        gs.staticItemsTaken = new Object(); // Sledování sebraných statických itemů

        gs.boss = new Object();
        gs.boss.active = false;
        gs.boss.room = null;
        gs.boss.turnCounter = 0;
        gs.boss.rage = false;
        gs.boss.demotivatedTurns = 0;
        gs.boss.encounters = 0;

        gs.endings = new Object();
        gs.endings.pepikVisitCount = 0;
        gs.endings.escapedWithCatAndCigs = false;
        gs.endings.rumEnding = false;
        gs.endings.pepikEnding = false;
        gs.endings.jindraHeroEnding = false;

        gs.stats = new Object();
        gs.stats.turns = 0; gs.stats.moves = 0; gs.stats.waits = 0; gs.stats.listens = 0; gs.stats.itemsPicked = 0;
        gs.stats.kurarnaHeals = 0;
        gs.stats.usedKurarnaHeal = false;
        gs.stats.rumUsedCount = 0; // Nové počítadlo pro vypitý rum
        gs.stats.slotMachinePlays = 0; // Počítadlo pro achievement Gamblerství
        gs.stats.junkItemsPicked = new Object(); // Pro perk "Šroťák"
        gs.stats.listenCount = 0; // Pro perk "Stopař"

        gs.playerClassId = null;
        gs.journal = new Object();
        gs.journal.rooms = new Object(); gs.journal.npcs = new Object(); gs.journal.perks = new Object();

        gs.playerPerks = new Object();
        gs.activeQuests = new Object();

        Halla.gameState = gs;
        gs.replayData = []; // Inicializace pole pro replay
        gs.currentTurnHealthDelta = 0; // Sledování změny HP pro replay v aktuálním kole

        // --- výběr classy (UI) ---
        var classId = (typeof Halla.choosePlayerClass === "function")
            ? Halla.choosePlayerClass()
            : "vyrobni_barbar";

        Halla.gameState.playerClassId = classId;

        // přepočet max health dle classy
        var cls = Halla.getPlayerClass();
        if (cls) {
            Halla.gameState.maxHealth = Math.floor(Halla.BASE_MAX_HEALTH * (cls.maxHealthMul || 1.0));
        }
        Halla.gameState.health = Halla.gameState.maxHealth;

        // init random events / quests (pokud už existují)
        if (typeof Halla.initRandomEvents === "function") {
            Halla.initRandomEvents();
        }
        if (typeof Halla.initQuests === "function") {
            Halla.initQuests();
        }
        // Init unikátních NPC
        if (typeof Halla.initUniqueNpcs === "function") {
            Halla.initUniqueNpcs();
        }

        // Jindra start pozice
        Halla.gameState.jindraRoom = Halla.randomFromArray(JINDRA_SPAWN_ROOMS);
        Halla.gameState.hasJindra = false;
        Halla.gameState.kamenikUsed = false;

        // Michal start pozice (daleko od hráče)
        var michalSpawnRooms = Object.keys(Halla.rooms).filter(function(r) { return r !== "placek"; });
        Halla.gameState.michalRoom = Halla.randomFromArray(michalSpawnRooms);

        // --- Nový systém distribuce všech předmětů ---
        if (typeof Halla.distributeAllItems === "function") {
            Halla.distributeAllItems();
        }

        // world phases registry
        if (typeof Halla.initWorldPhases === "function") {
            Halla.initWorldPhases();
        }

        // Zaznamenáme úvodní snímek pro replay hned po inicializaci.
        if (typeof Halla.recordReplayFrame === "function") {
            Halla.recordReplayFrame();
        }
    };

    /**
     * Nová centrální funkce pro rozmístění všech předmětů na mapě.
     * Zajišťuje, že každá místnost má 1-4 předměty.
     */
    Halla.distributeAllItems = function() {
        var gs = Halla.gameState;
        var roomNames = Object.keys(Halla.rooms);
        var roomItemMap = new Object();
        roomNames.forEach(function(name) { roomItemMap[name] = []; });

        // Helper function to place an item
        // Tries preferred rooms first, then falls back to any available room if allowed.
        function placeItem(item, preferredRooms, allowFallbackToAnyRoom) {
            var roomsToTry = preferredRooms ? Halla.shuffleArray(preferredRooms.slice()) : [];
            
            // Try preferred rooms first
            for (var i = 0; i < roomsToTry.length; i++) {
                var roomName = roomsToTry[i];
                if (roomItemMap[roomName] && roomItemMap[roomName].length < Halla.MAX_ITEMS_PER_ROOM) {
                    roomItemMap[roomName].push(item);
                    return true;
                }
            }

            // If preferred rooms are full or not provided, try any room if allowed
            if (allowFallbackToAnyRoom) {
                var allRoomsShuffled = Halla.shuffleArray(roomNames.slice());
                for (var i = 0; i < allRoomsShuffled.length; i++) {
                    var roomName = allRoomsShuffled[i];
                    if (roomItemMap[roomName] && roomItemMap[roomName].length < Halla.MAX_ITEMS_PER_ROOM) {
                        roomItemMap[roomName].push(item);
                        return true;
                    }
                }
            }
            return false; // Could not place item
        }

        // --- Prioritní rozmístění ---

        // 1. Ultimátní předměty: Každý do unikátní místnosti.
        // FILTR: Vyřadíme tajnou místnost (nelze se tam dostat, chybí Diplom) a Pepíka (past).
        var validForUltimate = roomNames.filter(function(name) {
            return name !== "tajna_mistnost" && name !== "pepik";
        });

        var shuffledRooms = Halla.shuffleArray(validForUltimate);
        Halla.ULTIMATE_ITEMS.forEach(function(item) {
            if (shuffledRooms.length > 0) {
                var roomName = shuffledRooms.pop();
                roomItemMap[roomName].push(item);
            } else {
                // Fallback if not enough unique rooms for ultimate items (should not happen with current map size)
                placeItem(item, null, true); // Place anywhere
            }
        });

        // 2. Statické předměty z rooms.js (pro zachování původní logiky, pokud by tam nějaké byly)
        roomNames.forEach(function(rName) {
            if (Halla.rooms[rName].items && Halla.rooms[rName].items.length > 0) {
                Halla.rooms[rName].items.forEach(function(item) {
                    placeItem(item, [rName], true); // Try to place in its room, fallback to any
                });
            }
        });

        // 3. Questové a speciální předměty
        for (var specialItemName in Halla.SPECIAL_SPAWN_ITEMS) {
            placeItem(specialItemName, Halla.SPECIAL_SPAWN_ITEMS[specialItemName].spawnRooms, true);
        }

        // 4. Dynamické předměty (první spawn)
        for (var itemName in Halla.DYNAMIC_ITEMS) {
            placeItem(itemName, Halla.DYNAMIC_ITEMS[itemName].spawnRooms, true);
        }

        // 5. Příprava poolu zbytečných předmětů
        var shuffledJunk = Halla.shuffleArray(Halla.JUNK_ITEMS.slice());

        // 6. Doplnění místností na minimálně 2 předměty (pokud je dostatek harampádí)
        roomNames.forEach(function(roomName) {
            while (roomItemMap[roomName].length < 2) {
                if (shuffledJunk.length > 0 && roomItemMap[roomName].length < Halla.MAX_ITEMS_PER_ROOM) {
                    roomItemMap[roomName].push(shuffledJunk.pop());
                } else {
                    break; // Došly zbytečné předměty
                }
            }
        });

        // 7. Rozmístění zbývajících zbytečných předmětů do volných slotů
        var allRoomsShuffledForJunk = Halla.shuffleArray(roomNames.slice());
        var roomIndex = 0;
        while (shuffledJunk.length > 0) {
            var roomName = allRoomsShuffledForJunk[roomIndex % allRoomsShuffledForJunk.length];
            if (roomItemMap[roomName].length < Halla.MAX_ITEMS_PER_ROOM) {
                roomItemMap[roomName].push(shuffledJunk.pop());
            }
            roomIndex++;
            // Pokud jsme prošli všechny místnosti a stále máme harampádí,
            // znamená to, že všechny místnosti jsou plné.
            if (roomIndex > allRoomsShuffledForJunk.length * 2 && shuffledJunk.length > 0) {
                break;
            }
        }

        // 8. Uložení výsledku do gameState
        gs.itemLocations = roomItemMap;
        // gs.coinRoom = null; // Již není potřeba, je v itemLocations
        // gs.idCardRoom = null; // Již není potřeba, je v itemLocations
        gs.dynamicItemLocations = new Object(); // Bude se plnit až po sebrání a respawnu
    };

})();
