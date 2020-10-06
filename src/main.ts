import * as dat from 'dat.gui';
import { mat4, vec2, vec3 } from 'gl-matrix';
import * as twgl from 'twgl.js';

// @ts-ignore
import fragmentSource from './shader/fragment.glsl';
// @ts-ignore
import vertexSource from './shader/vertex.glsl';

const cnv = document.createElement('canvas');
const gl = cnv.getContext('webgl', { preserveDrawingBuffer: true });
document.body.appendChild(cnv);

const programInfo = twgl.createProgramInfo(gl, [vertexSource, fragmentSource]);
const vertices = [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0];
const arrays = { position: vertices };
const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

const uniforms = {
  maxSteps: 500,
  minDist: 0.001,
  maxDist: 50,
  epsilon: 0.0001,
  resolution: vec2.create(),
  subSamples: 4,
  FOV: 45,
  rotationMatrix: mat4.create(),
  lightPos: vec3.fromValues(5, 5, 5),
  objectPos: vec3.fromValues(0, 0, -3),
  objectColour: [246, 189, 120],
  dynamicBg: true,
  bgColourFactor: 0.8,
  bgLightColour: [192, 219, 236],
  bgDarkColour: [63, 113, 184],
  diffuseFactor: 1,
  specularFactor: 0.2,
  ambientMin: 0.2,
  specularPower: 10,
  renderFractal: true,
  maxIterations: 10,
  fractalPower: 8,
  sphereRadius: 0.6,
  fogEnable: true,
  maxBounces: 1,
  aoEnable: true,
  aoStepSize: 0.025,
  aoFactor: 0.15,
  aoIterations: 2,
  enableShadows: true,
  shadowFactor: 0.3,
};

const state = {
  isMoving: false,
  isRotating: false,
  highRes: false,
  movingScale: 10,
  xRotMax: 90,
  mouseSens: 0.0015,
  movementFactor: 0.05,
  keyStates: {
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    Space: false,
    ShiftLeft: false,
  },
  rotation: vec2.create(),
  controllers: [],
  resizingTimeoutId: 0,
  slowDown: true,
  slowDownThreshold: 2.5,
  slowDownStrength: 0.85,
  animatePower: false,
  animateSpeed: 0.001,
  fractalPowerOriginal: uniforms.fractalPower,
  touchDevice: 'ontouchstart' in window,
  pTouch: null,
};

const functions: any = {};

function updateRotation() {
  const xRotMatrix = mat4.create();
  const yRotMatrix = mat4.create();
  mat4.fromXRotation(xRotMatrix, state.rotation[0]);
  mat4.fromYRotation(yRotMatrix, state.rotation[1]);
  mat4.multiply(uniforms.rotationMatrix, yRotMatrix, xRotMatrix);
}

function updatePosition() {
  const forward = vec3.fromValues(0, 0, -1);
  const right = vec3.create();
  const up = vec3.fromValues(0, 1, 0);
  vec3.transformMat4(forward, forward, uniforms.rotationMatrix);
  vec3.cross(right, forward, up);
  vec3.cross(up, right, forward);
  vec3.multiply(up, up, [0, 1, 0]);
  vec3.normalize(forward, forward);
  vec3.normalize(right, right);
  vec3.normalize(up, up);
  const diff = vec3.length(uniforms.objectPos) - state.slowDownThreshold;
  const distFactor = diff < 0 ? (1 - state.slowDownStrength) ** -diff : 1;
  const factor = state.movementFactor * (state.slowDown ? distFactor : 1);
  vec3.scale(forward, forward, factor);
  vec3.scale(right, right, factor);
  vec3.scale(up, up, factor);
  const ks = state.keyStates;
  if (ks.KeyW) vec3.subtract(uniforms.objectPos, uniforms.objectPos, forward);
  if (ks.KeyA) vec3.add(uniforms.objectPos, uniforms.objectPos, right);
  if (ks.KeyS) vec3.add(uniforms.objectPos, uniforms.objectPos, forward);
  if (ks.KeyD) vec3.subtract(uniforms.objectPos, uniforms.objectPos, right);
  if (ks.Space) vec3.sub(uniforms.objectPos, uniforms.objectPos, up);
  if (ks.ShiftLeft) vec3.add(uniforms.objectPos, uniforms.objectPos, up);
}

function updatePower(t: DOMHighResTimeStamp) {
  const pow = state.fractalPowerOriginal;
  uniforms.fractalPower = pow * Math.sin(t * state.animateSpeed) + 2 * pow;
}

function update(t: DOMHighResTimeStamp) {
  renderLogic();
  if (state.animatePower) updatePower(t);
  requestAnimationFrame(update);
}

function calcRotation(movement: vec2) {
  if (!state.touchDevice) state.isRotating = vec2.length(movement) > 1;
  const factor = -state.mouseSens * uniforms.FOV * (Math.PI / 180);
  vec2.scale(movement, movement, factor);
  vec2.add(state.rotation, state.rotation, movement);
  const lim = state.xRotMax * (Math.PI / 180);
  state.rotation[0] = Math.min(Math.max(-lim, state.rotation[0]), lim);
}

function renderLogic() {
  if (state.isMoving || state.isRotating || state.animatePower) {
    updateRotation();
    updatePosition();
    render(false);
  } else if (!state.highRes) {
    render(true);
  }
}

function render(highRes: boolean) {
  state.highRes = highRes;
  highRes ? setCanvasSize(1) : setCanvasSize(state.movingScale);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.useProgram(programInfo.program);
  twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
  twgl.setUniforms(programInfo, uniforms);
  twgl.drawBufferInfo(gl, bufferInfo);
}

function setCanvasSize(scl: number) {
  const width = window.innerWidth / scl;
  const height = window.innerHeight / scl;
  cnv.width = width;
  cnv.height = height;
  cnv.style.width = String(window.innerWidth);
  cnv.style.height = String(window.innerHeight);
  uniforms.resolution = vec2.fromValues(width, height);
}

function configureGui() {
  const gui = new dat.GUI();
  const control = gui.addFolder('Control');
  control.add(state, 'xRotMax', 1, 90);
  control.add(state, 'mouseSens', 0, 0.005);
  control.add(state, 'movementFactor', 0, 0.5);
  control.add(state, 'slowDown');
  control.add(state, 'slowDownThreshold', 0, 3);
  control.add(state, 'slowDownStrength', 0, 1);
  const rendering = gui.addFolder('Rendering');
  state.controllers.push(rendering.add(state, 'movingScale', 1, 10, 1));
  state.controllers.push(rendering.add(uniforms, 'maxSteps', 1, 1000, 1));
  state.controllers.push(rendering.add(uniforms, 'minDist', 0, 1));
  state.controllers.push(rendering.add(uniforms, 'maxDist', 1, 200, 1));
  state.controllers.push(rendering.add(uniforms, 'epsilon', 0, 0.001));
  state.controllers.push(rendering.add(uniforms, 'subSamples', 1, 10, 1));
  state.controllers.push(rendering.add(uniforms, 'FOV', 1, 179));
  const shading = gui.addFolder('Shading');
  state.controllers.push(shading.addColor(uniforms, 'objectColour'));
  state.controllers.push(shading.add(uniforms, 'dynamicBg'));
  state.controllers.push(shading.add(uniforms, 'bgColourFactor', 0, 1));
  state.controllers.push(shading.addColor(uniforms, 'bgLightColour'));
  state.controllers.push(shading.addColor(uniforms, 'bgDarkColour'));
  state.controllers.push(shading.add(uniforms, 'diffuseFactor', 0, 1));
  state.controllers.push(shading.add(uniforms, 'specularFactor', 0, 1));
  state.controllers.push(shading.add(uniforms, 'ambientMin', 0, 1));
  state.controllers.push(shading.add(uniforms, 'specularPower', 1, 50));
  state.controllers.push(shading.add(uniforms, 'fogEnable'));
  state.controllers.push(shading.add(uniforms, 'maxBounces', 1, 5, 1));
  state.controllers.push(shading.add(uniforms, 'aoEnable'));
  state.controllers.push(shading.add(uniforms, 'aoStepSize', 0, 10));
  state.controllers.push(shading.add(uniforms, 'aoFactor', 0, 1));
  state.controllers.push(shading.add(uniforms, 'aoIterations', 1, 5, 1));
  state.controllers.push(shading.add(uniforms, 'enableShadows'));
  state.controllers.push(shading.add(uniforms, 'shadowFactor', 0, 1));
  const sdf = gui.addFolder('SDF');
  state.controllers.push(sdf.add(uniforms, 'renderFractal'));
  state.controllers.push(sdf.add(uniforms, 'maxIterations', 1, 100, 1));
  state.controllers.push(sdf.add(uniforms, 'fractalPower', 1, 20).listen());
  state.controllers.push(sdf.add(state, 'animatePower'));
  state.controllers.push(sdf.add(state, 'animateSpeed', 0.0001, 0.001));
  state.controllers.push(sdf.add(uniforms, 'sphereRadius', 0, 5));
  gui.add(functions, "capture");
  for (const controller of state.controllers) {
    controller.onFinishChange(render);
  }
}

functions.capture = () => {
  const image = cnv.toDataURL("image/png");
  const element = document.createElement("a");
  element.download = "render";
  element.href = image;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function handleKey(e: KeyboardEvent) {
  if (document.pointerLockElement !== cnv) return;
  if (e.repeat) return;
  state.isMoving = false;
  for (const [key, value] of Object.entries(state.keyStates)) {
    if (e.code === key) state.keyStates[key] = !value;
    state.isMoving = state.isMoving || state.keyStates[key];
  }
}

function handleClick() {
  if (state.touchDevice) return;
  cnv.requestPointerLock();
}

function handleMouseMove(e: MouseEvent) {
  if (state.touchDevice) return;
  if (document.pointerLockElement === cnv) {
    const movement = vec2.fromValues(e.movementY, e.movementX);
    calcRotation(movement);
  }
}

function handleTouchMove(e: TouchEvent) {
  const mainTouch = e.targetTouches[0];
  const touch = vec2.fromValues(mainTouch.pageY, mainTouch.pageX);
  if (state.pTouch === null) {
    state.pTouch = touch;
    state.isRotating = true;
  } else {
    const movement = vec2.create();
    vec2.subtract(movement, touch, state.pTouch);
    state.pTouch = touch;
    calcRotation(movement);
  }
}

function handleTouchEnd() {
  state.pTouch = null;
  state.isRotating = false;
}

function handleResize() {
  clearTimeout(state.resizingTimeoutId);
  state.resizingTimeoutId = setTimeout(() => {
    render(true);
  }, 25);
}

document.addEventListener('keydown', handleKey);
document.addEventListener('keyup', handleKey);
document.addEventListener('mousemove', handleMouseMove);
cnv.addEventListener('touchmove', handleTouchMove);
cnv.addEventListener('touchend', handleTouchEnd);
window.addEventListener('resize', handleResize);
cnv.addEventListener('click', handleClick);

configureGui();
requestAnimationFrame(update);
