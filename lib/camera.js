import {matrixLookAt, matrixProjection, vectorAdd, vectorMinus} from './matrix.js';

export class Camera {
    constructor(fov, ratio, near, far){
        this.fov = fov;
        this.ratio = ratio;
        this.near = near;
        this.far = far;
        this.right = Math.tan(fov / 2) * near;
        this.top = this.right / ratio;
        this.pos = [0, 0, 0];
        this.direction = [0, 0, 0]; //look at center of the world.
        this.up = [0, 1, 0];
    }
    setLookTarget(pos, target, up) {
        this.pos = pos;
        this.direction = vectorMinus(target, this.pos);
        this.up = up;
    }
    setLookDirection(pos, direction, up) {
        this.pos = pos;
        this.direction = direction;
        this.up = up;
    }
    getWorldToViewMatrix() {
        return matrixLookAt(this.pos, vectorAdd(this.pos, this.direction), this.up);
    }
    getProjectionMatrix() {
        let projMatrix = matrixProjection(this.right, this.top, this.near, this.far);
        return projMatrix;
    }
}