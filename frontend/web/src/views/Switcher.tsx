import React, { useState, useCallback, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../contexts/AuthContext';

type TransitionType = 'CUT' | 'MIX' | 'WIPE' | 'DIP' | 'STING';

interface SwitcherState {
  pgm: number;
  pvw: number;
  transition: TransitionType;
  rate: number;
  inTransition: boolean;
}

const SOURCES = Array.from({ length: 32 }, (_, i) => ({
  id: i + 1,
  name: i < 24 ? `CAM-${String(i + 1).padStart(2, '0')}`
      : i < 29 ? `REPLAY-0${i - 23}`
      : ['PGM', 'PVW', 'GFX'][i - 29] ?? `SRC-${i + 1}`,
}));

const TRANSITIONS: TransitionType[] = ['CUT', 'MIX', 'WIPE', 'DIP', 'STING'];

export function Switcher() {
  const { role, token } = useAuth();
  const { sendMessage, lastMessage } = useWebSocket(token ?? undefined);
  const canOperate = role !== 'VIEWER';

  const [state, setState] = useState<SwitcherState>({
    pgm: 1, pvw: 2, transition: 'CUT', rate: 25, inTransition: false,
  });

  useEffect(() => {
    if (lastMessage?.type === 'TALLY_UPDATE') {
      setState(prev => ({
        ...prev,
        pgm: lastMessage.pgm as number,
        pvw: lastMessage.pvw as number,
      }));
    }
  }, [lastMessage]);

  const handlePvwSelect = useCallback((id: number) => {
    if (!canOperate) return;
    setState(prev => ({ ...prev, pvw: id }));
    sendMessage({ type: 'SWITCHER_PVW', payload: { source: id } });
  }, [canOperate, sendMessage]);

  const handleCut = useCallback(() => {
    if (!canOperate) return;
    sendMessage({ type: 'SWITCHER_CUT', payload: { pvw: state.pvw, pgm: state.pgm } });
  }, [canOperate, sendMessage, state]);

  const handleAuto = useCallback(() => {
    if (!canOperate) return;
    sendMessage({ type: 'SWITCHER_AUTO', payload: { transition: state.transition, rate: state.rate } });
  }, [canOperate, sendMessage, state]);

  return (
    <div style={{ padding: '1rem', fontFamily: 'monospace', background: '#111', color: '#eee', minHeight: '100vh' }}>
      <h2 style={{ color: '#0af', marginBottom: '1rem' }}>NEXUS SWITCH — Virtual Production Switcher</h2>

      {/* Preview Bus */}
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ color: '#0f0', marginBottom: '0.25rem', fontSize: '0.75rem' }}>PREVIEW</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {SOURCES.map(src => (
            <button
              key={src.id}
              onClick={() => handlePvwSelect(src.id)}
              disabled={!canOperate}
              style={{
                padding: '4px 8px', fontSize: '0.7rem', cursor: canOperate ? 'pointer' : 'default',
                background: state.pvw === src.id ? '#0f0' : '#222',
                color: state.pvw === src.id ? '#000' : '#aaa',
                border: '1px solid #333', borderRadius: '2px',
              }}
            >
              {src.name}
            </button>
          ))}
        </div>
      </div>

      {/* Program Bus (read-only) */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ color: '#f00', marginBottom: '0.25rem', fontSize: '0.75rem' }}>PROGRAM</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {SOURCES.map(src => (
            <div
              key={src.id}
              style={{
                padding: '4px 8px', fontSize: '0.7rem',
                background: state.pgm === src.id ? '#f00' : '#1a1a1a',
                color: state.pgm === src.id ? '#fff' : '#555',
                border: '1px solid #333', borderRadius: '2px',
              }}
            >
              {src.name}
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '4px' }}>TRANSITION</div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {TRANSITIONS.map(t => (
              <button
                key={t}
                onClick={() => setState(prev => ({ ...prev, transition: t }))}
                disabled={!canOperate}
                style={{
                  padding: '4px 10px', fontSize: '0.75rem',
                  background: state.transition === t ? '#0af' : '#222',
                  color: state.transition === t ? '#000' : '#aaa',
                  border: '1px solid #333', borderRadius: '2px', cursor: 'pointer',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '4px' }}>RATE (frames)</div>
          <input
            type="number" min={1} max={250} value={state.rate}
            onChange={e => setState(prev => ({ ...prev, rate: parseInt(e.target.value) || 25 }))}
            disabled={!canOperate}
            style={{ width: '60px', background: '#222', color: '#eee', border: '1px solid #333', padding: '4px', borderRadius: '2px' }}
          />
        </div>

        <button
          onClick={handleCut}
          disabled={!canOperate}
          style={{
            padding: '8px 24px', fontSize: '1rem', fontWeight: 'bold',
            background: '#f00', color: '#fff', border: 'none', borderRadius: '4px',
            cursor: canOperate ? 'pointer' : 'not-allowed',
          }}
        >
          CUT
        </button>

        <button
          onClick={handleAuto}
          disabled={!canOperate}
          style={{
            padding: '8px 24px', fontSize: '1rem', fontWeight: 'bold',
            background: '#0af', color: '#000', border: 'none', borderRadius: '4px',
            cursor: canOperate ? 'pointer' : 'not-allowed',
          }}
        >
          AUTO
        </button>
      </div>

      {/* Status */}
      <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#666' }}>
        PGM: {SOURCES.find(s => s.id === state.pgm)?.name} &nbsp;|&nbsp;
        PVW: {SOURCES.find(s => s.id === state.pvw)?.name} &nbsp;|&nbsp;
        Role: {role}
      </div>
    </div>
  );
}
