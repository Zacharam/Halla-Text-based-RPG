/**
 * @constructor
 * @param {RGuiAction} guiAction
 * @param {boolean} [isSelectAction=false]
 */
function Action(guiAction, isSelectAction) {
    Base.call(this, guiAction.getDocumentInterface());

    this.guiAction = guiAction;
    this.isSelectAction = isSelectAction;
    this.busy = false;
    this.hasSelection = false;
    this.hasTransaction = false;
    this.currentTransaction = undefined;
    this.cadToolBar = undefined;
    this.optionsToolBar = undefined;
    this.contextMenu = undefined;
    this.relativeAngle = 0;
    this.relativeAngleBase = new RVector(0,0);
    this.orthoAngle = 0;
    this.lastSnapPosition = new RVector(NaN, NaN);
    this.lastPosition = new RVector(NaN, NaN);
    this.lastGridPosition = new RVector(NaN, NaN);
    this.lastSnapMode = RS.SnapOff;
    this.autoSnap = true;
    this.autoSnapMode = RS.SnapAutomatic;
    this.restrictOrthogonally = false;
    this.restrictAngle = false;
    this.angleRestriction = 0;
    this.relativeZero = new RVector(NaN, NaN);
    this.ignoreNextUp = false;
    this.ignoreNextMove = false;
    this.state = -1;
    this.focus = false;
    this.applicationState = new RPropertyBag();
    this.applicationState.set("snapper/snapmode", RS.SnapAutomatic);
    this.applicationState.set("snapper/showcrosshairs", true);
    this.applicationState.set("snapper/snaprange", RSettings.getFloat("Snapper/SnapRange", 10));
    this.applicationState.set("action/orthomode", false);
    this.applicationState.set("action/gridisactive", false);
    this.applicationState.set("action/relativezeroisactive", false);
    this.applicationState.set("action/restrictangle", false);
    this.applicationState.set("action/restrictanglevalue", 0.0);
    this.applicationState.set("action/showgrid", true);
    this.applicationState.set("action/showrulers", false);
    this.applicationState.set("action/autofocus", false);
    this.applicationState.set("action/autofocusdistance", 10);
    this.applicationState.set("action/autofocuscolor", new QColor(255,0,0,128));
    this.applicationState.set("action/autofocusshowcursor", true);
    this.applicationState.set("action/autofocusshowtooltip", true);
    this.applicationState.set("action/autofocusshowtooltipatcrosshairs", false);
    this.applicationState.set("action/autofocusshowtooltipatentity", false);
    this.applicationState.set("action/autofocusshowtooltipatmouse", false);
    this.applicationState.set("action/autofocusshowtooltipatcrosshairsandmouse", false);
    this.applicationState.set("action/autofocusshowtooltipatentityandmouse", false);
    this.applicationState.set("action/autofocusshowtooltipatcrosshairsandentity", false);
    this.applicationState.set("action/autofocusshowtooltipatall", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutmouse", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutentity", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutcrosshairs", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutcrosshairsandentity", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutcrosshairsandmouse", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutentityandmouse", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutcrosshairsandentityandmouse", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutcrosshairsandentityandmouseandgrid", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutcrosshairsandentityandmouseandgridandendpoint", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutcrosshairsandentityandmouseandgridandendpointandmiddlepoint", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutcrosshairsandentityandmouseandgridandendpointandmiddlepointandcenterpoint", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutcrosshairsandentityandmouseandgridandendpointandmiddlepointandcenterpointandintersection", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutcrosshairsandentityandmouseandgridandendpointandmiddlepointandcenterpointandintersectionandperpendicular", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutcrosshairsandentityandmouseandgridandendpointandmiddlepointandcenterpointandintersectionandperpendicularandtangential", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutcrosshairsandentityandmouseandgridandendpointandmiddlepointandcenterpointandintersectionandperpendicularandtangentialandreference", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutcrosshairsandentityandmouseandgridandendpointandmiddlepointandcenterpointandintersectionandperpendicularandtangentialandreferenceandcoordinate", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutcrosshairsandentityandmouseandgridandendpointandmiddlepointandcenterpointandintersectionandperpendicularandtangentialandreferenceandcoordinateandcoordinatepolar", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutcrosshairsandentityandmouseandgridandendpointandmiddlepointandcenterpointandintersectionandperpendicularandtangentialandreferenceandcoordinateandcoordinatepolarandrelative", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutcrosshairsandentityandmouseandgridandendpointandmiddlepointandcenterpointandintersectionandperpendicularandtangentialandreferenceandcoordinateandcoordinatepolarandrelativeandrelativepolar", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutcrosshairsandentityandmouseandgridandendpointandmiddlepointandcenterpointandintersectionandperpendicularandtangentialandreferenceandcoordinateandcoordinatepolarandrelativeandrelativepolarandfreepoint", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutcrosshairsandentityandmouseandgridandendpointandmiddlepointandcenterpointandintersectionandperpendicularandtangentialandreferenceandcoordinateandcoordinatepolarandrelativeandrelativepolarandfreepointandgridpoint", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutcrosshairsandentityandmouseandgridandendpointandmiddlepointandcenterpointandintersectionandperpendicularandtangentialandreferenceandcoordinateandcoordinatepolarandrelativeandrelativepolarandfreepointandgridpointandzeropoint", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutcrosshairsandentityandmouseandgridandendpointandmiddlepointandcenterpointandintersectionandperpendicularandtangentialandreferenceandcoordinateandcoordinatepolarandrelativeandrelativepolarandfreepointandgridpointandzeropointandrelativezeropoint", false);
    this.applicationState.set("action/autofocusshowtooltipatallbutcrosshairsandentityandmouseandgridandendpointandmiddlepointandcenterpointandintersectionandperpendicularandtangentialandreferenceandcoordinateandcoordinatepolarandrelativeandrelativepolarandfreepointandgridpointandzeropointandrelativezeropointandendpoint", false);
}

Action.prototype = new Base();

Action.prototype.getGuiAction = function() {
    return this.guiAction;
};

Action.prototype.isFinished = function() {
    return this.state === -1;
};

Action.prototype.finish = function() {
    var wasBusy = this.busy;
    this.busy = true;
    this.setState(-1);
    this.getDocumentInterface().clearPreview();
    this.getDocumentInterface().clearSelection();
    this.setCommandPrompt("");
    this.setFocus(false);
    this.endTransaction();
    this.busy = wasBusy;
    this.terminate();
};

Action.prototype.terminate = function() {
    var wasBusy = this.busy;
    this.busy = true;
    this.setState(-1);
    this.getDocumentInterface().clearPreview();
    this.setCommandPrompt("");
    this.setFocus(false);
    this.endTransaction();
    this.guiAction.trigger();
    this.busy = wasBusy;
};

Action.prototype.setFocus = function(on) {
    if (this.focus === on) {
        return;
    }
    this.focus = on;
    this.guiAction.setFocus(on);
};

Action.prototype.setCadToolBar = function(toolBar) {
    this.cadToolBar = toolBar;
};

Action.prototype.getCadToolBar = function() {
    return this.cadToolBar;
};

Action.prototype.setOptionsToolBar = function(toolBar) {
    this.optionsToolBar = toolBar;
};

Action.prototype.getOptionsToolBar = function() {
    return this.optionsToolBar;
};

Action.prototype.setContextMenu = function(menu) {
    this.contextMenu = menu;
};

Action.prototype.getContextMenu = function() {
    return this.contextMenu;
};

Action.prototype.setRelativeZero = function(pos) {
    this.relativeZero = pos;
    this.applicationState.set("action/relativezeroisactive", this.relativeZero.isValid());
    this.updateSnapInfo();
};

Action.prototype.getRelativeZero = function() {
    return this.relativeZero;
};

Action.prototype.setSnapMode = function(snapMode) {
    this.autoSnapMode = snapMode;
    this.applicationState.set("snapper/snapmode", this.autoSnapMode);
    this.updateSnapInfo();
};

Action.prototype.getSnapMode = function() {
    return this.autoSnapMode;
};

Action.prototype.setRestrictOrthogonally = function(on) {
    this.restrictOrthogonally = on;
    this.applicationState.set("action/orthomode", this.restrictOrthogonally);
    this.updateSnapInfo();
};

Action.prototype.getRestrictOrthogonally = function() {
    return this.restrictOrthogonally;
};

Action.prototype.setRestrictAngle = function(on) {
    this.restrictAngle = on;
    this.applicationState.set("action/restrictangle", this.restrictAngle);
    this.updateSnapInfo();
};

Action.prototype.getRestrictAngle = function() {
    return this.restrictAngle;
};

Action.prototype.setAngleRestriction = function(angle) {
    this.angleRestriction = angle;
    this.applicationState.set("action/restrictanglevalue", this.angleRestriction);
    this.updateSnapInfo();
};

Action.prototype.getAngleRestriction = function() {
    return this.angleRestriction;
};

Action.prototype.setRelativeAngle = function(angle) {
    this.relativeAngle = angle;
};

Action.prototype.getRelativeAngle = function() {
    return this.relativeAngle;
};

Action.prototype.setRelativeAngleBase = function(base) {
    this.relativeAngleBase = base;
};

Action.prototype.getRelativeAngleBase = function() {
    return this.relativeAngleBase;
};

Action.prototype.setOrthoAngle = function(angle) {
    this.orthoAngle = angle;
};

Action.prototype.getOrthoAngle = function() {
    return this.orthoAngle;
};

Action.prototype.updateSnapInfo = function() {
    var di = this.getDocumentInterface();
    if (di) {
        di.updateSnapInfo();
    }
};

Action.prototype.beginEvent = function() {
    this.setFocus(true);
    this.hasSelection = this.getDocumentInterface().hasSelection();
};

Action.prototype.resumeEvent = function() {
    this.setFocus(true);
};

Action.prototype.suspendEvent = function() {
    this.setFocus(false);
};

Action.prototype.keyPressEvent = function(event) {
    if (event.key === Qt.Key_Escape) {
        this.escapeEvent();
        event.accept();
    }
};

Action.prototype.keyReleaseEvent = function(event) {
};

Action.prototype.mousePressEvent = function(event) {
};

Action.prototype.mouseReleaseEvent = function(event) {
};

Action.prototype.mouseMoveEvent = function(event) {
};

Action.outerWheelEvent = function(event) {
};

Action.prototype.tabletEvent = function(event) {
};

Action.prototype.commandEvent = function(event) {
    var handled = this.handleCommand(event);
    if (handled) {
        event.accept();
    }
};

Action.prototype.handleCommand = function(event) {
    return false;
};

Action.prototype.coordinateEvent = function(event) {
};

Action.prototype.propertyEvent = function(event) {
};

Action.prototype.zoomEvent = function(event) {
};

Action.prototype.escapeEvent = function() {
    this.finish();
};

Action.prototype.enterEvent = function() {
};

Action.prototype.backspaceEvent = function() {
};

Action.prototype.contextMenuEvent = function() {
};

Action.prototype.updateInterface = function() {
};

Action.prototype.applyOperation = function(op) {
    this.getDocumentInterface().applyOperation(op);
};

Action.prototype.snap = function(position, mode) {
    if (mode === undefined) {
        mode = this.autoSnapMode;
    }
    var ret = this.getDocumentInterface().snap(position, mode);
    this.lastSnapPosition = ret;
    this.lastSnapMode = this.getDocumentInterface().getLastSnapMode();
    return ret;
};

Action.prototype.snapToGrid = function(position) {
    var ret = this.getDocumentInterface().snapToGrid(position);
    this.lastGridPosition = ret;
    return ret;
};

Action.prototype.snapToMetaGrid = function(position) {
    return this.getDocumentInterface().snapToMetaGrid(position);
};

Action.prototype.beginTransaction = function() {
    if (this.hasTransaction) {
        this.endTransaction();
    }
    this.currentTransaction = new RTransaction();
    this.hasTransaction = true;
};

Action.prototype.endTransaction = function() {
    if (this.hasTransaction) {
        if (this.currentTransaction.hasActions()) {
            this.getDocumentInterface().applyTransaction(this.currentTransaction);
        }
        this.currentTransaction = undefined;
        this.hasTransaction = false;
    }
};

Action.prototype.addToTransaction = function(op, force) {
    if (this.hasTransaction) {
        this.currentTransaction.add(op, force);
    }
};

Action.prototype.setCommandPrompt = function(text) {
    var w = EAction.getCommandPrompt();
    if (w) {
        w.setText(text);
    }
};

Action.prototype.setState = function(state) {
    this.state = state;
};

Action.prototype.getState = function() {
    return this.state;
};

Action.prototype.addToPreview = function(entity) {
    this.getDocumentInterface().addToPreview(entity);
};

Action.prototype.removeFromPreview = function(entity) {
    this.getDocumentInterface().removeFromPreview(entity);
};

Action.prototype.clearPreview = function() {
    this.getDocumentInterface().clearPreview();
};

Action.prototype.getLastSnapPosition = function() {
    return this.lastSnapPosition;
};

Action.prototype.getLastSnapMode = function() {
    return this.lastSnapMode;
};

Action.prototype.getLastPosition = function() {
    return this.lastPosition;
};

Action.prototype.getLastGridPosition = function() {
    return this.lastGridPosition;
};

Action.prototype.getApplicationState = function() {
    return this.applicationState;
};