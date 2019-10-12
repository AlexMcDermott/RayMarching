precision mediump float;

uniform int maxSteps;
uniform float minDist;
uniform float maxDist;
uniform float epsilon;
uniform vec2 resolution;
uniform float FOV;
uniform vec3 cameraPos;
uniform vec3 lightPos;
uniform vec3 objectPos;
uniform vec3 objectColour;
uniform vec3 worldColour;
uniform float worldColourFactor;
uniform float diffuseFactor;
uniform float specularFactor;
uniform float ambientMin;
uniform float specularPower;

float sphereSDF(vec3 samplePoint, vec3 pos, float radius) {
  return length(samplePoint - pos) - radius;
}

float boxSDF(vec3 samplePoint, vec3 pos, vec3 size) {
  vec3 d = abs(samplePoint - pos) - size;
  return length(max(d, 0.0)) + min(max(size.x, max(size.y, size.z)), 0.0);
}

float sceneSDF(vec3 samplePoint) {
  // return sphereSDF(samplePoint, objectPos, 0.5);
  return boxSDF(samplePoint, objectPos, vec3(0.5));
}

float distToScene(vec3 cameraPos, vec3 dir, float start, float end) {
  float depth = start;
  for (int i = 0; i < 10000; i++) {
    if (i == maxSteps) return end;
    float dist = sceneSDF(cameraPos + depth * dir);
    if (dist < epsilon) return depth;
    depth += dist;
    if (depth >= end) return end;
  }
}

vec3 calcRay(vec3 origin, vec3 target, float FOV, vec2 fragCoord, vec2 resolution) {
  vec2 uv = 2.0 * (fragCoord / resolution) - 1.0;
  vec3 upGuide = vec3(0, 1, 0);
  vec3 forward = normalize(target - origin);
  vec3 right = normalize(cross(forward, upGuide));
  vec3 up = cross(right, forward);
  float h = tan(radians(FOV / 2.0));
  float w = h * (resolution.x / resolution.y);
  return normalize(forward + uv.x * w * right + uv.y * h * up);
}

vec3 estimateNormal(vec3 p, float epsilon) {
  return normalize(vec3(
    sceneSDF(vec3(p.x + epsilon, p.y, p.z)) - sceneSDF(vec3(p.x - epsilon, p.y, p.z)),
    sceneSDF(vec3(p.x, p.y + epsilon, p.z)) - sceneSDF(vec3(p.x, p.y - epsilon, p.z)),
    sceneSDF(vec3(p.x, p.y, p.z  + epsilon)) - sceneSDF(vec3(p.x, p.y, p.z - epsilon))
  ));
}

float calcDiffuse(vec3 normal, vec3 toLight, float ambientMin) {
  float factor = clamp(dot(normal, toLight), ambientMin, 1.0);
  return factor;
}

float calcSpecular(vec3 normal, vec3 toLight, vec3 toCamera, float specularPower) {
  vec3 lightReflected = 2.0 * dot(normal, toLight) * normal - toLight;
  float factor = clamp(dot(toCamera, lightReflected), 0.0, 1.0);
  return pow(factor, specularPower);
}

void main() {
  vec3 dir = calcRay(cameraPos, objectPos, FOV, gl_FragCoord.xy, resolution);
  float dist = distToScene(cameraPos, dir, minDist, maxDist);
  if (dist > maxDist - epsilon) {
    gl_FragColor = vec4(worldColourFactor * (worldColour / vec3(255)), 1.0);
  } else {
    vec3 hitPoint = cameraPos + dist * dir;
    vec3 normal = estimateNormal(hitPoint, epsilon);
    vec3 toLightFromHit = normalize(lightPos - hitPoint);
    vec3 toCameraFromHit = normalize(cameraPos - hitPoint);
    float diffuse = diffuseFactor * calcDiffuse(normal, toLightFromHit, ambientMin);
    float specular = specularFactor * calcSpecular(normal, toLightFromHit, toCameraFromHit, specularPower);
    gl_FragColor = vec4((objectColour / vec3(255)) * diffuse + vec3(1.0) * specular, 1.0);
  }    
}
