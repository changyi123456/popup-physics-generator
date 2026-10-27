import * as THREE from "./vendor/three.module.js";

// The book and its surroundings use the same paper-and-ink vocabulary as the mechanism.
export function paperMaterial(color, pitch = 1.8) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, toneMapped: false });
  material.onBeforeCompile = shader => {
    shader.uniforms.inkPitch = { value: pitch };
    shader.vertexShader = "varying vec3 vPaperPosition; varying vec3 vPaperNormal;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvPaperPosition = position; vPaperNormal = normal;");
    shader.fragmentShader = "varying vec3 vPaperPosition; varying vec3 vPaperNormal; uniform float inkPitch;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("void main() {", "#include <shadowmask_pars_fragment>\nvoid main() {");
    shader.fragmentShader = shader.fragmentShader.replace("#include <opaque_fragment>", `
      vec3 normalInk = normalize(vNormal);
      float lightInk = dot(normalInk, normalize(vec3(-0.45, 0.7, 0.55)));
      float shadeInk = 1.0 - smoothstep(-0.25, 0.65, lightInk);
      vec3 pn = abs(normalize(vPaperNormal));
      vec2 uvInk = pn.y > max(pn.x, pn.z) ? vPaperPosition.xz : (pn.x > pn.z ? vPaperPosition.zy : vPaperPosition.xy);
      float strokeInk = (uvInk.x + uvInk.y * 0.72) / inkPitch + sin(uvInk.y * 0.75) * 0.045;
      float aaInk = max(fwidth(strokeInk), 0.02);
      float hatchInk = 1.0 - smoothstep(0.025, 0.025 + aaInk, abs(fract(strokeInk) - 0.5));
      float toneInk = 0.83 + floor(clamp(lightInk * 0.5 + 0.5, 0.0, 0.99) * 4.0) * 0.055;
      vec3 paperInk = diffuseColor.rgb * toneInk * mix(0.78, 1.0, getShadowMask());
      outgoingLight = mix(paperInk, vec3(0.12, 0.18, 0.13), hatchInk * shadeInk * 0.32);
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey = () => "notebook-paper-1";
  return material;
}

export function inkEdges(mesh, color = "#394b38", opacity = 0.72) {
  const geometry = new THREE.EdgesGeometry(mesh.geometry, 24);
  const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  mesh.add(lines);
  return lines;
}
