precision mediump float;

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
  vec3 lightReflected = 2.0 * dot(normal, toLight) * normal - toLight;
  float diffuse = diffuseFactor * clamp(dot(normal, toLight), ambientMin, 1.0);
  float specular = specularFactor * pow(clamp(dot(toCamera, lightReflected), 0.0, 1.0), specularPower);
  return (objectColour / vec3(255)) * diffuse + vec3(1.0) * specular;
}

vec3 backgroundColour(vec3 dir) {
  vec3 colour = (bgLightColour + bgDarkColour) / vec3(2.0);
  if (dynamicBg) {
    vec3 forward = normalize(vec3(dir.x, 0.0, dir.z));
    float factor = dot(forward, dir);
    if (dir.y >= 0.0) {
      colour = bgLightColour * factor + bgDarkColour * (1.0 - factor);
    } else {
      colour = factor * bgLightColour;
    }
  }
  return bgColourFactor * colour / vec3(255);
}

vec3 rayMarch(vec3 dir) {
  float depth = minDist;
  for (int i = 0; i < 10000; i++) {
    float dist = sceneSDF(depth * dir);
    depth += dist;
    if (i == maxSteps) break;
    if (dist < epsilon) break;
    if (depth >= maxDist) break;
  }
  if (depth >= maxDist) {
    return backgroundColour(dir);
  } else {
    vec3 hitPoint = depth * dir;
    return phong(hitPoint);
  }
}

vec3 antiAliasing(vec2 pixelPos) {
  vec3 colour = vec3(0.0);
  vec2 pixelSize = vec2(1, resolution.x / resolution.y);
  for (int i = 0; i < 10000; i++) {
    if (i == subSamples) break;
    vec3 dir = calcDir(pixelPos + vec2(i) * (pixelSize / vec2(subSamples + 1)));
    colour += rayMarch(dir);
  }
  return colour / vec3(subSamples);
}

void main() {
  vec3 colour = antiAliasing(gl_FragCoord.xy);
  gl_FragColor = vec4(colour, 1.0);
}