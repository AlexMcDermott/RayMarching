precision highp float;

uniform int maxSteps;
uniform float minDist;
uniform float maxDist;
uniform float epsilon;
uniform vec2 resolution;
uniform int subSamples;
uniform float FOV;
uniform mat4 rotationMatrix;
uniform vec3 lightPos;
uniform vec3 objectPos;
uniform vec3 objectColour;
uniform bool dynamicBg;
uniform float bgColourFactor;
uniform vec3 bgLightColour;
uniform vec3 bgDarkColour;
uniform float diffuseFactor;
uniform float specularFactor;
uniform float ambientMin;
uniform float specularPower;
uniform bool renderFractal;
uniform int maxIterations;
uniform float fractalPower;
uniform float sphereRadius;
uniform int maxBounces;
uniform bool aoEnable;
uniform float aoStepSize;
uniform float aoFactor;
uniform int aoIterations;

float planeSDF(vec3 samplePoint, float height) {
  return dot(samplePoint + vec3(0.0, -height, 0.0), vec3(0.0, 1.0, 0.0));
}

float sphereSDF(vec3 samplePoint) {
  return length(samplePoint) - sphereRadius;
}

float mandelbulbSDF(vec3 samplePoint) {
  vec3 c = samplePoint;
  vec3 z = c;
  float dr = 1.0;
  float r = 0.0;
  for (int i = 0; i < 10000; i++) {
    if (i == maxIterations) break;
    r = length(z);
    if (r > 2.0) break;
    float theta = acos(z.z / r);
    float phi = atan(z.y, z.x);
    dr = pow(r, fractalPower - 1.0) * fractalPower * dr + 1.0;
    float zr = pow(r, fractalPower);
    theta = theta * fractalPower;
    phi = phi * fractalPower;
    z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
    z += c;
  }
  return 0.5 * log(r) * r / dr;
}

float sceneSDF(vec3 samplePoint) {
  samplePoint -= objectPos;
  if (renderFractal) {
    return mandelbulbSDF(samplePoint);
  } else {
    float plane = planeSDF(samplePoint, -sphereRadius);
    float sphere = sphereSDF(samplePoint);
    return min(plane, sphere);
  }
}

vec3 calcDir(vec2 pixelPos) {
  vec2 point = 2.0 * (pixelPos / resolution) - 1.0;
  point *= tan(radians(FOV / 2.0)) * vec2(resolution.x / resolution.y, 1);
  return normalize((rotationMatrix * vec4(point, -1.0, 1)).xyz);
}

vec3 estimateNormal(vec3 p) {
  return normalize(vec3(
    sceneSDF(p + vec3(epsilon, 0, 0)) - sceneSDF(p - vec3(epsilon, 0, 0)),
    sceneSDF(p + vec3(0, epsilon, 0)) - sceneSDF(p - vec3(0, epsilon, 0)),
    sceneSDF(p + vec3(0, 0, epsilon)) - sceneSDF(p - vec3(0, 0, epsilon))
  ));
}

vec3 phong(vec3 hitPoint) {
  vec3 normal = estimateNormal(hitPoint);
  vec3 toLight = normalize(lightPos - hitPoint);
  vec3 toCamera = normalize(-hitPoint);
  vec3 toHitPoint = normalize(hitPoint - lightPos);
  vec3 reflected = reflect(toHitPoint, normal);
  float diffuse = diffuseFactor * clamp(dot(normal, toLight), ambientMin, 1.0);
  float specular = specularFactor * pow(clamp(dot(toCamera, reflected), 0.0, 1.0), specularPower);
  return (objectColour / vec3(255)) * diffuse + vec3(specular);
}

vec3 backgroundColour(vec3 dir) {
  vec3 colour = (bgLightColour + bgDarkColour) / vec3(2.0);
  if (dynamicBg) {
    float factor = dot(normalize(vec3(dir.x, 0.0, dir.z)), dir);
    vec3 baseColour = bgLightColour * factor;
    colour = (dir.y >= 0.0 ? baseColour + bgDarkColour * (1.0 - factor) : baseColour);
  }
  return bgColourFactor * colour / vec3(255);
}

bool rayMarch(vec3 origin, vec3 dir, inout float depth, inout vec3 hitPoint) {
  depth = minDist;
  for (int i = 0; i < 10000; i++) {
    if (depth >= maxDist || i == maxSteps) return false;
    float dist = sceneSDF(origin + depth * dir);
    if (dist < epsilon) return true;
    depth += dist;
    hitPoint = origin + depth * dir;
  }
}

float ambientOcclusion(vec3 origin, vec3 normal) {
  if (!aoEnable) return 1.0;
  float ao;
  for (int i = 1; i < 10000; i++) {
    if (i == aoIterations + 1) return 1.0 - ao * aoFactor;
    float dist = aoStepSize * float(i);
    ao += max(0.0, (dist - sceneSDF(origin + normal * dist)) / dist);
  }
}

vec3 shade(vec3 dir) {
  bool hit = true;
  vec3 origin;
  float depth;
  vec3 hitPoint;
  vec3 colour;
  int bounces;
  for (int i = 0; i < 10000; i++) {
    if (i == maxBounces || !hit) return colour / vec3(i);
    hit = rayMarch(origin, dir, depth, hitPoint);
    vec3 hitPointNormal = estimateNormal(hitPoint);
    float fogFactor = clamp(depth / maxDist, 0.0, 1.0);
    vec3 c = phong(hitPoint) * (1.0 - fogFactor) + backgroundColour(dir) * fogFactor;
    colour += c * ambientOcclusion(hitPoint, hitPointNormal);
    dir = reflect(dir, hitPointNormal);
    origin = hitPoint + dir * epsilon;
  }
}

vec3 antiAliasing(vec2 pixelPos) {
  vec3 colour;
  vec2 pixelSize = vec2(1, resolution.x / resolution.y);
  for (int i = 0; i < 10000; i++) {
    if (i == subSamples) break;
    vec3 dir = calcDir(pixelPos + vec2(i) * (pixelSize / vec2(subSamples + 1)));
    colour += shade(dir);
  }
  return colour / vec3(subSamples);
}

void main() {
  vec3 colour = antiAliasing(gl_FragCoord.xy);
  gl_FragColor = vec4(colour, 1.0);
}