export default `
  precision mediump float;

  uniform int maxSteps;
  uniform float minDist;
  uniform float maxDist;
  uniform float epsilon;
  uniform vec2 resolution;
  uniform vec3 camera;
  uniform vec3 lightPos;
  uniform vec3 spherePos;

  float sphereSDF(vec3 samplePoint) {
    return length(samplePoint - spherePos) - 1.0;
  }

  float sceneSDF(vec3 samplePoint) {
    return sphereSDF(samplePoint);
  }

  float distToScene(vec3 eye, vec3 marchingDirection, float start, float end) {
    float depth = start;
    for (int i = 0; i < 10000; i++) {
      if (i == maxSteps) return end;
      float dist = sceneSDF(eye + depth * marchingDirection);
      if (dist < epsilon) return depth;
      depth += dist;
      if (depth >= end) return end;
    }
  }

  vec3 calcRay(float fieldOfView, vec2 size, vec2 fragCoord) {
    vec2 xy = fragCoord - size / 2.0;
    float z = size.y / tan(radians(fieldOfView) / 2.0);
    return normalize(vec3(xy, -z));
  }

  vec3 estimateNormal(vec3 p) {
    return normalize(vec3(
      sceneSDF(vec3(p.x + epsilon, p.y, p.z)) - sceneSDF(vec3(p.x - epsilon, p.y, p.z)),
      sceneSDF(vec3(p.x, p.y + epsilon, p.z)) - sceneSDF(vec3(p.x, p.y - epsilon, p.z)),
      sceneSDF(vec3(p.x, p.y, p.z  + epsilon)) - sceneSDF(vec3(p.x, p.y, p.z - epsilon))
    ));
  }

  void main() {
    vec3 dir = calcRay(45.0, resolution, gl_FragCoord.xy);
    float dist = distToScene(camera, dir, minDist, maxDist);
    if (dist > maxDist - epsilon) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
      vec3 pos = camera + dist * dir;
      vec3 normal = estimateNormal(pos);
      vec3 toLightFromPos = normalize(lightPos - pos);
      float cosAngle = clamp(dot(normal, toLightFromPos), 0.0, 1.0);
      gl_FragColor = vec4(1.0 * cosAngle, 0.0, 0.0, 1.0);
    }    
  }
`;
