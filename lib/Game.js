import { ECS, Entity } from "./ECS.js";
import { _player, _structure, _box, _laser } from './EntitiesDefinition.js';
import { ControlSystem, RenderingSystem, DebugSystem, PhysicsSystem } from "./Systems.js";
export const GAME_DEFAULTS = {
	"DEFAULT_SIMUL_TIMESTEP": 1000./60.,
	"DEFAULT_FRAME_DELTA": 0.,
	"DEFAULT_FPS": 60.,
	"DEFAULT_FPS_ALPHA": 0.9,
	"DEFAULT_FPS_UPDATE_INT": 1000.,
	"DEFAULT_MIN_FRAME_DELAY": 0.,
	"DEFAULT_BAILOUOT": 240.,
}
export class Game{
    constructor(canvas, window = {}){
        this.Base = window === {} ? this : window;
        this.windowOrRoot = this;
        this.simulationTimeStep = GAME_DEFAULTS.DEFAULT_SIMUL_TIMESTEP;
        this.frameDelta = GAME_DEFAULTS.DEFAULT_FRAME_DELTA;
        this.Fps = GAME_DEFAULTS.DEFAULT_FPS;
        this.fpsAlpha = GAME_DEFAULTS.DEFAULT_FPS_ALPHA;
        this.fpsUpdateInterval = GAME_DEFAULTS.DEFAULT_FPS_UPDATE_INT;
        this.minFrameDelay = GAME_DEFAULTS.DEFAULT_MIN_FRAME_DELAY;
        this.bailOut = GAME_DEFAULTS.DEFAULT_BAILOUOT;
        this.lastFrameTimeMs = 0;
        this.lastFpsUpdate = 0;
        this.framesSinceLastFpsUpdate = 0;
        this.numUpdateSteps = 0;
        this.running = false;
        this.started = false;
        this.panic = false;
        this.rafHandle;//id of current frame used for cancellation
        this._begin = this.noop;
        this._update = this.nooptrue;
        this._draw = this.noop;
        this._end = this.noop;
        this.myECS = new ECS();
        this.Canvas = canvas;
        this.DebugMode = true;
    }
    noop(){}//js trick, empty functions are faster than conditions
    nooptrue(){return true;}
    ECS_Initialize(){
        let that = this;
        this.myECS.AddEntity(new _player());
        this.myECS.AddSystem(new ControlSystem(that.Base, that.Canvas));
        this.myECS.AddSystem(new PhysicsSystem());
        this.myECS.AddSystem(new RenderingSystem(that.Canvas, 720, 480));
        if(this.DebugMode) this.myECS.AddSystem(new DebugSystem());
    }
    SetWindowOrRoot(value){ 
        this.windowOrRoot = typeof value === 'object' ? value : this.windowOrRoot; 
    }
    SetParameters(simulationtimestep, framedelta, fps, fpsalpha,
        fpsupdateinterval, minframedelay, bailout){
        this.simulationTimeStep = simulationtimestep || this.simulationTimeStep;
        this.frameDelta = framedelta || this.frameDelta;
        this.Fps = fps || this.Fps;
        this.fpsAlpha = fpsalpha || this.fpsAlpha;
        this.fpsUpdateInterval = fpsupdateinterval || this.fpsUpdateInterval;
        this.minFrameDelay = minframedelay || this.minFrameDelay;
        this.bailOut = bailout || this.bailOut;
    }
    getMaxAllowedFPS(){return 1000. / this.minFrameDelay;}
    setMaxAllowedFPS(fps){
        if (typeof fps === 'undefined') {fps = Infinity;}
        if (fps === 0) {this.stop();}
        else {this.minFrameDelay = 1000 / fps;}
        return this.minFrameDelay;
    }
    resetFrameDelta(){
        var oldFrameDelta = this.frameDelta;
        this.frameDelta = 0;
        return oldFrameDelta;
    }
    setBegin(fun){//can process inputs, runs once per frame
        this._begin = fun || this._begin;
        return this;
    }
    setUpdate(fun){//can run multiple times, calculate time-dependant stuff
        this._update = fun || this._update;
        return this;
    }
    setDraw(fun){//draw(timepassed/updateinterval). param as a percentage
        this._draw = fun || this._draw;
        return this;
    }
    setEnd(fun){//runs once. calculate time-independant stuff and clean up.
        this._end = fun || this._end;
        return this;
    }  
    _start(timestamp){
        this._draw(1);//draws the initial state before starting the loop
        this.running = true;
        this.lastFrameTimeMs = timestamp;
        this.lastFpsUpdate = timestamp;
        this.framesSinceLastFpsUpdate = 0;
        let animate = this.animateEnclosureGenerator();
        this.rafHandle = requestAnimationFrame(animate);//start main loop
    }
    start(){
        if (!this.started) {
            this.started = true;
            let starter = this._start.bind(this);
            this.rafHandle = requestAnimationFrame(starter);
        }
        return this;
    }
    stop(){
        this.running = false;
        this.started = false;
        cancelAnimationFrame(this.rafHandle);
        return this;
    }
    isRunning(){return this.running;}
    animateEnclosureGenerator(){
        let that = this;
        function _animate(timestamp){
            that.rafHandle = requestAnimationFrame(_animate);//handle for cancellation
            if (timestamp < that.lastFrameTimeMs + that.minFrameDelay) {return;}//caps fps
            that.frameDelta += timestamp - that.lastFrameTimeMs;//total time passed
            that.lastFrameTimeMs = timestamp;//update lastframe timestamp
            that._begin(timestamp, that.frameDelta);
            if (timestamp > that.lastFpsUpdate + that.fpsUpdateInterval) {
                that.Fps = that.fpsAlpha * that.framesSinceLastFpsUpdate * 1000 / (timestamp - that.lastFpsUpdate)
                    + (1 - that.fpsAlpha) * that.Fps;
                that.lastFpsUpdate = timestamp;
                that.framesSinceLastFpsUpdate = 0;
            }
            that.framesSinceLastFpsUpdate++;
            that.numUpdateSteps = 0;
            let updated = false;
            while (that.frameDelta >= that.simulationTimeStep) {
                updated = that._update(that.simulationTimeStep);
                that.frameDelta -= that.simulationTimeStep;
                if (++that.numUpdateSteps >= that.bailOut) {
                    that.panic = true;
                    break;
                }
            }
            if (updated) { that._draw(that.frameDelta / that.simulationTimeStep); }
            that._end(that.Fps, that.panic);
            that.panic = false;
        } 
        return _animate;
    }
}
