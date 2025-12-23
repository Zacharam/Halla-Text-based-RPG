(function (global) {
    "use strict";
    global.Halla = global.Halla || {};
    var Halla = global.Halla;

    var mapString = // Fallback map
        "░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░┌────────────────────────┐░░░░░░┌──────┐░░░\n" +
        "░░░░░░░░░░░░░░░░┌───────┐░░░░░░░░░│                        ├══════┤      │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░\n" +
        "░░░░┌═══════════┤       ├═════════┤                        │      └──────┘░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░\n" +
        "░░░░║░░░░░░░░░░░└───────┘░░░░░░░░░└────────────────┬───────┘░░░░░░░░░░░░░░░░░\n" +
        "░░░░║░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║ ░░░░░░░░░░  [NEON VOID]\n" +
        "░░░░║░░░░                 ░░░░░░░░░░░░░░░░░░░░░░░░ ║ ░░░░░░░░░░\n" +
        "░░░░║░░░░                 ░░░┌───────┐░░░░░┌───────┴───────┐░░░  DATA BLOCK B7\n" +
        "░░░░║░░░░                 ░░░│       │░░░░░│               │░░░\n" +
        "░░░░║░░░░                 ░░░└───┬───┘░░░░░└───────┬───────┘░░░\n" +
        "░░░░║░░░░                 ░░░░░░ ║ ░░░░░░░░░░░░░░░ ║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░ NET-TUNNEL\n" +
        "░░░░║░░░░       ░░░░░░░░░░░░░░░░ ║ ░░░░░░░░░░░░░░░ ║ ░░░┌────────────────────┐░░\n" +
        "░░┌─┴┐░░░       ░░┌──────────────┴─┐░░░░░░░░░┌─────┴─┐░░│                    │░░  GRID SECTOR 69\n" +
        "░░│  │░░░       ░░│                ├═════════┤       ├══│                    │░░   ░┌──────┐░░░░░░░░░░░░░░░░\n" +
        "░░│  │░░░       ░░└───┬────────────┘         └───────┘  │                    ├══════┤      │░░░░░░░░░░░░░░░░\n" +
        "░░│  │░░░       ░░░░░ ║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│                    │░░   ░└──────┘░░░░░░░░░░░░░░░░\n" +
        "░░│  │░░░░░░░░░░░░░░░ ║ ░░░░░░░┌──────────┐░░░░░░░░░░░░░│                    │░░  [SUBNET CAVES]\n" +
        "░░│  │░░░┌─────┐░░░┌──┴────┐░░░│          │       ░░░░░░└──┬─────────────────┘░░\n" +
        "░░│  ├═══┤     ├═══┤       ├═══┤          ├═════┐ ░░░░░░░░ ║ ░░░░░░░░░░░░░░░░░░░  ACCESS PORT 05\n" +
        "░░│  │░░░└─────┘░░░└──┬────┘░░░│          │     ║ ░░░░░░░░ ║ ░░░░░░░░░░░░░░░░░░░\n" +
        "░░│  │░░░░░░░░░░░░░░░ ║ ░░░░░░░└──────┬───┘     ║   ┌──────┴──────────────────┐░  DEFENSE GRID\n" +
        "░░│  │░░░        ░░░┌─┴─┐░░░░░░░░░░░░ │ ░░░░░   ║ ░░│                         │░\n" +
        "░░│  │░░░        ░░░│   │░░░    ░░░░░ │ ░░░░░   ║ ░░│                         │░░   ░┌──────┐░░░░░░░░░░░░░░░░\n" +
        "░░│  │░░░        ░░░│   │░░░    ░░┌───┴───┐░░   └═══┤                         ├══════┤      │░░░░░░░░░░░░░░░░\n" +
        "░░│  │░░░        ░░░│   │░░░    ░░│       │░░     ░░│                         │░░   ░└──────┘░░░░░░░░░░░░░░░░\n" +
        "░░│  │░░░        ░░░│   │░░░    ░░│       │░░     ░░│                         │░\n" +
        "░░│  │░░░        ░░░└─┬─┘░░░    ░░└───────┘░░     ░░└───────────┬─────────────┘░───ELEVATOR 121F\n" +
        "░░└──┘░░░        ░░░░ ║ ░░░░    ░░░░░░░░░░░░░     ░░░░░░░░░░░░░ ║ ░░░░░░░░░░░░░░░░░░░░░░───ERROR 04S\n" +
        "░░░░░░░░░        ░░░░ ║ ░░░░░░░░░░░░░░░░░░░░░                   ║ \n" +
        "░░░░░░░░░░░░░░░░░░░┌──┴─┐░░░░░░░░░┌───────┐░░░░░░░░░░░░░░░░░░░░ ║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░ MAINFRAME COIL\n" +
        "░░░░░░░░░┌──┐░░░░░░│    │░░░░░░░░░│       │░░░░░░░░░┌───────────┴────────────┐░░   ░┌──────┐░░░░░░░░░░░\n" +
        "░░░░░░░░░│  ├══════┤    ├═════════┤       ├═════════┤                        ├══════┤      │░░░░░░░░░░░\n" +
        "░░░░░░░░░│  │░░░░░░│    │░░░░░░░░░│       │░░░░░░░░░│                        │░░   ░│      │░░░░░░░░░░░\n" +
        "░░░░░░░░░│  │░░░░░░└────┘░░░░░░░░░└──┬────┘░░░░░░░░░└────────────────────────┘░░   ░└──────┘░░░░░░░░░░░\n" +
        "░░░░░░░░░└──┘░░░░░░░░░░░░░░░░░░░░░░░ ║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  LOW-SIGNAL ZONE\n" +
        "░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║ ░░░░░░░░┌┐┌┬──┬┐┌┐┌──┐▒▒▒▒▒▒▒▒ [CYBER RELIC]\n" +
        "░░░░░░░░░░░┌─────────────────────────┴────┐░░░░│└┘│┌┐│││││┌┐│▒▒▒▒▒▒▒▒ ACCESS PANEL\n" +
        "░░░░░░░░░░░│                              │░░░░│┌┐│├┤│└┤└┤├┤│▒▒▒▒▒▒▒▒ NODE ARRAY\n" +
        "░░░░░░░░░░░└──────────────────────────────┘░░░░└┘└┴┘└┴─┴─┴┘└┘▒▒▒▒▒▒▒▒ SIGNAL TOMB\n" +
        "░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒\n" +
        "░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░";
    var CUSTOM_MAP_LINES = (Halla && Halla.CUSTOM_MAP_LINES) ? Halla.CUSTOM_MAP_LINES.slice() : mapString.split("\n");

    // In the original script, the background was a sub-layer of the player layer.
    // Let's restore that logic for correct visibility.
    var LAYER_PLAYER = Halla.LAYER_PLAYER || "Halla_Player";
    var LAYER_BG = LAYER_PLAYER + (typeof RLayer !== 'undefined' ? RLayer.getHierarchySeparator() : "|") + "BG";

    // Data o pozicích místností jsou nyní v `Halla.ROOM_CHAR_POS` (definováno v rooms.js)
    // pro lepší centralizaci dat.

    function getBaseMapLines() {
        // Preferuje `Halla.CUSTOM_MAP_LINES` pokud existuje a není prázdné,
        // jinak se vrátí k lokální `CUSTOM_MAP_LINES`.
        if (Halla && Halla.CUSTOM_MAP_LINES && Halla.CUSTOM_MAP_LINES.length > 0) {
            try {
                return Halla.CUSTOM_MAP_LINES.slice();
            } catch (e) {
                // ignore, fallback to default
            }
        }
        if (!CUSTOM_MAP_LINES || CUSTOM_MAP_LINES.length === 0) return ["NO MAP DATA"];
        return CUSTOM_MAP_LINES.slice();
    }

    function createLayerIfNotExists(doc, di, layerName, color) {
        if (!doc.hasLayer(layerName)) {
            // Ensure parent layer exists if this is a sub-layer
            var separator = typeof RLayer !== 'undefined' ? RLayer.getHierarchySeparator() : "|";
            if (layerName.indexOf(separator) > -1) {
                var parentName = layerName.substring(0, layerName.lastIndexOf(separator));
                if (parentName && !doc.hasLayer(parentName)) {
                    createLayerIfNotExists(doc, di, parentName);
                }
            }
            var layer = new RLayer(doc, layerName);
            if (color) layer.setColor(color); // Nastavíme barvu, pokud je definována
            var op = new RAddObjectOperation(layer, false);
            di.applyOperation(op);
        }
    }

    function ensureLayerAndGetId(layerName, color) {
        try {
            var di = EAction.getDocumentInterface(); if (!di) return -1;
            var doc = di.getDocument(); if (!doc) return -1;
            
            createLayerIfNotExists(doc, di, layerName, color);

            if (typeof doc.getLayerId === 'function') {
                return doc.getLayerId(layerName);
            }
            if (typeof doc.getLayer === 'function') {
                var layer = doc.getLayer(layerName);
                if (layer && typeof layer.getId === 'function') {
                    return layer.getId();
                }
            }
        } catch (e) {
            // ignore errors, return -1
        }
        return -1;
    }

    function zoomToMap(doc, di) {
        var layerNames = [LAYER_BG, (Halla.LAYER_PLAYER || "Halla_Player"), (Halla.LAYER_BOSS || "Halla_Boss")];
        var bbox = null;
        var anyValid = false;

        try {
            for (var ln = 0; ln < layerNames.length; ln++) {
                var layerId = doc.getLayerId(layerNames[ln]);
                if (layerId === -1) continue;

                var ids = doc.queryLayerEntities(layerId);
                if (isNull(ids) || ids.length === 0) continue;

                for (var i = 0; i < ids.length; i++) {
                    var e = doc.queryEntity(ids[i]);
                    if (!isNull(e)) {
                        var eb = e.getBoundingBox();
                        if (eb.isValid()) {
                            if (!anyValid) {
                                bbox = eb;
                                anyValid = true;
                            } else {
                                bbox.growToInclude(eb);
                            }
                        }
                    }
                }
            }

            if (anyValid && bbox && bbox.isValid()) {
                bbox.grow(5);
                di.zoomTo(bbox);
            }
        } catch (e) {
            // Fallback if bounding box logic fails
            try { di.zoomToAuto(); } catch (e2) { /* ignore */ }
        }
    }

    /**
     * Aktualizuje masku objevené mapy (Fog of War) kolem pozice hráče.
     */
    function updateExplorationMask(gs, playerPos, mapLines) {
        if (!gs.explorationMask) {
            gs.explorationMask = [];
        }

        // Poloměr viditelnosti (elipsa)
        var radX = 18;
        var radY = 10;

        var startY = Math.max(0, playerPos.y - radY);
        var endY = Math.min(mapLines.length, playerPos.y + radY);

        for (var y = startY; y < endY; y++) {
            var lineLen = mapLines[y].length;
            if (!gs.explorationMask[y]) gs.explorationMask[y] = []; // Inicializace řádku

            var startX = Math.max(0, playerPos.x - radX);
            var endX = Math.min(lineLen, playerPos.x + radX);

            for (var x = startX; x < endX; x++) {
                var dx = x - playerPos.x;
                var dy = y - playerPos.y;
                // Rovnice elipsy pro odhalení oblasti <= 1.0
                if ((dx * dx) / (radX * radX) + (dy * dy) / (radY * radY) <= 1.0) {
                    gs.explorationMask[y][x] = true;
                }
            }
        }
    }

    function generateAsciiMap() {
        var y, x;
        var gs = Halla.gameState;
        if (!gs) return null;

        var baseMap = getBaseMapLines();
        var playerLines = [];

        for (y = 0; y < baseMap.length; y++) {
            // Bezpečnější náhrada za .repeat() a kontrola délky řádku
            var emptyLine = "";
            var len = (baseMap[y]) ? baseMap[y].length : 0;
            for (var k = 0; k < len; k++) emptyLine += " ";
            playerLines.push(emptyLine);
        }

        // --- FOG OF WAR: Aktualizace masky ---
        var pos = (gs.currentRoom && Halla.ROOM_CHAR_POS) ? Halla.ROOM_CHAR_POS[gs.currentRoom] : null;

        if (pos && playerLines[pos.y]) {
            // Pokud nejsme v replayi (kamery vidí vše), aktualizujeme mlhu
            if (!gs.isReplay) {
                updateExplorationMask(gs, pos, baseMap);
            }

            var rowChars = playerLines[pos.y].split("");
            if (pos.x >= 0 && pos.x < rowChars.length) {
                var playerChar = (Halla.MAP_SYMBOLS && Halla.MAP_SYMBOLS.player) ? Halla.MAP_SYMBOLS.player : "@";
                if (gs.ivcaBuffTurns > 0) {
                    playerChar = Halla.MAP_SYMBOLS.player_ivca;
                } else if (gs.hasJindra) {
                    playerChar = Halla.MAP_SYMBOLS.player_jindra;
                } else if (Halla.hasItemInInventory("Kočka")) {
                    playerChar = Halla.MAP_SYMBOLS.player_cat;
                }
                rowChars[pos.x] = playerChar;
            }
            playerLines[pos.y] = rowChars.join("");
        }

        // Oprava: Přístup k datům bosse přes novou strukturu gameState.boss
        var bossState = gs.boss || {};
        var playerClass = Halla.getPlayerClass ? Halla.getPlayerClass() : null;
        var visibilityMod = (playerClass && playerClass.bossVisibilityMod) ? playerClass.bossVisibilityMod : 3; // Výchozí hodnota 3

        // Nová podmínka pro permanentní viditelnost bosse
        var isKrysaWithStopar = (gs.playerClassId === "kancelarska_krysa" && Halla.hasPerk("stopar"));

        var showBoss = bossState.active && bossState.room && (
            gs.isReplay ||                                   // V replay módu vidíme vše
            (bossState.turnCounter % visibilityMod === 0) || // Standardní viditelnost
            Halla.hasItemInInventory("Kočka") ||             // Viditelnost díky kočce
            isKrysaWithStopar                                // Nové: Kancelářská krysa s perkem Stopař
        );

        var bossPos = null;
        var bossChar = Halla.MAP_SYMBOLS.boss;

        if (showBoss) {
            var bp = Halla.ROOM_CHAR_POS[bossState.room];
            if (bp) {
                bossPos = { x: bp.x, y: bp.y };
                // Oprava: Přístup k 'rage' stavu přes bossState
                if (bossState.rage) {
                    bossChar = Halla.MAP_SYMBOLS.boss_rage;
                }
            }
        }

        // Boss
        if (showBoss && bossPos) {
            var bossRow = playerLines[bossPos.y].split("");
            var currentSymbol = bossRow[bossPos.x];
            // Kreslíme bosse, jen pokud místo není obsazeno hráčem.
            if (currentSymbol === " ") {
                bossRow[bossPos.x] = bossChar;
                playerLines[bossPos.y] = bossRow.join("");
            }
        }

        // Unikátní NPC
        var uniqueNpcState = gs.uniqueNpc || {};
        var showUniqueNpc = uniqueNpcState.activeNpcId && uniqueNpcState.room && (gs.isReplay || (uniqueNpcState.turnCounter % 3 === 0));
        var uniqueNpcPos = null;
        var uniqueNpcChar = Halla.MAP_SYMBOLS.unique_npc;

        if (showUniqueNpc) {
            var npcId = uniqueNpcState.activeNpcId;
            var npcData = Halla.UNIQUE_NPCS[npcId];
            var npcRoomPos = Halla.ROOM_CHAR_POS[uniqueNpcState.room];
            if (npcData && npcRoomPos && npcData.char) {
                uniqueNpcPos = { x: npcRoomPos.x, y: npcRoomPos.y };
                uniqueNpcChar = npcData.char;
            }
        }

        // Vykreslení unikátního NPC
        if (showUniqueNpc && uniqueNpcPos) {
            var npcRow = playerLines[uniqueNpcPos.y].split("");
            var currentSymbol = npcRow[uniqueNpcPos.x];
            // Kreslíme NPC, jen pokud místo není obsazeno hráčem.
            if (currentSymbol === " ") {
                npcRow[uniqueNpcPos.x] = uniqueNpcChar;
                playerLines[uniqueNpcPos.y] = npcRow.join("");
            }
        }

        // Michal
        if (gs.hasMichal && gs.michalRoom) {
            var michalPos = Halla.ROOM_CHAR_POS[gs.michalRoom];
            if (michalPos) {
                var michalRow = playerLines[michalPos.y].split("");                
                var currentSymbol = michalRow[michalPos.x];
                if (currentSymbol === " ") {
                    michalRow[michalPos.x] = Halla.MAP_SYMBOLS.michal;
                    playerLines[michalPos.y] = michalRow.join("");
                }
            }
        }

        // ID Karta
        // Nová logika pro hledání itemů v gs.itemLocations
        var idCardRoom = null;
        for (var roomName in gs.itemLocations) {
            if (Halla.hasItem(gs.itemLocations[roomName], "ID karta")) {
                idCardRoom = roomName;
                break;
            }
        }
        if (idCardRoom) {
            var cardPos = Halla.ROOM_CHAR_POS[idCardRoom];
            if (cardPos && playerLines[cardPos.y]) {
                var cardRow = playerLines[cardPos.y].split('');
                if (cardRow[cardPos.x] === ' ') {
                    cardRow[cardPos.x] = '💳'; // Symbol pro ID kartu
                    playerLines[cardPos.y] = cardRow.join('');
                }
            }
        }

        // --- FOG OF WAR: Aplikace masky na pozadí ---
        var maskedBgLines = [];
        for (y = 0; y < baseMap.length; y++) {
            // V replay módu vidíme celou mapu, jinak aplikujeme masku
            if (gs.isReplay) {
                maskedBgLines.push(baseMap[y]);
            } else {
                var line = baseMap[y];
                var maskedLine = "";
                for (x = 0; x < line.length; x++) {
                    if (gs.explorationMask && gs.explorationMask[y] && gs.explorationMask[y][x]) {
                        maskedLine += line[x];
                    } else {
                        maskedLine += " "; // Neobjevená oblast = mezera (tma)
                    }
                }
                maskedBgLines.push(maskedLine);
            }
        }

        return {
            background: maskedBgLines.join("\n"),
            player: playerLines.join("\n")
        };
    }

    function drawAsciiMapToCanvas(mapData) {
        var di = EAction.getDocumentInterface(); if (!di) return;
        var doc = di.getDocument(); if (!doc) return;
        var gs = Halla.gameState; if (!gs) return false;

        var bgLayerId = ensureLayerAndGetId(LAYER_BG, new RColor(150, 150, 150)); // Používáme lokální LAYER_BG
        var playerLayerId = ensureLayerAndGetId(LAYER_PLAYER, new RColor(100, 255, 100)); // Používáme lokální LAYER_PLAYER

        if (!mapData) mapData = generateAsciiMap();
        if (!mapData || !mapData.background || !mapData.player) return false;

        var delOp = new RDeleteObjectsOperation();
        var idsToDelete = [gs.mapBackgroundEntityId, gs.mapPlayerEntityId];
        var somethingToDelete = false;
        for (var i = 0; i < idsToDelete.length; i++) {
            var id = idsToDelete[i];
            if (typeof id === "number" && id !== -1) {
                var e = doc.queryEntity(id);
                if (e && e.isValid()) {
                    delOp.deleteObject(e);
                    somethingToDelete = true;
                }
            }
        }
        if (somethingToDelete) di.applyOperation(delOp);

        var addOp = new RAddObjectsOperation();
        var newBgEntity, newPlayerEntity = null;

        var mapLines = getBaseMapLines();
        var totalHeight = mapLines.length * Halla.MAP_TEXT_HEIGHT;
        var basePos = new RVector(Halla.MAP_ORIGIN_X, Halla.MAP_ORIGIN_Y + totalHeight);

        var textConstructorArgs = [
            basePos, basePos, Halla.MAP_TEXT_HEIGHT, 0, RS.VAlignTop, RS.HAlignLeft,
            RS.LeftToRight, RS.Exact, 1.0, "", Halla.FONT_NAME, false, false, 0.0, false
        ];

        // Background
        var bgArgs = textConstructorArgs.slice();
        bgArgs[9] = mapData.background;
        var bgData = new RTextData(bgArgs[0], bgArgs[1], bgArgs[2], bgArgs[3], bgArgs[4], bgArgs[5], bgArgs[6], bgArgs[7], bgArgs[8], bgArgs[9], bgArgs[10], bgArgs[11], bgArgs[12], bgArgs[13], bgArgs[14]);
        newBgEntity = new RTextEntity(doc, bgData);
        newBgEntity.setLayerId(bgLayerId);
        newBgEntity.setColor(new RColor(150, 150, 150));
        addOp.addObject(newBgEntity, false);

        // Player
        var playerArgs = textConstructorArgs.slice();
        playerArgs[9] = mapData.player;
        var playerData = new RTextData(playerArgs[0], playerArgs[1], playerArgs[2], playerArgs[3], playerArgs[4], playerArgs[5], playerArgs[6], playerArgs[7], playerArgs[8], playerArgs[9], playerArgs[10], playerArgs[11], playerArgs[12], playerArgs[13], playerArgs[14]); // This line is correct, the error is in the next one
        newPlayerEntity = new RTextEntity(doc, playerData);
        newPlayerEntity.setLayerId(playerLayerId);
        newPlayerEntity.setColor(new RColor(100, 255, 100));
        addOp.addObject(newPlayerEntity, false);

        di.applyOperation(addOp);

        gs.mapBackgroundEntityId = newBgEntity.getId();
        gs.mapPlayerEntityId = newPlayerEntity.getId();

        di.regenerateScenes();
        zoomToMap(doc, di);

        return true;
    }

    Halla.generateAsciiMap = generateAsciiMap; Halla.drawAsciiMapToCanvas = drawAsciiMapToCanvas; Halla.ensureLayerAndGetId = ensureLayerAndGetId; Halla.zoomToMap = zoomToMap;

})(this);
