import * as dat from 'dat.gui';
import { mat4, vec2, vec3 } from 'gl-matrix';
import * as twgl from 'twgl.js';

// @ts-ignore
import fragmentSource from './shader/fragment.glsl';
// @ts-ignore
import vertexSource from './shader/vertex.glsl';

const cnv = document.createElement('canvas');
const gl = cnv.getContext('webgl');
document.body.appendChild(cnv);

const programInfo = twgl.createProgramInfo(gl, [vertexSource, fragmentSource]);
const vertices = [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0];
const arrays = { position: vertices };
const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

const uniforms = {
  isMoving: false,
  isRotating: false,
  highRes: false,
  movingScale: 6,
  xRotMax: 90,
  mouseSens: 0.0015,
  movementSpeed: 0.05,
  keyStates: { w: false, a: false, s: false, d: false },
  rotation: vec2.create(),
  maxSteps: 200,
  minDist: 0,
  maxDist: 50,
  epsilon: 0.0001,
  resolution: vec2.create(),
  subSamples: 4,
  FOV: 45,
  cameraPos: vec3.fromValues(0, 0, 0),
  rotationMatrix: mat4.create(),
  lightPos: vec3.fromValues(5, 5, 5),
  objectPos: vec3.fromValues(0, 0, -3),
  objectColour: [246, 189, 120],
  worldColour: [72, 92, 120],
  worldColourFactor: 0.5,
  diffuseFactor: 1,
  specularFactor: 0.2,
  ambientMin: 0.2,
  specularPower: 10,
  maxIterations: 10,
  fractalPower: 8,
};

function updateRotation() {
  const xRotMatrix = mat4.create();
  const yRotMatrix = mat4.create();
  mat4.fromXRotation(xRotMatrix, uniforms.rotation[0]);
  mat4.fromYRotation(yRotMatrix, uniforms.rotation[1]);
  mat4.multiply(uniforms.rotationMatrix, yRotMatrix, xRotMatrix);
}

function updatePosition() {
  const forward = vec3.fromValues(0, 0, -1);
  const right = vec3.create();
  const up = vec3.create();
  vec3.transformMat4(forward, forward, uniforms.rotationMatrix);
  vec3.cross(right, forward, [0, 1, 0]);
  vec3.cross(up, right, forward);
  vec3.normalize(forward, forward);
  vec3.normalize(right, right);
  vec3.scale(forward, forward, uniforms.movementSpeed);
  vec3.scale(right, right, uniforms.movementSpeed);

  if (uniforms.keyStates.w) {
    vec3.add(uniforms.cameraPos, uniforms.cameraPos, forward);
  }
  if (uniforms.keyStates.a) {
    vec3.subtract(uniforms.cameraPos, uniforms.cameraPos, right);
  }
  if (uniforms.keyStates.s) {
    vec3.subtract(uniforms.cameraPos, uniforms.cameraPos, forward);
  }
  if (uniforms.keyStates.d) {
    vec3.add(uniforms.cameraPos, uniforms.cameraPos, right);
  }

  vec3.multiply(uniforms.cameraPos, uniforms.cameraPos, [1, 0, 1]);
}

function update() {
  if (uniforms.isMoving || uniforms.isRotating) {
    setCanvasSize(uniforms.movingScale);
    updateRotation();
    updatePosition();
    render();
    uniforms.highRes = false;
  } else if (!uniforms.highRes) {
    setCanvasSize(1);
    render();
    uniforms.highRes = true;
  }
  requestAnimationFrame(update);
}

function render() {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.useProgram(programInfo.program);
  twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
  twgl.setUniforms(programInfo, uniforms);
  twgl.drawBufferInfo(gl, bufferInfo);
}

function setCanvasSize(scl: number) {
  cnv.width = window.innerWidth / scl;
  cnv.height = window.innerHeight / scl;
  uniforms.resolution = vec2.fromValues(cnv.width, cnv.height);
  cnv.style.width = '100vw';
  cnv.style.height = '100vh';
}

function handleKey(e: KeyboardEvent) {
  if (!e.repeat) {
    uniforms.isMoving = false;
    for (const key of Object.keys(uniforms.keyStates)) {
      if (e.key === key) {
        uniforms.keyStates[key] = !uniforms.keyStates[key];
      }
      uniforms.isMoving = uniforms.isMoving || uniforms.keyStates[key] === true;
    }
  }
}

function handleClick() {
  cnv.requestPointerLock();
  gui.close();
}

function handleMouseMove(e: MouseEvent) {
  if (document.pointerLockElement === cnv) {
    uniforms.isRotating = !(e.movementX === 0 && e.movementY === 0);
    const movement = vec2.fromValues(-e.movementY, -e.movementX);
    const factor = uniforms.mouseSens * uniforms.FOV * (Math.PI / 180);
    vec2.scale(movement, movement, factor);
    vec2.add(uniforms.rotation, uniforms.rotation, movement);
    const lim = uniforms.xRotMax * (Math.PI / 180);
    uniforms.rotation[0] = Math.min(Math.max(-lim, uniforms.rotation[0]), lim);
  }
}

function handleResize() {
  setCanvasSize(uniforms.movingScale);
  render();
}

document.addEventListener('keydown', handleKey);
document.addEventListener('keyup', handleKey);
document.addEventListener('mousemove', handleMouseMove);
window.addEventListener('resize', handleResize);
cnv.addEventListener('click', handleClick);

const gui = new dat.GUI();
const control = gui.addFolder('Control');
control.add(uniforms, 'xRotMax', 1, 90);
control.add(uniforms, 'mouseSens', 0, 0.005);
control.add(uniforms, 'movementSpeed', 0, 0.5);
const rendering = gui.addFolder('Rendering');
rendering.add(uniforms, 'movingScale', 1, 10, 1);
rendering.add(uniforms, 'subSamples', 1, 10, 1);
rendering.add(uniforms, 'FOV', 1, 179);
const shading = gui.addFolder('Shading');
shading.addColor(uniforms, 'objectColour');
shading.addColor(uniforms, 'worldColour');
shading.add(uniforms, 'worldColourFactor', 0, 1);
shading.add(uniforms, 'diffuseFactor', 0, 1);
shading.add(uniforms, 'specularFactor', 0, 1);
shading.add(uniforms, 'ambientMin', 0, 1);
shading.add(uniforms, 'specularPower', 1, 50);
const fractal = gui.addFolder('Fractal');
fractal.add(uniforms, 'maxIterations', 1, 100, 1);
fractal.add(uniforms, 'fractalPower', 1, 20);

requestAnimationFrame(update);
