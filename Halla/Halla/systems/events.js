// scripts/Halla/Halla/systems/events.js
// Random eventy: init + trigger.
// Držíme to mimo turn.js, ať se hlavní tah nezmění v event-loop peklo.

(function () {
    // Bezpečná reference na globální jmenný prostor
    var Halla = this.Halla || (this.Halla = {});

    Halla.RANDOM_EVENTS = [];

    // --------------------------------------
    //   INIT RANDOM EVENTŮ
    // --------------------------------------

    Halla.initRandomEvents = function () {
        var BALANCE = Halla.BALANCE; // Zkratka pro lepší čitelnost

        // POZOR: Místo `Halla.RANDOM_EVENTS = []` použijeme `.length = 0`.
        // V QtScript může přímé přiřazení (`= []`) přepsat celý Halla namespace.
        Halla.RANDOM_EVENTS.length = 0;

        // Event: Auditní den
        var auditEvent = new Object();
        auditEvent.id = "audit_day";
        auditEvent.chance = BALANCE.auditChance;
        auditEvent.rooms = new Array("mistrovna", "vestibul_ovr", "zasedacka_ovr");
        auditEvent.apply = function () {
            var gs = Halla.gameState;
            if (!gs || this.rooms.indexOf(gs.currentRoom) === -1) return;

            var dmg = BALANCE.auditDmgMin + Math.floor(Math.random() * (BALANCE.auditDmgMax - BALANCE.auditDmgMin + 1));
            var actualDmg = Halla.changeHealth(-dmg, "Auditní komise");
            
            Halla.showInfo(
                "Potkal jsi Brabce! Po 100 klikách a 1054 otázkách jsi vyčerpaný.\n" +
                actualDmg + " HP.",
                "Už nikdy více. Bože...\n" + actualDmg + " HP."
            );
        };
        Halla.RANDOM_EVENTS.push(auditEvent);

        // Event: Kocman ti pomůže (heal + perk)
        var kocmanEvent = new Object();
        kocmanEvent.id = "kocman_help";
        kocmanEvent.chance = BALANCE.kocmanChance;
        kocmanEvent.rooms = new Array("dilna_vyroba");
        kocmanEvent.apply = function () {
            var gs = Halla.gameState;
            if (!gs) return;

            var goodRooms = new Array("dilna_vyroba");

            if (goodRooms.indexOf(gs.currentRoom) === -1) return;

            var heal = BALANCE.kocmanHealMin + Math.floor(Math.random() * (BALANCE.kocmanHealMax - BALANCE.kocmanHealMin + 1));
            var actualHeal = Halla.changeHealth(heal, "Kocmanovo kafe");

            if (actualHeal <= 0) return;

            if (!Halla.hasPerk("coffeeBoost")) {
                Halla.grantPerk("coffeeBoost", true);
                if (typeof Halla.journalAddPerk === "function") {
                    Halla.journalAddPerk("coffeeBoost");
                }
            }

            Halla.showInfo(
                "Pán Kameník ti podal kafe a řekl, že to nějak dáte.\n" +
                "+" + actualHeal + " HP.\n" +
                "Získáváš perk 'coffeeBoost' (lepší heal z místností)."
            );
        };
        Halla.RANDOM_EVENTS.push(kocmanEvent);

        // Event: Zkrat na stole
        var zkratEvent = new Object();
        zkratEvent.id = "zkrat";
        zkratEvent.chance = BALANCE.zkratChance;
        zkratEvent.apply = function () {
            var gs = Halla.gameState;
            if (!gs) return;

            // šance, že Kabely zachrání situaci
            if (!Halla.hasPerk("cableWizard") && Math.random() < BALANCE.zkratPerkChance && Halla.hasItem(gs.inventory, "Kabely")) {
                Halla.grantPerk("cableWizard", true);
                if (typeof Halla.journalAddPerk === "function") {
                    Halla.journalAddPerk("cableWizard");
                }
                Halla.showInfo(
                    "Na stole to zkratovalo, ale díky Kabelům jsi to pohotově zkrotil.\n" +
                    "Získáváš perk 'cableWizard' (příští zkrat tě nezraní)."
                );
                return;
            }

            // jinak dmg
            var dmg = BALANCE.zkratDmgMin + Math.floor(Math.random() * (BALANCE.zkratDmgMax - BALANCE.zkratDmgMin + 1));
            var actualDmg = Halla.changeHealth(-dmg, "Zkrat na stole");

            if (actualDmg < 0) { // changeHealth vrací záporné číslo pro poškození
                Halla.showInfo("Zkrat na stole tě pěkně kopnul.\n" + actualDmg + " HP.");
            }
        };
        Halla.RANDOM_EVENTS.push(zkratEvent);

        // Event: Získání perku "Lehká noha"
        var lightFootEvent = new Object();
        lightFootEvent.id = "light_foot_training";
        lightFootEvent.chance = 0.07; // Šance 7 %
        lightFootEvent.apply = function() {
            var gs = Halla.gameState;
            if (!gs) return;

            // Podmínky: Hráč ještě nemá perk a je v nebezpečné místnosti
            var room = Halla.rooms[gs.currentRoom];
            if (Halla.hasPerk("lightFoot") || !room || !room.damage) {
                return;
            }

            Halla.grantPerk("lightFoot", true);
            if (typeof Halla.journalAddPerk === "function") {
                Halla.journalAddPerk("lightFoot");
            }

            Halla.showInfo(
                "Uskočil jsi před padajícím harampádím s nečekanou hbitostí.\n" +
                "Tato zkušenost tě naučila lépe vnímat okolí.\n\nZískáváš perk 'Lehká noha'!"
            );
        };
        Halla.RANDOM_EVENTS.push(lightFootEvent);
    };

    // --------------------------------------
    //   TRIGGER EVENTŮ (volá world phase)
    // --------------------------------------

    Halla.maybeTriggerRandomEvents = function () {
        var gs = Halla.gameState;
        if (!gs) return;

        if (!Halla.RANDOM_EVENTS || Halla.RANDOM_EVENTS.length === 0) return;

        var cls = (typeof Halla.getPlayerClass === "function") ? Halla.getPlayerClass() : null;
        var eventMul = (cls && cls.moreEvents) ? 1.3 : 1.0;

        for (var i = 0; i < Halla.RANDOM_EVENTS.length; i++) {
            var ev = Halla.RANDOM_EVENTS[i];
            if (!ev || !ev.apply || !ev.chance) continue;

            var chance = ev.chance * eventMul;
            if (Math.random() < chance) {
                ev.apply();
                if (!gs.running) break;
            }
        }
    };

})();
