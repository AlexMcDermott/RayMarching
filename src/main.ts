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
cnv.style.width = '100vw';
cnv.style.height = '100vh';

const programInfo = twgl.createProgramInfo(gl, [vertexSource, fragmentSource]);
const vertices = [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0];
const arrays = { position: vertices };
const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

const state = {
  isMoving: false,
  isRotating: false,
  highRes: false,
  movingScale: 6,
  xRotMax: 90,
  mouseSens: 0.0015,
  movementSpeed: 0.05,
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
};

const uniforms = {
  maxSteps: 500,
  minDist: 0,
  maxDist: 50,
  epsilon: 0.0002,
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
};

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
  const up = vec3.create();
  vec3.transformMat4(forward, forward, uniforms.rotationMatrix);
  vec3.cross(right, forward, [0, 1, 0]);
  vec3.cross(up, right, forward);
  vec3.normalize(forward, forward);
  vec3.normalize(right, right);
  vec3.scale(forward, forward, state.movementSpeed);
  vec3.scale(right, right, state.movementSpeed);
  vec3.scale(up, [0, 1, 0], state.movementSpeed);

  if (state.keyStates.KeyW) {
    vec3.subtract(uniforms.objectPos, uniforms.objectPos, forward);
  }
  if (state.keyStates.KeyA) {
    vec3.add(uniforms.objectPos, uniforms.objectPos, right);
  }
  if (state.keyStates.KeyS) {
    vec3.add(uniforms.objectPos, uniforms.objectPos, forward);
  }
  if (state.keyStates.KeyD) {
    vec3.subtract(uniforms.objectPos, uniforms.objectPos, right);
  }
  if (state.keyStates.Space) {
    vec3.sub(uniforms.objectPos, uniforms.objectPos, up);
  }
  if (state.keyStates.ShiftLeft) {
    vec3.add(uniforms.objectPos, uniforms.objectPos, up);
  }
}

function update() {
  renderLogic();
  requestAnimationFrame(update);
}

function renderLogic() {
  if (state.isMoving || state.isRotating) {
    if (state.highRes) setCanvasSize(state.movingScale);
    updateRotation();
    updatePosition();
    render();
  } else if (!state.highRes) {
    setCanvasSize(1);
    render();
  }
}

function render() {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.useProgram(programInfo.program);
  twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
  twgl.setUniforms(programInfo, uniforms);
  twgl.drawBufferInfo(gl, bufferInfo);
}

function setCanvasSize(scl: number) {
  state.highRes = scl === 1 ? true : false;
  const width = window.innerWidth;
  const height = window.innerHeight;
  cnv.width = uniforms.renderFractal ? width / scl : width;
  cnv.height = uniforms.renderFractal ? height / scl : height;
  uniforms.resolution = vec2.fromValues(cnv.width, cnv.height);
}

function configureGui() {
  const gui = new dat.GUI();
  const control = gui.addFolder('Control');
  control.add(state, 'xRotMax', 1, 90);
  control.add(state, 'mouseSens', 0, 0.005);
  control.add(state, 'movementSpeed', 0, 0.5);
  const rendering = gui.addFolder('Rendering');
  state.controllers.push(rendering.add(state, 'movingScale', 1, 10, 1));
  state.controllers.push(rendering.add(uniforms, 'maxSteps', 1, 1000, 1));
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
  const sdf = gui.addFolder('SDF');
  state.controllers.push(sdf.add(uniforms, 'renderFractal'));
  state.controllers.push(sdf.add(uniforms, 'maxIterations', 1, 100, 1));
  state.controllers.push(sdf.add(uniforms, 'fractalPower', 1, 20));
  state.controllers.push(sdf.add(uniforms, 'sphereRadius', 0, 5));
  for (const controller of state.controllers) {
    controller.onFinishChange(render);
  }
}

function handleKey(e: KeyboardEvent) {
  if (document.pointerLockElement === cnv) {
    if (!e.repeat) {
      state.isMoving = false;
      for (const key of Object.keys(state.keyStates)) {
        if (e.code === key) {
          state.keyStates[key] = !state.keyStates[key];
        }
        state.isMoving = state.isMoving || state.keyStates[key] === true;
      }
    }
  }
}

function handleClick() {
  cnv.requestPointerLock();
}

function handleMouseMove(e: MouseEvent) {
  if (document.pointerLockElement === cnv) {
    state.isRotating = Math.abs(e.movementX) + Math.abs(e.movementY) > 1;
    const movement = vec2.fromValues(-e.movementY, -e.movementX);
    const factor = state.mouseSens * uniforms.FOV * (Math.PI / 180);
    vec2.scale(movement, movement, factor);
    vec2.add(state.rotation, state.rotation, movement);
    const lim = state.xRotMax * (Math.PI / 180);
    state.rotation[0] = Math.min(Math.max(-lim, state.rotation[0]), lim);
  }
}

function handleResize() {
  clearTimeout(state.resizingTimeoutId);
  state.resizingTimeoutId = setTimeout(() => {
    setCanvasSize(state.movingScale);
    renderLogic();
  }, 25);
}

document.addEventListener('keydown', handleKey);
document.addEventListener('keyup', handleKey);
document.addEventListener('mousemove', handleMouseMove);
window.addEventListener('resize', handleResize);
cnv.addEventListener('click', handleClick);

configureGui();
requestAnimationFrame(update);
