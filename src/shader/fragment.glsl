precision mediump float;

uniform int maxSteps;
uniform float minDist;
uniform float maxDist;
uniform float epsilon;
uniform vec2 resolution;
uniform int subSamples;
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

vec3 calcDir(vec2 pixelPos) {
  vec2 point = 2.0 * (pixelPos / resolution) - 1.0;
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

vec3 calcPhong(vec3 hitPoint) {
  vec3 normal = estimateNormal(hitPoint);
  vec3 toLight = normalize(lightPos - hitPoint);
  vec3 toCamera = normalize(cameraPos - hitPoint);
  vec3 lightReflected = 2.0 * dot(normal, toLight) * normal - toLight;
  float diffuse = diffuseFactor * clamp(dot(normal, toLight), ambientMin, 1.0);
  float specular = specularFactor * pow(clamp(dot(toCamera, lightReflected), 0.0, 1.0), specularPower);
  return (objectColour / vec3(255)) * diffuse + vec3(1.0) * specular;
}

vec3 rayMarch(vec2 pixelPos) {
  vec3 dir = calcDir(pixelPos);
  float dist = distToScene(dir);
  if (dist >= maxDist) {
    return worldColourFactor * worldColour / vec3(255);
  } else {
    vec3 hitPoint = cameraPos + dist * dir;
    return calcPhong(hitPoint);
  }
}

void main() {
  vec3 colour = vec3(0.0);
  vec2 pixelSize = vec2(1, resolution.x / resolution.y);
  for (int i = 0; i < 10000; i++) {
    if (i == subSamples) break;
    colour += rayMarch(gl_FragCoord.xy + vec2(i) * (pixelSize / vec2(subSamples + 1)));
  }
  gl_FragColor = vec4(colour / vec3(subSamples), 1.0);
}

