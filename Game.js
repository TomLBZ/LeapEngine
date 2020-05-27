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
    windowOrRoot = () => this;
    set windowOrRoot(value){ 
        this.windowOrRoot = typeof value === 'object' ? value : this.windowOrRoot; 
    }
    noop = () => {}//js trick, empty functions are faster than conditions
    simulationTimeStep = GAME_DEFAULTS.DEFAULT_SIMUL_TIMESTEP;
    frameDelta = GAME_DEFAULTS.DEFAULT_FRAME_DELTA;
    Fps = GAME_DEFAULTS.DEFAULT_FPS;
    fpsAlpha = GAME_DEFAULTS.DEFAULT_FPS_ALPHA;
    fpsUpdateInterval = GAME_DEFAULTS.DEFAULT_FPS_UPDATE_INT;
    minFrameDelay = GAME_DEFAULTS.DEFAULT_MIN_FRAME_DELAY;
    bailOut = GAME_DEFAULTS.DEFAULT_BAILOUOT;
    SetParameters = (simulationtimestep, framedelta, fps, fpsalpha,
        fpsupdateinterval, minframedelay, bailout) => {
        this.simulationTimeStep = simulationtimestep || this.simulationTimeStep;
        this.frameDelta = framedelta || this.frameDelta;
        this.Fps = fps || this.Fps;
        this.fpsAlpha = fpsalpha || this.fpsAlpha;
        this.fpsUpdateInterval = fpsupdateinterval || this.fpsUpdateInterval;
        this.minFrameDelay = minframedelay || this.minFrameDelay;
        this.bailOut = bailout || this.bailOut;
    }
    lastFrameTimeMs = 0;
    lastFpsUpdate = 0;
    framesSinceLastFpsUpdate = 0;
    numUpdateSteps = 0;
    running = false;
    started = false;
    panic = false;
    _begin = this.noop;
    _update = this.noop;
    _draw = this.noop;
    _end = this.noop;
    rafHandle;//id of current frame used for cancellation
    getMaxAllowedFPS = () => {return 1000. / this.minFrameDelay;}
    setMaxAllowedFPS = (fps) => {
        if (typeof fps === 'undefined') {fps = Infinity;}
        if (fps === 0) {this.stop();}
        else {this.minFrameDelay = 1000 / fps;}
        return this.minFrameDelay;
    }
    resetFrameDelta = () => {
        var oldFrameDelta = this.frameDelta;
        this.frameDelta = 0;
        return oldFrameDelta;
    }
    setBegin = (fun) => {//can process inputs, runs once per frame
        this._begin = fun || this._begin;
        return this;
    }
    setUpdate = (fun) => {//can run multiple times, calculate time-dependant stuff
        this._update = fun || this._update;
        return this;
    }
    setDraw = (fun) => {//draw(timepassed/updateinterval). param as a percentage
        this._draw = fun || this._draw;
        return this;
    }
    setEnd = (fun) => {//runs once. calculate time-independant stuff and clean up.
        this._end = fun || this._end;
        return this;
    }  
    _start = (timestamp) => {
        this._draw(1);//draws the initial state before starting the loop
        this.running = true;
        this.lastFrameTimeMs = timestamp;
        this.lastFpsUpdate = timestamp;
        this.framesSinceLastFpsUpdate = 0;
        this.rafHandle = requestAnimationFrame(this.animate);//start main loop
    }
    start = () => {
        if (!this.started) {
            this.started = true;
            this.rafHandle = requestAnimationFrame(this._start);
        }
        return this;
    }
    stop = () => {
        this.running = false;
        this.started = false;
        cancelAnimationFrame(this.rafHandle);
        return this;
    }
    isRunning = () => {return this.running;}
    animate = (timestamp) => {
        this.rafHandle = requestAnimationFrame(this.animate);//handle for cancellation
        if (timestamp < this.lastFrameTimeMs + this.minFrameDelay) {return;}//caps fps
        this.frameDelta += timestamp - this.lastFrameTimeMs;//total time passed
        this.lastFrameTimeMs = timestamp;//update lastframe timestamp
        this._begin(timestamp, this.frameDelta);
        if (timestamp > this.lastFpsUpdate + this.fpsUpdateInterval) {
            this.Fps = this.fpsAlpha * this.framesSinceLastFpsUpdate * 1000 / (timestamp - this.lastFpsUpdate)
                + (1 - this.fpsAlpha) * this.Fps;
            this.lastFpsUpdate = timestamp;
            this.framesSinceLastFpsUpdate = 0;
        }
        this.framesSinceLastFpsUpdate++;
        this.numUpdateSteps = 0;
        while (this.frameDelta >= this.simulationTimeStep) {
            this._update(this.simulationTimeStep);
            this.frameDelta -= this.simulationTimeStep;
            if (++this.numUpdateSteps >= this.bailOut) {
                this.panic = true;
                break;
            }
        }
        this._draw(this.frameDelta / this.simulationTimeStep);
        this._end(this.Fps, this.panic);
        this.panic = false;
    };
}