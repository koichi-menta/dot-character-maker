import { useRef, useEffect, useState, useCallback } from 'react';

const GRID_W = 24;
const CELL = 14;

const SKIN_COLORS = ['#FFE0BD', '#FFCD94', '#F1C27D', '#E0AC69', '#C68642', '#8D5524'];
const HAIR_COLORS = ['#2B2118', '#4A2F22', '#8B5A2B', '#C99A3D', '#E8C15C', '#A83232', '#5B3FA0', '#3E7CB1', '#E85D9A', '#F4F4F4'];
const EYE_COLORS = ['#2E2622', '#4B3621', '#2E5E4E', '#2F5FA8', '#7A4FA3', '#A83232'];
const TOP_COLORS = ['#4A90D9', '#E0574C', '#3FAE6B', '#F0A93E', '#9B59B6', '#3A4750', '#E85D9A', '#20B2AA'];
const PANTS_COLORS = ['#2F3E63', '#1B1B1B', '#7A6A53', '#5C5C5C', '#8C3B4A', '#3E5C4E'];
const SHOE_COLORS = ['#1B1B1B', '#FFFFFF', '#6B4226', '#B23A3A', '#2F3E63', '#7A7A7A'];

function shade(hex: string, percent: number): string {
  const num = parseInt(hex.slice(1), 16);
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const R = num >> 16, G = (num >> 8) & 0x00ff, B = num & 0x0000ff;
  const nr = Math.round((t - R) * p) + R;
  const ng = Math.round((t - G) * p) + G;
  const nb = Math.round((t - B) * p) + B;
  return '#' + (0x1000000 + nr * 0x10000 + ng * 0x100 + nb).toString(16).slice(1);
}

/* ---------- head (共通・頭身に関わらず同じ) ---------- */

function faceClass(row: number, col: number, variant: number): 'base' | 'edge' | null {
  const dx = col - 11.5, dy = row - 11;
  let rx = 8, ry = 8;
  if (variant === 1) { rx = 6.8; ry = 9.6; }
  else if (variant === 2) { rx = 9.6; ry = 7.65; }
  const r = Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
  if (r <= 0.9) return 'base';
  if (r <= 1.06) return 'edge';
  return null;
}

function isBlush(row: number, col: number): boolean {
  const spots: Array<[number, number]> = [[15, 6.5], [15, 16.5]];
  return spots.some(([r, c]) => Math.hypot(row - r, col - c) <= 1.3);
}

const EYE_SHAPES: Record<number, Array<[number, number, string]>> = {
  0: [[0, 0, 'base'], [0, -1, 'base'], [0, 1, 'base'], [-1, 0, 'base'], [1, 0, 'base'], [-1, -1, 'highlight'], [-1, 1, 'base'], [1, -1, 'base'], [1, 1, 'base']],
  1: [[0, 0, 'base'], [0, -1, 'base'], [0, 1, 'base'], [0, -2, 'base'], [0, 2, 'base'], [-1, 0, 'base'], [-1, -1, 'base'], [-1, 1, 'base'], [1, 0, 'base'], [1, -1, 'base'], [1, 1, 'base'], [-1, -2, 'highlight']],
  2: [[0, -1, 'base'], [0, 0, 'base'], [0, 1, 'base']],
  3: [[0, 0, 'base'], [-1, 0, 'base'], [1, 0, 'base'], [0, -1, 'base'], [0, 1, 'base'], [-1, -1, 'highlight'], [1, 1, 'highlight']],
};

function eyeClass(row: number, col: number, variant: number): string | null {
  const shape = EYE_SHAPES[variant];
  for (const [dr, dc, kind] of shape) {
    if (row === 12 + dr && col === 8 + dc) return kind;
    if (row === 12 + dr && col === 15 - dc) return kind;
  }
  return null;
}

const MOUTH_SHAPES: Record<number, Array<[number, number]>> = {
  0: [[0, -1], [0, 0], [0, 1], [-1, -2], [-1, 2]],
  1: [[0, -1], [0, 0], [0, 1], [1, -1], [1, 0], [1, 1]],
  2: [[0, -1], [0, 0], [0, 1], [0, 2]],
  3: [[0, -1], [-1, 0], [0, 1], [1, 0]],
};

function mouthClass(row: number, col: number, variant: number): 'base' | null {
  const shape = MOUTH_SHAPES[variant];
  for (const [dr, dc] of shape) {
    if (row === 17 + dr && col === 11 + dc) return 'base';
  }
  return null;
}

function hairClass(row: number, col: number, variant: number): 'base' | 'edge' | null {
  const dx = col - 11.5, dy = row - 11;
  const capR = Math.sqrt(dx * dx + dy * dy);
  if (capR <= 8.6 && row <= 9) return 'base';
  if (capR <= 9.6 && row <= 9) return 'edge';
  if (variant === 0) {
    if ((col >= 3 && col <= 5) || (col >= 18 && col <= 20)) {
      if (row >= 9 && row <= 12) return 'base';
    }
  } else if (variant === 1) {
    if ((col >= 2 && col <= 5) || (col >= 18 && col <= 21)) {
      if (row >= 9 && row <= 21) return 'base';
    }
  } else if (variant === 2) {
    if ((col >= 3 && col <= 5) || (col >= 18 && col <= 20)) {
      if (row >= 9 && row <= 12) return 'base';
    }
    if (Math.hypot(row - 6, col - 21) <= 2.2) return 'base';
    if (col === 21 && row >= 7 && row <= 16) return 'base';
    if (col === 22 && row >= 8 && row <= 14) return 'edge';
  } else if (variant === 3) {
    if ((col >= 3 && col <= 6) || (col >= 17 && col <= 20)) {
      if (row >= 9 && row <= 16) return 'base';
    }
  }
  return null;
}

/* ---------- body: 1.5頭身(ちび) ---------- */

const CHIBI_HEIGHT = 30;

function neckClassChibi(row: number, col: number): 'base' | null {
  if (col < 10 || col > 13) return null;
  return row === 20 ? 'base' : null;
}

function torsoClassChibi(row: number, col: number, variant: number): 'base' | 'edge' | 'skin' | null {
  if (row < 20 || row > 25) return null;
  const dx = col - 11.5;
  const halfWidth = row <= 22 ? 6.3 : 6.0;
  if (Math.abs(dx) > halfWidth) return null;
  if (variant === 2 && row === 23 && (col === 10 || col === 13)) return 'edge';
  let cutout = false;
  if (variant === 0) {
    if (row === 20 && Math.abs(dx) <= 1.6) cutout = true;
  } else if (variant === 1) {
    const width = 1.8 - (row - 20) * 0.9;
    if (row <= 21 && width > 0 && Math.abs(dx) <= width) cutout = true;
  } else if (variant === 2) {
    if (row === 20 && Math.abs(dx) <= 1) cutout = true;
  } else if (variant === 3) {
    if (row === 20) return 'edge';
  }
  if (cutout) return 'skin';
  const edgeDist = halfWidth - Math.abs(dx);
  if (edgeDist < 1) return 'edge';
  return 'base';
}

function armClassChibi(row: number, col: number): 'sleeve' | 'skin' | null {
  for (const cx of [4.6, 18.4]) {
    const dx = col - cx;
    if (row >= 21 && row <= 23 && Math.abs(dx) <= 1) return 'sleeve';
    if (row === 24 && Math.abs(dx) <= 1.3) return 'skin';
  }
  return null;
}

function legsClassChibi(row: number, col: number, variant: number): 'base' | 'skin' | null {
  if (row < 26 || row > 27) return null;
  if (variant === 2) {
    const dx = col - 11.5;
    const width = row === 26 ? 5 : 6;
    return Math.abs(dx) <= width ? 'base' : null;
  }
  for (const cx of [8.7, 14.3]) {
    if (Math.abs(col - cx) > 1.6) continue;
    if (variant === 0) return 'base';
    if (variant === 1) return row === 26 ? 'base' : 'skin';
  }
  return null;
}

function shoeClassChibi(row: number, col: number, variant: number): 'base' | null {
  for (const cx of [8.7, 14.3]) {
    if (Math.abs(col - cx) > 1.6) continue;
    if (variant === 1 && row >= 27 && row <= 29) return 'base';
    if (variant === 0 && row >= 28 && row <= 29) return 'base';
  }
  return null;
}

/* ---------- body: 2.5頭身(スリム) ---------- */

const SLIM_HEIGHT = 44;

function neckClassSlim(row: number, col: number): 'base' | 'edge' | null {
  if (col < 10 || col > 13) return null;
  if (row === 20) return 'base';
  if (row === 21) return 'edge';
  return null;
}

function torsoClassSlim(row: number, col: number, variant: number): 'base' | 'edge' | 'skin' | null {
  if (row < 20 || row > 33) return null;
  const dx = col - 11.5;
  let halfWidth;
  if (row <= 24) halfWidth = 6.5;
  else if (row <= 30) halfWidth = 5.6;
  else halfWidth = 6.2;
  if (Math.abs(dx) > halfWidth) return null;
  if (variant === 2 && (row === 27 || row === 28) && (col === 10 || col === 13)) return 'edge';
  let cutout = false;
  if (variant === 0) {
    const d = Math.hypot(dx, row - 20);
    if (row <= 21 && d <= 2) cutout = true;
  } else if (variant === 1) {
    const width = 2.3 - (row - 20) * 0.8;
    if (row <= 23 && width > 0 && Math.abs(dx) <= width) cutout = true;
  } else if (variant === 2) {
    const d = Math.hypot(dx, row - 20);
    if (row <= 20 && d <= 1.3) cutout = true;
  } else if (variant === 3) {
    if (row <= 21) return 'edge';
  }
  if (cutout) return 'skin';
  const edgeDist = halfWidth - Math.abs(dx);
  if (edgeDist < 1) return 'edge';
  return 'base';
}

function armClassSlim(row: number, col: number): 'sleeve' | 'skin' | null {
  for (const cx of [4.5, 18.5]) {
    const dx = col - cx;
    if (row >= 23 && row <= 27 && Math.abs(dx) <= 1) return 'sleeve';
    if (row >= 28 && row <= 30 && Math.abs(dx) <= 1) return 'skin';
    if (row >= 31 && row <= 32 && Math.hypot(row - 31.5, dx) <= 1.8) return 'skin';
  }
  return null;
}

function legsClassSlim(row: number, col: number, variant: number): 'base' | 'edge' | 'skin' | null {
  if (row < 33 || row > 39) return null;
  if (variant === 2) {
    if (row <= 35) {
      const dx = col - 11.5;
      const width = 4 + (row - 33) * 0.9;
      return Math.abs(dx) <= width ? 'base' : null;
    }
    for (const cx of [8.7, 14.3]) {
      if (Math.abs(col - cx) <= 1.6) return 'skin';
    }
    return null;
  }
  for (const cx of [8.5, 14.5]) {
    const dx = col - cx;
    if (Math.abs(dx) > 1.8) continue;
    if (variant === 0) {
      if (row >= 33 && row <= 38) return 'base';
      if (row === 39) return 'edge';
    } else if (variant === 1) {
      if (row >= 33 && row <= 35) return 'base';
      if (row >= 36 && row <= 39) return 'skin';
    }
  }
  return null;
}

function shoeClassSlim(row: number, col: number, variant: number): 'base' | null {
  for (const cx of [8.5, 14.5]) {
    const dx = col - cx;
    if (variant === 1) {
      if (row >= 38 && row <= 41 && Math.abs(dx) <= 1.7) return 'base';
    } else {
      if (row >= 40 && row <= 41 && Math.abs(dx) <= 1.8) return 'base';
      if (row === 42 && Math.abs(dx) <= 1.3) return 'base';
    }
  }
  return null;
}

function randomOf<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const PROPORTION_LABELS = ['1.5頭身(ちび)', '2.5頭身(スリム)'];
const PROPORTION_VALUES = ['chibi', 'slim'] as const;
const FACE_LABELS = ['まる', 'たまご', 'ふっくら'];
const EYE_LABELS = ['ぱっちり', 'くりくり', 'にっこり', 'きらきら'];
const MOUTH_LABELS = ['スマイル', 'わくわく', 'ふつう', 'にゃっ'];
const HAIR_LABELS = ['ショート', 'ロング', 'ポニーテール', 'ボブ'];
const TOP_LABELS = ['まるえり', 'Vネック', 'パーカー', 'タートル'];
const BOTTOM_LABELS = ['ロングパンツ', 'ショートパンツ', 'スカート'];
const SHOE_LABELS = ['スニーカー', 'ブーツ'];

function Swatches({ colors, value, onChange }: { colors: string[]; value: string; onChange: (color: string) => void }) {
  return (
    <div className="swatchRow">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          className={'swatch' + (value.toUpperCase() === c.toUpperCase() ? ' active' : '')}
          style={{ background: c }}
          onClick={() => onChange(c)}
          aria-label={c}
        />
      ))}
      <label className="swatch customSwatch" title="カスタムカラー">
        ＋
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}

function Pills({ labels, value, onChange }: { labels: string[]; value: number; onChange: (index: number) => void }) {
  return (
    <div className="pillRow">
      {labels.map((label, i) => (
        <button
          key={label}
          type="button"
          className={'pill' + (value === i ? ' active' : '')}
          onClick={() => onChange(i)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function DotCharacterGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [proportion, setProportion] = useState<(typeof PROPORTION_VALUES)[number]>('chibi');
  const [face, setFace] = useState(0);
  const [skin, setSkin] = useState(SKIN_COLORS[1]);
  const [eyes, setEyes] = useState(0);
  const [eyeColor, setEyeColor] = useState(EYE_COLORS[0]);
  const [mouth, setMouth] = useState(0);
  const [hair, setHair] = useState(0);
  const [hairColor, setHairColor] = useState(HAIR_COLORS[0]);
  const [top, setTop] = useState(0);
  const [topColor, setTopColor] = useState(TOP_COLORS[0]);
  const [bottom, setBottom] = useState(0);
  const [pantsColor, setPantsColor] = useState(PANTS_COLORS[0]);
  const [shoe, setShoe] = useState(0);
  const [shoeColor, setShoeColor] = useState(SHOE_COLORS[0]);

  const gridH = proportion === 'chibi' ? CHIBI_HEIGHT : SLIM_HEIGHT;
  const neckFn = proportion === 'chibi' ? neckClassChibi : neckClassSlim;
  const torsoFn = proportion === 'chibi' ? torsoClassChibi : torsoClassSlim;
  const armFn = proportion === 'chibi' ? armClassChibi : armClassSlim;
  const legsFn = proportion === 'chibi' ? legsClassChibi : legsClassSlim;
  const shoeFn = proportion === 'chibi' ? shoeClassChibi : shoeClassSlim;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = GRID_W * CELL, H = gridH * CELL;
    ctx.clearRect(0, 0, W, H);

    const pixels: (string | null)[][] = Array.from({ length: gridH }, () => new Array(GRID_W).fill(null));
    const set = (row: number, col: number, color: string) => {
      if (row >= 0 && row < gridH && col >= 0 && col < GRID_W) pixels[row][col] = color;
    };

    for (let row = 0; row < gridH; row++) {
      for (let col = 0; col < GRID_W; col++) {
        const l = legsFn(row, col, bottom);
        if (l === 'base') set(row, col, pantsColor);
        else if (l === 'edge') set(row, col, shade(pantsColor, -0.25));
        else if (l === 'skin') set(row, col, skin);
      }
    }
    for (let row = 0; row < gridH; row++) {
      for (let col = 0; col < GRID_W; col++) {
        const s = shoeFn(row, col, shoe);
        if (s === 'base') set(row, col, shoeColor);
      }
    }
    for (let row = 0; row < gridH; row++) {
      for (let col = 0; col < GRID_W; col++) {
        const n = neckFn(row, col);
        if (n === 'base') set(row, col, skin);
        else if (n === 'edge') set(row, col, shade(skin, -0.15));
      }
    }
    for (let row = 0; row < gridH; row++) {
      for (let col = 0; col < GRID_W; col++) {
        const t = torsoFn(row, col, top);
        if (t === 'base') set(row, col, topColor);
        else if (t === 'edge') set(row, col, shade(topColor, -0.25));
        else if (t === 'skin') set(row, col, skin);
      }
    }
    for (let row = 0; row < gridH; row++) {
      for (let col = 0; col < GRID_W; col++) {
        const a = armFn(row, col);
        if (a === 'sleeve') set(row, col, topColor);
        else if (a === 'skin') set(row, col, skin);
      }
    }
    for (let row = 0; row < gridH; row++) {
      for (let col = 0; col < GRID_W; col++) {
        const f = faceClass(row, col, face);
        if (f === 'base') set(row, col, isBlush(row, col) ? '#FFB3C6' : skin);
        else if (f === 'edge') set(row, col, shade(skin, -0.2));
      }
    }
    for (let row = 0; row < gridH; row++) {
      for (let col = 0; col < GRID_W; col++) {
        const e = eyeClass(row, col, eyes);
        if (e === 'base') set(row, col, eyeColor);
        else if (e === 'highlight') set(row, col, '#FFFFFF');
      }
    }
    for (let row = 0; row < gridH; row++) {
      for (let col = 0; col < GRID_W; col++) {
        const m = mouthClass(row, col, mouth);
        if (m === 'base') set(row, col, '#8A4A4A');
      }
    }
    for (let row = 0; row < gridH; row++) {
      for (let col = 0; col < GRID_W; col++) {
        const h = hairClass(row, col, hair);
        if (h === 'base') set(row, col, hairColor);
        else if (h === 'edge') set(row, col, shade(hairColor, -0.28));
      }
    }

    for (let row = 0; row < gridH; row++) {
      for (let col = 0; col < GRID_W; col++) {
        const pixel = pixels[row][col];
        if (pixel) {
          ctx.fillStyle = pixel;
          ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
        }
      }
    }
  }, [gridH, neckFn, torsoFn, armFn, legsFn, shoeFn, face, skin, eyes, eyeColor, mouth, hair, hairColor, top, topColor, bottom, pantsColor, shoe, shoeColor]);

  useEffect(() => { draw(); }, [draw]);

  const handleRandom = () => {
    setFace(Math.floor(Math.random() * 3));
    setSkin(randomOf(SKIN_COLORS));
    setEyes(Math.floor(Math.random() * 4));
    setEyeColor(randomOf(EYE_COLORS));
    setMouth(Math.floor(Math.random() * 4));
    setHair(Math.floor(Math.random() * 4));
    setHairColor(randomOf(HAIR_COLORS));
    setTop(Math.floor(Math.random() * 4));
    setTopColor(randomOf(TOP_COLORS));
    setBottom(Math.floor(Math.random() * 3));
    setPantsColor(randomOf(PANTS_COLORS));
    setShoe(Math.floor(Math.random() * 2));
    setShoeColor(randomOf(SHOE_COLORS));
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'dot-character.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Space+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        .app {
          --ink: #241E3D;
          --paper: #F3EFFA;
          --coral: #FF6F61;
          --mint: #4ECDC4;
          --yellow: #FFD166;
          --line: #DCD4EE;
          box-sizing: border-box;
          min-height: 100%;
          width: 100%;
          padding: 28px 20px 40px;
          background-color: var(--paper);
          background-image: radial-gradient(var(--line) 1.4px, transparent 1.4px);
          background-size: 22px 22px;
          font-family: 'Space Grotesk', sans-serif;
          color: var(--ink);
        }
        .app * { box-sizing: border-box; }
        .header { max-width: 980px; margin: 0 auto 22px; }
        .eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.12em;
          color: var(--coral);
          text-transform: uppercase;
          margin: 0 0 6px;
        }
        .title { font-family: 'Fredoka', sans-serif; font-weight: 600; font-size: 32px; margin: 0; letter-spacing: 0.01em; }
        .subtitle { margin: 6px 0 0; font-size: 14px; color: #6b6483; }
        .layout {
          max-width: 980px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 760px) { .layout { grid-template-columns: 1fr; } }
        .stage { background: var(--ink); border-radius: 20px; padding: 16px; position: sticky; top: 16px; }
        .stageTop { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .powerDot {
          width: 9px; height: 9px; border-radius: 50%; background: var(--coral);
          box-shadow: 0 0 6px var(--coral); display: inline-block; margin-right: 8px;
        }
        .stageLabel { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.08em; color: #cfc9e6; }
        .stageGrid { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #6f6790; }
        .canvasFrame {
          border-radius: 12px; padding: 8px; display: flex; justify-content: center;
          background-color: #fff;
          background-image:
            linear-gradient(45deg, #d8d3e8 25%, transparent 25%),
            linear-gradient(-45deg, #d8d3e8 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #d8d3e8 75%),
            linear-gradient(-45deg, transparent 75%, #d8d3e8 75%);
          background-size: 16px 16px;
          background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
        }
        canvas {
          width: auto; max-width: 100%; height: 420px; display: block; border-radius: 6px;
          image-rendering: pixelated; image-rendering: -moz-crisp-edges; image-rendering: crisp-edges;
        }
        .stageActions { display: flex; gap: 10px; margin-top: 14px; }
        .btn {
          flex: 1; border: none; border-radius: 10px; padding: 12px 14px;
          font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 14px;
          cursor: pointer; transition: transform 0.12s ease, filter 0.12s ease;
        }
        .btn:hover { filter: brightness(1.06); transform: translateY(-1px); }
        .btn:active { transform: translateY(0); }
        .btnPrimary { background: var(--coral); color: #fff; }
        .btnSecondary { background: var(--mint); color: #10312e; }
        .rail { display: flex; flex-direction: column; gap: 14px; }
        .section { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 16px 18px; }
        .sectionHead { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }
        .sectionTitle { font-family: 'Fredoka', sans-serif; font-weight: 600; font-size: 16px; margin: 0; }
        .sectionHint { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #9a92b8; }
        .pillRow { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
        .pill {
          border: 1.5px solid var(--line); background: #fff; color: var(--ink);
          border-radius: 999px; padding: 6px 12px; font-size: 13px;
          font-family: 'Space Grotesk', sans-serif; cursor: pointer; transition: all 0.12s ease;
        }
        .pill:hover { border-color: var(--coral); }
        .pill.active { background: var(--ink); border-color: var(--ink); color: #fff; }
        .swatchRow { display: flex; flex-wrap: wrap; gap: 8px; }
        .swatch {
          width: 26px; height: 26px; border-radius: 8px;
          border: 2px solid rgba(0,0,0,0.06); cursor: pointer; padding: 0; position: relative;
        }
        .swatch.active { border-color: var(--ink); box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--ink); }
        .customSwatch {
          display: flex; align-items: center; justify-content: center; background: #fff;
          border: 2px dashed var(--line); font-size: 14px; color: #9a92b8; overflow: hidden;
        }
        .customSwatch input { opacity: 0; position: absolute; inset: 0; cursor: pointer; }
        .proportionSection { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 16px 18px; }
      `}</style>

      <div className="header">
        <p className="eyebrow">Pixel Workshop</p>
        <h1 className="title">ドットキャラクターメーカー</h1>
        <p className="subtitle">頭身・顔・目・口・髪・トップス・ボトムス・くつを選んで、自分だけのドットキャラを作ろう</p>
      </div>

      <div className="layout">
        <div className="stage">
          <div className="stageTop">
            <span>
              <span className="powerDot" />
              <span className="stageLabel">CHARACTER.PREVIEW</span>
            </span>
            <span className="stageGrid">{GRID_W}×{gridH}</span>
          </div>
          <div className="canvasFrame">
            <canvas ref={canvasRef} width={GRID_W * CELL} height={gridH * CELL} />
          </div>
          <div className="stageActions">
            <button type="button" className="btn btnSecondary" onClick={handleRandom}>🎲 ランダム</button>
            <button type="button" className="btn btnPrimary" onClick={handleDownload}>⬇ PNG保存</button>
          </div>
        </div>

        <div className="rail">
          <div className="proportionSection">
            <div className="sectionHead"><h2 className="sectionTitle">頭身</h2><span className="sectionHint">PROPORTION</span></div>
            <Pills
              labels={PROPORTION_LABELS}
              value={PROPORTION_VALUES.indexOf(proportion)}
              onChange={(i) => setProportion(PROPORTION_VALUES[i])}
            />
          </div>

          <div className="section">
            <div className="sectionHead"><h2 className="sectionTitle">顔</h2><span className="sectionHint">FACE</span></div>
            <Pills labels={FACE_LABELS} value={face} onChange={setFace} />
            <Swatches colors={SKIN_COLORS} value={skin} onChange={setSkin} />
          </div>

          <div className="section">
            <div className="sectionHead"><h2 className="sectionTitle">目</h2><span className="sectionHint">EYES</span></div>
            <Pills labels={EYE_LABELS} value={eyes} onChange={setEyes} />
            <Swatches colors={EYE_COLORS} value={eyeColor} onChange={setEyeColor} />
          </div>

          <div className="section">
            <div className="sectionHead"><h2 className="sectionTitle">口</h2><span className="sectionHint">MOUTH</span></div>
            <Pills labels={MOUTH_LABELS} value={mouth} onChange={setMouth} />
          </div>

          <div className="section">
            <div className="sectionHead"><h2 className="sectionTitle">髪</h2><span className="sectionHint">HAIR</span></div>
            <Pills labels={HAIR_LABELS} value={hair} onChange={setHair} />
            <Swatches colors={HAIR_COLORS} value={hairColor} onChange={setHairColor} />
          </div>

          <div className="section">
            <div className="sectionHead"><h2 className="sectionTitle">トップス</h2><span className="sectionHint">TOP</span></div>
            <Pills labels={TOP_LABELS} value={top} onChange={setTop} />
            <Swatches colors={TOP_COLORS} value={topColor} onChange={setTopColor} />
          </div>

          <div className="section">
            <div className="sectionHead"><h2 className="sectionTitle">ボトムス</h2><span className="sectionHint">BOTTOM</span></div>
            <Pills labels={BOTTOM_LABELS} value={bottom} onChange={setBottom} />
            <Swatches colors={PANTS_COLORS} value={pantsColor} onChange={setPantsColor} />
          </div>

          <div className="section">
            <div className="sectionHead"><h2 className="sectionTitle">くつ</h2><span className="sectionHint">SHOES</span></div>
            <Pills labels={SHOE_LABELS} value={shoe} onChange={setShoe} />
            <Swatches colors={SHOE_COLORS} value={shoeColor} onChange={setShoeColor} />
          </div>

        </div>
      </div>
    </div>
  );
}
