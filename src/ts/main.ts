import * as dat from 'dat.gui';
import * as twgl from 'twgl.js';

import { default as fragmentSource } from './shader/fragment';
import { default as vertexSource } from './shader/vertex';

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
  maxSteps: 255,
  minDist: 0,
  maxDist: 100,
  epsilon: 0.0001,
  resolution: [gl.canvas.width, gl.canvas.height],
  FOV: 45,
  cameraPos: [0, 0, 5],
  facing: [0, 0, 0],
  lightPos: [5, 5, 5],
  objectPos: [0, 0, 0],
  objectColour: [0, 0.9, 0.5],
  worldColour: [0.1, 0.1, 0.1],
  Kd: 1,
  Ks: 0.2,
  ambientMin: 0.2,
  specularPower: 10,
};

function render() {
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
  uniforms.resolution[0] = gl.canvas.width;
  uniforms.resolution[1] = gl.canvas.height;
});

window.onload = () => {
  const gui = new dat.GUI();
  gui.add(uniforms, 'FOV', 1, 180);
  gui.add(uniforms, 'Kd', 0, 1);
  gui.add(uniforms, 'Ks', 0, 1);
  gui.add(uniforms, 'ambientMin', 0, 1);
  gui.add(uniforms, 'specularPower', 1, 50);
  requestAnimationFrame(render);
};
