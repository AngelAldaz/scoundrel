// Fondo animado: remolino de pintura en WebGL, renderizado a baja resolución y escalado
// en "pixelated" (barato en móvil y con look retro). Fallback: degradado CSS.

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `
precision mediump float;
uniform vec2 res; uniform float t; uniform float energy;
uniform vec3 c1; uniform vec3 c2; uniform vec3 c3;
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / res.y;
  float r = length(uv);
  float a = atan(uv.y, uv.x) + t * 0.08 + 1.6 / (r + 0.7);
  uv = vec2(cos(a), sin(a)) * r * 1.6;
  for (int i = 1; i < 6; i++) {
    float fi = float(i);
    uv += vec2(sin(uv.y * 1.7 + t * 0.21 * energy + fi * 1.3), cos(uv.x * 1.9 - t * 0.17 * energy + fi * 0.7)) * 0.42 / fi;
  }
  float v = sin(length(uv) * 3.2 - t * 0.35) * 0.5 + 0.5;
  float w = sin(uv.x * 2.4 + uv.y * 1.3 + t * 0.12) * 0.5 + 0.5;
  vec3 col = mix(c3, c1, smoothstep(0.25, 0.75, v));
  col = mix(col, c2, smoothstep(0.62, 0.92, w) * 0.85);
  col *= 1.0 - 0.45 * smoothstep(0.35, 1.1, r);
  col = floor(col * 14.0 + 0.5) / 14.0;
  gl_FragColor = vec4(col, 1.0);
}`;

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

export function createBackground(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  let current = [hex('#1e5a8c'), hex('#c0392b'), hex('#0f2a40')];
  let target = current.map((c) => c.slice());
  let energy = 1;
  let energyTarget = 1;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!gl) {
    canvas.style.background = 'radial-gradient(circle at 50% 40%, #1e5a8c, #0f2a40)';
    return { setPalette() {}, pulse() {} };
  }

  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  const uRes = U('res'), uT = U('t'), uE = U('energy'), uC = [U('c1'), U('c2'), U('c3')];

  const SCALE = 5; // píxeles de pantalla por píxel de fondo
  function resize() {
    canvas.width = Math.max(32, Math.round(innerWidth / SCALE));
    canvas.height = Math.max(32, Math.round(innerHeight / SCALE));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  addEventListener('resize', resize);
  resize();

  let time = 0;
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!document.hidden) {
      energy += (energyTarget - energy) * 0.05;
      energyTarget += (1 - energyTarget) * 0.02;
      time += dt * (reduced ? 0.25 : 1) * energy;
      current = current.map((c, i) => c.map((v, j) => v + (target[i][j] - v) * 0.03));
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uT, time);
      gl.uniform1f(uE, energy);
      current.forEach((c, i) => gl.uniform3fv(uC[i], c));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    setPalette(colors) { target = colors.map(hex); },
    // Acelera el remolino un momento (golpes, victorias...).
    pulse(amount = 2.5) { energyTarget = Math.max(energyTarget, amount); },
  };
}
