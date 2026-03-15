import React, { useState, useCallback, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../contexts/AuthContext';

type TransitionType = 'CUT' | 'MIX' | 'WIPE' | 'DIP' | 'STING';

interface MEState {
  pgm: number;
  pvw: number;
  transition: TransitionType;
  rate: number;
  inTransition: boolean;
  progress: number;
}

const ME_COUNT = 3;
const TRANSITIONS: TransitionType[] = ['CUT', 'MIX', 'WIPE', 'DIP', 'STING'];

const SOURCES = Array.from({ length: 32 }, (_, i) => ({
  id: i + 1,
  name: i < 24 ? `CAM-${String(i + 1).padStart(2, '0')}`
      : i < 29 ? `REPLAY-0${i - 23}`
      : ['PGM', 'PVW', 'GFX'][i - 29] ?? `SRC-${i + 1}`,
}));

function makeDefaultME(pgm: number, pvw: number): MEState {
  return { pgm, pvw, transition: 'CUT', rate: 25, inTransition: false, progress: 0 };
}

const S: React.CSSProperties = {
  fontFamily: '"Courier New", monospace',
  background: '#080808',
  color: '#e0e0e0',
  minHeight: '100vh',
  padding: '12px',
};

function srcName(id: number) {
  return SOURCES.find(s => s.id === id)?.name ?? `SRC-${id}`;
}

interface MEBankProps {
  meIndex: number;
  state: MEState;
  canOperate: boolean;
  onPvwSelect: (me: number, id: number) => void;
  onCut: (me: number) => void;
  onAuto: (me: number) => void;
  onTransition: (me: number, t: TransitionType) => void;
  onRate: (me: number, r: number) => void;
}

function MEBank({ meIndex, state, canOperate, onPvwSelect, onCut, onAuto, onTransition, onRate }: MEBankProps) {
  const meLabel = `ME-${meIndex + 1}`;
  const accentColor = ['#00b4d8', '#06d6a0', '#ffd166'][meIndex] ?? '#00b4d8';

  return (
    <div style={{
      background: '#0f0f0f',
      border: `1px solid #1e1e1e`,
      borderTop: `2px solid ${accentColor}`,
      borderRadius: '6px',
      padding: '12px',
      marginBottom: '10px',
    }}>
      {/* ME header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <span style={{ color: accentColor, fontWeight: 'bold', fontSize: '13px', letterSpacing: '2px' }}>
          {meLabel}
        </span>
        <span style={{ color: '#555', fontSize: '10px' }}>
          PGM: <b style={{ color: '#ef233c' }}>{srcName(state.pgm)}</b>
          &nbsp;&nbsp;PVW: <b style={{ color: '#06d6a0' }}>{srcName(state.pvw)}</b>
        </span>
        {state.inTransition && (
          <span style={{ color: accentColor, fontSize: '10px', marginLeft: 'auto' }}>
            {state.transition} {Math.round(state.progress)}%
          </span>
        )}
      </div>

      {/* Preview bus */}
      <div style={{ marginBottom: '6px' }}>
        <div style={{ color: '#06d6a0', fontSize: '9px', letterSpacing: '1px', marginBottom: '4px', textTransform: 'uppercase' }}>
          Preview
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
          {SOURCES.map(src => (
            <button
              key={src.id}
              onClick={() => onPvwSelect(meIndex, src.id)}
              disabled={!canOperate}
              style={{
                padding: '3px 7px', fontSize: '9px',
                background: state.pvw === src.id ? '#06d6a0' : '#161616',
                color: state.pvw === src.id ? '#000' : '#666',
                border: `1px solid ${state.pvw === src.id ? '#06d6a0' : '#2a2a2a'}`,
                borderRadius: '2px', cursor: canOperate ? 'pointer' : 'default',
                transition: 'all .1s',
              }}
            >
              {src.name}
            </button>
          ))}
        </div>
      </div>

      {/* Program bus (read-only) */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ color: '#ef233c', fontSize: '9px', letterSpacing: '1px', marginBottom: '4px', textTransform: 'uppercase' }}>
          Program
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
          {SOURCES.map(src => (
            <div
              key={src.id}
              style={{
                padding: '3px 7px', fontSize: '9px',
                background: state.pgm === src.id ? '#ef233c' : '#0d0d0d',
                color: state.pgm === src.id ? '#fff' : '#333',
                border: `1px solid ${state.pgm === src.id ? '#ef233c' : '#1e1e1e'}`,
                borderRadius: '2px',
              }}
            >
              {src.name}
            </div>
          ))}
        </div>
      </div>

      {/* Transition bar */}
      {state.inTransition && (
        <div style={{ height: '4px', background: '#1e1e1e', borderRadius: '2px', marginBottom: '8px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: accentColor,
            width: `${state.progress}%`, transition: 'width .04s linear',
          }} />
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '9px', color: '#555', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '1px' }}>Transition</div>
          <div style={{ display: 'flex', gap: '3px' }}>
            {TRANSITIONS.map(t => (
              <button
                key={t}
                onClick={() => onTransition(meIndex, t)}
                disabled={!canOperate}
                style={{
                  padding: '3px 8px', fontSize: '10px',
                  background: state.transition === t ? accentColor : '#161616',
                  color: state.transition === t ? '#000' : '#888',
                  border: `1px solid ${state.transition === t ? accentColor : '#2a2a2a'}`,
                  borderRadius: '2px', cursor: 'pointer',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '9px', color: '#555', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '1px' }}>Rate (f)</div>
          <input
            type="number" min={1} max={250} value={state.rate}
            onChange={e => onRate(meIndex, parseInt(e.target.value) || 25)}
            disabled={!canOperate}
            style={{
              width: '55px', background: '#0d0d0d', color: '#e0e0e0',
              border: '1px solid #2a2a2a', padding: '3px 6px',
              borderRadius: '2px', fontFamily: 'inherit', fontSize: '11px',
            }}
          />
        </div>

        <button
          onClick={() => onCut(meIndex)}
          disabled={!canOperate}
          style={{
            padding: '7px 22px', fontSize: '13px', fontWeight: 'bold',
            background: '#ef233c', color: '#fff', border: 'none',
            borderRadius: '3px', cursor: canOperate ? 'pointer' : 'not-allowed',
            letterSpacing: '1px',
          }}
        >
          CUT
        </button>

        <button
          onClick={() => onAuto(meIndex)}
          disabled={!canOperate}
          style={{
            padding: '7px 22px', fontSize: '13px', fontWeight: 'bold',
            background: accentColor, color: '#000', border: 'none',
            borderRadius: '3px', cursor: canOperate ? 'pointer' : 'not-allowed',
            letterSpacing: '1px',
          }}
        >
          AUTO
        </button>
      </div>
    </div>
  );
}

export function Switcher() {
  const { role, token } = useAuth();
  const { sendMessage, lastMessage } = useWebSocket(token ?? undefined);
  const canOperate = role !== 'VIEWER';

  const [mes, setMes] = useState<MEState[]>([
    makeDefaultME(1, 2),
    makeDefaultME(3, 4),
    makeDefaultME(5, 6),
  ]);

  // Transition animation state
  const [transTimers, setTransTimers] = useState<(ReturnType<typeof setInterval> | null)[]>([null, null, null]);

  useEffect(() => {
    if (lastMessage?.type === 'TALLY_UPDATE') {
      const meIdx = (lastMessage.me as number ?? 1) - 1;
      setMes(prev => prev.map((m, i) =>
        i === meIdx
          ? { ...m, pgm: lastMessage.pgm as number, pvw: lastMessage.pvw as number }
          : m
      ));
    }
  }, [lastMessage]);

  const handlePvwSelect = useCallback((meIdx: number, id: number) => {
    if (!canOperate) return;
    setMes(prev => prev.map((m, i) => i === meIdx ? { ...m, pvw: id } : m));
    sendMessage({ type: 'SWITCHER_PVW', payload: { me: meIdx + 1, source: id } });
  }, [canOperate, sendMessage]);

  const handleCut = useCallback((meIdx: number) => {
    if (!canOperate) return;
    setMes(prev => prev.map((m, i) => {
      if (i !== meIdx) return m;
      return { ...m, pgm: m.pvw, pvw: m.pgm };
    }));
    sendMessage({ type: 'SWITCHER_CUT', payload: { me: meIdx + 1, pvw: mes[meIdx].pvw, pgm: mes[meIdx].pgm } });
  }, [canOperate, sendMessage, mes]);

  const handleAuto = useCallback((meIdx: number) => {
    if (!canOperate) return;
    const me = mes[meIdx];
    if (me.inTransition) return;

    setMes(prev => prev.map((m, i) => i === meIdx ? { ...m, inTransition: true, progress: 0 } : m));

    const totalMs = (me.rate / 25) * 1000;
    const step = 100 / (totalMs / 40);
    let prog = 0;

    const timer = setInterval(() => {
      prog += step;
      if (prog >= 100) {
        clearInterval(timer);
        setMes(prev => prev.map((m, i) =>
          i === meIdx ? { ...m, pgm: m.pvw, pvw: m.pgm, inTransition: false, progress: 0 } : m
        ));
        setTransTimers(prev => prev.map((t, i) => i === meIdx ? null : t));
      } else {
        setMes(prev => prev.map((m, i) => i === meIdx ? { ...m, progress: prog } : m));
      }
    }, 40);

    setTransTimers(prev => prev.map((t, i) => {
      if (i === meIdx) { if (t) clearInterval(t); return timer; }
      return t;
    }));

    sendMessage({ type: 'SWITCHER_AUTO', payload: { me: meIdx + 1, transition: me.transition, rate: me.rate } });
  }, [canOperate, sendMessage, mes]);

  const handleTransition = useCallback((meIdx: number, t: TransitionType) => {
    setMes(prev => prev.map((m, i) => i === meIdx ? { ...m, transition: t } : m));
  }, []);

  const handleRate = useCallback((meIdx: number, r: number) => {
    setMes(prev => prev.map((m, i) => i === meIdx ? { ...m, rate: r } : m));
  }, []);

  return (
    <div style={S}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <span style={{ color: '#00b4d8', fontWeight: 'bold', fontSize: '13px', letterSpacing: '2px' }}>
          NEXUS SWITCH
        </span>
        <span style={{ color: '#555', fontSize: '10px' }}>Virtual Production Switcher — {ME_COUNT} M/E Banks</span>
        <span style={{
          marginLeft: 'auto', padding: '2px 8px', borderRadius: '10px', fontSize: '9px',
          background: role === 'ENGINEER' ? 'rgba(0,180,216,.1)' : role === 'OPERATOR' ? 'rgba(6,214,160,.1)' : '#1a1a1a',
          color: role === 'ENGINEER' ? '#00b4d8' : role === 'OPERATOR' ? '#06d6a0' : '#666',
          fontWeight: 'bold', letterSpacing: '1px',
        }}>
          {role}
        </span>
      </div>

      {mes.map((me, i) => (
        <MEBank
          key={i}
          meIndex={i}
          state={me}
          canOperate={canOperate}
          onPvwSelect={handlePvwSelect}
          onCut={handleCut}
          onAuto={handleAuto}
          onTransition={handleTransition}
          onRate={handleRate}
        />
      ))}
    </div>
  );
}
