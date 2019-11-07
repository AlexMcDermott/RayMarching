import * as dat from 'dat.gui';
import { mat4, vec2, vec3 } from 'gl-matrix';
import * as twgl from 'twgl.js';
import Camera from './camera';

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

let uniforms = {
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

const cam = new Camera(cnv, uniforms);

function render() {
  uniforms = cam.update();
  twgl.resizeCanvasToDisplaySize(cnv);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.useProgram(programInfo.program);
  twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
  twgl.setUniforms(programInfo, uniforms);
  twgl.drawBufferInfo(gl, bufferInfo);
  requestAnimationFrame(render);
}

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
