import React, { useState } from 'react';

type Layout = '1x1' | '2x2' | '3x3' | '4x4' | '2x4' | '3x4';

const LAYOUTS: Record<Layout, { cols: number; rows: number }> = {
  '1x1': { cols: 1, rows: 1 },
  '2x2': { cols: 2, rows: 2 },
  '3x3': { cols: 3, rows: 3 },
  '4x4': { cols: 4, rows: 4 },
  '2x4': { cols: 4, rows: 2 },
  '3x4': { cols: 4, rows: 3 },
};

const SOURCES = Array.from({ length: 32 }, (_, i) => ({
  id: i + 1,
  name: i < 24 ? `CAM-${String(i + 1).padStart(2, '0')}`
      : i < 29 ? `REPLAY-0${i - 23}`
      : ['PGM', 'PVW', 'GFX'][i - 29] ?? `SRC-${i + 1}`,
  tally: i === 0 ? 'pgm' : i === 1 ? 'pvw' : 'off',
}));

export function Multiviewer() {
  const [layout, setLayout] = useState<Layout>('4x4');
  const { cols, rows } = LAYOUTS[layout];
  const cellCount = cols * rows;

  return (
    <div style={{ padding: '1rem', background: '#0a0a0a', minHeight: '100vh', fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <h2 style={{ color: '#0af', margin: 0 }}>NEXUS MOSAIC</h2>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(Object.keys(LAYOUTS) as Layout[]).map(l => (
            <button
              key={l}
              onClick={() => setLayout(l)}
              style={{
                padding: '3px 8px', fontSize: '0.7rem',
                background: layout === l ? '#0af' : '#222',
                color: layout === l ? '#000' : '#aaa',
                border: '1px solid #333', borderRadius: '2px', cursor: 'pointer',
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: '2px',
        background: '#000',
      }}>
        {Array.from({ length: cellCount }, (_, i) => {
          const src = SOURCES[i % SOURCES.length];
          const tallyColor = src.tally === 'pgm' ? '#f00' : src.tally === 'pvw' ? '#0f0' : '#333';
          return (
            <div
              key={i}
              style={{
                aspectRatio: '16/9',
                background: '#111',
                border: `2px solid ${tallyColor}`,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Simulated video feed */}
              <div style={{
                width: '100%', height: '100%',
                background: `hsl(${(src.id * 37) % 360}, 20%, 15%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: '#666', fontSize: '0.6rem' }}>VIDEO</span>
              </div>

              {/* Source label */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'rgba(0,0,0,0.7)', padding: '2px 4px',
                fontSize: '0.6rem', color: '#eee',
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span>{src.name}</span>
                {src.tally !== 'off' && (
                  <span style={{ color: tallyColor, fontWeight: 'bold' }}>
                    {src.tally.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
