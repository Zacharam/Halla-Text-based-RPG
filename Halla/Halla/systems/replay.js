// scripts/Halla/Halla/systems/replay.js
// Systém pro záznam a zpětné přehrání průběhu hry (Replay).

(function (global) {
    "use strict";
    var Halla = global.Halla = global.Halla || {};

    // --- Konfigurace Replaye ---
    var REPLAY_SPEED_MS = 50;      // Prodleva mezi tahy v ms (nižší = rychlejší)
    var HUD_POS_Y_TURN = -34;        // Odsazení čísla tahu pod mapou (Y souřadnice)
    var HUD_POS_Y_HEALTH = -30;      // Odsazení změny zdraví pod mapou
    var HUD_POS_Y_TOTAL_HEALTH = -27; // Odsazení celkového zdraví pod mapou
    var HUD_POS_X_OFFSET = 75;       // Odsazení HUDu od levého okraje mapy (X souřadnice)
    var HUD_SIZE_TURN = 4.0;         // Velikost textu pro číslo tahu
    var HUD_SIZE_HEALTH = 3.0;       // Velikost textu pro změnu zdraví
    var HUD_SIZE_TOTAL_HEALTH = 3.0; // Velikost textu pro celkové zdraví

    /**
     * Uloží aktuální stav pozic do historie pro replay.
     * Volá se na konci každého tahu.
     */
    Halla.recordReplayFrame = function() {
        var gs = Halla.gameState;
        if (!gs) return;
        if (!gs.replayData) gs.replayData = [];

        // Vytvoříme lehký snapshot pouze dat nutných pro vykreslení mapy
        var frame = {
            turnNumber: (gs.stats ? gs.stats.turns : 0),
            healthDelta: gs.currentTurnHealthDelta || 0,
            currentHealth: gs.health,
            maxHealth: gs.maxHealth,
            currentRoom: gs.currentRoom,
            boss: {
                active: gs.boss ? gs.boss.active : false,
                room: gs.boss ? gs.boss.room : null,
                rage: gs.boss ? gs.boss.rage : false,
                turnCounter: gs.boss ? gs.boss.turnCounter : 0
            },
            uniqueNpc: {
                activeNpcId: gs.uniqueNpc ? gs.uniqueNpc.activeNpcId : null,
                room: gs.uniqueNpc ? gs.uniqueNpc.room : null,
                turnCounter: gs.uniqueNpc ? gs.uniqueNpc.turnCounter : 0
            },
            michal: {
                hasMichal: gs.hasMichal,
                michalRoom: gs.michalRoom
            },
            playerState: {
                ivcaBuffTurns: gs.ivcaBuffTurns,
                hasJindra: gs.hasJindra,
                hasCat: Halla.hasItemInInventory("Kočka")
            },
            // Pro ID kartu musíme najít, kde zrovna leží
            idCardRoom: null
        };

        // Najdeme ID kartu v itemLocations
        if (gs.itemLocations) {
            for (var r in gs.itemLocations) {
                if (Halla.hasItem(gs.itemLocations[r], "ID karta")) {
                    frame.idCardRoom = r;
                    break;
                }
            }
        }

        gs.replayData.push(frame);
        gs.currentTurnHealthDelta = 0; // Resetujeme počítadlo pro další tah
    };

    /**
     * Pomocná funkce pro čekání (aby animace nebyla okamžitá).
     * Udržuje UI responzivní.
     */
    function _delay(ms) {
        var start = new Date().getTime();
        while (new Date().getTime() - start < ms) {
            if (typeof QCoreApplication !== "undefined" && QCoreApplication.processEvents) {
                QCoreApplication.processEvents();
            }
        }
    }

    /**
     * Spustí přehrávání záznamu.
     */
    Halla.playReplay = function() {
        var gs = Halla.gameState;
        if (!gs || !gs.replayData || gs.replayData.length === 0) {
            Halla.showInfo("Žádný záznam není k dispozici.");
            return;
        }

        Halla.showInfo("Spouštím záznam bezpečnostních kamer...\n(Sleduj mapu na pozadí)");

        // 1. Záloha aktuálního stavu (abychom ho nerozbili přehráváním)
        // Používáme JSON parse/stringify pro deep copy jednoduchých objektů
        var backup = {
            currentRoom: gs.currentRoom,
            boss: JSON.parse(JSON.stringify(gs.boss)),
            uniqueNpc: JSON.parse(JSON.stringify(gs.uniqueNpc)),
            hasMichal: gs.hasMichal,
            michalRoom: gs.michalRoom,
            ivcaBuffTurns: gs.ivcaBuffTurns,
            hasJindra: gs.hasJindra,
            inventory: gs.inventory.slice(),
            itemLocations: JSON.parse(JSON.stringify(gs.itemLocations))
        };

        // Nastavíme příznak replay režimu (pro mapRender, aby zobrazil vše)
        gs.isReplay = true;

        // 2. Smyčka přehrávání
        for (var i = 0; i < gs.replayData.length; i++) {
            var frame = gs.replayData[i];

            // Obnovení stavu z framu
            gs.currentRoom = frame.currentRoom;
            
            gs.boss.active = frame.boss.active;
            gs.boss.room = frame.boss.room;
            gs.boss.rage = frame.boss.rage;
            gs.boss.turnCounter = frame.boss.turnCounter;

            gs.uniqueNpc.activeNpcId = frame.uniqueNpc.activeNpcId;
            gs.uniqueNpc.room = frame.uniqueNpc.room;
            gs.uniqueNpc.turnCounter = frame.uniqueNpc.turnCounter;

            gs.hasMichal = frame.michal.hasMichal;
            gs.michalRoom = frame.michal.michalRoom;

            gs.ivcaBuffTurns = frame.playerState.ivcaBuffTurns;
            gs.hasJindra = frame.playerState.hasJindra;
            
            // Simulace inventáře pro Kočku (ovlivňuje viditelnost bosse na mapě)
            if (frame.playerState.hasCat) {
                if (!Halla.hasItemInInventory("Kočka")) gs.inventory.push("Kočka");
            } else {
                Halla.takeItemFromInventory("Kočka");
            }

            // Simulace polohy ID karty
            // Nejprve ji smažeme odevšad
            for (var r in gs.itemLocations) {
                Halla.takeItemFromRoom("ID karta", r);
            }
            // Pak ji přidáme tam, kde byla v záznamu
            if (frame.idCardRoom && gs.itemLocations[frame.idCardRoom]) {
                gs.itemLocations[frame.idCardRoom].push("ID karta");
            }

            // Vykreslení mapy
            if (typeof Halla.drawAsciiMapToCanvas === "function") {
                Halla.drawAsciiMapToCanvas();
            }

            // Vykreslení HUDu pro replay (číslo tahu)
            if (typeof Halla.drawReplayHud === "function") {
                Halla.drawReplayHud(frame.turnNumber, frame.healthDelta, frame.currentHealth, frame.maxHealth);
            }

            // Pauza mezi snímky (rychlost přehrávání)
            var speed = (Halla.BALANCE && typeof Halla.BALANCE.replaySpeed !== 'undefined') ? Halla.BALANCE.replaySpeed : REPLAY_SPEED_MS;
            _delay(speed); 
        }

        Halla.showInfo("Konec záznamu.");

        // 3. Obnovení původního stavu
        gs.currentRoom = backup.currentRoom;
        gs.boss = backup.boss;
        gs.uniqueNpc = backup.uniqueNpc;
        gs.hasMichal = backup.hasMichal;
        gs.michalRoom = backup.michalRoom;
        gs.ivcaBuffTurns = backup.ivcaBuffTurns;
        gs.hasJindra = backup.hasJindra;
        gs.inventory = backup.inventory;
        gs.itemLocations = backup.itemLocations;

        // Zrušíme příznak replay režimu
        gs.isReplay = false;

        // Finální překreslení do stavu "Konec hry"
        if (typeof Halla.clearReplayHud === "function") {
            Halla.clearReplayHud();
        }
        if (typeof Halla.drawAsciiMapToCanvas === "function") {
            Halla.drawAsciiMapToCanvas();
        }
    };

    /**
     * Vykreslí číslo tahu do speciální vrstvy.
     */
    Halla.drawReplayHud = function(turnNumber, healthDelta, currentHealth, maxHealth) {
        var di = EAction.getDocumentInterface();
        if (!di) return;
        var doc = di.getDocument();
        if (!doc) return;

        var layerName = "Halla_Replay_HUD";
        var layerId = -1;

        // Použijeme existující helper z mapRender, pokud je dostupný
        if (typeof Halla.ensureLayerAndGetId === "function") {
            layerId = Halla.ensureLayerAndGetId(layerName, new RColor(255, 125, 0));
        } else {
            if (!doc.hasLayer(layerName)) {
                var layer = new RLayer(doc, layerName);
                layer.setColor(new RColor(255, 125, 0));
                var op = new RAddObjectOperation(layer, false);
                di.applyOperation(op);
            }
            layerId = doc.getLayerId(layerName);
        }

        // Smazání starého textu
        var ids = doc.queryLayerEntities(layerId);
        if (ids && ids.length > 0) {
            var delOp = new RDeleteObjectsOperation();
            for (var i = 0; i < ids.length; i++) {
                var e = doc.queryEntity(ids[i]);
                if (e) delOp.deleteObject(e);
            }
            di.applyOperation(delOp);
        }

        // Vykreslení nového textu (pod mapou)
        var pos = new RVector((Halla.MAP_ORIGIN_X || 0) + HUD_POS_X_OFFSET, (Halla.MAP_ORIGIN_Y || 0) - HUD_POS_Y_TURN);
        var textData = new RTextData(pos, pos, HUD_SIZE_TURN, 0, RS.VAlignTop, RS.HAlignLeft, RS.LeftToRight, RS.Exact, 1.0, "TAH: " + turnNumber, "Arial", true, false, 0.0, false);
        textData.setLayerId(layerId);
        
        var addOp = new RAddObjectsOperation();
        addOp.addObject(new RTextEntity(doc, textData), false);

        // Vykreslení změny zdraví (pokud nějaká byla)
        if (healthDelta && healthDelta !== 0) {
            var deltaText = (healthDelta > 0 ? "+" : "") + healthDelta + " HP";
            var color = (healthDelta > 0) ? new RColor(0, 255, 0) : new RColor(255, 0, 0);
            
            var posDelta = new RVector((Halla.MAP_ORIGIN_X || 0) + HUD_POS_X_OFFSET, (Halla.MAP_ORIGIN_Y || 0) - HUD_POS_Y_HEALTH); // Pod číslem tahu
            var textDataDelta = new RTextData(posDelta, posDelta, HUD_SIZE_HEALTH, 0, RS.VAlignTop, RS.HAlignLeft, RS.LeftToRight, RS.Exact, 1.0, deltaText, "Arial", true, false, 0.0, false);
            textDataDelta.setLayerId(layerId);
            
            var entityDelta = new RTextEntity(doc, textDataDelta);
            entityDelta.setColor(color);
            addOp.addObject(entityDelta, false);
        }

        // Vykreslení celkového zdraví
        if (typeof currentHealth !== "undefined") {
            var hpText = "HP: " + currentHealth;
            if (typeof maxHealth !== "undefined") hpText += "/" + maxHealth;
            
            var posTotal = new RVector((Halla.MAP_ORIGIN_X || 0) + HUD_POS_X_OFFSET, (Halla.MAP_ORIGIN_Y || 0) - HUD_POS_Y_TOTAL_HEALTH);
            var textDataTotal = new RTextData(posTotal, posTotal, HUD_SIZE_TOTAL_HEALTH, 0, RS.VAlignTop, RS.HAlignLeft, RS.LeftToRight, RS.Exact, 1.0, hpText, "Arial", true, false, 0.0, false);
            textDataTotal.setLayerId(layerId);
            
            var entityTotal = new RTextEntity(doc, textDataTotal);
            entityTotal.setColor(new RColor(200, 200, 200)); // Světle šedá
            addOp.addObject(entityTotal, false);
        }

        di.applyOperation(addOp);
    };

    /**
     * Smaže vrstvu s HUDem replaye.
     */
    Halla.clearReplayHud = function() {
        var di = EAction.getDocumentInterface();
        if (!di) return;
        var doc = di.getDocument();
        if (!doc) return;
        
        var layerName = "Halla_Replay_HUD";
        if (doc.hasLayer(layerName)) {
            var layerId = doc.getLayerId(layerName);
            var ids = doc.queryLayerEntities(layerId);
            if (ids && ids.length > 0) {
                var delOp = new RDeleteObjectsOperation();
                for (var i = 0; i < ids.length; i++) {
                    var e = doc.queryEntity(ids[i]);
                    if (e) delOp.deleteObject(e);
                }
                di.applyOperation(delOp);
            }
        }
    };

})(this);
