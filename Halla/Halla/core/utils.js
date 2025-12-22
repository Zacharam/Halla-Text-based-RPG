// scripts/Halla/Halla/core/utils.js
// Malé helpery bez závislosti na UI, QCADu nebo stavu hry.
// Čistá utilita. Kéž by takhle vypadala celá firma.

(function () {
    // Bezpečná reference na globální jmenný prostor
    var Halla = this.Halla || (this.Halla = {});

    // --------------------------------------
    //   NORMALIZACE STRINGŮ
    // --------------------------------------
    // Slouží k porovnávání příkazů a itemů
    // (diakritika, velikost písmen, atd.)
    
    // Mapa pro normalizaci je definována jednou pro lepší výkon.
    var DIACRITICS_MAP = {
        "á": "a", "č": "c", "ď": "d", "é": "e", "ě": "e", "í": "i",
        "ň": "n", "ó": "o", "ř": "r", "š": "s", "ť": "t", "ú": "u",
        "ů": "u", "ý": "y", "ž": "z"
    };

    Halla.normalizeString = function (s) {
        var out = "";
        s = String(s || "").toLowerCase();

        for (var i = 0; i < s.length; i++) {
            var ch = s.charAt(i);
            out += (DIACRITICS_MAP[ch] || ch);
        }
        return out;
    };

    // --------------------------------------
    //   NÁHODNÝ VÝBĚR Z POLE
    // --------------------------------------
    
    Halla.randomFromArray = function (arr) {
        if (!arr || arr.length === 0) return null;
        var idx = Math.floor(Math.random() * arr.length);
        return arr[idx];
    };

    // --------------------------------------
    //   SHUFFLE POLE (Fisher–Yates)
    // --------------------------------------

    Halla.shuffleArray = function (arr) {
        if (!arr) return arr;
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
        }
        return arr;
    };

    // --------------------------------------
    //   BFS (Breadth-First Search) pro graf místností
    // --------------------------------------

    /**
     * Provede prohledávání do šířky z daného startovního uzlu.
     * @param {string} startNode - ID startovní místnosti.
     * @returns {{distances: object, predecessors: object}} Objekt obsahující
     *          mapu vzdáleností a mapu předchůdců pro rekonstrukci cesty.
     */
    Halla.runBFS = function(startNode) {
        // POZOR: V QtScript může přímé přiřazení nového objektu ({}) nebo pole ([])
        // někdy přepsat celý Halla namespace. Použijeme bezpečnější metody.
        var distances = new Object();
        var predecessors = new Object();
        var queue = new Array();

        if (!Halla.rooms[startNode]) {
            var emptyResult = new Object();
            emptyResult.distances = new Object();
            emptyResult.predecessors = new Object();
            return emptyResult;
        }

        distances[startNode] = 0;
        queue.push(startNode);

        while (queue.length > 0) {
            var u = queue.shift();
            // POZOR: `|| {}` je také nebezpečné. Nahradíme to explicitním checkem.
            var exits = Halla.rooms[u].exits;
            if (!exits) {
                exits = new Object();
            }

            for (var dir in exits) {
                if (!exits.hasOwnProperty(dir)) continue;
                var v = exits[dir];
                if (Halla.rooms[v] && typeof distances[v] === "undefined") {
                    distances[v] = distances[u] + 1;
                    predecessors[v] = u;
                    queue.push(v);
                }
            }
        }
        var finalResult = new Object();
        finalResult.distances = distances;
        finalResult.predecessors = predecessors;
        return finalResult;
    };

})();
