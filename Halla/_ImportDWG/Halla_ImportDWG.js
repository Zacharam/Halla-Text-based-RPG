// HALLA – DWG batch „import pod sebe“ pro QCAD Pro 3.32.3
// Otevírání přes RMainWindowQt.getMainWindow().openDocument(...)
// Postup: dočasně otevřít DWG → (Explode) → srovnat na cílové XY → Copy → znovu otevřít původní → Paste.
// Vrstva: KONSTRUKCE. Kotvení: levý-dolní roh bboxu → INSERT_BASE (+ k*STACK_DY).

include("scripts/EAction.js");

function msgErr(s){ QMessageBox.critical(null, "Import DWG – chyba", s); }
function msgInfo(s){ QMessageBox.information(null, "Import DWG", s); }
function msgStat(s){ EAction.handleUserMessage(s); }

function main(){
    try{
        msgStat("Import DWG: start…");

        var app = RMainWindowQt.getMainWindow();
        if (!app){ msgErr("MainWindow nedosažen."); return; }

        var di = EAction.getDocumentInterface();
        if (!di){ msgErr("DocumentInterface nedosažen. Otevři a ulož výkres."); return; }
        var doc = di.getDocument();
        var currentPath = doc.getFileName();
        if (!currentPath || currentPath.length===0){ msgErr("Ulož nejprv výkres, by skript věděl, kde dlí."); return; }

        // ==== NASTAVENÍ =======================================================
        var DWG_NAMES    = [];                 // ["situace.dwg","pudorys.dwg"]; prázdné = dva první *.dwg
        var INSERT_BASE  = new RVector(0, 0);  // souřadnice prvého
        var STACK_DY     = -1000.0;            // posun druhého v ose Y (záporně = dolů)
        var TARGET_LAYER = "KONSTRUKCE";
        var EXPLODE_IN_TEMP = true;            // v dočasném DWG rozbít block reference / MINSERT
        var WANT_BLOCK   = true;               // po paste vytvořit náš blok z vložených entit
        // =====================================================================

        // 1) Root složka
        var rootParent = QFileDialog.getExistingDirectory(
            null, "Zvol kořenovou (root) složku s číselnými podsložkami",
            rememberedRootOrHome(), QFileDialog.ShowDirsOnly
        );
        if (!rootParent || rootParent.length===0){ msgStat("Zrušeno: kořenová složka nevybrána."); return; }
        rootParent = QDir.cleanPath(rootParent);
        rememberRoot(rootParent);

        // 2) Číselný kmen z jména výkresu
        var fi = new QFileInfo(currentPath);
        var baseName = fi.baseName();                 // např. 199316E
        var numericKey = extractNumericKey(baseName); // → 199316
        if (!numericKey){ msgErr("Z jména výkresu nevyčten číselný kmen (např. 199316 z 199316E)."); return; }

        // 3) Cílová podsložka
        var targetDir = QDir.cleanPath(rootParent + "/" + numericKey);
        if (!new QDir(targetDir).exists()){ msgErr("Složka \""+numericKey+"\" nenalezena v:\n"+rootParent); return; }

        // 4) Seznam DWG
        var dwgFiles = collectDwgFiles(targetDir, DWG_NAMES);
        if (dwgFiles.length===0){ msgErr("V cílové složce není žádný DWG:\n"+targetDir); return; }
        if (dwgFiles.length>2) dwgFiles = [dwgFiles[0], dwgFiles[1]];

        // 5) Před vložením: zajisti vrstvu v CÍLOVÉM výkrese (který budeme vracet)
        ensureLayer(di, TARGET_LAYER);
        var prevLayerId = doc.getCurrentLayerId();
        var prevLayer   = doc.queryLayer(prevLayerId);
        var prevName    = prevLayer ? prevLayer.getName() : null;

        // 6) Pro každý DWG: otevři → explode → srovnej → copy → vrať hlavní → paste → (blok)
        for (var k=0; k<dwgFiles.length; k++){
            var wantedPos = new RVector(INSERT_BASE.x, INSERT_BASE.y + k*STACK_DY);

            // a) otevřít zdrojový DWG (přepne aktivní dokument)
            app.openDocument(dwgFiles[k]);
            di = EAction.getDocumentInterface();
            if (!di){ msgErr("Po otevření DWG nebyl získán DocumentInterface."); return; }
            var tmpDoc = di.getDocument();

            // b) vybrat vše
            di.selectAll();

            // c) explode (v dočasném) – ochrana proti MINSERT a podobným
            if (EXPLODE_IN_TEMP){
                try {
                    include("scripts/Modify/Explode/Explode.js");
                    Explode.explodeSelection(di);
                } catch(e) {
                    try { include("scripts/Misc/Explode/Explode.js"); Explode.explodeSelection(di); }
                    catch(e2){ qDebug("Explode nedostupný: " + e2); }
                }
            }

            // d) dorovnání na cílové XY v dočasném dokumentu
            var idsTmp = tmpDoc.querySelectedEntities();
            if (idsTmp.length===0){ idsTmp = tmpDoc.queryAllEntities(false); } // kdyby selection zmizel
            if (idsTmp.length>0){
                var bb = getEntitiesBbox(tmpDoc, idsTmp);
                if (bb.isValid()){
                    var anchor = bb.getMinimum();
                    var delta  = new RVector(wantedPos.x - anchor.x, wantedPos.y - anchor.y);
                    moveEntities(di, tmpDoc, idsTmp, delta);
                }
            }

            // e) zkopírovat do schránky (po přesunu)
            di.selectAll();  // ať kopírujeme vše po dorovnání
            di.copy();

            // f) vrátit původní výkres
            app.openDocument(currentPath);
            di  = EAction.getDocumentInterface();
            doc = di.getDocument();

            // g) cílová vrstva + paste (vkládáme „jak jest“, již srovnáno na wantedPos)
            ensureLayer(di, TARGET_LAYER);
            di.setCurrentLayer(TARGET_LAYER);

            // paste – pozice zde nastavím na (0,0), neb jsme už „nasměrovali“ v dočasném
            di.paste(new RVector(0,0));

            // h) vezmi právě vložené entity (výběr po paste)
            var pastedIds = doc.querySelectedEntities();
            if (pastedIds.length===0){
                // fallback: diff všech entit (méně přesné, ale ať se něco děje)
                // (ponechám prázdné – uživatel by stejně chtěl vidět výsledek)
            }

            // i) volitelně zabal do našeho bloku
            if (WANT_BLOCK && pastedIds.length>0){
                var blkBase = "IMP_" + sanitizeName(new QFileInfo(dwgFiles[k]).baseName());
                var blkName = uniqueBlockName(doc, blkBase);

                // vytvoř definici bloku a klony vložených entit do definice (basepoint 0,0)
                var blk=new RBlock(doc, blkName, new RVector(0,0));
                di.applyOperation(new RAddObjectOperation(blk, false));
                var blockId = doc.getBlockId(blkName);

                var opAdd = new RAddObjectsOperation();
                for (var j=0;j<pastedIds.length;j++){
                    var e = doc.queryEntity(pastedIds[j]); if (!e) continue;
                    var ec = e.clone();
                    ec.setBlockId(blockId);
                    opAdd.addObject(ec);
                }
                di.applyOperation(opAdd);

                // vlož block referenci na (0,0) – geometrie už je v globálních souřadnicích
                var data = new RBlockReferenceData(blockId, new RVector(0,0), new RVector(0,0), 1.0, 1.0, 0.0);
                var ref  = new RBlockReferenceEntity(doc, data);
                di.applyOperation(new RAddObjectOperation(ref, false));

                // smaž původní vložené entity z modelspace
                var delOp = new RDeleteObjectsOperation();
                for (var t=0;t<pastedIds.length;t++){
                    var obj = doc.queryObject(pastedIds[t]); if (obj) delOp.deleteObject(obj);
                }
                di.applyOperation(delOp);
            }

            // j) zruš výběr
            di.selectNone();

            qDebug("OK: vloženo z " + new QFileInfo(dwgFiles[k]).fileName());
        }

        // 7) vrátit původní vrstvu
        if (prevName && prevName.length>0) di.setCurrentLayer(prevName);

        di.autoZoom();
        msgInfo("Hotovo. Vloženy " + dwgFiles.length + " DWG do vrstvy \""+TARGET_LAYER+"\".\nZdroj: "+targetDir);
    }
    catch(e){
        msgErr("Neočekávaná chyba: " + e);
    }
}

// ===== Pomůcky =====
function rememberedRootOrHome(){
    try{ var s=new QSettings("HALLA","QCAD-ImportDWG"); var r=s.value("rootParentDir",""); return r&&r.length>0?r:QDir.homePath(); } catch(e){ return QDir.homePath(); }
}
function rememberRoot(path){
    try{ var s=new QSettings("HALLA","QCAD-ImportDWG"); s.setValue("rootParentDir", path); } catch(e){}
}
function extractNumericKey(baseName){ var m=baseName.match(/(\d+)/); return m?m[1]:null; }

function collectDwgFiles(dirPath, names){
    var out=[];
    if (names && names.length>0){
        for (var i=0;i<names.length;i++){ var p=QDir.cleanPath(dirPath+"/"+names[i]); if (new QFileInfo(p).exists()) out.push(p); else qDebug("Var: Nenalezeno: "+p); }
    } else {
        var list=new QDir(dirPath).entryList(["*.dwg","*.DWG"], QDir.Files, QDir.Name);
        for (var j=0;j<list.length && out.length<2; j++) out.push(QDir.cleanPath(dirPath+"/"+list[j]));
    }
    return out;
}

function ensureLayer(di, name){
    var doc=di.getDocument();
    if (!doc.hasLayer(name)){
        var layer=new RLayer(doc, name);
        di.applyOperation(new RAddObjectOperation(layer, false));
    }
    di.setCurrentLayer(name);
}

function getEntitiesBbox(doc, ids){
    var bb=new RBox();
    for (var i=0;i<ids.length;i++){ var e=doc.queryEntity(ids[i]); if (e) bb.growToInclude(e.getBoundingBox()); }
    return bb;
}

function moveEntities(di, doc, ids, deltaVec){
    if (!deltaVec || (Math.abs(deltaVec.x)<1e-9 && Math.abs(deltaVec.y)<1e-9)) return;
    var op=new RModifyObjectsOperation();
    for (var i=0;i<ids.length;i++){
        var e=doc.queryEntity(ids[i]); if (!e) continue;
        var ec=e.clone();
        ec.move(deltaVec);
        op.addObject(ec, false);   // replace
    }
    di.applyOperation(op);
}

// — start —
main();
