import * as dat from 'dat.gui';
import { mat4, vec2, vec3 } from 'gl-matrix';
import * as twgl from 'twgl.js';

// @ts-ignore
import fragmentSource from './shader/fragment.glsl';
// @ts-ignore
import vertexSource from './shader/vertex.glsl';

const cnv = document.createElement('canvas');
const gl = cnv.getContext('webgl');
cnv.width = window.innerWidth;
cnv.height = window.innerHeight;
document.body.appendChild(cnv);

const programInfo = twgl.createProgramInfo(gl, [vertexSource, fragmentSource]);
const vertices = [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0];
const arrays = { position: vertices };
const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

const uniforms = {
  xRotMax: 90,
  mouseSens: 0.0015,
  movementSpeed: 0.05,
  keyStates: { w: false, a: false, s: false, d: false },
  rotation: vec2.create(),
  maxSteps: 200,
  minDist: 0,
  maxDist: 50,
  epsilon: 0.0001,
  resolution: vec2.fromValues(cnv.width, cnv.height),
  FOV: 45,
  cameraPos: vec3.fromValues(0, 0, 0),
  rotationMatrix: mat4.create(),
  lightPos: vec3.fromValues(5, 5, 5),
  objectPos: vec3.fromValues(0, 0, -5),
  objectColour: [246, 189, 120],
  worldColour: [72, 92, 120],
  worldColourFactor: 0.5,
  diffuseFactor: 1,
  specularFactor: 0.2,
  ambientMin: 0.2,
  specularPower: 10,
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

function handleKey(e: KeyboardEvent) {
  if (!e.repeat) {
    for (const key of Object.keys(uniforms.keyStates)) {
      if (e.key === key) {
        uniforms.keyStates[key] = !uniforms.keyStates[key];
        break;
      }
    }
  }
}

function handleClick() {
  cnv.requestPointerLock();
  gui.close();
}

function handleMouseMove(e: MouseEvent) {
  if (document.pointerLockElement === cnv) {
    const movement = vec2.fromValues(-e.movementY, -e.movementX);
    const factor = uniforms.mouseSens * uniforms.FOV * (Math.PI / 180);
    vec2.scale(movement, movement, factor);
    vec2.add(uniforms.rotation, uniforms.rotation, movement);
    const lim = uniforms.xRotMax * (Math.PI / 180);
    uniforms.rotation[0] = Math.min(Math.max(-lim, uniforms.rotation[0]), lim);
  }
}

function handleResize() {
  cnv.width = window.innerWidth;
  cnv.height = window.innerHeight;
  uniforms.resolution = vec2.fromValues(cnv.width, cnv.height);
}

function render() {
  if (document.pointerLockElement === cnv) {
    updateRotation();
    updatePosition();
  }
  twgl.resizeCanvasToDisplaySize(cnv);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.useProgram(programInfo.program);
  twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
  twgl.setUniforms(programInfo, uniforms);
  twgl.drawBufferInfo(gl, bufferInfo);
  requestAnimationFrame(render);
}

const gui = new dat.GUI();
gui.add(uniforms, 'FOV', 1, 179);
gui.add(uniforms, 'xRotMax', 1, 90);
gui.add(uniforms, 'mouseSens', 0, 0.005);
gui.add(uniforms, 'movementSpeed', 0, 0.5);
gui.addColor(uniforms, 'objectColour');
gui.addColor(uniforms, 'worldColour');
gui.add(uniforms, 'worldColourFactor', 0, 1);
gui.add(uniforms, 'diffuseFactor', 0, 1);
gui.add(uniforms, 'specularFactor', 0, 1);
gui.add(uniforms, 'ambientMin', 0, 1);
gui.add(uniforms, 'specularPower', 1, 50);
requestAnimationFrame(render);

document.addEventListener('keydown', handleKey);
document.addEventListener('keyup', handleKey);
document.addEventListener('mousemove', handleMouseMove);
window.addEventListener('resize', handleResize);
cnv.addEventListener('click', handleClick);
