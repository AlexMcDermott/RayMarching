import * as dat from 'dat.gui';
import { mat4, vec2, vec3 } from 'gl-matrix';
import * as twgl from 'twgl.js';

// @ts-ignore
import fragmentSource from './shader/fragment.glsl';
// @ts-ignore
import vertexSource from './shader/vertex.glsl';

const cnv = document.createElement('canvas');
cnv.width = window.innerWidth;
cnv.height = window.innerHeight;
document.body.appendChild(cnv);
const gl = cnv.getContext('webgl');

const programInfo = twgl.createProgramInfo(gl, [vertexSource, fragmentSource]);

const arrays = {
  position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
};
const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

const uniforms = {
  maxSteps: 200,
  minDist: 0,
  maxDist: 50,
  epsilon: 0.0001,
  resolution: vec2.fromValues(cnv.width, cnv.height),
  FOV: 45,
  xRotMax: 90,
  mouseSens: 0.0015,
  movementSpeed: 0.05,
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

const rotation = vec2.create();
const xRotMatrix = mat4.create();
const yRotMatrix = mat4.create();
const d2r = Math.PI / 180;
const keyStates = {
  w: false,
  a: false,
  s: false,
  d: false,
};

function updateKeyStates(e: KeyboardEvent) {
  if (!e.repeat) {
    for (const key of Object.keys(keyStates)) {
      if (e.key === key) {
        keyStates[key] = !keyStates[key];
        break;
      }
    }
  }
}

document.addEventListener('keydown', updateKeyStates);
document.addEventListener('keyup', updateKeyStates);

function update() {
  mat4.fromXRotation(xRotMatrix, rotation[0]);
  mat4.fromYRotation(yRotMatrix, rotation[1]);
  mat4.multiply(uniforms.rotationMatrix, yRotMatrix, xRotMatrix);

  if (document.pointerLockElement === cnv) {
    const forward = vec3.fromValues(0, 0, -1);
    const right = vec3.create();
    const up = vec3.create();
    vec3.transformMat4(forward, forward, uniforms.rotationMatrix);
    vec3.cross(right, forward, [0, 1, 0]);
    vec3.cross(up, right, forward);
    vec3.normalize(forward, forward);
    vec3.normalize(right, right);
    vec3.normalize(up, up);
    vec3.scale(forward, forward, uniforms.movementSpeed);
    vec3.scale(right, right, uniforms.movementSpeed);
    vec3.scale(up, up, uniforms.movementSpeed);

    if (keyStates.w) {
      vec3.add(uniforms.cameraPos, uniforms.cameraPos, forward);
    }
    if (keyStates.a) {
      vec3.subtract(uniforms.cameraPos, uniforms.cameraPos, right);
    }
    if (keyStates.s) {
      vec3.subtract(uniforms.cameraPos, uniforms.cameraPos, forward);
    }
    if (keyStates.d) {
      vec3.add(uniforms.cameraPos, uniforms.cameraPos, right);
    }

    vec3.multiply(uniforms.cameraPos, uniforms.cameraPos, [1, 0, 1]);
  }
}

function render() {
  update();
  twgl.resizeCanvasToDisplaySize(cnv);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.useProgram(programInfo.program);
  twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
  twgl.setUniforms(programInfo, uniforms);
  twgl.drawBufferInfo(gl, bufferInfo);
  requestAnimationFrame(render);
}

cnv.addEventListener('click', () => {
  cnv.requestPointerLock();
});

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(min, val), max);
}

document.addEventListener('mousemove', e => {
  if (document.pointerLockElement === cnv) {
    const movement = vec2.fromValues(-e.movementY, -e.movementX);
    vec2.scale(movement, movement, uniforms.mouseSens * uniforms.FOV * d2r);
    vec2.add(rotation, rotation, movement);
    const range = uniforms.xRotMax * d2r;
    rotation[0] = clamp(rotation[0], -range, range);
  }
});

window.addEventListener('resize', () => {
  cnv.width = window.innerWidth;
  cnv.height = window.innerHeight;
  uniforms.resolution = vec2.fromValues(cnv.width, cnv.height);
});

window.addEventListener('load', () => {
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
});
