import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Float, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Download, X, Play, Square as StopIcon, Music, Upload, Film, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { CARD_THEMES, FONT_OPTIONS, drawCardToCanvas, drawDialogCardToCanvas, type CardTheme, type ExportFormat } from '../lib/contentExport';

// ── Wave types & corners ─────────────────────────────────────────────────────
export type WaveStyle = 'ribbon' | 'particle' | 'both';
export type Corner    = 'TL' | 'TR' | 'BL' | 'BR';

const CORNER_BASE_ANGLE: Record<Corner, number> = {
  TL: (Math.PI * 3) / 4,
  TR:  Math.PI / 4,
  BL: (Math.PI * 5) / 4,
  BR: (Math.PI * 7) / 4,
};

/** outward XY position of a corner given card width/height */
function cornerXY(c: Corner, w: number, h: number): [number, number] {
  return {
    TL: [-w / 2,  h / 2] as [number,number],
    TR: [ w / 2,  h / 2] as [number,number],
    BL: [-w / 2, -h / 2] as [number,number],
    BR: [ w / 2, -h / 2] as [number,number],
  }[c];
}

// ── Animated ribbon strand at a corner (GPU-friendly: mutates buffer in-place) ──
function RibbonStrand({
  cx, cy, baseAngle, idx, total, hexColor, speed = 1,
}: {
  cx: number; cy: number; baseAngle: number; idx: number; total: number;
  hexColor: string; speed?: number;
}) {
  const POINTS = 42;
  const spread  = Math.PI * 0.55;
  const frac    = total > 1 ? idx / (total - 1) : 0.5;
  const stAngle = baseAngle + (frac - 0.5) * spread;
  const phase   = frac * Math.PI * 2;
  const maxDist = 0.48 + (idx % 2) * 0.08;

  const posArr = useMemo(() => new Float32Array(POINTS * 3), []);
  const geo    = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    return g;
  }, [posArr]);
  const mat = useMemo(() => {
    // Shift color slightly per strand toward white for outer strands
    const base = new THREE.Color(hexColor);
    base.lerp(new THREE.Color('#ffffff'), idx / (total * 2.5));
    return new THREE.LineBasicMaterial({
      color: base,
      transparent: true,
      opacity: Math.max(0.12, 0.78 - idx * 0.11),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [hexColor, idx, total]);
  const line = useMemo(() => new THREE.Line(geo, mat), [geo, mat]);

  useFrame(() => {
    const t = Date.now() * 0.001 * speed;
    for (let i = 0; i < POINTS; i++) {
      const p    = i / (POINTS - 1);
      const dist = p * maxDist;
      const sway = Math.sin(t * (1.3 + idx * 0.25) + phase) * 0.22 * p;
      const wZ   = Math.sin(p * Math.PI * (2.5 + idx * 0.6) - t * (3.5 + idx * 0.35) + phase) * 0.13 * p;
      const ang  = stAngle + sway;
      posArr[i * 3]     = cx + Math.cos(ang) * dist;
      posArr[i * 3 + 1] = cy + Math.sin(ang) * dist;
      posArr[i * 3 + 2] = wZ;
    }
    geo.attributes.position.needsUpdate = true;
  });

  return <primitive object={line} />;
}

// ── Particle burst at a corner ───────────────────────────────────────────────
function CornerParticles({
  cx, cy, baseAngle, hexColor, speed = 1,
}: {
  cx: number; cy: number; baseAngle: number; hexColor: string; speed?: number;
}) {
  const N = 90;
  const posArr = useMemo(() => new Float32Array(N * 3), []);
  const geo    = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    return g;
  }, [posArr]);
  const mat = useMemo(() => new THREE.PointsMaterial({
    color: new THREE.Color(hexColor),
    size:  0.028,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  }), [hexColor]);
  const pts = useMemo(() => new THREE.Points(geo, mat), [geo, mat]);

  // Per-particle state, stable across renders
  const state = useMemo(() => Array.from({ length: N }, (_, i) => {
    const s   = 0.12 + Math.random() * 0.32;
    const ang = baseAngle + (Math.random() - 0.5) * Math.PI * 0.7;
    return {
      vx: Math.cos(ang) * s,
      vy: Math.sin(ang) * s,
      vz: (Math.random() - 0.5) * 0.09,
      life: Math.random(),
      maxLife: 0.9 + Math.random() * 0.9,
      wPhase: Math.random() * Math.PI * 2,
      wFreq:  2.5 + Math.random() * 3.5,
    };
  }), [baseAngle]);

  useFrame((_, dt) => {
    const t = Date.now() * 0.001 * speed;
    for (let i = 0; i < N; i++) {
      const s = state[i];
      s.life += dt * 0.55 * speed;
      if (s.life > s.maxLife) s.life = Math.random() * 0.05;
      const p   = s.life / s.maxLife;
      const wZ  = Math.sin(s.wPhase + t * 4 + p * Math.PI * s.wFreq) * 0.065 * p;
      posArr[i * 3]     = cx + s.vx * p;
      posArr[i * 3 + 1] = cy + s.vy * p;
      posArr[i * 3 + 2] = wZ + s.vz * p;
    }
    geo.attributes.position.needsUpdate = true;
  });

  return <primitive object={pts} />;
}

// ── Pulsing glow orb at the corner itself ────────────────────────────────────
function CornerOrb({ cx, cy, hexColor }: { cx: number; cy: number; hexColor: string }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    const s = 0.038 + Math.sin(Date.now() * 0.004) * 0.012;
    if (meshRef.current) meshRef.current.scale.setScalar(s / 0.04);
  });
  return (
    <mesh ref={meshRef} position={[cx, cy, 0.01]}>
      <sphereGeometry args={[0.04, 10, 10]} />
      <meshBasicMaterial color={hexColor} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

// ── Full corner wave group (ribbons + particles + orb) ────────────────────────
function CornerWaveGroup({
  corner, aspect, hexColor, style, speed,
}: {
  corner: Corner; aspect: number; hexColor: string; style: WaveStyle; speed: number;
}) {
  const h  = 2;
  const w  = h / aspect;
  const [cx, cy] = cornerXY(corner, w, h);
  const baseAngle = CORNER_BASE_ANGLE[corner];
  const STRANDS = 6;

  return (
    <>
      {(style === 'ribbon' || style === 'both') && (
        Array.from({ length: STRANDS }, (_, i) => (
          <RibbonStrand key={i} cx={cx} cy={cy} baseAngle={baseAngle}
            idx={i} total={STRANDS} hexColor={hexColor} speed={speed} />
        ))
      )}
      {(style === 'particle' || style === 'both') && (
        <CornerParticles cx={cx} cy={cy} baseAngle={baseAngle} hexColor={hexColor} speed={speed} />
      )}
      <CornerOrb cx={cx} cy={cy} hexColor={hexColor} />
    </>
  );
}

// ── Wave motion types ─────────────────────────────────────────────────────────
export type WaveMotion = 'fan' | 'circular' | 'cross';

// ── Circular ribbons: spiral inward from perimeter toward card center ──────────
function CircularRibbon({ idx, total, aspect, hexColor, speed }: {
  idx: number; total: number; aspect: number; hexColor: string; speed: number;
}) {
  const POINTS = 52;
  const h = 2; const w = h / aspect;
  const posArr = useMemo(() => new Float32Array(POINTS * 3), []);
  const { geo, line } = useMemo(() => {
    const base = new THREE.Color(hexColor);
    base.lerp(new THREE.Color('#ffffff'), idx / (total * 2.2));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    const m = new THREE.LineBasicMaterial({
      color: base, transparent: true,
      opacity: Math.max(0.1, 0.72 - idx * 0.09),
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    return { geo: g, line: new THREE.Line(g, m) };
  }, [hexColor, idx, total, posArr]);
  const phase = (idx / total) * Math.PI * 2;
  const arcSweep = Math.PI * (1.3 + (idx % 3) * 0.28);
  const sX = w / 2 + 0.05; const sY = h / 2 + 0.05;
  useFrame(() => {
    const t = Date.now() * 0.001 * speed;
    for (let i = 0; i < POINTS; i++) {
      const p = i / (POINTS - 1);
      const angle  = t * 0.6 + phase + p * arcSweep;
      const radius = Math.max(0.01, 1 - p * 0.97) + Math.sin(p * Math.PI * 3 - t * 2 + phase) * 0.04 * (1 - p);
      const zWave  = Math.sin(p * Math.PI * 5 - t * 3.5 + phase) * 0.14 * (1 - p);
      posArr[i*3]   = Math.cos(angle) * radius * sX;
      posArr[i*3+1] = Math.sin(angle) * radius * sY;
      posArr[i*3+2] = zWave;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return <primitive object={line} />;
}

// ── Crossing ribbons: diagonal / horizontal / vertical arcs through center ─────
function CrossRibbon({ idx, total, aspect, hexColor, speed }: {
  idx: number; total: number; aspect: number; hexColor: string; speed: number;
}) {
  const POINTS = 48;
  const h = 2; const w = h / aspect;
  const posArr = useMemo(() => new Float32Array(POINTS * 3), []);
  const { geo, line } = useMemo(() => {
    const base = new THREE.Color(hexColor);
    base.lerp(new THREE.Color('#ffffff'), idx / (total * 3));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    const m = new THREE.LineBasicMaterial({
      color: base, transparent: true,
      opacity: Math.max(0.1, 0.65 - idx * 0.07),
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    return { geo: g, line: new THREE.Line(g, m) };
  }, [hexColor, idx, total, posArr]);
  const type   = idx % 4;
  const offset = (Math.floor(idx / 4) - 0.5) * 0.7;
  const phase  = (idx / total) * Math.PI * 2;
  useFrame(() => {
    const t     = Date.now() * 0.001 * speed;
    const drift = Math.sin(t * 0.4 + phase) * 0.12;
    for (let i = 0; i < POINTS; i++) {
      const p = i / (POINTS - 1);
      let x: number, y: number;
      if      (type === 0) { x = (p - 0.5) * (w + 0.4);  y = -(p - 0.5) * (h + 0.4) + offset + drift; }
      else if (type === 1) { x = -(p - 0.5) * (w + 0.4); y = -(p - 0.5) * (h + 0.4) + offset + drift; }
      else if (type === 2) { x = (p - 0.5) * (w + 0.4);  y = offset + drift; }
      else                 { x = offset + drift;           y = (p - 0.5) * (h + 0.4); }
      const wX = Math.sin(p * Math.PI * 4 - t * 2.5 + phase) * 0.08;
      const wY = Math.sin(p * Math.PI * 3 - t * 1.8 + phase + 1) * 0.08;
      const wZ = Math.sin(p * Math.PI * 5 - t * 3   + phase) * 0.1;
      posArr[i*3]   = x + wX; posArr[i*3+1] = y + wY; posArr[i*3+2] = wZ;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return <primitive object={line} />;
}

function CircularWaveField({ aspect, hexColor, speed }: { aspect: number; hexColor: string; speed: number }) {
  return <>{Array.from({ length: 6 }, (_, i) => <CircularRibbon key={i} idx={i} total={6} aspect={aspect} hexColor={hexColor} speed={speed} />)}</>;
}

function CrossWaveField({ aspect, hexColor, speed }: { aspect: number; hexColor: string; speed: number }) {
  return <>{Array.from({ length: 8 }, (_, i) => <CrossRibbon key={i} idx={i} total={8} aspect={aspect} hexColor={hexColor} speed={speed} />)}</>;
}

// ── 3D Template definitions ──────────────────────────────────────────────────
export type TemplateCategory = 'classic' | 'space' | 'sky' | 'nature' | 'creative';
export type Template3D = 'float' | 'prismatic' | 'parallax' | 'hologram' | 'vortex'
  | 'solar' | 'galaxy' | 'nebula' | 'nightsky' | 'moon'
  | 'sun' | 'clouds' | 'sunset' | 'snow' | 'thunder'
  | 'ocean' | 'volcano' | 'earth' | 'forest' | 'rain'
  | 'matrix' | 'fireworks' | 'neon' | 'plasma' | 'glitch';

interface TemplateOption { id: Template3D; name: string; desc: string; category: TemplateCategory; }
const TEMPLATE_3D_OPTIONS: TemplateOption[] = [
  // Classic — Professional card styles
  { id: 'float',    name: 'Float',       desc: 'Hovering card with soft glow',         category: 'classic'  },
  { id: 'prismatic',name: 'Prismatic',   desc: 'Crystal edge refraction, premium',      category: 'classic'  },
  { id: 'parallax', name: 'Parallax',    desc: 'Deep space particle field',             category: 'classic'  },
  { id: 'hologram', name: 'Hologram',    desc: 'Scan-line shimmer & interference rings',category: 'classic'  },
  { id: 'vortex',   name: 'Vortex',      desc: 'Spiral particles converging to center', category: 'classic'  },
  // Space — Cosmic & astronomical
  { id: 'solar',    name: 'Solar System',desc: 'Planets orbit your card in formation',  category: 'space'    },
  { id: 'galaxy',   name: 'Galaxy',      desc: 'Rotating spiral arms of star dust',     category: 'space'    },
  { id: 'nebula',   name: 'Nebula',      desc: 'Colorful cosmic gas cloud in 3 hues',  category: 'space'    },
  { id: 'nightsky', name: 'Night Sky',   desc: 'Dense stars with shooting star trails', category: 'space'    },
  { id: 'moon',     name: 'Moon Waves',  desc: 'Silver orbit particles & crater rings', category: 'space'    },
  // Sky — Atmosphere & weather
  { id: 'sun',      name: 'Sun Waves',   desc: 'Solar corona rays & flare particles',   category: 'sky'      },
  { id: 'clouds',   name: 'Clouds',      desc: 'Layered drifting cloud ribbons',        category: 'sky'      },
  { id: 'sunset',   name: 'Sunset',      desc: 'Warm sun glow with horizon bands',      category: 'sky'      },
  { id: 'snow',     name: 'Snow',        desc: 'Snowflakes drifting in the wind',       category: 'sky'      },
  { id: 'thunder',  name: 'Thunder',     desc: 'Lightning bolts & spark particles',     category: 'sky'      },
  // Nature — Earth & environment
  { id: 'ocean',    name: 'Ocean',       desc: 'Undulating waves with rising bubbles',  category: 'nature'   },
  { id: 'volcano',  name: 'Volcano',     desc: 'Lava eruption with heat-colour embers', category: 'nature'   },
  { id: 'earth',    name: 'Aurora',      desc: 'Northern-lights curtains sweep the card',category:'nature'   },
  { id: 'forest',   name: 'Forest',      desc: 'Autumn leaves drifting in the breeze',  category: 'nature'   },
  { id: 'rain',     name: 'Rain',        desc: 'Silver rain streaks with splash dots',  category: 'nature'   },
  // Creative — Digital & artistic effects
  { id: 'matrix',   name: 'Matrix',      desc: 'Green digital rain columns',            category: 'creative' },
  { id: 'fireworks',name: 'Fireworks',   desc: 'Periodic colorful burst explosions',    category: 'creative' },
  { id: 'neon',     name: 'Neon Grid',   desc: 'Glowing neon city grid with color shift',category:'creative' },
  { id: 'plasma',   name: 'Plasma',      desc: 'Dense animated energy field in color',  category: 'creative' },
  { id: 'glitch',   name: 'Glitch',      desc: 'RGB split horizontal band disruption',  category: 'creative' },
];

const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string; color: string }[] = [
  { id: 'classic',  label: 'Classic',  color: '#818cf8' },
  { id: 'space',    label: 'Space',    color: '#a78bfa' },
  { id: 'sky',      label: 'Sky',      color: '#38bdf8' },
  { id: 'nature',   label: 'Nature',   color: '#4ade80' },
  { id: 'creative', label: 'Creative', color: '#f472b6' },
];

// ── Helpers shared across new templates ──────────────────────────────────────
function makePointSystem(N: number, color: string | null, size: number) {
  const posArr = new Float32Array(N * 3);
  const colArr = color ? null : new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  if (colArr) geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
  const mat = new THREE.PointsMaterial({
    ...(color ? { color: new THREE.Color(color) } : { vertexColors: true }),
    size, transparent: true, opacity: 0.88,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  return { posArr, colArr, geo, pts: new THREE.Points(geo, mat) };
}

function makeLineObj(posArr: Float32Array, color: string, opacity: number) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  const mat = new THREE.LineBasicMaterial({
    color: new THREE.Color(color), transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  return { geo, line: new THREE.Line(geo, mat) };
}

// ── 🪐 SOLAR SYSTEM ──────────────────────────────────────────────────────────
const PLANETS_DATA = [
  { r: 0.85, spd: 1.1,  sz: 0.04,  col: '#ff6b35', tilt: 0.5, ph: 0 },
  { r: 1.2,  spd: 0.7,  sz: 0.055, col: '#4dd0e1', tilt: 1.2, ph: 1.8 },
  { r: 1.65, spd: 0.45, sz: 0.05,  col: '#81c784', tilt: 2.0, ph: 3.5 },
  { r: 2.1,  spd: 0.28, sz: 0.075, col: '#ffb300', tilt: 0.8, ph: 0.9 },
  { r: 2.6,  spd: 0.15, sz: 0.065, col: '#ce93d8', tilt: 1.5, ph: 2.5 },
];

function OrbitPlanet({ r, spd, sz, col, tilt, ph }: typeof PLANETS_DATA[0]) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    const t = Date.now() * 0.001 * spd + ph;
    const tk = Math.PI * 0.08 * tilt;
    ref.current.position.set(Math.cos(t) * r, Math.sin(t) * Math.sin(tk) * r, Math.sin(t) * Math.cos(tk) * r * 0.22 - 0.5);
  });
  return (
    <>
      <mesh rotation={[Math.PI * 0.5 - 0.08 * tilt, 0, ph]}>
        <torusGeometry args={[r, 0.003, 4, 72]} />
        <meshBasicMaterial color={col} transparent opacity={0.13} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={ref}>
        <sphereGeometry args={[sz, 10, 10]} />
        <meshBasicMaterial color={col} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  );
}

function SolarSystemBg() {
  return (
    <>
      <Stars radius={9} depth={5} count={1500} factor={0.5} saturation={0.3} fade speed={0.15} />
      <mesh position={[0, 0, -2]}>
        <sphereGeometry args={[0.55, 16, 16]} /><meshBasicMaterial color="#ffe566" transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, -2]}>
        <sphereGeometry args={[1.15, 16, 16]} /><meshBasicMaterial color="#ff9500" transparent opacity={0.07} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {PLANETS_DATA.map((p, i) => <OrbitPlanet key={i} {...p} />)}
    </>
  );
}

// ── ☀️ SUN WAVES ─────────────────────────────────────────────────────────────
function SolarRay({ idx, total }: { idx: number; total: number }) {
  const POINTS = 36;
  const posArr = useMemo(() => new Float32Array(POINTS * 3), []);
  const { geo, line } = useMemo(() => makeLineObj(posArr,
    idx % 3 === 0 ? '#fff8dc' : idx % 3 === 1 ? '#ffd700' : '#ff9500',
    0.48 - (idx % 4) * 0.06), [idx, posArr]);
  const baseAngle = (idx / total) * Math.PI * 2;
  const phase = baseAngle;
  useFrame(() => {
    const t = Date.now() * 0.001;
    const sway = Math.sin(t * 0.9 + phase) * 0.09;
    const len  = 1.5 + Math.sin(t * 1.3 + phase * 1.6) * 0.32;
    for (let i = 0; i < POINTS; i++) {
      const p  = i / (POINTS - 1);
      const sp = Math.sin(p * Math.PI) * sway;
      posArr[i*3]   = Math.cos(baseAngle + sp) * p * len;
      posArr[i*3+1] = Math.sin(baseAngle + sp) * p * len;
      posArr[i*3+2] = -2 + Math.sin(p * Math.PI * 2 - t * 2.2 + phase) * 0.09 * p;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return <primitive object={line} />;
}

function SunFlares() {
  const N = 90;
  const { posArr, geo, pts } = useMemo(() => makePointSystem(N, '#ffdd00', 0.032), []);
  const state = useMemo(() => Array.from({ length: N }, () => {
    const ang = Math.random() * Math.PI * 2;
    const spd = 0.22 + Math.random() * 0.5;
    return { vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd, life: Math.random(), maxLife: 1+Math.random(), ph: Math.random()*Math.PI*2 };
  }), []);
  useFrame((_, dt) => {
    for (let i = 0; i < N; i++) {
      const s = state[i];
      s.life += dt * 0.42; if (s.life > s.maxLife) s.life = 0;
      const p = s.life / s.maxLife;
      posArr[i*3] = s.vx*p; posArr[i*3+1] = s.vy*p;
      posArr[i*3+2] = -2 + Math.sin(s.ph + p * Math.PI) * 0.14;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return <primitive object={pts} />;
}

function SunWavesBg() {
  const RAYS = 18;
  return (
    <>
      {[0.5,1.1,2.2].map((r,i) => (
        <mesh key={i} position={[0,0,-2]}>
          <sphereGeometry args={[r,16,16]} />
          <meshBasicMaterial color={i===0?'#fffde7':i===1?'#ffcc00':'#ff8800'} transparent opacity={i===0?0.38:i===1?0.09:0.035} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      {Array.from({length:RAYS},(_,i)=><SolarRay key={i} idx={i} total={RAYS}/>)}
      <SunFlares/>
    </>
  );
}

// ── 🌙 MOON WAVES ────────────────────────────────────────────────────────────
function MoonOrbitParticles() {
  const N = 130;
  const { posArr, geo, pts } = useMemo(() => makePointSystem(N, '#c8d8e8', 0.019), []);
  const state = useMemo(() => Array.from({ length: N }, (_, i) => ({
    radius: 1.0 + (i%4) * 0.26, spd: 0.38 + Math.random()*0.32,
    phase: (i/N)*Math.PI*2, tilt: (Math.random()-0.5)*Math.PI*0.28,
  })), []);
  useFrame(() => {
    const t = Date.now() * 0.001;
    for (let i = 0; i < N; i++) {
      const s = state[i]; const ang = t*s.spd + s.phase;
      posArr[i*3]   = Math.cos(ang)*s.radius;
      posArr[i*3+1] = Math.sin(ang)*Math.sin(s.tilt)*s.radius*0.55;
      posArr[i*3+2] = Math.sin(ang)*Math.cos(s.tilt)*s.radius*0.18 - 0.3;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return <primitive object={pts} />;
}

function MoonWavesBg() {
  const moonRef = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    const t = Date.now() * 0.001;
    moonRef.current.position.set(Math.cos(t*0.28)*2.3, Math.sin(t*0.28)*0.32, Math.sin(t*0.28)*0.3-0.45);
    moonRef.current.rotation.y = t * 0.18;
  });
  return (
    <>
      <Stars radius={9} depth={5} count={2200} factor={0.38} saturation={0} fade speed={0.08} />
      <mesh ref={moonRef}>
        <sphereGeometry args={[0.3,20,20]} />
        <meshStandardMaterial color="#dde8f0" emissive="#8899aa" emissiveIntensity={0.42} roughness={0.9} />
      </mesh>
      {[0.72,1.25,1.85].map((r,i)=>(
        <mesh key={i} rotation={[Math.PI*0.5,0,0]}>
          <torusGeometry args={[r,0.005,5,80]} />
          <meshBasicMaterial color="#aabbcc" transparent opacity={0.07} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      <MoonOrbitParticles />
    </>
  );
}

// ── 🌍 EARTH / AURORA WAVES ──────────────────────────────────────────────────
const AURORA_COLORS = ['#00ff88','#00ddff','#aa44ff','#44ffaa','#0088ff','#ff44cc','#22ffdd'];

function AuroraRibbon({ idx, total }: { idx: number; total: number }) {
  const POINTS = 52;
  const posArr = useMemo(() => new Float32Array(POINTS * 3), []);
  const { geo, line } = useMemo(() => makeLineObj(posArr, AURORA_COLORS[idx % AURORA_COLORS.length], 0.38 - idx*0.02), [idx, posArr]);
  const phase = (idx / total) * Math.PI * 2;
  const yBase = 2.0 - idx * 0.42;
  useFrame(() => {
    const t = Date.now() * 0.001;
    for (let i = 0; i < POINTS; i++) {
      const p = i/(POINTS-1);
      posArr[i*3]   = (p-0.5)*4.8;
      posArr[i*3+1] = yBase + Math.sin(p*Math.PI*3.5 - t*1.4 + phase)*0.28;
      posArr[i*3+2] = Math.sin(p*Math.PI*2.2 - t*0.9 + phase)*0.32;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return <primitive object={line} />;
}

function EarthWavesBg() {
  return (
    <>
      <Stars radius={9} depth={4} count={800} factor={0.38} saturation={0.8} fade speed={0.18} />
      <mesh position={[0,-3.2,-1]}>
        <sphereGeometry args={[2.4,16,16]} /><meshBasicMaterial color="#1a66cc" transparent opacity={0.11} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {Array.from({length:8},(_,i)=><AuroraRibbon key={i} idx={i} total={8}/>)}
    </>
  );
}

// ── 🌋 VOLCANO ────────────────────────────────────────────────────────────────
function VolcanoBg({ aspect }: { aspect: number }) {
  const N = 220;
  const h = 2; const yOrigin = -(h/2 + 0.45);
  const { posArr, colArr, geo, pts } = useMemo(() => makePointSystem(N, null, 0.034), []);
  const HEAT = useMemo(() => [
    new THREE.Color('#fffbe0'), new THREE.Color('#ffcc00'),
    new THREE.Color('#ff6600'), new THREE.Color('#cc1100'),
  ], []);
  const state = useMemo(() => Array.from({length:N}, () => {
    const sp = (Math.random()-0.5)*0.55;
    const v  = 0.5 + Math.random()*1.3;
    return { x:sp, vx:sp*0.3+(Math.random()-0.5)*0.18, vy:v, vz:(Math.random()-0.5)*0.18,
             life:Math.random(), maxLife:0.7+Math.random()*1.1 };
  }), []);
  useFrame((_,dt)=>{
    for(let i=0;i<N;i++){
      const s=state[i]; s.life+=dt*0.52; if(s.life>s.maxLife){s.life=Math.random()*0.04; s.x=(Math.random()-0.5)*0.5;}
      const p=s.life/s.maxLife;
      posArr[i*3]  =s.x+s.vx*p*0.5;
      posArr[i*3+1]=yOrigin+s.vy*p-0.75*p*p;
      posArr[i*3+2]=s.vz*p;
      const hi=p*(HEAT.length-1); const hf=Math.floor(hi); const hfrac=hi-hf;
      const c1=HEAT[Math.min(hf,HEAT.length-1)]; const c2=HEAT[Math.min(hf+1,HEAT.length-1)];
      colArr![i*3]=c1.r+(c2.r-c1.r)*hfrac; colArr![i*3+1]=c1.g+(c2.g-c1.g)*hfrac; colArr![i*3+2]=c1.b+(c2.b-c1.b)*hfrac;
    }
    geo.attributes.position.needsUpdate=true; geo.attributes.color.needsUpdate=true;
  });
  return (
    <>
      <mesh position={[0,yOrigin-0.2,-0.25]}>
        <sphereGeometry args={[0.7,12,12]}/><meshBasicMaterial color="#ff4400" transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false}/>
      </mesh>
      <primitive object={pts}/>
    </>
  );
}

// ── 🌌 GALAXY ─────────────────────────────────────────────────────────────────
function GalaxyBg() {
  const N = 2200;
  const initAngle  = useMemo(() => new Float32Array(N), []);
  const initRadius = useMemo(() => new Float32Array(N), []);
  const { posArr, colArr, geo, pts } = useMemo(() => {
    const sys = makePointSystem(N, null, 0.016);
    for (let i = 0; i < N; i++) {
      const arm  = i % 2;
      const r    = 0.18 + Math.pow(Math.random(), 0.48) * 2.6;
      const ang  = (arm/2)*Math.PI*2 + r*3.1 + (Math.random()-0.5)*0.5;
      initAngle[i] = ang; initRadius[i] = r;
      sys.posArr[i*3]   = Math.cos(ang)*r;
      sys.posArr[i*3+1] = (Math.random()-0.5)*0.1;
      sys.posArr[i*3+2] = Math.sin(ang)*r*0.28 - 1.5;
      const c = new THREE.Color(); c.setHSL(0.62-r/8, 0.72, 0.45+(1-r/2.8)*0.42);
      sys.colArr![i*3]=c.r; sys.colArr![i*3+1]=c.g; sys.colArr![i*3+2]=c.b;
    }
    return sys;
  }, [initAngle, initRadius]);
  useFrame(()=>{
    const t=Date.now()*0.001;
    for(let i=0;i<N;i++){
      const r=initRadius[i]; const spd=0.04/(r+0.28);
      const ang=initAngle[i]+t*spd;
      posArr[i*3]=Math.cos(ang)*r; posArr[i*3+2]=Math.sin(ang)*r*0.28-1.5;
    }
    geo.attributes.position.needsUpdate=true;
  });
  return (
    <>
      <mesh position={[0,0,-1.5]}>
        <sphereGeometry args={[0.32,12,12]}/><meshBasicMaterial color="#ffe8b0" transparent opacity={0.26} blending={THREE.AdditiveBlending} depthWrite={false}/>
      </mesh>
      <primitive object={pts}/>
    </>
  );
}

// ── ⚡ THUNDER / LIGHTNING ─────────────────────────────────────────────────────
function ThunderBolt({ idx, total, aspect }: { idx: number; total: number; aspect: number }) {
  const SEGS = 14;
  const h = 2; const w = h / aspect;
  const posArr = useMemo(() => new Float32Array((SEGS + 1) * 3), []);
  const { geo, line } = useMemo(() => makeLineObj(posArr,
    idx % 3 === 0 ? '#ffffff' : idx % 3 === 1 ? '#88aaff' : '#bbccff',
    idx === 0 ? 1.0 : Math.max(0.08, 0.72 - idx * 0.12)), [idx, posArr]);
  const clock   = useRef(0);
  const zigzag  = useRef(Array.from({ length: SEGS }, () => (Math.random() - 0.5) * 0.5));
  const visible = useRef(0);
  const interval = useRef(0.35 + Math.random() * 1.8);
  const xBase   = ((idx / Math.max(total - 1, 1)) - 0.5) * w * 1.15;
  useFrame((_, dt) => {
    clock.current += dt;
    if (clock.current > interval.current) {
      clock.current = 0; interval.current = 0.2 + Math.random() * 2.2;
      zigzag.current = Array.from({ length: SEGS }, () => (Math.random() - 0.5) * 0.65);
      visible.current = 1.0;
    }
    visible.current = Math.max(0, visible.current - dt * 4.5);
    (line.material as THREE.LineBasicMaterial).opacity = visible.current * (idx === 0 ? 1.0 : Math.max(0.05, 0.6 - idx * 0.1));
    const yTop = h / 2 + 0.3; const yBot = -(h / 2 + 0.3);
    for (let i = 0; i <= SEGS; i++) {
      const p = i / SEGS;
      posArr[i*3]   = xBase + zigzag.current[Math.min(i, SEGS - 1)] * Math.sin(p * Math.PI);
      posArr[i*3+1] = yTop + p * (yBot - yTop);
      posArr[i*3+2] = 0.01;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return <primitive object={line} />;
}

function ThunderParticles() {
  const N = 100;
  const { posArr, geo, pts } = useMemo(() => makePointSystem(N, '#99bbff', 0.022), []);
  const state = useMemo(() => Array.from({ length: N }, () => ({
    x: (Math.random() - 0.5) * 2.8, y: (Math.random() - 0.5) * 2.8,
    vx: (Math.random() - 0.5) * 0.7, vy: (Math.random() - 0.5) * 0.7,
    life: Math.random(), maxLife: 0.15 + Math.random() * 0.45,
  })), []);
  useFrame((_, dt) => {
    for (let i = 0; i < N; i++) {
      const s = state[i]; s.life += dt;
      if (s.life > s.maxLife) { s.life = 0; s.x = (Math.random() - 0.5) * 2.8; s.y = (Math.random() - 0.5) * 2.8; }
      const p = s.life / s.maxLife;
      posArr[i*3] = s.x + s.vx * p * 0.5; posArr[i*3+1] = s.y + s.vy * p * 0.5;
      posArr[i*3+2] = (Math.random() - 0.5) * 0.06;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return <primitive object={pts} />;
}

function ThunderBg({ aspect }: { aspect: number }) {
  return (
    <>
      <Stars radius={8} depth={4} count={600} factor={0.28} saturation={0.3} fade speed={0.05} />
      <mesh position={[0, 0, -1]}>
        <sphereGeometry args={[1.1, 12, 12]} />
        <meshBasicMaterial color="#1122cc" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => <ThunderBolt key={i} idx={i} total={5} aspect={aspect} />)}
      <ThunderParticles />
    </>
  );
}

// ── 🌠 NIGHT SKY (shooting stars + milky way) ────────────────────────────────
function ShootingStar({ idx }: { idx: number }) {
  const PTS = 22;
  const posArr = useMemo(() => new Float32Array(PTS * 3), []);
  const { geo, line } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    return { geo: g, line: new THREE.Line(g, new THREE.LineBasicMaterial({
      color: '#ffffff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    })) };
  }, [posArr]);
  const clock  = useRef(0); const delay = useRef(idx * 1.6 + Math.random() * 3);
  const active = useRef(false); const life = useRef(0);
  const sx = useRef(0); const sy = useRef(0); const vx = useRef(0); const vy = useRef(0);
  useFrame((_, dt) => {
    const mat = line.material as THREE.LineBasicMaterial;
    if (!active.current) {
      mat.opacity = 0; clock.current += dt;
      if (clock.current > delay.current) {
        clock.current = 0; delay.current = 3 + Math.random() * 8;
        sx.current = (Math.random() * 0.5 - 1.2) * 3.5; sy.current = 1.3 + Math.random() * 0.9;
        const spd = 2.8 + Math.random() * 2.2; const ang = -Math.PI * 0.22 + (Math.random() - 0.5) * 0.35;
        vx.current = Math.cos(ang) * spd; vy.current = Math.sin(ang) * spd;
        life.current = 0; active.current = true;
      }
    } else {
      life.current += dt; const maxL = 0.32 + Math.random() * 0.12;
      if (life.current > maxL) { active.current = false; return; }
      mat.opacity = Math.max(0, (1 - life.current / maxL)) * 0.95;
      const trail = 0.42;
      for (let i = 0; i < PTS; i++) {
        const t = i / (PTS - 1); const lt = life.current - trail * (1 - t);
        posArr[i*3]   = lt < 0 ? sx.current : sx.current + vx.current * lt;
        posArr[i*3+1] = lt < 0 ? sy.current : sy.current + vy.current * lt;
        posArr[i*3+2] = 0;
      }
      geo.attributes.position.needsUpdate = true;
    }
  });
  return <primitive object={line} />;
}
function NightSkyBg() {
  return (
    <>
      <Stars radius={10} depth={6} count={3200} factor={0.62} saturation={0.18} fade speed={0.04} />
      <mesh position={[0, 0, -4]} rotation={[0, 0, Math.PI * 0.12]}>
        <planeGeometry args={[12, 3.5]} />
        <meshBasicMaterial color="#8899dd" transparent opacity={0.025} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {Array.from({ length: 4 }, (_, i) => <ShootingStar key={i} idx={i} />)}
    </>
  );
}

// ── ☁️ CLOUDS (layered drifting ribbons + puff spheres) ───────────────────────
function CloudLayer({ idx }: { idx: number }) {
  const PTS = 45;
  const posArr = useMemo(() => new Float32Array(PTS * 3), []);
  const { geo, line } = useMemo(() => makeLineObj(posArr,
    idx % 2 === 0 ? '#dde8f8' : '#bbd0e8', Math.max(0.04, 0.22 - idx * 0.016)), [idx, posArr]);
  const yBase = 1.5 - idx * 0.36; const phase = idx * 2.1;
  const spd = (0.032 + (idx % 3) * 0.022) * (idx % 2 === 0 ? 1 : -1);
  const xOff = useRef(Math.random() * 6);
  useFrame((_, dt) => {
    xOff.current += spd * dt;
    if (xOff.current > 5) xOff.current -= 10; if (xOff.current < -5) xOff.current += 10;
    const t = Date.now() * 0.001;
    for (let i = 0; i < PTS; i++) {
      const p = i / (PTS - 1);
      posArr[i*3]   = -5 + p * 10 + xOff.current;
      posArr[i*3+1] = yBase + Math.sin(p*Math.PI*2.5+phase)*0.14 + Math.sin(p*Math.PI*6+t*0.28+phase)*0.042;
      posArr[i*3+2] = -0.4 + idx * 0.07;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return <primitive object={line} />;
}
function CloudsBg() {
  return (
    <>
      <mesh position={[0, 0, -3]}>
        <sphereGeometry args={[5, 8, 8]} />
        <meshBasicMaterial color="#1a3050" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => <CloudLayer key={i} idx={i} />)}
      {([[-1.1,0.7,0.4],[1.1,0.3,0.35],[0,1.05,0.38],[-0.4,-0.35,0.28]] as [number,number,number][]).map(([x,y,r],i)=>(
        <mesh key={i} position={[x, y, 0.04]}>
          <sphereGeometry args={[r, 10, 10]} />
          <meshBasicMaterial color="#ccddee" transparent opacity={0.07} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

// ── 🌅 SUNSET (sun glow + horizon bands + heat shimmer) ───────────────────────
function SunsetHeat() {
  const N = 80;
  const { posArr, geo, pts } = useMemo(() => makePointSystem(N, '#ff8833', 0.019), []);
  const state = useMemo(() => Array.from({ length: N }, () => ({
    x: (Math.random()-0.5)*3, vx:(Math.random()-0.5)*0.08, vy:0.3+Math.random()*0.6,
    life:Math.random(), maxLife:1.2+Math.random()*1.5,
  })), []);
  useFrame((_, dt) => {
    for (let i = 0; i < N; i++) {
      const s = state[i]; s.life += dt;
      if (s.life > s.maxLife) { s.life = 0; s.x = (Math.random()-0.5)*3; }
      const p = s.life / s.maxLife;
      posArr[i*3] = s.x + s.vx * p; posArr[i*3+1] = -1.8 + s.vy * p;
      posArr[i*3+2] = (Math.random()-0.5)*0.04;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return <primitive object={pts} />;
}
function SunsetBg() {
  const sunRef = useRef<THREE.Mesh>(null!);
  useFrame(() => { sunRef.current?.scale.setScalar(1 + Math.sin(Date.now()*0.002)*0.04); });
  return (
    <>
      <mesh ref={sunRef} position={[0, -1.55, -1.2]}>
        <sphereGeometry args={[0.65, 16, 16]} />
        <meshBasicMaterial color="#ffcc00" transparent opacity={0.82} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {([
        [0,-1.55,-1.2,'#ff8800',0.28,2.8],[0,-1.2,-1.8,'#ff6600',0.14,4.0],
        [0,-0.6,-2.4,'#ff4488',0.08,5.5],[0,0.3,-3.0,'#992299',0.05,7.0],
      ] as [number,number,number,string,number,number][]).map(([x,y,z,c,op,r],i)=>(
        <mesh key={i} position={[x,y,z]}>
          <sphereGeometry args={[r,12,12]}/>
          <meshBasicMaterial color={c} transparent opacity={op} blending={THREE.AdditiveBlending} depthWrite={false}/>
        </mesh>
      ))}
      <mesh position={[0,-2.35,-0.8]}><planeGeometry args={[8,0.28]}/><meshBasicMaterial color="#050200" transparent opacity={0.9} depthWrite={false}/></mesh>
      <SunsetHeat />
    </>
  );
}

// ── 🌌 NEBULA (colorful gas cloud with slow orbital drift) ────────────────────
function NebulaBg() {
  const N = 2000;
  const initA = useMemo(() => new Float32Array(N), []);
  const initR = useMemo(() => new Float32Array(N), []);
  const zX    = useMemo(() => new Float32Array(N), []);
  const zY    = useMemo(() => new Float32Array(N), []);
  const { posArr, colArr, geo, pts } = useMemo(() => {
    const sys = makePointSystem(N, null, 0.021);
    const ZONES = [
      { h:0.82,s:0.80,l:0.50,ox:-1.0,oy:0.4 },
      { h:0.70,s:0.72,l:0.42,ox:0.0, oy:0.2 },
      { h:0.52,s:0.85,l:0.50,ox:1.0, oy:-0.3 },
    ];
    for (let i = 0; i < N; i++) {
      const z  = ZONES[i % 3];
      const ang = Math.random() * Math.PI * 2; const r = 0.1 + Math.pow(Math.random(), 0.5) * 1.8;
      initA[i] = ang; initR[i] = r; zX[i] = z.ox; zY[i] = z.oy;
      sys.posArr[i*3]   = Math.cos(ang)*r + z.ox + (Math.random()-0.5)*0.5;
      sys.posArr[i*3+1] = Math.sin(ang)*r*0.5 + z.oy + (Math.random()-0.5)*0.4;
      sys.posArr[i*3+2] = (Math.random()-0.5)*0.9 - 1.8;
      const c = new THREE.Color();
      c.setHSL(z.h+(Math.random()-0.5)*0.07, z.s, z.l+(Math.random()-0.5)*0.18);
      sys.colArr![i*3]=c.r; sys.colArr![i*3+1]=c.g; sys.colArr![i*3+2]=c.b;
    }
    return sys;
  }, [initA, initR, zX, zY]);
  useFrame(() => {
    const t = Date.now() * 0.00003;
    for (let i = 0; i < N; i++) {
      const r = initR[i]; const ang = initA[i] + t * (0.06/(r+0.3));
      posArr[i*3]   = Math.cos(ang)*r + zX[i];
      posArr[i*3+1] = Math.sin(ang)*r*0.5 + zY[i];
    }
    geo.attributes.position.needsUpdate = true;
  });
  return (
    <>
      <Stars radius={9} depth={4} count={600} factor={0.32} saturation={0} fade speed={0.06} />
      {(['#ff44aa','#8844ff','#00ddcc'] as const).map((c,i)=>(
        <mesh key={i} position={[(i-1)*1.0, (i%2===0?0.3:-0.2), -1.5]}>
          <sphereGeometry args={[1.1,10,10]}/>
          <meshBasicMaterial color={c} transparent opacity={0.09} blending={THREE.AdditiveBlending} depthWrite={false}/>
        </mesh>
      ))}
      <primitive object={pts} />
    </>
  );
}

// ── 🌊 OCEAN (horizontal waves + rising bubbles) ──────────────────────────────
function OceanWave({ idx, total }: { idx: number; total: number }) {
  const PTS = 48;
  const posArr = useMemo(() => new Float32Array(PTS * 3), []);
  const WCOLS = ['#00aadd','#0088bb','#00ccee','#005577'];
  const { geo, line } = useMemo(() => makeLineObj(posArr, WCOLS[idx%WCOLS.length], Math.max(0.05,0.42-idx*0.028)),[idx,posArr]);
  const yBase = 1.2 - idx*(2.8/total); const phase = idx*1.35;
  useFrame(() => {
    const t = Date.now() * 0.001;
    for (let i = 0; i < PTS; i++) {
      const p = i/(PTS-1);
      posArr[i*3]   = (p-0.5)*5.6;
      posArr[i*3+1] = yBase + Math.sin(p*Math.PI*3.5-t*1.2+phase)*0.18 + Math.sin(p*Math.PI*7-t*2.1+phase)*0.06;
      posArr[i*3+2] = Math.sin(p*Math.PI*2-t*0.8+phase)*0.12;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return <primitive object={line} />;
}
function OceanBubbles() {
  const N = 80;
  const { posArr, geo, pts } = useMemo(() => makePointSystem(N,'#88ddff',0.016),[]);
  const state = useMemo(()=>Array.from({length:N},()=>({
    x:(Math.random()-0.5)*4, vy:0.15+Math.random()*0.45, life:Math.random(),
    maxLife:1.5+Math.random()*2, ph:Math.random()*Math.PI*2,
  })),[]);
  useFrame((_, dt) => {
    const t = Date.now()*0.001;
    for(let i=0;i<N;i++){
      const s=state[i]; s.life+=dt;
      if(s.life>s.maxLife){s.life=0;s.x=(Math.random()-0.5)*4;}
      const p=s.life/s.maxLife;
      posArr[i*3]=s.x+Math.sin(t*1.5+s.ph)*0.12; posArr[i*3+1]=-1.4+s.vy*p*3; posArr[i*3+2]=(Math.random()-0.5)*0.04;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return <primitive object={pts} />;
}
function OceanBg() {
  return (
    <>
      <mesh position={[0,-1,-1.5]}>
        <sphereGeometry args={[3.5,12,12]}/>
        <meshBasicMaterial color="#003355" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false}/>
      </mesh>
      {Array.from({length:12},(_,i)=><OceanWave key={i} idx={i} total={12}/>)}
      <OceanBubbles/>
    </>
  );
}

// ── ❄️ SNOW (particles falling with gentle wind drift) ────────────────────────
function SnowBg() {
  const N = 280;
  const { posArr, geo, pts } = useMemo(() => {
    const sys = makePointSystem(N, '#e8f0ff', 0.016);
    for(let i=0;i<N;i++){
      sys.posArr[i*3]=(Math.random()-0.5)*5.5; sys.posArr[i*3+1]=(Math.random()-0.5)*4.5;
      sys.posArr[i*3+2]=(Math.random()-0.5)*1.5;
    }
    return sys;
  }, []);
  const speeds = useMemo(()=>Array.from({length:N},(_,i)=>0.12+(i%5)*0.04+Math.random()*0.1),[]);
  const phases = useMemo(()=>Array.from({length:N},(_,i)=>i*0.37),[]);
  useFrame((_, dt) => {
    const t = Date.now()*0.001;
    for(let i=0;i<N;i++){
      posArr[i*3]   += Math.sin(t*0.4+phases[i])*0.003;
      posArr[i*3+1] -= speeds[i]*dt;
      if(posArr[i*3+1] < -2.4) posArr[i*3+1] = 2.4;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return (
    <>
      <Stars radius={8} depth={3} count={400} factor={0.22} saturation={0} fade speed={0.03}/>
      <primitive object={pts}/>
    </>
  );
}

// ── 🎆 FIREWORKS (periodic colorful burst explosions) ─────────────────────────
const FW_COLORS = ['#ff4444','#ffaa00','#00ff88','#4488ff','#ff44ff','#ffff44','#44ffff','#ff8844'];
function FireworkBurst({ idx }: { idx: number }) {
  const N = 80;
  const { posArr, colArr, geo, pts } = useMemo(() => makePointSystem(N, null, 0.038), []);
  const bCol = useMemo(() => new THREE.Color(FW_COLORS[idx % FW_COLORS.length]), [idx]);
  const state = useRef({ x: 0, y: 0, life: 0, delay: idx * 0.9 + Math.random() * 2, active: false });
  const vels  = useMemo(() => Array.from({length:N}, () => {
    const ang = Math.random()*Math.PI*2; const el=(Math.random()-0.5)*Math.PI*0.5; const spd=0.4+Math.random()*1.4;
    return { vx:Math.cos(ang)*Math.cos(el)*spd, vy:Math.sin(el)*spd+0.3, vz:Math.sin(ang)*Math.cos(el)*spd*0.25 };
  }), []);
  useFrame((_, dt) => {
    const s = state.current;
    if (!s.active) {
      s.delay -= dt;
      if (s.delay <= 0) { s.x=(Math.random()-0.5)*2.8; s.y=(Math.random()-0.5)*1.8; s.life=0; s.active=true; }
      for(let i=0;i<N;i++){colArr![i*3]=0;colArr![i*3+1]=0;colArr![i*3+2]=0;}
    } else {
      s.life += dt; const maxL=1.6;
      if(s.life>maxL){s.active=false;s.delay=1.5+Math.random()*3.5;}
      const p=s.life/maxL; const fade=Math.max(0,1-p);
      for(let i=0;i<N;i++){
        const v=vels[i];
        posArr[i*3]=s.x+v.vx*p; posArr[i*3+1]=s.y+v.vy*p-0.35*p*p; posArr[i*3+2]=v.vz*p;
        const b=fade*(0.6+Math.random()*0.4);
        colArr![i*3]=bCol.r*b; colArr![i*3+1]=bCol.g*b; colArr![i*3+2]=bCol.b*b;
      }
    }
    geo.attributes.position.needsUpdate=true; geo.attributes.color.needsUpdate=true;
  });
  return <primitive object={pts}/>;
}
function FireworksBg() {
  return <>{Array.from({length:5},(_,i)=><FireworkBurst key={i} idx={i}/>)}</>;
}

// ── 🟩 MATRIX RAIN (green digital rain columns) ───────────────────────────────
function MatrixBg() {
  const COLS=15; const DPR=12; const N=COLS*DPR;
  const { posArr, colArr, geo, pts } = useMemo(() => {
    const sys = makePointSystem(N,null,0.023);
    for(let i=0;i<N;i++){
      const col=Math.floor(i/DPR);
      sys.posArr[i*3]=-2.4+col*(4.8/COLS); sys.posArr[i*3+1]=Math.random()*4.5-2.2; sys.posArr[i*3+2]=0;
    }
    return sys;
  },[]);
  const state = useMemo(()=>Array.from({length:COLS},(_,c)=>({
    headY:Math.random()*4.5-2.2, spd:0.6+Math.random()*1.4, x:-2.4+c*(4.8/COLS),
  })),[]);
  useFrame((_,dt)=>{
    for(let c=0;c<COLS;c++){
      const s=state[c]; s.headY-=s.spd*dt;
      if(s.headY<-2.5){s.headY=2.5;s.spd=0.6+Math.random()*1.4;}
      for(let j=0;j<DPR;j++){
        const idx=c*DPR+j; const bright=Math.max(0,1-j/DPR); const y=s.headY+j*0.21;
        posArr[idx*3]=s.x; posArr[idx*3+1]=y; posArr[idx*3+2]=0;
        colArr![idx*3]=0.05*bright; colArr![idx*3+1]=bright*(j===0?1:0.75); colArr![idx*3+2]=0.1*bright;
      }
    }
    geo.attributes.position.needsUpdate=true; geo.attributes.color.needsUpdate=true;
  });
  return (
    <>
      <mesh position={[0,0,-1]}>
        <sphereGeometry args={[1.2,10,10]}/>
        <meshBasicMaterial color="#002200" transparent opacity={0.14} blending={THREE.AdditiveBlending} depthWrite={false}/>
      </mesh>
      <primitive object={pts}/>
    </>
  );
}

// ── HOLOGRAM (scan lines + interference rings) ────────────────────────────────
function HologramBg({ aspect }: { aspect: number }) {
  const h = 2; const w = h / aspect;
  const N = 16; // horizontal scan lines
  const posArr = useMemo(() => new Float32Array(N * 4 * 3), []); // 2 points per line × 2 (top+bottom)
  const { geo, line } = useMemo(() => makeLineObj(posArr, '#44ddff', 0.28), [posArr]);
  const scanRef = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    const t = Date.now() * 0.001;
    const scanY = ((t * 0.55) % (h + 0.4)) - h / 2 - 0.2;
    if (scanRef.current) scanRef.current.position.y = scanY;
    for (let i = 0; i < N; i++) {
      const y = -h / 2 + (i / (N - 1)) * h;
      const flicker = 0.18 + Math.sin(t * 12 + i * 0.8) * 0.08;
      (line.material as THREE.LineBasicMaterial).opacity = flicker;
      const x0 = -w / 2 - 0.05; const x1 = w / 2 + 0.05;
      posArr[i*6]   = x0; posArr[i*6+1] = y; posArr[i*6+2] = 0.02;
      posArr[i*6+3] = x1; posArr[i*6+4] = y; posArr[i*6+5] = 0.02;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return (
    <>
      <primitive object={line} />
      {/* Bright horizontal sweep bar */}
      <mesh ref={scanRef} position={[0, 0, 0.03]}>
        <planeGeometry args={[w + 0.1, 0.018]} />
        <meshBasicMaterial color="#88eeff" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {[0.55, 1.05, 1.65].map((r, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.004, 4, 72]} />
          <meshBasicMaterial color="#00ccff" transparent opacity={0.12 - i * 0.02} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

// ── VORTEX (spiral particle funnel) ───────────────────────────────────────────
function VortexBg() {
  const N = 1800;
  const initA = useMemo(() => new Float32Array(N), []);
  const initR = useMemo(() => new Float32Array(N), []);
  const { posArr, colArr, geo, pts } = useMemo(() => {
    const sys = makePointSystem(N, null, 0.018);
    for (let i = 0; i < N; i++) {
      const r = 0.05 + Math.pow(Math.random(), 0.4) * 2.2;
      const ang = Math.random() * Math.PI * 2;
      initA[i] = ang; initR[i] = r;
      sys.posArr[i*3]   = Math.cos(ang) * r;
      sys.posArr[i*3+1] = (Math.random() - 0.5) * 0.5;
      sys.posArr[i*3+2] = Math.sin(ang) * r * 0.35 - 0.8;
      const c = new THREE.Color(); c.setHSL((0.62 + r / 8) % 1, 0.8, 0.45 + (1 - r / 2.2) * 0.35);
      sys.colArr![i*3]=c.r; sys.colArr![i*3+1]=c.g; sys.colArr![i*3+2]=c.b;
    }
    return sys;
  }, [initA, initR]);
  useFrame(() => {
    const t = Date.now() * 0.001;
    for (let i = 0; i < N; i++) {
      const r = initR[i]; const spd = 0.08 / (r + 0.12);
      const ang = initA[i] + t * spd;
      const zPull = Math.sin(t * 0.4 + r) * 0.06;
      posArr[i*3]   = Math.cos(ang) * r;
      posArr[i*3+1] = (initA[i] % (Math.PI * 0.25)) - 0.12 + zPull;
      posArr[i*3+2] = Math.sin(ang) * r * 0.35 - 0.8;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return (
    <>
      <mesh position={[0, 0, -0.8]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshBasicMaterial color="#4466ff" transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <primitive object={pts} />
    </>
  );
}

// ── FOREST (autumn leaf particles drifting) ────────────────────────────────────
const LEAF_COLORS = ['#4a8c3f','#8cc152','#d4a035','#c0392b','#e67e22','#f1c40f','#27ae60'];
function ForestBg() {
  const N = 160;
  const { posArr, colArr, geo, pts } = useMemo(() => {
    const sys = makePointSystem(N, null, 0.032);
    for (let i = 0; i < N; i++) {
      sys.posArr[i*3]   = (Math.random()-0.5)*5.5;
      sys.posArr[i*3+1] = (Math.random()-0.5)*4.5;
      sys.posArr[i*3+2] = (Math.random()-0.5)*1.2;
      const c = new THREE.Color(LEAF_COLORS[i % LEAF_COLORS.length]);
      sys.colArr![i*3]=c.r; sys.colArr![i*3+1]=c.g; sys.colArr![i*3+2]=c.b;
    }
    return sys;
  }, []);
  const speeds = useMemo(() => Array.from({length:N}, (_,i) => 0.1 + (i%4)*0.04 + Math.random()*0.08), []);
  const swings = useMemo(() => Array.from({length:N}, (_,i) => i * 0.41), []);
  useFrame((_, dt) => {
    const t = Date.now() * 0.001;
    for (let i = 0; i < N; i++) {
      posArr[i*3]   += Math.sin(t * 0.5 + swings[i]) * 0.004;
      posArr[i*3+1] -= speeds[i] * dt;
      posArr[i*3+2] += Math.cos(t * 0.35 + swings[i]) * 0.002;
      if (posArr[i*3+1] < -2.5) posArr[i*3+1] = 2.5;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return (
    <>
      <mesh position={[0, -2.8, -1.2]}>
        <sphereGeometry args={[2.8, 10, 10]} />
        <meshBasicMaterial color="#0a1f0a" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <primitive object={pts} />
    </>
  );
}

// ── RAIN (diagonal silver streaks + splash particles) ─────────────────────────
function RainBg() {
  const NS = 200;
  const { posArr: sArr, geo: sGeo, pts: sPts } = useMemo(() => makePointSystem(NS, '#c8d8e8', 0.014), []);
  const sState = useMemo(() => Array.from({length:NS}, () => ({
    x:(Math.random()-0.5)*5.5, y:2.5+Math.random()*2, vx:-0.25, vy:-(1.2+Math.random()*1.8),
  })), []);
  const NB = 60;
  const { posArr: bArr, geo: bGeo, pts: bPts } = useMemo(() => makePointSystem(NB, '#aabbcc', 0.02), []);
  const bState = useMemo(() => Array.from({length:NB}, () => ({
    x:(Math.random()-0.5)*5.5, y:-2.3, vx:(Math.random()-0.5)*0.4, vy:0.3+Math.random()*0.5, life:0, maxLife:0.3+Math.random()*0.4,
  })), []);
  useFrame((_, dt) => {
    for (let i=0;i<NS;i++){
      const s=sState[i];
      s.x+=s.vx*dt; s.y+=s.vy*dt;
      if(s.y<-2.5){s.y=2.5+Math.random()*1.5;s.x=(Math.random()-0.5)*5.5;}
      sArr[i*3]=s.x; sArr[i*3+1]=s.y; sArr[i*3+2]=(Math.random()-0.5)*0.05;
    }
    for (let i=0;i<NB;i++){
      const s=bState[i]; s.life+=dt;
      if(s.life>s.maxLife){s.life=0;s.x=(Math.random()-0.5)*5.5;s.vy=0.3+Math.random()*0.5;}
      const p=s.life/s.maxLife;
      bArr[i*3]=s.x+s.vx*p; bArr[i*3+1]=-2.3+s.vy*p; bArr[i*3+2]=(Math.random()-0.5)*0.04;
    }
    sGeo.attributes.position.needsUpdate=true; bGeo.attributes.position.needsUpdate=true;
  });
  return (
    <>
      <mesh position={[0,0,-2]}>
        <sphereGeometry args={[4,8,8]}/>
        <meshBasicMaterial color="#0a1525" transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false}/>
      </mesh>
      <primitive object={sPts}/>
      <primitive object={bPts}/>
    </>
  );
}

// ── NEON GRID (glowing neon city grid) ────────────────────────────────────────
function NeonBg({ aspect }: { aspect: number }) {
  const h = 2.4; const w = h / aspect + 0.6;
  const HLINES = 10; const VLINES = 8;
  const NCOLS = ['#ff0088','#00ffcc','#ff8800','#0088ff','#cc00ff','#ffff00'];
  const segments = useMemo(() => {
    const segs: { posArr: Float32Array; geo: THREE.BufferGeometry; line: THREE.Line }[] = [];
    for (let i = 0; i <= HLINES; i++) {
      const y = -h/2 + (i/HLINES)*h;
      const posArr = new Float32Array([-w/2, y, 0, w/2, y, 0]);
      const { geo, line } = makeLineObj(posArr, NCOLS[i%NCOLS.length], 0.18 + (i%3)*0.08);
      segs.push({ posArr, geo, line });
    }
    for (let i = 0; i <= VLINES; i++) {
      const x = -w/2 + (i/VLINES)*w;
      const posArr = new Float32Array([x, -h/2, 0, x, h/2, 0]);
      const { geo, line } = makeLineObj(posArr, NCOLS[(i+2)%NCOLS.length], 0.14 + (i%2)*0.06);
      segs.push({ posArr, geo, line });
    }
    return segs;
  }, [w, h]);
  useFrame(() => {
    const t = Date.now() * 0.001;
    segments.forEach((s, i) => {
      const pulse = 0.12 + Math.sin(t * 1.5 + i * 0.7) * 0.09;
      (s.line.material as THREE.LineBasicMaterial).opacity = pulse;
    });
  });
  return (
    <>
      {segments.map((s, i) => <primitive key={i} object={s.line} />)}
      {/* Intersection glow dots at grid corners */}
      {Array.from({length: (HLINES+1)*(VLINES+1)}, (_, k) => {
        const row = Math.floor(k/(VLINES+1)); const col = k%(VLINES+1);
        const x = -w/2+(col/VLINES)*w; const y = -h/2+(row/HLINES)*h;
        return (
          <mesh key={k} position={[x, y, 0.02]}>
            <sphereGeometry args={[0.022, 5, 5]} />
            <meshBasicMaterial color={NCOLS[k%NCOLS.length]} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        );
      })}
    </>
  );
}

// ── PLASMA (animated energy field) ────────────────────────────────────────────
function PlasmaBg() {
  const N = 2400;
  const initA = useMemo(() => new Float32Array(N), []);
  const initR = useMemo(() => new Float32Array(N), []);
  const { posArr, colArr, geo, pts } = useMemo(() => {
    const sys = makePointSystem(N, null, 0.019);
    for (let i = 0; i < N; i++) {
      const ang = Math.random()*Math.PI*2; const r = 0.05+Math.pow(Math.random(),0.5)*2.1;
      initA[i]=ang; initR[i]=r;
      sys.posArr[i*3]=Math.cos(ang)*r; sys.posArr[i*3+1]=(Math.random()-0.5)*2.8; sys.posArr[i*3+2]=Math.sin(ang)*r*0.3-0.8;
      const hue = (i/N*2.5) % 1;
      const c=new THREE.Color(); c.setHSL(hue, 0.9, 0.55);
      sys.colArr![i*3]=c.r; sys.colArr![i*3+1]=c.g; sys.colArr![i*3+2]=c.b;
    }
    return sys;
  }, [initA, initR]);
  useFrame(() => {
    const t = Date.now() * 0.001;
    for (let i = 0; i < N; i++) {
      const r=initR[i]; const ang=initA[i]+t*0.08;
      posArr[i*3]=Math.cos(ang)*r+Math.sin(t*0.6+r)*0.12;
      posArr[i*3+1]=((initA[i]*0.3+t*0.04)%2.8)-1.4+Math.cos(t*0.5+r)*0.1;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return <primitive object={pts} />;
}

// ── GLITCH (RGB split bands) ───────────────────────────────────────────────────
function GlitchBg({ aspect }: { aspect: number }) {
  const h = 2; const w = h / aspect;
  const N = 60;
  const { posArr, colArr, geo, pts } = useMemo(() => makePointSystem(N, null, 0.03), []);
  const state = useMemo(() => Array.from({length:N}, () => ({
    y:(Math.random()-0.5)*2.4, x:(Math.random()-0.5)*2.8,
    vx:(Math.random()-0.5)*0.8, life:Math.random(), maxLife:0.1+Math.random()*0.3,
    ch: Math.floor(Math.random()*3), // 0=R 1=G 2=B
  })), []);
  // Glitch bands
  const bands = useMemo(() => Array.from({length:6}, (_, i) => {
    const g = new THREE.PlaneGeometry(w + 0.3, 0.06 + Math.random() * 0.12);
    const m = new THREE.MeshBasicMaterial({ color: i%3===0?'#ff0000':i%3===1?'#00ff00':'#0000ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    return new THREE.Mesh(g, m);
  }), [w]);
  const glitchClock = useRef(0);
  useFrame((_, dt) => {
    glitchClock.current += dt;
    const t = Date.now() * 0.001;
    // Randomly fire glitch bands
    bands.forEach((b, i) => {
      const mat = b.material as THREE.MeshBasicMaterial;
      if (glitchClock.current > 0.05 + Math.random() * 0.4) {
        b.position.y = (Math.random()-0.5)*h;
        b.position.x = (Math.random()-0.5)*0.12;
        mat.opacity = Math.random() > 0.5 ? 0.25 + Math.random()*0.25 : 0;
      }
    });
    if (glitchClock.current > 0.5) glitchClock.current = 0;
    // Spark particles
    for (let i=0;i<N;i++){
      const s=state[i]; s.life+=dt;
      if(s.life>s.maxLife){s.life=0;s.y=(Math.random()-0.5)*2.4;s.x=(Math.random()-0.5)*2.8;s.vx=(Math.random()-0.5)*0.8;}
      const p=s.life/s.maxLife; const fade=1-p;
      posArr[i*3]=s.x+s.vx*p; posArr[i*3+1]=s.y; posArr[i*3+2]=0.05;
      colArr![i*3]=s.ch===0?fade:0; colArr![i*3+1]=s.ch===1?fade:0; colArr![i*3+2]=s.ch===2?fade:0;
    }
    geo.attributes.position.needsUpdate=true; geo.attributes.color.needsUpdate=true;
  });
  return (
    <>
      <Stars radius={7} depth={3} count={300} factor={0.25} saturation={0} fade speed={0.04}/>
      {bands.map((b, i) => <primitive key={i} object={b} />)}
      <primitive object={pts} />
    </>
  );
}

// ── Build canvas texture from card item ──────────────────────────────────────
function buildCardTexture(
  item: any, theme: CardTheme, fontId: string, format: ExportFormat,
  watermark: string, showWm: boolean
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = format === 'reel' ? 1920 : 1080;
  const opts = { format, theme, fontId, watermark, showWatermark: showWm };
  const dialogue = item.dialogue ?? (item.content_type === 'dialog'
    ? (() => { try { return JSON.parse(item.body || '[]'); } catch { return undefined; } })()
    : undefined);
  if (dialogue && dialogue.length > 0) {
    drawDialogCardToCanvas(canvas, { ...item, dialogue }, opts);
  } else {
    drawCardToCanvas(canvas, { title: item.title, body: item.body || '', hashtags: item.hashtags, bestPlatform: item.bestPlatform }, opts);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// ── Float template mesh ──────────────────────────────────────────────────────
function FloatCard({ texture, aspect }: { texture: THREE.CanvasTexture; aspect: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(Date.now() * 0.0006) * 0.22;
      meshRef.current.rotation.x = Math.sin(Date.now() * 0.0004) * 0.06;
    }
  });
  const h = 2;
  const w = h / aspect;
  return (
    <Float speed={1.4} rotationIntensity={0.05} floatIntensity={0.3}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={texture} roughness={0.12} metalness={0.08} />
      </mesh>
      {/* Shadow plane below */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -h / 2 - 0.3, 0]} receiveShadow>
        <planeGeometry args={[w * 1.5, 0.3]} />
        <shadowMaterial opacity={0.35} />
      </mesh>
    </Float>
  );
}

// ── Prismatic template ───────────────────────────────────────────────────────
function PrismaticCard({ texture, aspect }: { texture: THREE.CanvasTexture; aspect: number }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(Date.now() * 0.0007) * 0.3;
    }
  });
  const h = 2; const w = h / aspect;
  const edges = useMemo(() => {
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.04));
    return geo;
  }, [w, h]);
  return (
    <group ref={groupRef}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshPhysicalMaterial map={texture} roughness={0.05} metalness={0.2} clearcoat={1} clearcoatRoughness={0.05} />
      </mesh>
      {/* Glowing edge frame */}
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#d4a017" linewidth={2} />
      </lineSegments>
      {/* Corner spheres */}
      {[[-w/2, -h/2], [w/2, -h/2], [-w/2, h/2], [w/2, h/2]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.05]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#d4a017" emissive="#c9a227" emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// ── Parallax / deep-space template ───────────────────────────────────────────
function ParallaxCard({ texture, aspect }: { texture: THREE.CanvasTexture; aspect: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(Date.now() * 0.0005) * 0.18;
      meshRef.current.rotation.x = Math.cos(Date.now() * 0.0003) * 0.05;
    }
  });
  const h = 2; const w = h / aspect;
  return (
    <>
      <Stars radius={8} depth={5} count={500} factor={0.8} saturation={0} fade speed={0.6} />
      <mesh ref={meshRef}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={texture} roughness={0.1} metalness={0.3} />
      </mesh>
    </>
  );
}

// ── Scene wrapper per template ────────────────────────────────────────────────
function Scene({
  template, texture, aspect,
  waveCorners, waveStyle, waveMotion, waveSpeed, waveColor,
}: {
  template: Template3D; texture: THREE.CanvasTexture; aspect: number;
  waveCorners: Corner[]; waveStyle: WaveStyle; waveMotion: WaveMotion; waveSpeed: number; waveColor: string;
}) {
  const bgColors: Record<Template3D, string> = {
    float:    '#0d1117', prismatic: '#0a0818', parallax: '#010108',
    hologram: '#010a10', vortex:   '#01010e',
    solar:    '#020510', galaxy:   '#020008', nebula:   '#060008',
    nightsky: '#000308', moon:     '#030608',
    sun:      '#0a0500', clouds:   '#050810', sunset:   '#080200',
    snow:     '#020508', thunder:  '#010208',
    ocean:    '#000810', volcano:  '#0a0200', earth:    '#010a08',
    forest:   '#010a02', rain:     '#010510',
    matrix:   '#000500', fireworks:'#010102', neon:     '#050008',
    plasma:   '#020015', glitch:   '#020204',
  };
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color(bgColors[template]);
  }, [template, scene]);

  const isNewTemplate = !['float', 'prismatic', 'parallax'].includes(template);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 3.2]} fov={42} />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 4, 3]} intensity={2} color={template === 'prismatic' ? '#ffd700' : template === 'thunder' ? '#4488ff' : '#ffffff'} castShadow />
      <pointLight position={[-3, -2, 2]} intensity={0.6} color={template === 'parallax' ? '#4466ff' : template === 'thunder' ? '#2244cc' : '#ffe0a0'} />
      {template === 'float'     && <FloatCard     texture={texture} aspect={aspect} />}
      {template === 'prismatic' && <PrismaticCard texture={texture} aspect={aspect} />}
      {template === 'parallax'  && <ParallaxCard  texture={texture} aspect={aspect} />}
      {isNewTemplate && <FloatCard texture={texture} aspect={aspect} />}
      {template === 'solar'   && <SolarSystemBg />}
      {template === 'sun'     && <SunWavesBg />}
      {template === 'moon'    && <MoonWavesBg />}
      {template === 'earth'   && <EarthWavesBg />}
      {template === 'volcano' && <VolcanoBg aspect={aspect} />}
      {template === 'galaxy'  && <GalaxyBg />}
      {template === 'hologram'  && <HologramBg aspect={aspect} />}
      {template === 'vortex'    && <VortexBg />}
      {template === 'thunder'   && <ThunderBg aspect={aspect} />}
      {template === 'nightsky'  && <NightSkyBg />}
      {template === 'clouds'    && <CloudsBg />}
      {template === 'sunset'    && <SunsetBg />}
      {template === 'nebula'    && <NebulaBg />}
      {template === 'ocean'     && <OceanBg />}
      {template === 'snow'      && <SnowBg />}
      {template === 'fireworks' && <FireworksBg />}
      {template === 'matrix'    && <MatrixBg />}
      {template === 'forest'    && <ForestBg />}
      {template === 'rain'      && <RainBg />}
      {template === 'neon'      && <NeonBg aspect={aspect} />}
      {template === 'plasma'    && <PlasmaBg />}
      {template === 'glitch'    && <GlitchBg aspect={aspect} />}
      {/* Wave motion overlay */}
      {waveMotion === 'fan' && waveCorners.map(c => (
        <CornerWaveGroup key={c} corner={c} aspect={aspect}
          hexColor={waveColor} style={waveStyle} speed={waveSpeed} />
      ))}
      {waveMotion === 'circular' && (
        <CircularWaveField aspect={aspect} hexColor={waveColor} speed={waveSpeed} />
      )}
      {waveMotion === 'cross' && (
        <CrossWaveField aspect={aspect} hexColor={waveColor} speed={waveSpeed} />
      )}
    </>
  );
}

// ── Capture WebGL canvas ─────────────────────────────────────────────────────
function CaptureButton({ glRef, itemTitle, format }: { glRef: React.MutableRefObject<HTMLCanvasElement | null>; itemTitle: string; format: ExportFormat }) {
  const { gl } = useThree();
  useEffect(() => { glRef.current = gl.domElement; }, [gl, glRef]);
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  item?: any;
  items?: any[];
  initialIdx?: number;
  initialTemplate?: Template3D;
  onClose: () => void;
}

export function ThreeDCardViewer({ item: singleItem, items, initialIdx = 0, initialTemplate, onClose }: Props) {
  const [template, setTemplate]   = useState<Template3D>(initialTemplate ?? 'float');
  const [theme, setTheme]         = useState<CardTheme>(CARD_THEMES[1]);
  const [fontId, setFontId]       = useState('georgia');
  const [format, setFormat]       = useState<ExportFormat>('post');
  const [showWm, setShowWm]       = useState(true);
  const [wm, setWm]               = useState('Tinyuwizev1.1');
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [playing, setPlaying]     = useState(false);
  const [recording, setRecording] = useState(false);
  const [idx, setIdx]             = useState(initialIdx);
  // Corner waves
  const [waveCorners, setWaveCorners] = useState<Corner[]>(['TL', 'TR', 'BL', 'BR']);
  const [waveStyle, setWaveStyle]     = useState<WaveStyle>('ribbon');
  const [waveMotion, setWaveMotion]   = useState<WaveMotion>('fan');
  const [waveSpeed, setWaveSpeed]     = useState(1.0);
  const [waveColorOverride, setWaveColorOverride] = useState('');
  const glRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const allItems = items ?? (singleItem ? [singleItem] : []);
  const item = allItems[idx] ?? allItems[0] ?? singleItem ?? {};
  const total = allItems.length;

  const texture = useMemo(
    () => buildCardTexture(item, theme, fontId, format, wm, showWm),
    [item, theme, fontId, format, wm, showWm]
  );

  const aspect    = format === 'reel' ? 1920 / 1080 : 1;
  const waveColor = waveColorOverride || theme.accentColor;

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMusicFile(file);
    toast.success(`Music loaded: ${file.name}`);
  };

  const togglePlay = () => {
    if (!audioRef.current && musicFile) {
      const audio = new Audio(URL.createObjectURL(musicFile));
      audio.loop = true;
      audioRef.current = audio;
    }
    if (audioRef.current) {
      if (playing) { audioRef.current.pause(); setPlaying(false); }
      else { audioRef.current.play(); setPlaying(true); }
    }
  };

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const downloadFrame = useCallback(() => {
    const gl = glRef.current;
    if (!gl) return;
    gl.toBlob(blob => {
      if (!blob) return toast.error('Capture failed');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `3d_${template}_${(item.title || '').slice(0, 15).replace(/[^\w]/g, '_').toLowerCase()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('3D frame downloaded');
    });
  }, [template, item]);

  const recordVideo = useCallback(async (durationMs = 5000) => {
    const gl = glRef.current;
    if (!gl) return;
    setRecording(true);
    toast(`Recording ${durationMs / 1000}s video…`);
    try {
      const chunks: Blob[] = [];
      const videoStream = (gl as any).captureStream(30) as MediaStream;
      const allTracks = [...videoStream.getTracks()];

      if (musicFile && audioRef.current) {
        const ctx = new AudioContext();
        const source = ctx.createMediaElementSource(audioRef.current);
        const dest = ctx.createMediaStreamDestination();
        source.connect(dest);
        source.connect(ctx.destination);
        allTracks.push(...dest.stream.getAudioTracks());
        if (!playing) { audioRef.current.play(); setPlaying(true); }
      }

      const combined = new MediaStream(allTracks);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9' : 'video/webm';
      const rec = new MediaRecorder(combined, { mimeType });
      rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `3d_${template}_${(item.title || '').slice(0, 15).replace(/[^\w]/g, '_').toLowerCase()}.webm`;
        a.click();
        URL.revokeObjectURL(a.href);
        setRecording(false);
        toast.success('Video exported — convert to MP4 at cloudconvert.com for Instagram');
      };
      rec.start();
      setTimeout(() => rec.stop(), durationMs);
    } catch (e: any) {
      toast.error('Video export failed: ' + e.message);
      setRecording(false);
    }
  }, [musicFile, playing, template, item]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-black/60 backdrop-blur border-b border-white/10">
        <div className="flex items-center gap-4">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <Film className="w-4 h-4 text-indigo-400" />3D Studio
            <span className="text-[10px] text-white/40">— {TEMPLATE_3D_OPTIONS.find(t => t.id === template)?.name}</span>
          </h2>
          {total > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
                className="w-7 h-7 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/40 disabled:opacity-25 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-white/50 min-w-[50px] text-center">{idx + 1} / {total}</span>
              <button onClick={() => setIdx(i => Math.min(total - 1, i + 1))} disabled={idx === total - 1}
                className="w-7 h-7 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/40 disabled:opacity-25 transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <button onClick={onClose}><X className="w-5 h-5 text-white/60 hover:text-white" /></button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Vertical card strip — left scroll rail when multiple items */}
        {total > 1 && (
          <div className="w-16 bg-black/40 border-r border-white/10 flex flex-col gap-2 p-2 overflow-y-auto">
            {allItems.map((it, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className="relative shrink-0 rounded-lg overflow-hidden border-2 transition-all"
                style={{
                  aspectRatio: '1/1.25',
                  background: CARD_THEMES[(i % CARD_THEMES.length)].cssBg,
                  borderColor: i === idx ? '#818cf8' : 'transparent',
                  opacity: i === idx ? 1 : 0.45,
                }}>
                <p className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/80 p-0.5 text-center leading-tight line-clamp-3">
                  {it.title?.slice(0, 30)}
                </p>
                <span className="absolute bottom-0.5 right-0.5 text-[7px] text-white/50 font-bold">{i + 1}</span>
              </button>
            ))}
          </div>
        )}

        {/* 3D Viewport */}
        <div className="flex-1 relative">
          <Canvas gl={{ preserveDrawingBuffer: true }} shadows>
            <Scene template={template} texture={texture} aspect={aspect}
              waveCorners={waveCorners} waveStyle={waveStyle} waveMotion={waveMotion}
              waveSpeed={waveSpeed} waveColor={waveColor} />
            <CaptureButton glRef={glRef} itemTitle={item.title} format={format} />
          </Canvas>

          {/* Recording indicator */}
          {recording && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-red-600/90 text-white rounded-full text-sm animate-pulse z-20">
              <div className="w-2.5 h-2.5 bg-white rounded-full" />Recording video…
            </div>
          )}

          {/* In-canvas prev / next navigation */}
          {total > 1 && (
            <>
              {/* Prev */}
              <button
                onClick={() => setIdx(i => Math.max(0, i - 1))}
                disabled={idx === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full flex items-center justify-center
                           bg-white/10 hover:bg-white/25 border border-white/20 hover:border-white/50
                           text-white disabled:opacity-15 disabled:cursor-not-allowed
                           backdrop-blur-sm transition-all shadow-lg"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Next */}
              <button
                onClick={() => setIdx(i => Math.min(total - 1, i + 1))}
                disabled={idx === total - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full flex items-center justify-center
                           bg-white/10 hover:bg-white/25 border border-white/20 hover:border-white/50
                           text-white disabled:opacity-15 disabled:cursor-not-allowed
                           backdrop-blur-sm transition-all shadow-lg"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Counter badge at bottom */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/15">
                <span className="text-white/90 text-xs font-bold">{idx + 1}</span>
                <span className="text-white/35 text-xs">/ {total}</span>
                {/* Dot indicators (max 10 shown) */}
                <div className="flex gap-1 ml-1">
                  {allItems.slice(0, Math.min(total, 12)).map((_, i) => (
                    <button key={i} onClick={() => setIdx(i)}
                      className="rounded-full transition-all"
                      style={{
                        width:  i === idx ? 16 : 6,
                        height: 6,
                        background: i === idx ? '#818cf8' : 'rgba(255,255,255,0.3)',
                      }} />
                  ))}
                  {total > 12 && <span className="text-white/30 text-[9px] ml-0.5">+{total - 12}</span>}
                </div>
              </div>

              {/* Card title overlay (top-center) */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-[60%]">
                <p className="text-center text-white/70 text-xs font-medium truncate px-3 py-1 rounded-full bg-black/30 backdrop-blur-sm">
                  {item.title}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Controls sidebar */}
        <div className="w-72 bg-gray-950 border-l border-white/10 p-5 overflow-y-auto flex flex-col gap-5">

          {/* 3D Template — Categorized */}
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">3D Template</p>
            <div className="space-y-2">
              {TEMPLATE_CATEGORIES.map(cat => {
                const catTemplates = TEMPLATE_3D_OPTIONS.filter(t => t.category === cat.id);
                const hasCurrent  = catTemplates.some(t => t.id === template);
                return (
                  <div key={cat.id} className="rounded-xl overflow-hidden border"
                    style={{ borderColor: hasCurrent ? cat.color + '60' : 'rgba(255,255,255,0.07)' }}>
                    {/* Category header */}
                    <div className="flex items-center gap-2 px-3 py-2"
                      style={{ background: hasCurrent ? cat.color + '14' : 'transparent' }}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.color }} />
                      <p className="text-[10px] font-bold uppercase tracking-widest flex-1"
                        style={{ color: hasCurrent ? cat.color : '#6b7280' }}>{cat.label}</p>
                      <span className="text-[9px] text-gray-600">{catTemplates.length}</span>
                    </div>
                    {/* Templates in category */}
                    <div className="grid grid-cols-2 gap-1 p-1.5">
                      {catTemplates.map(t => (
                        <button key={t.id} onClick={() => setTemplate(t.id)}
                          className={`text-left px-2 py-2 rounded-lg border text-[10px] transition-all leading-tight ${template === t.id ? 'text-white border-transparent' : 'border-white/8 text-gray-400 hover:text-gray-200 hover:border-white/20'}`}
                          style={template === t.id ? { background: cat.color + '28', borderColor: cat.color + '80', color: cat.color } : {}}>
                          <p className="font-semibold truncate">{t.name}</p>
                          <p className="text-[9px] text-gray-600 mt-0.5 line-clamp-1">{t.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Corner Waves ─────────────────────────────────────────── */}
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/30 p-3 space-y-3">
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse inline-block" />
              Corner Waves
            </p>

            {/* Wave motion */}
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">Motion</p>
              <div className="flex gap-1.5">
                {([
                  { v: 'fan'      as WaveMotion, label: '↗ Fan', tip: 'Radiate from corners' },
                  { v: 'circular' as WaveMotion, label: '⟳ Orbit', tip: 'Spiral inward to center' },
                  { v: 'cross'    as WaveMotion, label: '✕ Cross', tip: 'Ribbons crossing the card' },
                ]).map(o => (
                  <button key={o.v} onClick={() => setWaveMotion(o.v)} title={o.tip}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${waveMotion === o.v ? 'bg-violet-600 border-violet-500 text-white' : 'border-white/15 text-gray-500 hover:border-white/30 hover:text-gray-300'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Wave style */}
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">Style</p>
              <div className="flex gap-1.5">
                {(['ribbon','particle','both'] as WaveStyle[]).map(s => (
                  <button key={s} onClick={() => setWaveStyle(s)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition-all capitalize ${waveStyle === s ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/15 text-gray-500 hover:border-white/30 hover:text-gray-300'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Which corners */}
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">Active Corners</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(['TL','TR','BL','BR'] as Corner[]).map(c => {
                  const active = waveCorners.includes(c);
                  const labels: Record<Corner, string> = { TL:'↖ Top Left', TR:'↗ Top Right', BL:'↙ Bot Left', BR:'↘ Bot Right' };
                  return (
                    <button key={c} onClick={() => setWaveCorners(prev =>
                      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
                    )}
                      className={`py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${active ? 'bg-indigo-700/60 border-indigo-500 text-indigo-300' : 'border-white/10 text-gray-600 hover:border-white/25 hover:text-gray-400'}`}>
                      {labels[c]}
                    </button>
                  );
                })}
              </div>
              {/* Preset shortcuts */}
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {[
                  { label: 'All',  val: ['TL','TR','BL','BR'] as Corner[] },
                  { label: 'Top',  val: ['TL','TR'] as Corner[] },
                  { label: 'Bot',  val: ['BL','BR'] as Corner[] },
                  { label: '↘↖',  val: ['TL','BR'] as Corner[] },
                  { label: '↗↙',  val: ['TR','BL'] as Corner[] },
                  { label: 'None', val: [] as Corner[] },
                ].map(p => (
                  <button key={p.label} onClick={() => setWaveCorners(p.val)}
                    className="px-2 py-0.5 rounded text-[9px] font-medium border border-white/15 text-gray-500 hover:border-white/30 hover:text-gray-300 transition-colors">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Speed */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] text-gray-500 uppercase tracking-wider">Speed</p>
                <span className="text-[10px] text-indigo-400 font-bold">{waveSpeed.toFixed(1)}×</span>
              </div>
              <input type="range" min="0.2" max="3.0" step="0.1" value={waveSpeed}
                onChange={e => setWaveSpeed(Number(e.target.value))}
                className="w-full h-1.5 rounded-full accent-indigo-500" />
              <div className="flex justify-between text-[8px] text-gray-600 mt-0.5">
                <span>Slow</span><span>Fast</span>
              </div>
            </div>

            {/* Color override */}
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">Wave Color</p>
              <div className="flex items-center gap-2">
                <input type="color" value={waveColorOverride || theme.accentColor}
                  onChange={e => setWaveColorOverride(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 bg-transparent" />
                <div className="flex gap-1 flex-wrap">
                  {['', '#818cf8', '#f472b6', '#34d399', '#fbbf24', '#f87171', '#ffffff'].map(c => (
                    <button key={c || 'auto'} onClick={() => setWaveColorOverride(c)}
                      className="w-5 h-5 rounded-full border-2 transition-all"
                      style={{
                        background: c || theme.accentColor,
                        borderColor: (waveColorOverride === c) ? 'white' : 'transparent',
                      }}
                      title={c ? c : 'Auto (match card theme)'} />
                  ))}
                </div>
              </div>
              <p className="text-[9px] text-gray-600 mt-1">Auto follows card theme</p>
            </div>
          </div>

          {/* Theme */}
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Card Theme</p>
            <div className="grid grid-cols-6 gap-1.5">
              {CARD_THEMES.map(t => (
                <button key={t.id} onClick={() => setTheme(t)} title={t.name}
                  className="w-8 h-8 rounded-lg transition-all"
                  style={{ background: t.cssBg, outline: theme.id === t.id ? `2px solid ${t.accentColor}` : 'none', outlineOffset: 2 }} />
              ))}
            </div>
          </div>

          {/* Font */}
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Font</p>
            <div className="flex flex-wrap gap-1.5">
              {FONT_OPTIONS.map(f => (
                <button key={f.id} onClick={() => setFontId(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${fontId === f.id ? 'bg-indigo-600 text-white border-indigo-600' : 'border-white/15 text-gray-400 hover:border-white/30'}`}
                  style={{ fontFamily: f.css }}>
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Format</p>
            <div className="flex gap-2">
              {([['post','Post 1:1'], ['reel','Reel 9:16']] as const).map(([f, label]) => (
                <button key={f} onClick={() => setFormat(f)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-colors ${format === f ? 'bg-indigo-600 text-white border-indigo-600' : 'border-white/15 text-gray-400 hover:border-white/30'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Watermark */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Watermark</p>
              <button onClick={() => setShowWm(s => !s)}
                className={`w-9 h-5 rounded-full flex items-center transition-colors ${showWm ? 'bg-indigo-500 justify-end' : 'bg-white/10 justify-start'}`}>
                <span className="w-4 h-4 bg-white rounded-full mx-0.5 shadow" />
              </button>
            </div>
            {showWm && (
              <input value={wm} onChange={e => setWm(e.target.value)}
                className="w-full bg-white/8 border border-white/15 text-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-indigo-500" />
            )}
          </div>

          {/* Music */}
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              <Music className="w-3 h-3 inline mr-1" />Background Music
            </p>
            <label className="flex items-center gap-2 px-3 py-2 border border-white/15 rounded-xl text-xs text-gray-400 cursor-pointer hover:border-white/30 transition-colors">
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              {musicFile ? musicFile.name.slice(0, 22) : 'Upload MP3 / WAV'}
              <input type="file" accept="audio/*" className="hidden" onChange={handleMusicUpload} />
            </label>
            {musicFile && (
              <button onClick={togglePlay}
                className={`mt-2 w-full py-1.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors ${playing ? 'border-red-500 text-red-400' : 'border-white/15 text-gray-400 hover:border-white/30'}`}>
                {playing ? <><StopIcon className="w-3 h-3" />Stop preview</> : <><Play className="w-3 h-3" />Preview music</>}
              </button>
            )}
          </div>

          {/* Export */}
          <div className="space-y-2 mt-auto">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Export</p>
            <button onClick={downloadFrame}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
              <ImageIcon className="w-4 h-4" />Save as Image (PNG)
            </button>
            <button onClick={() => recordVideo(5000)} disabled={recording}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
              {recording
                ? <><div className="w-3 h-3 bg-white rounded-full animate-pulse" />Recording…</>
                : <><Film className="w-4 h-4" />Export 5s Video (.webm)</>}
            </button>
            <button onClick={() => recordVideo(10000)} disabled={recording}
              className="w-full py-2 border border-rose-600/50 hover:bg-rose-950/40 disabled:opacity-40 text-rose-400 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors">
              {recording
                ? 'Recording…'
                : <><Film className="w-3.5 h-3.5" />Export 10s Video (.webm)</>}
            </button>
            <p className="text-[9px] text-gray-600 text-center leading-relaxed">
              Convert .webm → MP4 at<br/>
              <span className="text-indigo-400">cloudconvert.com</span> for Instagram
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
