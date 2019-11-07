import { mat4, vec2, vec3 } from 'gl-matrix';

export default class Camera {
  private keyStates: any;
  private rotation: vec2;
  private xRotMatrix: mat4;
  private yRotMatrix: mat4;
  private d2r: number;
  private cnv: HTMLCanvasElement;
  private uniforms: any;

  constructor(cnv: HTMLCanvasElement, uniforms: any) {
    this.keyStates = { w: false, a: false, s: false, d: false };
    this.rotation = vec2.create();
    this.xRotMatrix = mat4.create();
    this.yRotMatrix = mat4.create();
    this.d2r = Math.PI / 180;
    this.cnv = cnv;
    this.uniforms = uniforms;

    document.addEventListener('keydown', this.updateKeyStates.bind(this));
    document.addEventListener('keyup', this.updateKeyStates.bind(this));
    cnv.addEventListener('click', this.handleClick.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
  }

  public update() {
    if (document.pointerLockElement === this.cnv) {
      this.updateRotation();
      this.updatePosition();
    }
    return this.uniforms;
  }

  private updateRotation() {
    mat4.fromXRotation(this.xRotMatrix, this.rotation[0]);
    mat4.fromYRotation(this.yRotMatrix, this.rotation[1]);
    mat4.multiply(
      this.uniforms.rotationMatrix,
      this.yRotMatrix,
      this.xRotMatrix
    );
  }

  private updatePosition() {
    const forward = vec3.fromValues(0, 0, -1);
    const right = vec3.create();
    const up = vec3.create();
    vec3.transformMat4(forward, forward, this.uniforms.rotationMatrix);
    vec3.cross(right, forward, [0, 1, 0]);
    vec3.cross(up, right, forward);
    vec3.normalize(forward, forward);
    vec3.normalize(right, right);
    vec3.normalize(up, up);
    vec3.scale(forward, forward, this.uniforms.movementSpeed);
    vec3.scale(right, right, this.uniforms.movementSpeed);
    vec3.scale(up, up, this.uniforms.movementSpeed);
    if (this.keyStates.w) {
      vec3.add(this.uniforms.cameraPos, this.uniforms.cameraPos, forward);
    }
    if (this.keyStates.a) {
      vec3.subtract(this.uniforms.cameraPos, this.uniforms.cameraPos, right);
    }
    if (this.keyStates.s) {
      vec3.sub(this.uniforms.cameraPos, this.uniforms.cameraPos, forward);
    }
    if (this.keyStates.d) {
      vec3.add(this.uniforms.cameraPos, this.uniforms.cameraPos, right);
    }
    vec3.mul(this.uniforms.cameraPos, this.uniforms.cameraPos, [1, 0, 1]);
  }

  private updateKeyStates(e: KeyboardEvent) {
    if (!e.repeat) {
      for (const key of Object.keys(this.keyStates)) {
        if (e.key === key) {
          this.keyStates[key] = !this.keyStates[key];
          break;
        }
      }
    }
  }

  private handleClick() {
    this.cnv.requestPointerLock();
  }

  private clamp(val: number, min: number, max: number) {
    return Math.min(Math.max(min, val), max);
  }

  private handleMouseMove(e: MouseEvent) {
    if (document.pointerLockElement === this.cnv) {
      const movement = vec2.fromValues(-e.movementY, -e.movementX);
      const sclFactor = this.uniforms.mouseSens * this.uniforms.FOV * this.d2r;
      vec2.scale(movement, movement, sclFactor);
      vec2.add(this.rotation, this.rotation, movement);
      const range = this.uniforms.xRotMax * this.d2r;
      this.rotation[0] = this.clamp(this.rotation[0], -range, range);
    }
  }
}
