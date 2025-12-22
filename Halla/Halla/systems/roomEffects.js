// scripts/Halla/Halla/systems/roomEffects.js
// Heal / damage podle místnosti (env), včetně perků a Ivča buffu.

(function () {
    // Bezpečná reference na globální jmenný prostor
    var Halla = this.Halla || (this.Halla = {});

    Halla.applyRoomEffects = function () {
        var gs = Halla.gameState;
        if (!gs) return;

        var room = Halla.rooms[gs.currentRoom];
        if (!room) return;

        var BALANCE = Halla.BALANCE;
        var messages = [];
        var healthDelta = 0;
        var oldHealth = gs.health;

        // Získání modifikátorů z hráčovy třídy
        var cls = (typeof Halla.getPlayerClass === "function") ? Halla.getPlayerClass() : null;
        var healMul = (cls && cls.healMul) ? cls.healMul : 1.0;
        var envMul  = (cls && cls.envDamageMul) ? cls.envDamageMul : 1.0;

        // -----------------
        // VÝPOČET LÉČENÍ
        // -----------------
        if (room.heal && room.heal > 0) {
            // Nová logika: Generuje náhodné léčení v rozsahu definovaném v config.js
            var randomHeal = BALANCE.roomDefaultHealMin + Math.floor(Math.random() * (BALANCE.roomDefaultHealMax - BALANCE.roomDefaultHealMin + 1));
            
            // Aplikujeme násobiče
            var baseHeal = Math.floor(randomHeal * BALANCE.roomHealBaseMul * healMul);
            
            // Aplikace perku 'coffeeBoost'
            if (Halla.hasPerk("coffeeBoost")) {
                baseHeal = Math.floor(baseHeal * BALANCE.coffeeBoostHealMul);
            }

            if (baseHeal > 0) {
                healthDelta += baseHeal;
                // Zpráva se liší podle toho, jestli je to kuchyňka nebo jiná healovací místnost
                if (gs.currentRoom === "kuchynka_ovr") {
                    messages.push("Uvařil sis kafe a na chvíli vypnul. +" + baseHeal + " HP.");
                } else {
                    messages.push("Našel jsi klidný kout a trochu si odpočinul. +" + baseHeal + " HP.");
                }
            }
        }

        // Bonus za kouření v kuřárně
        if (gs.currentRoom === "kurarna" &&
            Halla.hasItemInInventory("Krabička cigaret") &&
            Halla.hasItemInInventory("Zapalovač")) {

            var cigHeal = Math.floor(BALANCE.kurarnaHealBase * BALANCE.kurarnaHealMul * healMul);
            if (cigHeal > 0) {
                healthDelta += cigHeal;
                gs.stats.itemUsed = true; // Příznak pro achievement "Přežití o suchu"
                messages.push("Zakouřil jsi si s Kubou a Kubou. +" + cigHeal + " HP.");
                gs.stats.usedKurarnaHeal = true;
                gs.stats.kurarnaHeals = (gs.stats.kurarnaHeals || 0) + 1;
            }
        }


        // -----------------
        // VÝPOČET POŠKOZENÍ
        // -----------------
        if (room.damage && room.damage > 0) {
            // Nová logika: Generuje náhodné poškození v rozsahu
            var randomDmg = BALANCE.roomDefaultDmgMin + Math.floor(Math.random() * (BALANCE.roomDefaultDmgMax - BALANCE.roomDefaultDmgMin + 1));
            
            var dmg = Math.floor(randomDmg * envMul);
            
            // --- Aplikace perku 'lightFoot' (šance na úplné vyhnutí) ---
            if (Halla.hasPerk("lightFoot") && Math.random() < BALANCE.lightFootDodgeChance) {
                messages.push("Díky své hbitosti ses vyhnul nebezpečí! (Perk Lehká noha)");
                // Poškození se neaplikuje, dmg zůstává 0 pro tuto část.
            } else {
                // Pokud se hráč nevyhnul, aplikují se standardní redukce poškození.
                // Aplikace perku 'OVRmind'
                if (Halla.hasPerk("OVRmind")) {
                    dmg = Math.floor(dmg * BALANCE.ovrMindDmgMul);
                }
    
                // Aplikace buffu od Ivči
                if (gs.ivcaBuffTurns && gs.ivcaBuffTurns > 0) {
                    var beforeIvca = dmg;
                    dmg = Math.floor(dmg * BALANCE.ivcaBuffDmgMul);
                    gs.ivcaBuffTurns--;
    
                    messages.push(
                        "Ivča ti kryje záda: poškození z prostředí sníženo z " +
                        beforeIvca + " na " + dmg + ". Zbývá " + gs.ivcaBuffTurns + " tahů ochrany."
                    );
                }
    
                if (dmg > 0) {
                    healthDelta -= dmg;
                    var dmgMessage = Halla.randomFromArray(Halla.ROOM_DAMAGE_MESSAGES) || "Prostředí tě semlelo.";
                    messages.push(dmgMessage + " -" + dmg + " HP.");
                }
            }
        }

        // -----------------
        // APLIKACE ZMĚN A VÝSTUP
        // -----------------
        if (healthDelta !== 0 && typeof Halla.changeHealth === "function") {
            // Použijeme centrální funkci, která se postará o vše
            // (omezení, update UI, kontrola smrti).
            Halla.changeHealth(healthDelta, "Prostředí Hally");
            
            // Zobrazíme jen zprávy, protože changeHealth už ukáže finální HP.
            Halla.showInfo(
                messages.join("\n")
            );
        }
    };

})();
