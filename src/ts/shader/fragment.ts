export default `
  precision mediump float;

  uniform int maxSteps;
  uniform float minDist;
  uniform float maxDist;
  uniform float epsilon;
  uniform vec2 resolution;

  float sphereSDF(vec3 samplePoint) {
    return length(samplePoint) - 1.0;
  }

  float sceneSDF(vec3 samplePoint) {
    return sphereSDF(samplePoint);
  }

  float shortestDistanceToSurface(vec3 eye, vec3 marchingDirection, float start, float end) {
    float depth = start;
    for (int i = 0; i < 10000; i++) {
      if (i == maxSteps) return end;
      float dist = sceneSDF(eye + depth * marchingDirection);
      if (dist < epsilon) {
        return depth;
      }
      depth += dist;
      if (depth >= end) {
        return end;
      }
    }
  }

  vec3 rayDirection(float fieldOfView, vec2 size, vec2 fragCoord) {
    vec2 xy = fragCoord - size / 2.0;
    float z = size.y / tan(radians(fieldOfView) / 2.0);
    return normalize(vec3(xy, -z));
  }

  void main() {
    vec3 dir = rayDirection(45.0, resolution, gl_FragCoord.xy);
    vec3 eye = vec3(0.0, 0.0, 5.0);
    float dist = shortestDistanceToSurface(eye, dir, minDist, maxDist);
    if (dist > maxDist - epsilon) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    } else {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }    
  }
`;
