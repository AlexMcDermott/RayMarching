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

function render() {
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

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

  gl.useProgram(programInfo.program);
  twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
  twgl.setUniforms(programInfo, uniforms);
  twgl.drawBufferInfo(gl, bufferInfo);
}

window.addEventListener('resize', () => {
  cnv.width = window.innerWidth;
  cnv.height = window.innerHeight;
  render();
});

render();
