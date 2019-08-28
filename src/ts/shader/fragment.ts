export default `
  precision mediump float;

  uniform int maxSteps;
  uniform float minDist;
  uniform float maxDist;
  uniform float epsilon;
  uniform vec2 resolution;
  uniform vec3 cameraPos;
  uniform vec3 lightPos;

  float sphereSDF(vec3 samplePoint, vec3 pos, float radius) {
    return length(samplePoint - pos) - radius;
  }

  float sceneSDF(vec3 samplePoint) {
    return sphereSDF(samplePoint, vec3(0.0), 0.5);
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

  float calcDiffuse(vec3 pos, vec3 lightPos) {
    vec3 normal = estimateNormal(pos);
    vec3 toLightFromPos = normalize(lightPos - pos);
    float factor = clamp(dot(normal, toLightFromPos), 0.1, 1.0);
    return factor;
  }

  float calcSpecular(vec3 pos, vec3 lightPos, vec3 cameraPos) {
    vec3 normal = estimateNormal(pos);
    vec3 toCameraFromPos = normalize(cameraPos - pos);
    vec3 toLightFromPos = normalize(lightPos - pos);
    vec3 lightReflected = 2.0 * dot(normal, toLightFromPos) * normal - toLightFromPos;
    float factor = clamp(dot(toCameraFromPos, lightReflected), 0.0, 1.0);
    return pow(factor, 100.0);
  }

  void main() {
    vec3 dir = calcRay(45.0, resolution, gl_FragCoord.xy);
    float dist = distToScene(cameraPos, dir, minDist, maxDist);
    if (dist > maxDist - epsilon) {
      gl_FragColor = vec4(vec3(0.1), 1.0);
    } else {
      vec3 pos = cameraPos + dist * dir;
      float diffuse = calcDiffuse(pos, lightPos);
      float specular = calcSpecular(pos, lightPos, cameraPos);
      vec3 colour = vec3(0.0, 0.9, 0.5);
      gl_FragColor = vec4(colour * diffuse + vec3(1.0) * specular, 1.0);
    }    
  }
`;
