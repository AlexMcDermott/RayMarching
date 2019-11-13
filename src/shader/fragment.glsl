precision mediump float;

uniform int maxSteps;
uniform float minDist;
uniform float maxDist;
uniform float epsilon;
uniform vec2 resolution;
uniform float FOV;
uniform vec3 cameraPos;
uniform mat4 rotationMatrix;
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

float sceneSDF(vec3 samplePoint) {
  float sphere = sphereSDF(samplePoint, objectPos, 1.0);
  return sphere;
}

float distToScene(vec3 dir) {
  float depth = minDist;
  for (int i = 0; i < 10000; i++) {
    if (i == maxSteps) return maxDist;
    float dist = sceneSDF(cameraPos + depth * dir);
    if (dist < epsilon) return depth;
    depth += dist;
    if (depth >= maxDist) return maxDist;
  }
}

vec3 calcDir() {
  vec2 point = 2.0 * (gl_FragCoord.xy / resolution) - 1.0;
  point *= tan(radians(FOV / 2.0)) * vec2(resolution.x / resolution.y, 1);
  vec3 dir = vec3(point, -1.0);
  vec4 dirRotated = rotationMatrix * vec4(dir, 1.0);
  return normalize(dirRotated.xyz);
}

vec3 estimateNormal(vec3 p) {
  return normalize(vec3(
    sceneSDF(vec3(p.x + epsilon, p.y, p.z)) - sceneSDF(vec3(p.x - epsilon, p.y, p.z)),
    sceneSDF(vec3(p.x, p.y + epsilon, p.z)) - sceneSDF(vec3(p.x, p.y - epsilon, p.z)),
    sceneSDF(vec3(p.x, p.y, p.z + epsilon)) - sceneSDF(vec3(p.x, p.y, p.z - epsilon))
  ));
}

float calcDiffuse(vec3 normal, vec3 toLight) {
  float factor = clamp(dot(normal, toLight), ambientMin, 1.0);
  return factor;
}

float calcSpecular(vec3 normal, vec3 toLight, vec3 toCamera) {
  vec3 lightReflected = 2.0 * dot(normal, toLight) * normal - toLight;
  float factor = clamp(dot(toCamera, lightReflected), 0.0, 1.0);
  return pow(factor, specularPower);
}

void main() {
  vec3 dir = calcDir();
  float dist = distToScene(dir);
  if (dist >= maxDist) {
    gl_FragColor = vec4(worldColourFactor * (worldColour / vec3(255)), 1.0);
  } else {
    vec3 hitPoint = cameraPos + dist * dir;
    vec3 normal = estimateNormal(hitPoint);
    vec3 toLightFromHit = normalize(lightPos - hitPoint);
    vec3 toCameraFromHit = normalize(cameraPos - hitPoint);
    float diffuse = diffuseFactor * calcDiffuse(normal, toLightFromHit);
    float specular = specularFactor * calcSpecular(normal, toLightFromHit, toCameraFromHit);
    gl_FragColor = vec4((objectColour / vec3(255)) * diffuse + vec3(1.0) * specular, 1.0);
  }    
}
