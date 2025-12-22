include("scripts/EAction.js");
include("scripts/library.js");
/**
 * @author      Michal Zachara <zachara.m@seznam.cz>
 * @version     1.0.0
 * @date        2025-11-06
 * @description Skript pro vytvoření geometrického výřezu v 2D objektech (typicky profilech nebo šasí).
 *              Postup:
 *              1. Uživatel vybere objekty (čáry), které chce zkrátit.
 *              2. Uživatel vybere PŘESNĚ DVĚ svislé pomocné čáry na vrstvě '0', které definují oblast výřezu.
 *              3. Skript odstraní segmenty mezi pomocnými čárami, posune pravou část objektů doleva a v místě spoje vloží svislou čáru typu ZIGZAG.
 *              4. Původní objekty, pomocné čáry a posunuté ZIGZAGy jsou automaticky smazány nebo vybrány k ručnímu smazání.
 */
// ===========================================
// === HLAVNÍ TŘÍDA A LOGIKA SKRIPTU ===
// ===========================================
function Halla_Vyrez(guiAction) {
    EAction.call(this, guiAction);
}
Halla_Vyrez.prototype = new EAction();

/**
 * Zobrazí informativní zprávu uživateli.
 * @param {string} text Zpráva k zobrazení.
 */
Halla_Vyrez.prototype.info = function(text) {
    EAction.handleUserMessage(text);
};

/**
 * Zobrazí varovnou zprávu uživateli.
 * @param {string} text Zpráva k zobrazení.
 */
Halla_Vyrez.prototype.warn = function(text) {
    EAction.handleUserWarning(text);
};

Halla_Vyrez.prototype.beginEvent = function() {
    EAction.prototype.beginEvent.call(this);

    var di = this.getDocumentInterface();
    if (!di) {
        // Toto je kritická chyba, takže použijeme přímo QMessageBox pro jistotu
        QMessageBox.critical(null, "Kritická chyba", "❌ CHYBA: Nelze získat DocumentInterface.");
        this.terminate();
        return;
    }

    var doc = di.getDocument();
    if (!doc) {
        this.warn("❌ CHYBA: Nelze získat dokument.");
        this.terminate();
        return;
    }

    var appWin = undefined;
    if (typeof EAction.getMainWindow === "function") {
        appWin = EAction.getMainWindow();
    }

    var TOL = 1.0e-6;

    // Vrstva pro fallback (KONSTRUKCE)
    var konstrukceLayerId = -1;
    if (typeof doc.getLayerId === "function") {
        konstrukceLayerId = doc.getLayerId("KONSTRUKCE");
    }

    // Linetype ZIGZAG – naše "zlomové" čáry
    var zigzagLinetypeId = undefined;
    try {
        if (typeof doc.getLinetypeId === "function") {
            zigzagLinetypeId = doc.getLinetypeId("ZIGZAG");
        }
    } catch (e) {
        zigzagLinetypeId = undefined;
    }

    //==========================================================
    // 0) Info dialog na začátek
    //==========================================================
    try {
        if (typeof QMessageBox !== "undefined" && QMessageBox.information) {
            QMessageBox.information(
                appWin,
                "Halla výřez - Nápověda",
                "Použití:\n\n" +
                "1) Vyber objekt (profil/šasí), které chceš zkrátit.\n" +
                "2) Vyber PŘESNĚ DVĚ svislé pomocné čáry na vrstvě '0'.\n\n" +
                "Oblast mezi nimi bude odstraněna a pravá část se posune k levé.\n" +
                "Nové čáry budou ve stejné vrstvě jako původní (nebo v KONSTRUKCE).\n" +
                "V místě výřezu vznikne svislá ZIGZAG čára.\n" +
                "Na konci se pokusím původní čáry i pomocné svislice automaticky smazat.\n\n" +
                "Pokud po dokončení operace zůstanou některé původní entity vybrané, " +
                "stiskněte klávesu DELETE pro jejich ruční odstranění."
            );
        }
    } catch (e) {
    }

    //==========================================================
    // 1) Výběr entit
    //==========================================================
    var sel = doc.querySelectedEntities();
    if (!sel || sel.length === 0) {
        this.warn("❌ Nic není vybrané.\nVyberte vodiče (čáry) a DVĚ svislé pomocné čáry na vrstvě '0'.");
        this.terminate();
        return;
    }

    var cutLines         = [];  // pomocné svislice
    var wireLines        = [];  // vodiče
    var zigzagLines      = [];  // existující ZIGZAG zlomy
    var i;

    for (i = 0; i < sel.length; ++i) {
        var ent = doc.queryEntity(sel[i]);
        if (!ent) {
            continue;
        }

        if (isBlockReferenceEntity(ent)) {
            this.warn("❌ Ve výběru je blok. Nejdřív ho explodujte (Block > Explode) na čáry.");
            this.terminate();
            return;
        }

        if (!isLineEntity(ent)) {
            continue;
        }

        var layerName = ent.getLayerName();

        // Je to ZIGZAG čára?
        var isZigzag = false;
        try {
            if (zigzagLinetypeId !== undefined &&
                typeof ent.getLinetypeId === "function" &&
                ent.getLinetypeId() === zigzagLinetypeId) {
                isZigzag = true;
            }
        } catch (eLt) {
            isZigzag = false;
        }

        if (isZigzag) {
            zigzagLines.push(ent);
            continue;   // ZIGZAG NEřežeme, jen později posuneme/překreslíme
        }

        if (layerName === "0") {
            // pomocná čára – musí být svislá
            var p1 = ent.getStartPoint();
            var p2 = ent.getEndPoint();
            if (Math.abs(p1.x - p2.x) > TOL) {
                this.warn("❌ Na vrstvě '0' je čára, která není svislá.\n" +
                    "Vrstvu '0' používej jen pro svislé pomocné řezy.");
                this.terminate();
                return;
            }
            cutLines.push(ent);
        } else {
            wireLines.push(ent);
        }
    }

    if (cutLines.length !== 2) {
        this.warn("❌ Musí být vybrané PŘESNĚ DVĚ svislé pomocné čáry na vrstvě '0'.");
        this.terminate();
        return;
    }

    if (wireLines.length === 0) {
        this.warn("❌ Nenalezeny žádné vodiče (line entity mimo vrstvu '0').");
        this.terminate();
        return;
    }

    //==========================================================
    // 2) Z pomocných čar zjistit cutX1 a cutX2
    //==========================================================
    var xA = cutLines[0].getStartPoint().x;
    var xB = cutLines[1].getStartPoint().x;

    var cutX1 = xA < xB ? xA : xB;
    var cutX2 = xA < xB ? xB : xA;

    if (Math.abs(cutX2 - cutX1) < TOL) {
        this.warn("❌ Pomocné svislé čáry mají prakticky stejnou X pozici. Posuňte je dál od sebe.");
        this.terminate();
        return;
    }

    //==========================================================
    // 3) Bounding box vodičů – kvůli výšce a ZIGZAGu
    //==========================================================
    var haveBox = false;
    var minX, minY, maxX, maxY;

    for (i = 0; i < wireLines.length; ++i) {
        var wl = wireLines[i];
        var bb = wl.getBoundingBox(true);
        var bMin = bb.getMinimum();
        var bMax = bb.getMaximum();

        if (!haveBox) {
            minX = bMin.x;
            minY = bMin.y;
            maxX = bMax.x;
            maxY = bMax.y;
            haveBox = true;
        } else {
            if (bMin.x < minX) minX = bMin.x;
            if (bMin.y < minY) minY = bMin.y;
            if (bMax.x > maxX) maxX = bMax.x;
            if (bMax.y > maxY) maxY = bMax.y;
        }
    }

    if (!haveBox) {
        this.warn("❌ Nepodařilo se spočítat bounding box vodičů.");
        this.terminate();
        return;
    }

    var originalHeight = maxY - minY;
    var moveDx = cutX2 - cutX1;   // o tolik posuneme pravou část doleva

    function lerpPoint(A, B, t) {
        return new RVector(
            A.x + (B.x - A.x) * t,
            A.y + (B.y - A.y) * t
        );
    }

    //==========================================================
    // 4) Řez jedné čáry podle cutX1 a cutX2 – HARD CUT
    //==========================================================
    function sliceLineSingleGap(line, cut1, cut2) {
        var res = {
            leftSegments: [],
            rightSegments: []
        };

        var p1 = line.getStartPoint();
        var p2 = line.getEndPoint();

        var x1 = p1.x;
        var y1 = p1.y;
        var x2 = p2.x;
        var y2 = p2.y;

        var layerId = -1;
        if (typeof line.getLayerId === "function") {
            layerId = line.getLayerId();
        }

        var A = p1;
        var B = p2;

        // aby A.x <= B.x
        if (x1 > x2) {
            A = p2;
            B = p1;
            var tx = x1; x1 = x2; x2 = tx;
            var ty = y1; y1 = y2; y2 = ty;
        }

        var dx = x2 - x1;

        function makeVec(xx, yy) {
            return new RVector(xx, yy);
        }

        function intersectAtX(xCut) {
            var t = (xCut - x1) / (x2 - x1);
            var AA = makeVec(x1, y1);
            var BB = makeVec(x2, y2);
            return lerpPoint(AA, BB, t);
        }

        // vertikální čára
        if (Math.abs(dx) < TOL) {
            if (x1 <= cut1 + TOL) {
                res.leftSegments.push({
                    p1: makeVec(p1.x, p1.y),
                    p2: makeVec(p2.x, p2.y),
                    layerId: layerId
                });
            } else if (x1 >= cut2 - TOL) {
                res.rightSegments.push({
                    p1: makeVec(p1.x, p1.y),
                    p2: makeVec(p2.x, p2.y),
                    layerId: layerId
                });
            }
            return res;
        }

        // celé vlevo
        if (x2 <= cut1 + TOL) {
            res.leftSegments.push({
                p1: makeVec(p1.x, p1.y),
                p2: makeVec(p2.x, p2.y),
                layerId: layerId
            });
            return res;
        }

        // celé vpravo
        if (x1 >= cut2 - TOL) {
            res.rightSegments.push({
                p1: makeVec(p1.x, p1.y),
                p2: makeVec(p2.x, p2.y),
                layerId: layerId
            });
            return res;
        }

        var crosses1 = (x1 < cut1 - TOL && x2 > cut1 + TOL);
        var crosses2 = (x1 < cut2 - TOL && x2 > cut2 + TOL);

        var P1 = null;
        var P2 = null;

        if (crosses1) P1 = intersectAtX(cut1);
        if (crosses2) P2 = intersectAtX(cut2);

        // vlevo od cut1
        if (crosses1) {
            res.leftSegments.push({
                p1: makeVec(A.x, A.y),
                p2: P1,
                layerId: layerId
            });
        } else if (x1 < cut1 - TOL && x2 <= cut2 + TOL) {
            P1 = intersectAtX(cut1);
            res.leftSegments.push({
                p1: makeVec(A.x, A.y),
                p2: P1,
                layerId: layerId
            });
        }

        // vpravo od cut2
        if (crosses2) {
            res.rightSegments.push({
                p1: P2,
                p2: makeVec(B.x, B.y),
                layerId: layerId
            });
        } else if (x1 >= cut1 - TOL && x2 > cut2 + TOL) {
            P2 = intersectAtX(cut2);
            res.rightSegments.push({
                p1: P2,
                p2: makeVec(B.x, B.y),
                layerId: layerId
            });
        }

        // co je jen uvnitř [cut1, cut2] ignorujeme (prostředek pryč)
        return res;
    }

    //==========================================================
    // 5) Rozřezat všechny vodiče
    //==========================================================
    var leftSegments = [];
    var rightSegments = [];

    for (i = 0; i < wireLines.length; ++i) {
        var line = wireLines[i];
        var parts = sliceLineSingleGap(line, cutX1, cutX2);

        var j;
        for (j = 0; j < parts.leftSegments.length; ++j) {
            leftSegments.push(parts.leftSegments[j]);
        }
        for (j = 0; j < parts.rightSegments.length; ++j) {
            rightSegments.push(parts.rightSegments[j]);
        }
    }

    if (leftSegments.length === 0 && rightSegments.length === 0) {
        this.warn("❌ Po výřezu nezbyly žádné segmenty.\nZkontrolujte, jestli řežete správné čáry a kde jsou pomocné svislice.");
        this.terminate();
        return;
    }

    //==========================================================
    // 6) Posun pravých segmentů doleva o moveDx
    //==========================================================
    var s;
    for (s = 0; s < rightSegments.length; ++s) {
        var seg = rightSegments[s];
        seg.p1 = new RVector(seg.p1.x - moveDx, seg.p1.y);
        seg.p2 = new RVector(seg.p2.x - moveDx, seg.p2.y);
    }

    //==========================================================
    // 6b) „Posun“ ZIGZAG čar – překreslení na nové pozici
    //==========================================================
    var movedZigzagSegments = [];   // nové ZIGZAG čáry
    var zigzagToDelete      = [];   // staré ZIGZAG čáry, které pryč

    for (i = 0; i < zigzagLines.length; ++i) {
        var zz = zigzagLines[i];
        var bbZ = zz.getBoundingBox(true);
        var bbMin = bbZ.getMinimum();

        // pokud je celá ZIGZAG čára vpravo od cutX2, patří do pravé části → posunout
        if (bbMin.x >= cutX2 - TOL) {
            var zp1 = zz.getStartPoint();
            var zp2 = zz.getEndPoint();

            var newP1 = new RVector(zp1.x - moveDx, zp1.y);
            var newP2 = new RVector(zp2.x - moveDx, zp2.y);

            var layId = -1;
            var ltId  = zigzagLinetypeId;
            var ltSc  = 20;

            try {
                if (typeof zz.getLayerId === "function") {
                    layId = zz.getLayerId();
                }
            } catch (eLay) {}

            try {
                if (typeof zz.getLinetypeId === "function") {
                    ltId = zz.getLinetypeId();
                }
            } catch (eLt2) {}

            try {
                if (typeof zz.getLinetypeScale === "function") {
                    ltSc = zz.getLinetypeScale();
                }
            } catch (eSc2) {}

            movedZigzagSegments.push({
                p1: newP1,
                p2: newP2,
                layerId: layId,
                linetypeId: ltId,
                linetypeScale: ltSc
            });

            zigzagToDelete.push(zz);
        }
    }

    //==========================================================
    // 7) ZIGZAG symbol v místě nového spoje – svislá čára se scale 20
    //==========================================================
    var breakLines = [];

    function addBreakSymbol(xCenter) {
        var y1 = minY;
        var y2 = maxY;

        var p1 = new RVector(xCenter, y1);
        var p2 = new RVector(xCenter, y2);

        var bl = new RLineEntity(doc, new RLineData(p1, p2));

        // vrstva KONSTRUKCE (pokud existuje)
        if (konstrukceLayerId !== -1 && typeof bl.setLayerId === "function") {
            bl.setLayerId(konstrukceLayerId);
        }

        // nastavit linetype ZIGZAG, pokud existuje
        try {
            if (zigzagLinetypeId !== undefined &&
                typeof bl.setLinetypeId === "function") {
                bl.setLinetypeId(zigzagLinetypeId);
            }
        } catch (eLt2) {
            // když to nevyjde, zůstane continuous
        }

        // scale = 20
        try {
            if (typeof bl.setLinetypeScale === "function") {
                bl.setLinetypeScale(5);
            }
        } catch (eSc) {
            // když to nejde, nevadí
        }

        breakLines.push(bl);
    }

    // spoj je v x = cutX1 (pravá část posunutá k levé)
    addBreakSymbol(cutX1);

    //==========================================================
    // 8) Vložit nové vodiče, nové ZIGZAGy a break čáru
    //==========================================================
    var opAdd = new RAddObjectOperation();

    function addSeg(seg) {
        var le = new RLineEntity(doc, new RLineData(seg.p1, seg.p2));
        if (typeof seg.layerId !== "undefined" && seg.layerId !== -1 && typeof le.setLayerId === "function") {
            le.setLayerId(seg.layerId);
        } else if (konstrukceLayerId !== -1 && typeof le.setLayerId === "function") {
            le.setLayerId(konstrukceLayerId);
        }
        opAdd.addObject(le, false);
    }

    function addZigzagSeg(seg) {
        var le = new RLineEntity(doc, new RLineData(seg.p1, seg.p2));

        if (typeof seg.layerId !== "undefined" && seg.layerId !== -1 && typeof le.setLayerId === "function") {
            le.setLayerId(seg.layerId);
        } else if (konstrukceLayerId !== -1 && typeof le.setLayerId === "function") {
            le.setLayerId(konstrukceLayerId);
        }

        try {
            if (typeof seg.linetypeId !== "undefined" &&
                seg.linetypeId !== undefined &&
                typeof le.setLinetypeId === "function") {
                le.setLinetypeId(seg.linetypeId);
            } else if (zigzagLinetypeId !== undefined &&
                       typeof le.setLinetypeId === "function") {
                le.setLinetypeId(zigzagLinetypeId);
            }
        } catch (eLt3) {}

        try {
            if (typeof seg.linetypeScale !== "undefined" &&
                typeof le.setLinetypeScale === "function") {
                le.setLinetypeScale(seg.linetypeScale);
            }
        } catch (eSc3) {}

        opAdd.addObject(le, false);
    }

    for (s = 0; s < leftSegments.length; ++s) {
        addSeg(leftSegments[s]);
    }
    for (s = 0; s < rightSegments.length; ++s) {
        addSeg(rightSegments[s]);
    }
    for (s = 0; s < movedZigzagSegments.length; ++s) {
        addZigzagSeg(movedZigzagSegments[s]);
    }
    for (s = 0; s < breakLines.length; ++s) {
        opAdd.addObject(breakLines[s], false);
    }

    di.applyOperation(opAdd);
    di.regenerateScenes();

    //==========================================================
    // 9) AUTO SMAZÁNÍ původních entit (vodiče + pomocné čáry + staré ZIGZAGy)
    //==========================================================
    var autoDeleted = false;

    try {
        if (typeof RDeleteObjectsOperation !== "undefined") {
            var opDel = new RDeleteObjectsOperation(true);

            for (i = 0; i < wireLines.length; ++i) {
                opDel.deleteObject(wireLines[i]);
            }
            for (i = 0; i < cutLines.length; ++i) {
                opDel.deleteObject(cutLines[i]);
            }
            for (i = 0; i < zigzagToDelete.length; ++i) {
                opDel.deleteObject(zigzagToDelete[i]);
            }

            di.applyOperation(opDel);
            autoDeleted = true;
        }
    } catch (eDel) {
        autoDeleted = false;
    }

    if (!autoDeleted) {
        // fallback – aspoň je vybereme pro ruční Delete
        try {
            if (typeof di.clearSelection === "function") {
                di.clearSelection();
            }
            if (typeof doc.setObjectSelected === "function") {
                for (i = 0; i < wireLines.length; ++i) {
                    doc.setObjectSelected(wireLines[i].getId(), true);
                }
                for (i = 0; i < cutLines.length; ++i) {
                    doc.setObjectSelected(cutLines[i].getId(), true);
                }
                for (i = 0; i < zigzagToDelete.length; ++i) {
                    doc.setObjectSelected(zigzagToDelete[i].getId(), true);
                }
            }
            this.info("ℹ️ Poznámka: Automatické mazání se nepodařilo. Původní čáry jsou nyní vybrané – stiskněte Delete.");
        } catch (eSel) {
            this.info("ℹ️ Poznámka: Ani automatické mazání, ani automatický výběr se nepovedly.\n" +
                "Kdyžtak smaž původní čáry ručně.");
        }
    }

    this.info(
        "✅ Hotovo.\n" +
        "Vyříznuto mezi X = " + cutX1.toFixed(2) + " a " + cutX2.toFixed(2) +
        ". Pravá část posunuta doleva k levé.\n" +
        "Nové zkrácené vodiče jsou ve svých vrstvách.\n" +
        (autoDeleted
            ? "Původní vodiče, pomocné čáry a staré ZIGZAGy (vpravo) byly automaticky smazány."
            : "Pokud ještě něco zůstalo, doraz to Delete.")
    );

    this.terminate();
};

// Entry point pro QCAD
function main(guiAction) {
    return new Halla_Vyrez(guiAction);
}
