// scripts/Halla/Halla/core/turn.js
// Hlavní tah hry + gameLoop.
// Orchestrace: UI -> akce -> advanceWorldOneTurn -> render.
(function () {
    "use strict";
    // Bezpečná reference na globální jmenný prostor
    var Halla = this.Halla || (this.Halla = {});

    // --------------------------------------
    //   COMMAND HANDLERS (Data-driven design)
    // --------------------------------------

    /**
     * Pomocná funkce pro vstup do tajné místnosti.
     * @returns {boolean} True, pokud byl vstup úspěšný.
     */
    function _enterSecretRoom() {
        var gs = Halla.gameState;
        if (gs.currentRoom === "chodba_ovr" &&
            Halla.hasItemInInventory("Kočka") &&
            Halla.hasItemInInventory("Diplom")) {

            var nextRoomId = "tajna_mistnost";
            gs.currentRoom = nextRoomId;
            return true;
        }
        Halla.showWarning("Zatím nevíš, jak tudy projít.\nMožná potřebuješ víc koček nebo papírů.");
        return false;
    }

    /**
     * Pomocná funkce pro sebrání předmětu z místnosti.
     * @param {string} itemName - Název předmětu k sebrání.
     * @returns {string|boolean} Název sebraného předmětu nebo false.
     */
    function _takeItem(itemName) {
        var gs = Halla.gameState;
        var room = Halla.rooms[gs.currentRoom];
        var targetNorm = Halla.normalizeString(itemName);

        var dynamicItems = gs.itemLocations && gs.itemLocations[gs.currentRoom];
        if (dynamicItems) {
            for (var i = dynamicItems.length - 1; i >= 0; i--) {
                if (Halla.normalizeString(dynamicItems[i]) === targetNorm) {
                    var item = dynamicItems.splice(i, 1)[0];

                    // Pokud je to dynamický item, neukládáme ho do inventáře, ale do speciálního slotu
                    if (Halla.DYNAMIC_ITEMS && Halla.DYNAMIC_ITEMS[item]) {
                        gs.dynamicItemLocations[item] = "inventory"; // Označíme, že ho má hráč
                        return item; // Vracíme název itemu (truthy), aby volající věděl, že akce proběhla
                    }

                    Halla.giveItemToInventory(item);
                    return item;
                }
            }
        }

        return false;
    }

    var COMMANDS = {
        "konec": function(target) {
            Halla.gameState.running = false;
            return { advanceTurn: false };
        },
        "denik": function(target) {
            return Halla.runUiAction(function() {
                if (typeof Halla.showJournalDialog === "function") Halla.showJournalDialog();
                else Halla.showInfo("Deník není k dispozici. (chybí journal.js)");
            });
        },
        "jdi": function(target) {
            var gs = Halla.gameState;
            var room = Halla.rooms[gs.currentRoom];
            var normDir = Halla.normalizeString(target);

            if (normDir === "tajne") { // Z historických důvodů
                return { advanceTurn: _enterSecretRoom(), actionType: "move" };
            }

            if (room.exits && room.exits[normDir]) {
                var nextRoomId = room.exits[normDir];

                // --- Kontrola zamčených místností ---
                var GATED_ROOMS = ["vestibul_ovr", "denni_mistnost"];
                if (GATED_ROOMS.indexOf(nextRoomId) !== -1 && !Halla.hasItemInInventory("ID karta")) {
                    Halla.showWarning("Vstup je pouze na ID kartu. Musíš ji nejdřív najít.");
                    return { advanceTurn: false };
                }

                gs.currentRoom = nextRoomId;

                // --- NOVĚ: Triggery při vstupu (questy/NPC/perky/počítadla) ---
                // Voláme až po úspěšném přesunu do nové místnosti.
                if (typeof Halla.handleRoomEntryEvents === "function") {
                    Halla.handleRoomEntryEvents();
                }

                // Kameníkův zásek
                if (nextRoomId === "dilna_vyroba" && gs.hasJindra && !gs.kamenikUsed) {
                    gs.kamenikUsed = true;
                    Halla.showInfo("S Jindrou vkročíte do dílny výroby a zdrží vás pan Kameník.\n" +
                                   "Zatímco se vykecáváte, boss znejistí a na chvilku se uklidnil.");

                    // Nastavíme bossovi, aby se 2 kola vzdaloval
                    if (gs.boss && gs.boss.active) {
                        gs.boss.retreatTurns = 2;
                    }

                    // Šance 33 % na nalezení předmětu
                    if (Math.random() < 0.33) {
                        var foundItem = Halla.randomFromArray(Halla.JUNK_ITEMS);
                        if (foundItem) {
                            Halla.giveItemToInventory(foundItem);
                            Halla.showInfo("Mezitím, co se nikdo nedíval, jsi ze stolu sebral: " + foundItem);
                        }
                    }

                    // Zdržíme hráče na dvě kola, během kterých se boss bude vzdalovat
                    for (var kk = 0; kk < 2 && gs.running; kk++) {
                        Halla.advanceWorldOneTurn("wait");
                    }
                    return { advanceTurn: false }; // Svět už pokročil, takže tento tah neposouvá svět znovu
                }
                return { advanceTurn: true, actionType: "move" };
            }

            Halla.showWarning("Tudy cesta nevede.");
            return { advanceTurn: false };
        },
        "tajny": function(target) { // Pro volbu ze seznamu
            return { advanceTurn: _enterSecretRoom(), actionType: "move" };
        },
        "vezmi": function(target) {
            var takenItem = _takeItem(target);
            if (takenItem) {
                Halla.gameState.stats.itemsPicked = (Halla.gameState.stats.itemsPicked || 0) + 1;
                Halla.showInfo("Vzal jsi: " + takenItem);
                if (takenItem === "Diplom" && !Halla.hasPerk("OVRmind")) {
                    Halla.showInfo("Diplom ti otevírá dveře k vyššímu utrpení...");
                }

                // Zkontrolujeme, zda sebraný předmět není zbytečný (pro achievement)
                if (Halla.JUNK_ITEMS && Halla.JUNK_ITEMS.indexOf(takenItem) !== -1) {
                    var gs = Halla.gameState;
                    gs.stats.pickedJunkItem = true;

                    // Logika pro získání perku "Šroťák"
                    if (!Halla.hasPerk("srotak")) {
                        if (!gs.stats.junkItemsPicked) {
                            gs.stats.junkItemsPicked = new Object();
                        }
                        gs.stats.junkItemsPicked[takenItem] = true;

                        var uniqueJunkCount = Object.keys(gs.stats.junkItemsPicked).length;
                        if (uniqueJunkCount >= Halla.BALANCE.scroungerPerkRequirement) {
                            Halla.grantPerk("srotak", true);
                            if (typeof Halla.journalAddPerk === "function") {
                                Halla.journalAddPerk("srotak");
                            }
                            Halla.showInfo(
                                "Prohrabávání se v harampádí ti vytříbilo zrak.\nZískáváš perk 'Šroťák'!"
                            );
                        }
                    }
                }

            } else {
                Halla.showWarning("Tenhle předmět tu není.");
            }
            return { advanceTurn: false }; // Sebrání itemu neposouvá tah
        },
        "cekej": function(target) {
            Halla.showInfo("Rozhodl ses jen stát a existovat.\nSvět se mezitím hýbe dál.");
            return { advanceTurn: true, actionType: "wait" };
        },
        "naslouchej": function(target) {
            var gs = Halla.gameState;
            var msg;
            if (!gs.boss.active || !gs.boss.room) {
                msg = "Zaposloucháš se… ale slyšíš jen vrnění ventilátorů a tiché zoufalství.";
            } else {
                var dist = Halla.estimateDistanceToBoss(gs.currentRoom, gs.boss.room);
                if (dist < 0) msg = "Boss je někde v labyrintu, ale nemáš ponětí kde.";
                else if (dist === 0) msg = "Je přímo s tebou. Pokud tohle čteš, máš problém.";
                else if (dist <= 2) msg = "Cítíš jeho přítomnost.\nBoss je hodně blízko.";
                else if (dist <= 4) msg = "Někde poblíž v hale něco tiše číhá.\nBoss je ve střední vzdálenosti.";
                else msg = "Zvuky jsou tlumené.\nBoss je dost daleko… zatím.";

                // Logika pro získání perku "Stopař"
                if (!Halla.hasPerk("stopar")) {
                    gs.stats.listenCount = (gs.stats.listenCount || 0) + 1;
                    if (gs.stats.listenCount >= Halla.BALANCE.trackerPerkRequirement) {
                        Halla.grantPerk("stopar", true);
                        if (typeof Halla.journalAddPerk === "function") {
                            Halla.journalAddPerk("stopar");
                        }
                        Halla.showInfo(
                            "Neustálé naslouchání ti zostřilo sluch.\nZískáváš perk 'Stopař'!"
                        );
                    }
                }

                // Efekt perku "Stopař" nebo třídy "Kancelářská krysa"
                var cls = (Halla.getPlayerClass ? Halla.getPlayerClass() : null);
                if ((cls && cls.betterListen) || Halla.hasPerk("stopar")) {
                    msg += "\n\n(Jako kancelářský mág odhaduješ vzdálenost na " + dist + " kroků.)";
                }
            }
            Halla.showInfo("Zaposloucháš se do šumu Hally.\n\n" + msg);
            return { advanceTurn: true, actionType: "listen" };
        },
        "rozhlidni": function(target) {
            return Halla.runUiAction(function() { _handleLookAround(); });
        }
    };

    // Přidáme nový příkaz "vypit"
    COMMANDS["vypit"] = function(target) {
        var gs = Halla.gameState;
        var normTarget = Halla.normalizeString(target);

        var consumable = null;
        if (normTarget === Halla.normalizeString("Láhev rumu")) {
            consumable = { name: "Láhev rumu", heal: Halla.BALANCE.rumHealAmount };
        } else if (normTarget === Halla.normalizeString("Mega kafe")) {
            consumable = { name: "Mega kafe", heal: Halla.BALANCE.megaKafeHealAmount };
        }

        if (!consumable) {
            Halla.showWarning("Tohle se pít nedá.");
            return { advanceTurn: false };
        }

        if (!gs.dynamicItemLocations || gs.dynamicItemLocations[consumable.name] !== "inventory") {
            Halla.showWarning("Nemáš u sebe žádný " + consumable.name + ".");
            return { advanceTurn: false };
        }

        Halla.changeHealth(consumable.heal, consumable.name);
        delete gs.dynamicItemLocations[consumable.name]; // Odebereme z "inventáře"
        Halla.showInfo("Vypil jsi " + consumable.name + ". Cítíš se o poznání lépe.\n+" + consumable.heal + " HP.");

        gs.stats.itemUsed = true; // Příznak pro achievement "Přežití o suchu"
        if (consumable.name === "Láhev rumu") {
            gs.stats.rumUsedCount = (gs.stats.rumUsedCount || 0) + 1;
        }

        // Respawn dynamického předmětu
        if (Halla.DYNAMIC_ITEMS[consumable.name]) {
            var itemData = Halla.DYNAMIC_ITEMS[consumable.name];
            if (itemData.spawnRooms && itemData.spawnRooms.length > 0) {
                var newRoom = Halla.randomFromArray(itemData.spawnRooms);
                gs.dynamicItemLocations[consumable.name] = newRoom;
                Halla.showInfo("Někde v hale se objevil další " + consumable.name + ".");
            }
        }

        Halla.showInfo("Chvíli ti trvá, než se zorientuješ.");
        return { advanceTurn: true, actionType: "wait" }; // Vypití rumu stojí tah
    };

    // --------------------------------------
    //   HLAVNÍ TAH
    // --------------------------------------

    Halla.performGameTurn = function (callbacks) {
        var gs = Halla.gameState;
        if (!gs) return;

        if (gs.isTurnInProgress) return;

        if (!gs.running) {
            Halla.showInfo("Hra byla ukončena.");
            return;
        }

        gs.isTurnInProgress = true;

        // --- Akce při prvním kole ---
        // Mapa je již vykreslena v main.js. Zde pouze zajistíme AutoZoom.
        if (gs.isFirstTurn) {
            if (typeof Halla.zoomToMap === "function") {
                Halla.zoomToMap();
            }
            // Tento příznak zajistí, že se mapa nepřekreslí znovu až do dalšího tahu.
            gs.isFirstTurn = false;
        }

        var room = Halla.rooms[gs.currentRoom];
        if (!room) {
            gs.running = false;
            gs.isTurnInProgress = false;
            return;
        }

        // POZOR: `gs.revealedRooms = {}` je v QtScript nebezpečné.
        if (!gs.revealedRooms) {
            gs.revealedRooms = new Object();
        }
        var roomRevealed = !!gs.revealedRooms[gs.currentRoom];

        // --- Win Condition: Sestrojení svítidla ---
        if (room.win && Halla.getUltimateItemCount(gs.inventory) === Halla.ULTIMATE_ITEMS.length) {
            gs.running = false; // Ukončíme hru
            var winMessage = "KONEC: VÍTĚZSTVÍ\n\n\n" +
                         "S posledními zbytky sil jsi sestrojil ultimátní svítidlo." +
                         "Světlo zalije místnost a ty víš, že jsi to dokázal.\n" +
                         "Sestrojil jsi ultimátní svítidlo.\n" +
                         "Vyhrál jsi. GRATULUJI!\n" +
                         "Tato herní hříčka je takový dárek pro R&D.\n" +
                         "A s tímto se s Vámi loučím. Mějte se fajn!\n" +
                         "Made by Michal Zachara (c) 2025 Halla Labs";
 
            if (typeof Halla.showWinDialog === "function") {
                Halla.showWinDialog(Halla.GAME_TITLE + " – Vítězství!", winMessage);
            }
            Halla.endGameWithSummary(""); // Po zavření dialogu se zobrazí rekapitulace
            gs.isTurnInProgress = false;
            return;
        }

        // --- Střet s Michalem ---
        if (gs.hasMichal && gs.currentRoom === gs.michalRoom) {
            Halla.showInfo("Konečně jsi dostihl Michala! Zastaví se a vyčerpaně na tebe hledí.");
            gs.hasMichal = false; // Michal je dopaden

            // Šance na speciální konec
            if (Math.random() < (Halla.BALANCE.michalEndingChance || 0.33)) {
                if (typeof Halla.triggerMichalEnding === "function") {
                    Halla.triggerMichalEnding();
                    gs.isTurnInProgress = false;
                    return;
                }
            }

            // Pokud konec nenastal, uděl perk a Michal uteče
            Halla.showInfo(
                "Michal ti s povzdechem předá tajemství rychlých nohou a řekne: 'Dík za vysvobození, kámo.'\n" +
                "Než se naděješ, zmizí ti z očí. Utekl domů.\n\nZískáváš perk 'Štvanice'!"
            );
            Halla.grantPerk("stvanice");
        }

        // --- setkání s unikátním NPC ---
        if (typeof Halla.handleUniqueNpcEncounter === "function") {
            Halla.handleUniqueNpcEncounter();
        }

        // --- endingy, co se mohou stát hned po vstupu ---
        if (typeof Halla.checkSpecialEndings === "function") {
            Halla.checkSpecialEndings();
            if (!gs.running) {
                gs.isTurnInProgress = false;
                return;
            }
        }

        // --- popis ---
        var desc = "";
        desc += "========================================\n";
        desc += "Lokace: " + gs.currentRoom + "\n\n";
        desc += room.description;

        if (typeof Halla.getAmbientMessageOrEmpty === "function") {
            desc += Halla.getAmbientMessageOrEmpty();
        }

        desc += "\n\nHP: " + gs.health + "/" + gs.maxHealth + "\n";

        // Zobrazení všech itemů v místnosti (statické + dynamické)
        if (roomRevealed) {
            var allItemsInRoom = [];
            if (gs.itemLocations && gs.itemLocations[gs.currentRoom]) {
                allItemsInRoom = allItemsInRoom.concat(gs.itemLocations[gs.currentRoom]);
            }

            if (allItemsInRoom.length > 0) {
                desc += "\nVidíš zde: " + allItemsInRoom.join(", ");
            }
        }

        if (gs.inventory && gs.inventory.length > 0) {
            var displayInv = [];
            for (var i = 0; i < gs.inventory.length; i++) {
                displayInv.push(Halla.ITEM_DISPLAY_NAMES[gs.inventory[i]] || gs.inventory[i]);
            }
            desc += "\n\nV inventáři máš: " + displayInv.join(", ");
        }
        // Zobrazení dynamických předmětů v "inventáři"
        var dynamicHeldItems = [];
        for (var dItem in gs.dynamicItemLocations) {
            if (gs.dynamicItemLocations[dItem] === "inventory") dynamicHeldItems.push(dItem);
        }
        if (dynamicHeldItems.length > 0) {
            desc += (gs.inventory.length > 0 ? ", " : "\n\nV inventáři máš: ") + dynamicHeldItems.join(", ");
        }

        // --- choices ---
        var choices = [];

        // secret volba
        if (gs.currentRoom === "chodba_ovr" &&
            Halla.hasItemInInventory("Kočka") &&
            Halla.hasItemInInventory("Diplom")) {
            choices.push("tajny vstup");
        }

        // pickup volby jen pokud je room revealed
        if (roomRevealed) {
            var allItemsForPickup = [];
            if (gs.itemLocations && gs.itemLocations[gs.currentRoom]) {
                allItemsForPickup = allItemsForPickup.concat(gs.itemLocations[gs.currentRoom]);
            }

            if (allItemsForPickup.length > 0) {
                for (var i = 0; i < allItemsForPickup.length; i++) {
                    // Odstraníme duplicity, pokud by se náhodou vyskytly
                    if (choices.indexOf("vezmi " + allItemsForPickup[i]) === -1) {
                        choices.push("vezmi " + allItemsForPickup[i]);
                    }
                }
            }
        }

        choices.push("rozhlidni se");
        choices.push("cekej");
        choices.push("naslouchej bossovi");
        choices.push("denik");
        choices.push("konec");

        // --- dialog ---
        var command = Halla.getGameCommandDialog(desc, choices, room);

        var advanceTurn = true;

        if (!command) {
            gs.running = false;
            advanceTurn = false;
        } else {
            var parts = String(command).split(" ");
            var action = parts[0];
            var target = parts.slice(1).join(" ");

            var handler = COMMANDS[action];
            if (typeof handler === "function") {
                var result = handler(target);
                advanceTurn = result.advanceTurn;
                // Vykreslíme mapu, pouze pokud se posunul tah a nejedná se o první kolo
                // (v prvním kole se mapa vykreslila už v main.js).
                if (gs.running && advanceTurn && !gs.isFirstTurn) {
                    // Posuneme svět...
                    Halla.advanceWorldOneTurn(result.actionType);

                    // Pokud hra skončila během tahu světa (např. smrt -> rekapitulace),
                    // nemusíme už nic dělat, jen zajistíme překreslení pro finální stav.
                    if (!gs.running) {
                        // Pokračujeme níže k vykreslení, ale logika je bezpečná
                    }

                    // Zaznamenáme stav pro replay (po pohybu světa)
                    if (typeof Halla.recordReplayFrame === "function") {
                        Halla.recordReplayFrame();
                    }
                    // ...a až potom vykreslíme nový stav na mapu.
                    if (typeof Halla.drawAsciiMapToCanvas === "function") {
                        var mapLines = Halla.generateAsciiMap();
                        if (mapLines) Halla.drawAsciiMapToCanvas(mapLines);
                    }
                } else if (gs.running && advanceTurn && gs.isFirstTurn) {
                    // V prvním kole jen posuneme svět, mapa se překreslí až v dalším cyklu.
                    Halla.advanceWorldOneTurn(result.actionType);
                    
                    // Zaznamenáme stav i po prvním tahu, aby nebyl v replayi přeskočen.
                    if (typeof Halla.recordReplayFrame === "function") {
                        Halla.recordReplayFrame();
                    }
                }
            } else {
                advanceTurn = false;
            }
        }
        gs.isTurnInProgress = false;

        var actionType = (result && result.actionType) ? result.actionType : null;

        // Zavoláme onTurnEnd callback, pokud existuje (pro pohyb roaming NPC atd.)
        if (callbacks && typeof callbacks.onTurnEnd === 'function') {
            callbacks.onTurnEnd(actionType);
        }
    };

    // --------------------------------------
    //   GAME LOOP – NEREKURZIVNÍ
    // --------------------------------------

    Halla.gameLoop = function (callbacks) {
        if (!Halla.gameState) {
            Halla.resetGame();
        }

        if (typeof Halla.updateHealthHearts === "function") {
            Halla.updateHealthHearts();
        }

        var extraTurn;
        do {
            extraTurn = false;
            while (Halla.gameState && Halla.gameState.running) {
                // Zavoláme onTurnStart callback, pokud existuje
                if (callbacks && typeof callbacks.onTurnStart === 'function') {
                    callbacks.onTurnStart();
                }
                if (!Halla.gameState.running) break; // onTurnStart mohl ukončit hru
                Halla.performGameTurn(callbacks);
            }
            // Zkontrolujeme perk "Štvanice" pro případný tah zdarma a případně spustíme další kolo.
            extraTurn = Halla.gameState && Halla.gameState.running && Halla.checkStvanicePerk && Halla.checkStvanicePerk();
        } while (extraTurn);
    };

    /**
     * Zpracovává logiku pro akci "rozhlidni se".
     * @private
     */
    function _handleLookAround() {
        var gs = Halla.gameState;
        gs.revealedRooms[gs.currentRoom] = true;

        // Speciální případ: automat v chodbě
        if (gs.currentRoom === "chodba_ovr") {
            if (Halla.hasItemInInventory("mince")) {
                Halla.showInfo("Rozhlédneš se... V rohu stojí výherní automat a opírá se o něj Vojta.");
                var yes = Halla.askYesNo(Halla.GAME_TITLE + " – Automat", "Chceš hodit Minci do automatu?", "Ano", "Ne");
                if (yes) {
                    if (typeof Halla.playSlotMachine === "function") Halla.playSlotMachine();
                    else Halla.showInfo("Automat nefunguje. (chybí slotMachine.js)");
                }
            } else {
                Halla.showInfo("Rozhlédneš se po chodbě OVR. Automat tam stojí, ale bez Mince je ti k ničemu.");
            }
            return; // Konec specifické logiky
        }

        // Obecné rozhlédnutí
        var extra = Halla.getAmbientMessageOrEmpty ? Halla.getAmbientMessageOrEmpty() : "";
        if (extra === "") {
            extra = "\n\nNic zvláštního nevidíš. Jen další den v práci.";
        }

        var allItemsInRoom = (gs.itemLocations && gs.itemLocations[gs.currentRoom])
            ? gs.itemLocations[gs.currentRoom].slice()
            : [];

        if (allItemsInRoom.length > 0) {
            extra += "\n\nPo chvíli pátrání si všimneš:\n- " + allItemsInRoom.join("\n- ");
        }

        Halla.showInfo("Rozhlédneš se kolem sebe." + extra);

        // Efekt perku "Šroťák"
        if (Halla.hasPerk("srotak") && Math.random() < Halla.BALANCE.scroungerPerkChance) {
            var roomItems = gs.itemLocations[gs.currentRoom] || [];
            if (roomItems.length < Halla.MAX_ITEMS_PER_ROOM) {
                // Najdeme zbytečný předmět, který ještě není v místnosti
                var availableJunk = Halla.JUNK_ITEMS.filter(function(junk) {
                    return roomItems.indexOf(junk) === -1;
                });

                if (availableJunk.length > 0) {
                    var foundItem = Halla.randomFromArray(availableJunk);
                    gs.itemLocations[gs.currentRoom].push(foundItem);
                    Halla.showInfo(
                        "Díky svému vycvičenému oku (perk Šroťák) sis všiml něčeho dalšího: " + foundItem
                    );
                }
            }
        }
    }


})();
