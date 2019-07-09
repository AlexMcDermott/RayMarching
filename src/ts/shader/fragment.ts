export default `
  precision mediump float;

  uniform vec2 resolution;
  uniform float time;

  void main() {
    vec2 u = (gl_FragCoord.xy / resolution) - 0.5;
    u.x = u.x * (resolution.x / resolution.y);

    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  }
`;
