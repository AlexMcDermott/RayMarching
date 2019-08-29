export default `
  precision mediump float;

  uniform int maxSteps;
  uniform float minDist;
  uniform float maxDist;
  uniform float epsilon;
  uniform vec2 resolution;
  uniform float FOV;
  uniform vec3 cameraPos;
  uniform vec3 facing;
  uniform vec3 lightPos;
  uniform vec3 objectPos;
  uniform vec3 objectColour;
  uniform vec3 worldColour;
  uniform float Kd;
  uniform float Ks;
  uniform float ambientMin;
  uniform float specularPower;

  float sphereSDF(vec3 samplePoint, vec3 pos, float radius) {
    return length(samplePoint - pos) - radius;
  }

  float sceneSDF(vec3 samplePoint) {
    return sphereSDF(samplePoint, objectPos, 0.5);
  }

  float distToScene(vec3 camera, vec3 marchingDirection, float start, float end) {
    float depth = start;
    for (int i = 0; i < 10000; i++) {
      if (i == maxSteps) return end;
      float dist = sceneSDF(camera + depth * marchingDirection);
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
    vec3 dir = calcRay(FOV, resolution, gl_FragCoord.xy);
    float dist = distToScene(cameraPos, dir, minDist, maxDist);
    if (dist > maxDist - epsilon) {
      gl_FragColor = vec4(worldColour, 1.0);
    } else {
      vec3 pos = cameraPos + dist * dir;
      vec3 normal = estimateNormal(pos);
      vec3 toLightFromPos = normalize(lightPos - pos);
      vec3 toCameraFromPos = normalize(cameraPos - pos);
      float diffuse = calcDiffuse(normal, toLightFromPos);
      float specular = calcSpecular(normal, toLightFromPos, toCameraFromPos);
      gl_FragColor = vec4(objectColour * Kd * diffuse + vec3(1.0) * Ks * specular, 1.0);
    }    
  }
`;
