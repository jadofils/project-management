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

// ── 3D Template definitions ──────────────────────────────────────────────────
export type Template3D = 'float' | 'prismatic' | 'parallax';

const TEMPLATE_3D_OPTIONS: { id: Template3D; name: string; desc: string }[] = [
  { id: 'float',     name: 'Float',     desc: 'Hovering card with soft glow and shadow' },
  { id: 'prismatic', name: 'Prismatic', desc: 'Crystal edge refraction, premium look' },
  { id: 'parallax',  name: 'Parallax',  desc: 'Card in deep space with particle field' },
];

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
  waveCorners, waveStyle, waveSpeed, waveColor,
}: {
  template: Template3D; texture: THREE.CanvasTexture; aspect: number;
  waveCorners: Corner[]; waveStyle: WaveStyle; waveSpeed: number; waveColor: string;
}) {
  const bgColors: Record<Template3D, string> = {
    float:     '#0d1117',
    prismatic: '#0a0818',
    parallax:  '#010108',
  };
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color(bgColors[template]);
  }, [template, scene]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 3.2]} fov={42} />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 4, 3]} intensity={2} color={template === 'prismatic' ? '#ffd700' : '#ffffff'} castShadow />
      <pointLight position={[-3, -2, 2]} intensity={0.6} color={template === 'parallax' ? '#4466ff' : '#ffe0a0'} />
      {template === 'float'     && <FloatCard     texture={texture} aspect={aspect} />}
      {template === 'prismatic' && <PrismaticCard texture={texture} aspect={aspect} />}
      {template === 'parallax'  && <ParallaxCard  texture={texture} aspect={aspect} />}
      {waveCorners.map(c => (
        <CornerWaveGroup key={c} corner={c} aspect={aspect}
          hexColor={waveColor} style={waveStyle} speed={waveSpeed} />
      ))}
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
  onClose: () => void;
}

export function ThreeDCardViewer({ item: singleItem, items, initialIdx = 0, onClose }: Props) {
  const [template, setTemplate]   = useState<Template3D>('float');
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
              waveCorners={waveCorners} waveStyle={waveStyle}
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

          {/* 3D Template */}
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">3D Template</p>
            <div className="space-y-1.5">
              {TEMPLATE_3D_OPTIONS.map(t => (
                <button key={t.id} onClick={() => setTemplate(t.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${template === t.id ? 'border-indigo-500 bg-indigo-950/60' : 'border-white/10 hover:border-white/25'}`}>
                  <p className={`text-xs font-semibold ${template === t.id ? 'text-indigo-400' : 'text-gray-300'}`}>{t.name}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* ── Corner Waves ─────────────────────────────────────────── */}
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/30 p-3 space-y-3">
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse inline-block" />
              Corner Waves
            </p>

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
