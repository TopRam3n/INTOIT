import { useState, useEffect, useRef, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useStore } from './store';
import { COURSES, ALL_TOPICS, GRAPH_NODES, GRAPH_EDGES, COURSE_COLORS } from './data/courses';
import { isUnlocked } from './lib/engine';
import { explainMistake, generateHint, rewriteELI5, rewriteChallenge } from './lib/openai';
import { pingBackend, isBackendConnected } from './lib/api';
import { ErrorBoundary } from './components/ErrorBoundary';
import { VoiceQuiz } from './components/VoiceQuiz';
import type { Course, Topic, QuizQuestion, DifficultyMode } from './types';

// ── KaTeX ──────────────────────────────────────────────
declare global { interface Window { katex: any; } }
if (!window.katex) {
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css'; document.head.appendChild(l);
  const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.js'; document.head.appendChild(s);
}
function KaTeX({ math, display = false }: { math: string; display?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (ref.current && window.katex) try { window.katex.render(math, ref.current, { displayMode: display, throwOnError: false }); } catch {} }, [math, display]);
  return <span ref={ref} />;
}

// ── Theme tokens ───────────────────────────────────────
const D = { bg:'#0a0a0f', surface:'#13131a', card:'#16161f', border:'rgba(255,255,255,0.08)', text:'#e8e8f0', muted:'rgba(255,255,255,0.4)' };
const L = { bg:'#f0f0f5', surface:'#fff', card:'#fafafc', border:'rgba(0,0,0,0.08)', text:'#18181f', muted:'rgba(0,0,0,0.4)' };

// ── MathContent ────────────────────────────────────────
function renderInline(text: string, T: typeof D) {
  const segs: React.ReactNode[] = []; let last = 0;
  const re = /\\\((.*?)\\\)|\*\*(.*?)\*\*/g; let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push(text.slice(last, m.index));
    if (m[1]) segs.push(<KaTeX key={m.index} math={m[1]} />);
    if (m[2]) segs.push(<strong key={m.index} style={{ color: T.text, fontWeight: 700 }}>{m[2]}</strong>);
    last = re.lastIndex;
  }
  if (last < text.length) segs.push(text.slice(last));
  return segs;
}
function MathContent({ content, T }: { content: string; T: typeof D }) {
  return (
    <div style={{ lineHeight: 1.9, fontSize: 15, color: T.text }}>
      {content.split('\n').map((line, i) => {
        if (line.startsWith('## ')) return <h3 key={i} style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 20, letterSpacing: 2, color: T.text, margin: '20px 0 8px', fontWeight: 400 }}>{line.slice(3)}</h3>;
        if (/^\$\$.*\$\$$/.test(line)) return <div key={i} style={{ margin: '14px 0', padding: '14px 20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, textAlign: 'center', overflowX: 'auto' }}><KaTeX math={line.slice(2, -2)} display /></div>;
        if (line.startsWith('- ') || line.startsWith('* ')) return <div key={i} style={{ display: 'flex', gap: 10, padding: '3px 0 3px 8px', borderLeft: '2px solid rgba(255,255,255,0.1)', marginBottom: 4 }}><span style={{ color: T.muted }}>→</span><span>{renderInline(line.slice(2), T)}</span></div>;
        if (line.trim() === '') return <div key={i} style={{ height: 8 }} />;
        return <p key={i} style={{ margin: '4px 0' }}>{renderInline(line, T)}</p>;
      })}
    </div>
  );
}

// ── Sat Meter ──────────────────────────────────────────
function SatMeter({ value, label, size = 'lg' }: { value: number; label: string; size?: 'lg' | 'sm' }) {
  const pct = Math.round(value * 100);
  const color = pct >= 72 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const dim = size === 'lg' ? 96 : 64, r = size === 'lg' ? 36 : 24, sw = size === 'lg' ? 7 : 5;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={dim} height={dim} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - value)} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1), stroke 0.5s' }} />
        <text x={dim / 2} y={dim / 2 + 5} style={{ transform: `rotate(90deg)`, transformOrigin: `${dim / 2}px ${dim / 2}px`, fontFamily: "'Bebas Neue',Impact" }}
          textAnchor="middle" fill={color} fontSize={size === 'lg' ? 17 : 12}>{pct}%</text>
      </svg>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Mono',monospace", textAlign: 'center' }}>{label}</span>
    </div>
  );
}

// ── Knowledge Heatmap ──────────────────────────────────
function KnowledgeHeatmap({ knowledge }: { knowledge: Record<string, any> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {Object.values(COURSES).map(course => (
        <div key={course.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>{course.emoji}</span>
            <span style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 13, letterSpacing: 2, color: course.accent }}>{course.title.toUpperCase()}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${course.topics.length},1fr)`, gap: 6 }}>
            {course.topics.map(topic => {
              const pKnow = knowledge[topic.id]?.pKnow ?? 0.1;
              const pct = Math.round(pKnow * 100);
              return (
                <div key={topic.id} title={`${topic.title}: ${pct}%`}
                  style={{ background: `${course.color}${Math.round((0.12 + pKnow * 0.88) * 255).toString(16).padStart(2, '0')}`, border: `1px solid ${course.color}40`, borderRadius: 6, padding: '10px 6px', textAlign: 'center', transition: 'all 0.6s' }}>
                  <div style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 18, color: pct > 40 ? '#fff' : 'rgba(255,255,255,0.35)' }}>{pct}%</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2, lineHeight: 1.2, fontFamily: "'DM Mono',monospace" }}>{topic.title.split(' ').slice(0, 2).join(' ')}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Knowledge Graph ────────────────────────────────────
function KnowledgeGraph({ knowledge, onSelect }: { knowledge: Record<string, any>; onSelect: (id: string) => void }) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const POS: Record<string, { x: number; y: number }> = {
    alg_vars: { x: 120, y: 80 }, alg_linear: { x: 120, y: 200 }, alg_functions: { x: 120, y: 320 }, alg_quad: { x: 280, y: 200 },
    calc_limits: { x: 460, y: 80 }, calc_deriv: { x: 460, y: 200 }, calc_integ: { x: 460, y: 320 },
    stat_desc: { x: 660, y: 80 }, stat_prob: { x: 660, y: 200 }, stat_normal: { x: 660, y: 320 }, stat_regression: { x: 560, y: 420 },
  };
  return (
    <div>
      <svg viewBox="0 0 820 500" style={{ width: '100%', height: 'auto', background: 'rgba(255,255,255,0.02)', borderRadius: 16 }}>
        {GRAPH_EDGES.map(e => {
          const s = POS[e.source], t = POS[e.target]; if (!s || !t) return null;
          const ul = (knowledge[e.target]?.pKnow ?? 0) >= 0.5;
          return <line key={`${e.source}-${e.target}`} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={ul ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'} strokeWidth={1.5} strokeDasharray={ul ? 'none' : '4 4'} />;
        })}
        {GRAPH_NODES.map(node => {
          const pos = POS[node.id]; if (!pos) return null;
          const pKnow = knowledge[node.id]?.pKnow ?? 0.1;
          const unlocked = isUnlocked(node.id, knowledge);
          const color = COURSE_COLORS[node.courseId];
          const r = 20 + pKnow * 16;
          return (
            <g key={node.id} style={{ cursor: unlocked ? 'pointer' : 'default' }} opacity={unlocked ? 1 : 0.3}
              onClick={() => unlocked && onSelect(node.id)}
              onMouseEnter={() => setTip({ x: pos.x, y: pos.y - r - 12, text: `${node.label}: ${Math.round(pKnow * 100)}%${!unlocked ? ' 🔒' : ''}` })}
              onMouseLeave={() => setTip(null)}>
              {pKnow > 0.7 && <circle cx={pos.x} cy={pos.y} r={r + 6} fill="none" stroke={color} strokeWidth={2} opacity={0.35}><animate attributeName="r" values={`${r + 4};${r + 10};${r + 4}`} dur="2s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.35;0.1;0.35" dur="2s" repeatCount="indefinite" /></circle>}
              <circle cx={pos.x} cy={pos.y} r={r} fill={`${color}${Math.round((0.12 + pKnow * 0.45) * 255).toString(16).padStart(2, '0')}`} stroke={color} strokeWidth={unlocked ? 2 : 1} />
              {!unlocked && <text x={pos.x} y={pos.y + 5} textAnchor="middle" fontSize={13} fill="rgba(255,255,255,0.5)">🔒</text>}
              {unlocked && <text x={pos.x} y={pos.y + 5} textAnchor="middle" fontSize={10} fill="#fff" fontFamily="'DM Mono',monospace">{Math.round(pKnow * 100)}%</text>}
              <text x={pos.x} y={pos.y + r + 14} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.55)" fontFamily="'DM Mono',monospace">{node.label}</text>
            </g>
          );
        })}
        {tip && <g><rect x={tip.x - 65} y={tip.y - 18} width={130} height={22} rx={4} fill="rgba(0,0,0,0.9)" /><text x={tip.x} y={tip.y - 2} textAnchor="middle" fontSize={10} fill="#fff" fontFamily="'DM Mono',monospace">{tip.text}</text></g>}
      </svg>
    </div>
  );
}

// ── Full Quiz Block ────────────────────────────────────
function FullQuizBlock({ questions, topic, pKnow, isStruggling, openAiKey, onComplete }: {
  questions: QuizQuestion[]; topic: Topic; pKnow: number; isStruggling: boolean;
  openAiKey: string; onComplete: (answers: boolean[], time: number) => void;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [aiExp, setAiExp] = useState<Record<number, string>>({});
  const [loadingAI, setLoadingAI] = useState<Record<number, boolean>>({});
  const [hints, setHints] = useState<Record<number, string>>({});
  const [elapsed, setElapsed] = useState(0);
  const [voiceResults, setVoiceResults] = useState<Record<number, boolean>>({});
  const t0 = useRef(Date.now());
  useEffect(() => { const iv = setInterval(() => setElapsed(Date.now() - t0.current), 1000); return () => clearInterval(iv); }, []);

  async function doHint(qi: number) {
    const h = await generateHint({ question: questions[qi].question, topicTitle: topic.title, pKnow, apiKey: openAiKey });
    setHints(p => ({ ...p, [qi]: h ?? 'Think about the key formula!' }));
  }
  async function doExplain(qi: number) {
    const q = questions[qi]; setLoadingAI(p => ({ ...p, [qi]: true }));
    const txt = await explainMistake({ question: q.question, userAnswer: q.options[answers[qi]] ?? '?', correctAnswer: q.options[q.correctIndex], explanation: q.explanation, topicTitle: topic.title, pKnow, isStruggling, apiKey: openAiKey });
    setAiExp(p => ({ ...p, [qi]: txt ?? q.explanation })); setLoadingAI(p => ({ ...p, [qi]: false }));
  }

  function handleVoiceResult(qi: number, correct: boolean) {
    setVoiceResults(p => ({ ...p, [qi]: correct }));
    setAnswers(p => ({ ...p, [qi]: correct ? questions[qi].correctIndex : -1 }));
  }

  function submit() {
    setSubmitted(true);
    onComplete(questions.map((q, i) => answers[i] === q.correctIndex), (Date.now() - t0.current) / 1000);
  }
  const allAnswered = questions.every((_, i) => answers[i] !== undefined || voiceResults[i] !== undefined);

  return (
    <div>
      {!submitted && elapsed > 45000 && <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#93c5fd', fontFamily: "'DM Mono',monospace" }}>⏱ Taking your time? Use 💡 Hint or 🎤 Voice below.</div>}
      {questions.map((q, qi) => {
        const ua = answers[qi], correct = submitted && ua === q.correctIndex, wrong = submitted && ua !== undefined && ua !== q.correctIndex;
        return (
          <div key={qi} style={{ marginBottom: 24, background: submitted ? (correct ? 'rgba(16,185,129,0.06)' : wrong ? 'rgba(239,68,68,0.06)' : '#16161f') : '#16161f', border: `1px solid ${submitted ? (correct ? 'rgba(16,185,129,0.3)' : wrong ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)') : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, marginBottom: 14, color: '#e8e8f0', lineHeight: 1.5 }}>{qi + 1}. {q.question}</div>
            {q.formula && <div style={{ margin: '0 0 12px', padding: '8px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, display: 'inline-block' }}><KaTeX math={q.formula} display /></div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {q.options.map((opt, oi) => {
                const sel = ua === oi, corr = submitted && oi === q.correctIndex, wrng = submitted && sel && oi !== q.correctIndex;
                return <button key={oi} onClick={() => !submitted && setAnswers(p => ({ ...p, [qi]: oi }))} style={{ padding: '10px 14px', borderRadius: 8, cursor: submitted ? 'default' : 'pointer', background: corr ? 'rgba(16,185,129,0.15)' : wrng ? 'rgba(239,68,68,0.15)' : sel ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${corr ? '#10b981' : wrng ? '#ef4444' : sel ? '#818cf8' : 'rgba(255,255,255,0.1)'}`, color: corr ? '#6ee7b7' : wrng ? '#fca5a5' : sel ? '#c7d2fe' : '#e8e8f0', textAlign: 'left', fontSize: 13, fontFamily: "'DM Mono',monospace", transition: 'all 0.15s' }}>{corr ? '✓ ' : wrng ? '✗ ' : ''}{opt}</button>;
              })}
            </div>
            {/* Voice input + hint row */}
            {!submitted && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 4 }}>
                <VoiceQuiz question={q} topicTitle={topic.title} onResult={(correct, _) => handleVoiceResult(qi, correct)} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => doHint(qi)} style={{ padding: '5px 12px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', fontFamily: "'DM Mono',monospace" }}>💡 Hint</button>
                  {hints[qi] && <span style={{ fontSize: 11, color: '#7dd3fc', fontFamily: "'DM Mono',monospace", flex: 1 }}>{hints[qi]}</span>}
                </div>
              </div>
            )}
            {submitted && wrong && (
              <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, fontFamily: "'DM Mono',monospace" }}>{aiExp[qi] || <><strong style={{ color: '#e8e8f0' }}>Standard:</strong> {q.explanation}</>}</div>
                {!aiExp[qi] && openAiKey && <button onClick={() => doExplain(qi)} disabled={loadingAI[qi]} style={{ marginTop: 8, padding: '6px 14px', borderRadius: 6, background: 'rgba(99,102,241,0.2)', border: '1px solid #818cf8', color: '#c7d2fe', fontSize: 11, cursor: loadingAI[qi] ? 'not-allowed' : 'pointer', fontFamily: "'DM Mono',monospace" }}>{loadingAI[qi] ? '⏳ AI thinking...' : '✨ Show My Mistake (AI)'}</button>}
              </div>
            )}
            {submitted && correct && <div style={{ fontSize: 12, color: '#6ee7b7', marginTop: 8, fontFamily: "'DM Mono',monospace" }}>✓ {q.explanation}</div>}
          </div>
        );
      })}
      {!submitted && <button onClick={submit} disabled={!allAnswered} style={{ padding: '12px 32px', borderRadius: 8, border: 'none', background: allAnswered ? '#6366f1' : 'rgba(255,255,255,0.05)', color: allAnswered ? '#fff' : 'rgba(255,255,255,0.3)', fontFamily: "'Bebas Neue',Impact", fontSize: 16, letterSpacing: 2, cursor: allAnswered ? 'pointer' : 'not-allowed' }}>SUBMIT ANSWERS</button>}
    </div>
  );
}

// ── Reel Cards ─────────────────────────────────────────
function QuizReelCard({ card, onAction }: { card: any; onAction: (a: string, c?: boolean) => void }) {
  const [sel, setSel] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const q = card.question!;
  const diffBadge = card.difficulty === 'hard' ? { label: '🔥 HARD', color: '#ef4444' } : card.difficulty === 'easy' ? { label: '✨ EASY', color: '#10b981' } : null;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px 22px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, alignItems: 'center' }}>
        <span style={{ background: `${card.courseColor}20`, color: card.courseColor, border: `1px solid ${card.courseColor}40`, borderRadius: 4, padding: '3px 10px', fontSize: 10, fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>QUIZ</span>
        {diffBadge && <span style={{ background: `${diffBadge.color}15`, color: diffBadge.color, border: `1px solid ${diffBadge.color}40`, borderRadius: 4, padding: '3px 8px', fontSize: 9, fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>{diffBadge.label}</span>}
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Mono',monospace" }}>{card.topicTitle}</span>
      </div>
      {q.formula && <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, textAlign: 'center' }}><KaTeX math={q.formula} display /></div>}
      <div style={{ fontSize: 17, fontFamily: "'Playfair Display',serif", color: '#fff', lineHeight: 1.55, marginBottom: 20, flex: 1 }}>{q.question}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {q.options.map((opt: string, i: number) => {
          const s = sel === i, co = revealed && i === q.correctIndex, wr = revealed && s && i !== q.correctIndex;
          return <button key={i} onClick={() => !revealed && setSel(i)} style={{ padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${co ? '#10b981' : wr ? '#ef4444' : s ? card.courseColor : 'rgba(255,255,255,0.1)'}`, background: co ? 'rgba(16,185,129,0.13)' : wr ? 'rgba(239,68,68,0.13)' : s ? `${card.courseColor}18` : 'rgba(255,255,255,0.04)', color: co ? '#6ee7b7' : wr ? '#fca5a5' : '#e8e8f0', textAlign: 'left', fontSize: 12, fontFamily: "'DM Mono',monospace", cursor: revealed ? 'default' : 'pointer', transition: 'all 0.13s' }}>{co ? '✓ ' : wr ? '✗ ' : ''}{opt}</button>;
        })}
      </div>
      {revealed && <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.04)', fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Mono',monospace", lineHeight: 1.7 }}>{q.explanation}</div>}
      {!revealed && <button onClick={() => { if (sel === null) return; const correct = sel === q.correctIndex; setRevealed(true); setTimeout(() => onAction(correct ? 'correct' : 'incorrect', correct), 350); }} disabled={sel === null} style={{ width: '100%', padding: 11, borderRadius: 9, border: 'none', background: sel !== null ? card.courseColor : 'rgba(255,255,255,0.05)', color: '#fff', fontFamily: "'Bebas Neue',Impact", fontSize: 15, letterSpacing: 2, cursor: sel !== null ? 'pointer' : 'not-allowed' }}>SUBMIT</button>}
    </div>
  );
}

function FormulaReelCard({ card, onAction }: { card: any; onAction: (a: string) => void }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px 22px', justifyContent: 'center' }}>
      <span style={{ background: `${card.courseColor}18`, color: card.courseColor, border: `1px solid ${card.courseColor}35`, borderRadius: 4, padding: '3px 10px', fontSize: 10, fontFamily: "'DM Mono',monospace", letterSpacing: 1, alignSelf: 'flex-start', marginBottom: 16 }}>FORMULA</span>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>{card.topicTitle}</div>
      <div style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 24, color: '#fff', letterSpacing: 2, marginBottom: 28 }}>{card.title}</div>
      <div style={{ background: `${card.courseColor}0d`, border: `1px solid ${card.courseColor}25`, borderRadius: 14, padding: 24, textAlign: 'center', marginBottom: 28 }}><KaTeX math={card.formula ?? ''} display /></div>
      <button onClick={() => onAction('complete')} style={{ width: '100%', padding: 11, borderRadius: 9, border: `1px solid ${card.courseColor}`, background: 'transparent', color: card.courseColor, fontFamily: "'Bebas Neue',Impact", fontSize: 15, letterSpacing: 2, cursor: 'pointer' }}>GOT IT →</button>
    </div>
  );
}

function AnalogyReelCard({ card, onAction }: { card: any; onAction: (a: string) => void }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px 22px', justifyContent: 'center' }}>
      <span style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 4, padding: '3px 10px', fontSize: 10, fontFamily: "'DM Mono',monospace", letterSpacing: 1, alignSelf: 'flex-start', marginBottom: 16 }}>ANALOGY</span>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>{card.topicTitle}</div>
      <div style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 22, color: '#fff', letterSpacing: 2, marginBottom: 28 }}>{card.title}</div>
      <div style={{ fontSize: 20, lineHeight: 1.75, color: '#e8e8f0', fontFamily: "'Playfair Display',serif", flex: 1, display: 'flex', alignItems: 'center' }}>"{card.body}"</div>
      <button onClick={() => onAction('complete')} style={{ marginTop: 24, width: '100%', padding: 11, borderRadius: 9, border: '1px solid rgba(251,191,36,0.35)', background: 'transparent', color: '#fbbf24', fontFamily: "'Bebas Neue',Impact", fontSize: 15, letterSpacing: 2, cursor: 'pointer' }}>UNDERSTOOD →</button>
    </div>
  );
}

function YouTubeReelCard({ card, onAction }: { card: any; onAction: (a: string) => void }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px 22px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <span style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, padding: '3px 10px', fontSize: 10, fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>▶ VIDEO</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Mono',monospace" }}>{card.topicTitle}</span>
      </div>
      <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 18, position: 'relative', cursor: 'pointer', minHeight: 180 }}
        onClick={() => { onAction('youtube_open'); window.open(`https://www.youtube.com/watch?v=${card.videoId}`, '_blank'); }}>
        <img src={card.thumbnail} alt={card.videoTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${card.videoId}/hqdefault.jpg`; }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'rgba(255,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 22, marginLeft: 4 }}>▶</span></div>
        </div>
        <div style={{ position: 'absolute', top: 10, right: 10, background: '#ff0000', borderRadius: 3, padding: '2px 7px', fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: "'DM Mono',monospace" }}>SHORTS</div>
      </div>
      <div style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 16, color: '#fff', letterSpacing: 1, marginBottom: 4 }}>{card.videoTitle}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Mono',monospace", marginBottom: 16 }}>{card.channelName}</div>
      <button onClick={() => { onAction('youtube_open'); window.open(`https://www.youtube.com/watch?v=${card.videoId}`, '_blank'); }} style={{ width: '100%', padding: 11, borderRadius: 9, background: '#ff0000', border: 'none', color: '#fff', fontFamily: "'Bebas Neue',Impact", fontSize: 15, letterSpacing: 2, cursor: 'pointer' }}>WATCH ON YOUTUBE →</button>
    </div>
  );
}

function ReelsFeed() {
  const { feedCards, feedIdx, swipeFeed } = useStore();
  const [dragY, setDragY] = useState(0); const isDragging = useRef(false); const t0 = useRef(0);
  function onTouchStart(e: React.TouchEvent) { t0.current = e.touches[0].clientY; isDragging.current = true; }
  function onTouchMove(e: React.TouchEvent) { if (!isDragging.current) return; setDragY(e.touches[0].clientY - t0.current); }
  function onTouchEnd() { isDragging.current = false; if (Math.abs(dragY) > 60) swipeFeed(dragY < 0 ? 'up' : 'down', feedCards[feedIdx]?.id ?? '', 'complete'); setDragY(0); }
  const card = feedCards[feedIdx];
  if (!card) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: "'DM Mono',monospace" }}>Loading feed...</div>;
  return (
    <div style={{ height: '100%', position: 'relative', overflow: 'hidden' }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div style={{ position: 'absolute', top: 12, right: 14, zIndex: 10, display: 'flex', gap: 4 }}>
        {feedCards.slice(0, 8).map((_, i) => <div key={i} style={{ width: i === feedIdx ? 14 : 6, height: 6, borderRadius: 3, background: i === feedIdx ? '#fff' : 'rgba(255,255,255,0.2)', transition: 'all 0.3s' }} />)}
      </div>
      <div style={{ height: '100%', background: 'linear-gradient(155deg,#16161f 0%,#0c0c14 100%)', borderRadius: 20, border: `1px solid ${card.courseColor}28`, transform: `translateY(${dragY * 0.3}px)`, transition: isDragging.current ? 'none' : 'transform 0.3s ease', overflow: 'hidden' }}>
        <div style={{ height: 3, background: `linear-gradient(90deg,${card.courseColor},transparent)` }} />
        <ErrorBoundary>
          {card.type === 'quiz' && <QuizReelCard card={card} onAction={(a, c) => setTimeout(() => swipeFeed('up', card.id, a, c), 400)} />}
          {card.type === 'formula' && <FormulaReelCard card={card} onAction={(a) => setTimeout(() => swipeFeed('up', card.id, a), 400)} />}
          {card.type === 'analogy' && <AnalogyReelCard card={card} onAction={(a) => setTimeout(() => swipeFeed('up', card.id, a), 400)} />}
          {card.type === 'youtube' && <YouTubeReelCard card={card} onAction={(a) => swipeFeed('up', card.id, a)} />}
        </ErrorBoundary>
      </div>
      <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 20, zIndex: 10 }}>
        <button onClick={() => swipeFeed('down', card.id, 'skip')} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 30, padding: '7px 18px', color: 'rgba(255,255,255,0.45)', fontSize: 11, cursor: 'pointer', fontFamily: "'DM Mono',monospace" }}>↓ skip</button>
        <button onClick={() => swipeFeed('up', card.id, 'complete')} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 30, padding: '7px 18px', color: 'rgba(255,255,255,0.45)', fontSize: 11, cursor: 'pointer', fontFamily: "'DM Mono',monospace" }}>↑ next</button>
      </div>
    </div>
  );
}

// ── Difficulty Mode Toggle ─────────────────────────────
function DifficultyToggle() {
  const { difficultyMode, setDifficultyMode, profile } = useStore();
  const [eli5Loading, setEli5Loading] = useState(false);
  const modes: { id: DifficultyMode; label: string; icon: string; color: string }[] = [
    { id: 'eli5', label: 'ELI5', icon: '🐣', color: '#10b981' },
    { id: 'normal', label: 'Normal', icon: '📚', color: '#818cf8' },
    { id: 'challenge', label: 'Challenge', icon: '🔥', color: '#ef4444' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {modes.map(m => (
        <button key={m.id} onClick={() => setDifficultyMode(m.id)}
          style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${difficultyMode === m.id ? m.color : 'rgba(255,255,255,0.1)'}`, background: difficultyMode === m.id ? `${m.color}18` : 'transparent', color: difficultyMode === m.id ? m.color : 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', fontFamily: "'DM Mono',monospace", display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>{m.icon}</span> {m.label}
        </button>
      ))}
    </div>
  );
}

// ── Review Queue Screen ────────────────────────────────
function ReviewScreen() {
  const { profile, getDueReviewCards, setScreen } = useStore();
  const dueCards = getDueReviewCards();
  const T = useStore(s => s.isDark) ? D : L;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 32, letterSpacing: 4, color: T.text, marginBottom: 4 }}>REVIEW QUEUE</div>
        <div style={{ color: T.muted, fontSize: 12, fontFamily: "'DM Mono',monospace" }}>SM-2 spaced repetition — review what you're about to forget</div>
      </div>
      {dueCards.length === 0 ? (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
          <div style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 22, letterSpacing: 2, color: T.text, marginBottom: 8 }}>ALL CAUGHT UP</div>
          <div style={{ color: T.muted, fontSize: 12, fontFamily: "'DM Mono',monospace" }}>No reviews due. Come back tomorrow to reinforce your knowledge.</div>
        </div>
      ) : (
        <>
          <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>📅</span>
            <div>
              <div style={{ fontFamily: "'Bebas Neue',Impact", letterSpacing: 2, color: '#818cf8', fontSize: 13 }}>{dueCards.length} TOPIC{dueCards.length !== 1 ? 'S' : ''} DUE FOR REVIEW</div>
              <div style={{ color: T.muted, fontSize: 11, fontFamily: "'DM Mono',monospace" }}>Based on SM-2 spaced repetition algorithm</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {dueCards.map(({ topicId, pKnow }) => {
              const topic = ALL_TOPICS.find(t => t.id === topicId);
              const course = topic ? Object.values(COURSES).find(c => c.id === topic.courseId) : null;
              if (!topic || !course) return null;
              const sm2 = profile.sm2Cards[topicId];
              return (
                <div key={topicId} style={{ background: T.card, border: `1px solid ${course.color}28`, borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${course.color}18`, border: `1px solid ${course.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{course.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Bebas Neue',Impact", letterSpacing: 2, color: T.text, fontSize: 14 }}>{topic.title.toUpperCase()}</div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: T.muted, fontFamily: "'DM Mono',monospace" }}>Mastery: {Math.round(pKnow * 100)}%</span>
                      <span style={{ fontSize: 10, color: T.muted, fontFamily: "'DM Mono',monospace" }}>Reviews: {sm2?.repetition ?? 0}</span>
                    </div>
                  </div>
                  <button onClick={() => { useStore.getState().startTopic(course, topic); }}
                    style={{ padding: '8px 16px', borderRadius: 8, background: course.color, border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer', fontFamily: "'Bebas Neue',Impact", letterSpacing: 2, flexShrink: 0 }}>
                    REVIEW →
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Settings Modal ─────────────────────────────────────
function SettingsModal() {
  const { profile, setKeys, setShowSettings } = useStore();
  const [ai, setAi] = useState(profile.openAiKey ?? '');
  const [yt, setYt] = useState(profile.youtubeApiKey ?? '');
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'connected' | 'offline'>('unknown');

  useEffect(() => {
    pingBackend().then(ok => setBackendStatus(ok ? 'connected' : 'offline'));
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#16161f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: 34, maxWidth: 500, width: '100%' }}>
        <div style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 24, letterSpacing: 3, color: '#fff', marginBottom: 6 }}>API KEYS</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: "'DM Mono',monospace", marginBottom: 20, lineHeight: 1.7 }}>Keys stored in your browser only. Never sent to any server.</div>

        {/* Backend status */}
        <div style={{ background: backendStatus === 'connected' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${backendStatus === 'connected' ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14 }}>{backendStatus === 'connected' ? '🟢' : backendStatus === 'offline' ? '🟡' : '⏳'}</span>
          <div>
            <div style={{ fontSize: 10, fontFamily: "'Bebas Neue',Impact", letterSpacing: 2, color: backendStatus === 'connected' ? '#10b981' : '#fbbf24' }}>{backendStatus === 'connected' ? 'SPRING BOOT BACKEND CONNECTED' : backendStatus === 'offline' ? 'BACKEND OFFLINE — DEMO MODE (localStorage)' : 'CHECKING BACKEND...'}</div>
            {backendStatus === 'offline' && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Mono',monospace" }}>Start backend: cd backend && ./mvnw spring-boot:run</div>}
          </div>
        </div>

        {[{ label: 'OPENAI API KEY', val: ai, set: setAi, ph: 'sk-...', hint: 'platform.openai.com — enables ✨ Show My Mistake, 💡 Hints, 🎤 Voice grading, ELI5/Challenge rewrite' }, { label: 'YOUTUBE DATA API v3', val: yt, set: setYt, ph: 'AIza...', hint: 'console.cloud.google.com → Enable YouTube Data API v3 — enables live video search' }].map(({ label, val, set, ph, hint }) => (
          <div key={label} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontFamily: "'DM Mono',monospace", letterSpacing: 2, marginBottom: 6 }}>{label}</div>
            <input value={val} onChange={e => set(e.target.value)} placeholder={ph} type="password" style={{ width: '100%', background: '#0c0c10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 13, fontFamily: "'DM Mono',monospace", boxSizing: 'border-box', marginBottom: 4 }} />
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', fontFamily: "'DM Mono',monospace" }}>{hint}</div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setKeys({ openAiKey: ai, youtubeApiKey: yt }); setShowSettings(false); }} style={{ flex: 1, padding: 11, borderRadius: 8, background: '#6366f1', border: 'none', color: '#fff', fontFamily: "'Bebas Neue',Impact", fontSize: 15, letterSpacing: 2, cursor: 'pointer' }}>SAVE</button>
          <button onClick={() => setShowSettings(false)} style={{ padding: '11px 20px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Mono',monospace", fontSize: 12, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Lesson Results ─────────────────────────────────────
function LessonResults({ quizScore, pKnowBefore, pKnowAfter, satisfaction, onNext, onRetry }: any) {
  const { setScreen } = useStore();
  const pct = Math.round(quizScore * 100);
  const label = pct === 100 ? 'PERFECT' : pct >= 67 ? 'GREAT WORK' : pct >= 33 ? 'KEEP GOING' : "DON'T STOP";
  return (
    <div style={{ textAlign: 'center', padding: '32px 0' }}>
      <div style={{ fontSize: 52, marginBottom: 8 }}>{pct === 100 ? '🏆' : pct >= 67 ? '🎯' : pct >= 33 ? '📈' : '💪'}</div>
      <div style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 36, letterSpacing: 4, color: '#fff', marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 36, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>session complete</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 36, marginBottom: 32 }}>
        <SatMeter value={quizScore} label="Quiz Score" /><SatMeter value={pKnowAfter} label="Knowledge" /><SatMeter value={satisfaction} label="Satisfaction" />
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 18, marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {[{ l: 'Knowledge Gain', v: `+${Math.round((pKnowAfter - pKnowBefore) * 100)}%`, c: '#10b981' }, { l: 'Mastery Level', v: `${Math.round(pKnowAfter * 100)}%`, c: '#818cf8' }, { l: 'Satisfaction', v: `${Math.round(satisfaction * 100)}%`, c: '#f59e0b' }].map(({ l, v, c }) => (
          <div key={l}><div style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 26, color: c, letterSpacing: 2 }}>{v}</div><div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: "'DM Mono',monospace" }}>{l}</div></div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        {pct < 67 && <button onClick={onRetry} style={{ padding: '10px 24px', borderRadius: 8, background: 'transparent', border: '1.5px solid #38bdf8', color: '#38bdf8', fontSize: 12, cursor: 'pointer', fontFamily: "'Bebas Neue',Impact", letterSpacing: 2 }}>↩ RETRY</button>}
        <button onClick={onNext} style={{ padding: '10px 24px', borderRadius: 8, background: '#6366f1', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', fontFamily: "'Bebas Neue',Impact", letterSpacing: 2 }}>NEXT TOPIC →</button>
      </div>
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────
export default function App() {
  const store = useStore();
  const { screen, setScreen, isDark, setIsDark, showSettings, setShowSettings, profile, selectedCourse, selectedTopic, lessonPhase, setLessonPhase, lastResult, startTopic, recordSession, buildFeed, feedCards, feedIdx, feedLoading, getDueReviewCards, getPredictedSat, isStruggling, getAdaptiveLesson, difficultyMode } = store;

  const T = isDark ? D : L;
  const masteredTopics = ALL_TOPICS.filter(t => (profile.knowledge[t.id]?.pKnow ?? 0) >= 0.7).length;
  const dueReviews = getDueReviewCards().length;
  const chartData = profile.sessions.map((s, i) => ({ s: i + 1, sat: Math.round(s.satisfaction * 100), quiz: Math.round(s.quizScore * 100), know: Math.round(s.pKnowAfter * 100) }));

  useEffect(() => { if (screen === 'feed' && feedCards.length === 0) buildFeed(); }, [screen]);

  function handleQuizComplete(answers: boolean[], time: number) {
    if (!selectedTopic) return;
    recordSession({ topicId: selectedTopic.id, topicDifficulty: selectedTopic.difficulty, answers, timeOnTask: time });
  }

  function nextTopic() {
    if (!selectedCourse || !selectedTopic) return;
    const topics = selectedCourse.topics;
    const idx = topics.findIndex(t => t.id === selectedTopic.id);
    if (idx < topics.length - 1) startTopic(selectedCourse, topics[idx + 1]);
    else setScreen('course');
  }

  const struggling = selectedTopic ? isStruggling(selectedTopic.id) : false;

  // ── Shared nav ──
  const Nav = () => (
    <nav style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '0 22px', height: 54, display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 0, zIndex: 100 }}>
      <span style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 20, letterSpacing: 4, color: T.text, cursor: 'pointer', marginRight: 6 }} onClick={() => setScreen('home')}>INTOIT</span>
      <span style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 3, padding: '2px 7px', fontSize: 9, letterSpacing: 2 }}>MATH</span>
      <div style={{ flex: 1 }} />
      {([['feed', '⚡ FEED', '#818cf8'], ['review', `📅 REVIEW${dueReviews > 0 ? ` (${dueReviews})` : ''}`, dueReviews > 0 ? '#f59e0b' : 'rgba(255,255,255,0.4)'], ['graph', '🧠 GRAPH', '#34d399'], ['dashboard', '📊 DASH', '#fbbf24']] as const).map(([s, label, color]) => (
        <button key={s} onClick={() => setScreen(s as any)} style={{ background: screen === s ? `${color}15` : 'transparent', border: `1px solid ${screen === s ? `${color}40` : T.border}`, color: screen === s ? color : T.muted, borderRadius: 6, padding: '5px 11px', fontSize: 10, cursor: 'pointer', letterSpacing: 0.5 }}>{label}</button>
      ))}
      <button onClick={() => setShowSettings(true)} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, borderRadius: 6, padding: '5px 9px', fontSize: 11, cursor: 'pointer' }}>⚙</button>
      <button onClick={() => setIsDark(!isDark)} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, borderRadius: 6, padding: '5px 9px', fontSize: 13, cursor: 'pointer' }}>{isDark ? '☀️' : '🌙'}</button>
    </nav>
  );

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'DM Mono',monospace" }}>
      {showSettings && <SettingsModal />}
      <Nav />

      {/* ══ HOME ══ */}
      {screen === 'home' && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '52px 24px' }}>
          <div style={{ marginBottom: 56 }}>
            <div style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 'clamp(48px,9vw,96px)', lineHeight: 0.92, letterSpacing: 4, marginBottom: 18 }}>
              <span style={{ color: T.text }}>THE</span><br />
              <span style={{ color: 'transparent', WebkitTextStroke: `1.5px ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}` }}>FOR YOU</span><br />
              <span style={{ background: 'linear-gradient(90deg,#818cf8,#a855f7,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PAGE FOR MATHS</span>
            </div>
            <div style={{ maxWidth: 540, color: T.muted, fontSize: 14, lineHeight: 1.9, marginBottom: 28 }}>A knowledge graph that knows what you need. A TikTok-style feed algorithm that serves it based on your engagement. Voice input, adaptive difficulty, spaced repetition, and AI-powered explanations.</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
              {['🧠 Knowledge Graph', '📱 TikTok Feed', '🎤 Voice Input', '🔥 Adaptive Difficulty', '📅 Spaced Repetition', '✨ AI Explainer', '🐣 ELI5 Mode', '▶ YouTube Shorts', '🔒 Prereq Unlocks', '☁️ Spring Boot + Kafka'].map(f => (
                <span key={f} style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${T.border}`, borderRadius: 4, padding: '3px 9px', fontSize: 9, letterSpacing: 0.5 }}>{f}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setScreen('feed')} style={{ padding: '13px 30px', borderRadius: 10, background: '#6366f1', border: 'none', color: '#fff', fontFamily: "'Bebas Neue',Impact", fontSize: 17, letterSpacing: 2, cursor: 'pointer' }}>START FEED →</button>
              <button onClick={() => setScreen('graph')} style={{ padding: '13px 30px', borderRadius: 10, background: 'transparent', border: '1.5px solid rgba(16,185,129,0.5)', color: '#34d399', fontFamily: "'Bebas Neue',Impact", fontSize: 17, letterSpacing: 2, cursor: 'pointer' }}>VIEW GRAPH</button>
              {dueReviews > 0 && <button onClick={() => setScreen('review')} style={{ padding: '13px 24px', borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1.5px solid rgba(245,158,11,0.4)', color: '#fbbf24', fontFamily: "'Bebas Neue',Impact", fontSize: 17, letterSpacing: 2, cursor: 'pointer' }}>📅 {dueReviews} REVIEWS DUE</button>}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 36 }}>
            {[{ val: profile.xp, l: 'XP', c: '#f59e0b', i: '⚡' }, { val: profile.streak, l: 'STREAK', c: '#ef4444', i: '🔥' }, { val: `${masteredTopics}/${ALL_TOPICS.length}`, l: 'MASTERED', c: '#10b981', i: '🎯' }, { val: dueReviews, l: 'DUE REVIEWS', c: '#818cf8', i: '📅' }].map(({ val, l, c, i }) => (
              <div key={l} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{i}</div>
                <div style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 26, color: c, letterSpacing: 2 }}>{val}</div>
                <div style={{ fontSize: 9, color: T.muted, letterSpacing: 1 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {Object.values(COURSES).map(course => {
              const avg = course.topics.reduce((s, t) => s + (profile.knowledge[t.id]?.pKnow ?? 0.1), 0) / course.topics.length;
              return (
                <div key={course.id} onClick={() => { store.setScreen('course'); useStore.setState({ selectedCourse: course }); }}
                  style={{ background: T.card, border: `1px solid ${course.color}28`, borderRadius: 16, padding: 26, cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = course.color; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${course.color}28`; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${course.color},${course.accent})` }} />
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 28, marginBottom: 10 }}>{course.emoji}</div>
                  <div style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 19, letterSpacing: 3, color: T.text, marginBottom: 6 }}>{course.title.toUpperCase()}</div>
                  <div style={{ color: T.muted, fontSize: 11, marginBottom: 18, lineHeight: 1.6 }}>{course.tagline}</div>
                  <div style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', borderRadius: 99, height: 3, marginBottom: 6 }}>
                    <div style={{ width: `${avg * 100}%`, background: `linear-gradient(90deg,${course.color},${course.accent})`, height: 3, borderRadius: 99, transition: 'width 1s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, color: course.accent, letterSpacing: 1 }}>{Math.round(avg * 100)}% MASTERY</span>
                    <span style={{ fontSize: 10, color: T.muted }}>{course.topics.length} topics →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ COURSE ══ */}
      {screen === 'course' && selectedCourse && (
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <button onClick={() => setScreen('home')} style={{ background: 'transparent', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 20, padding: 0 }}>←</button>
            <span style={{ fontSize: 24 }}>{selectedCourse.emoji}</span>
            <div><div style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 22, letterSpacing: 3, color: T.text }}>{selectedCourse.title.toUpperCase()}</div><div style={{ color: T.muted, fontSize: 11 }}>{selectedCourse.tagline}</div></div>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {selectedCourse.topics.map((topic, i) => {
              const pKnow = profile.knowledge[topic.id]?.pKnow ?? 0.1;
              const pred = getPredictedSat(topic.id, topic.difficulty);
              const strug = isStruggling(topic.id);
              const locked = !isUnlocked(topic.id, profile.knowledge);
              return (
                <div key={topic.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, opacity: locked ? 0.45 : 1 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue',Impact", fontSize: 17, color: '#818cf8', flexShrink: 0 }}>{locked ? '🔒' : i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Bebas Neue',Impact", letterSpacing: 2, color: T.text, fontSize: 14, marginBottom: 4 }}>
                      {topic.title.toUpperCase()}
                      {strug && <span style={{ marginLeft: 8, fontSize: 9, background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 3, padding: '2px 6px', letterSpacing: 1 }}>⚠ NEEDS WORK</span>}
                      {locked && <span style={{ marginLeft: 8, fontSize: 9, background: 'rgba(255,255,255,0.06)', color: T.muted, border: `1px solid ${T.border}`, borderRadius: 3, padding: '2px 6px' }}>PREREQ NEEDED</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', borderRadius: 99, height: 3, width: 100 }}>
                        <div style={{ width: `${pKnow * 100}%`, background: selectedCourse.color, height: 3, borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 9, color: T.muted }}>{Math.round(pKnow * 100)}% mastery</span>
                      <span style={{ fontSize: 9, color: pred >= 0.7 ? '#10b981' : '#f59e0b' }}>~{Math.round(pred * 100)}% sat.</span>
                    </div>
                  </div>
                  <SatMeter value={pred} label="Predicted" size="sm" />
                  <button onClick={() => !locked && startTopic(selectedCourse, topic)} disabled={locked}
                    style={{ padding: '7px 14px', borderRadius: 8, background: locked ? 'rgba(255,255,255,0.05)' : selectedCourse.color, border: 'none', color: locked ? T.muted : '#fff', fontSize: 9, cursor: locked ? 'not-allowed' : 'pointer', fontFamily: "'Bebas Neue',Impact", letterSpacing: 2, flexShrink: 0 }}>
                    {locked ? 'LOCKED' : pKnow > 0.2 ? 'REVIEW' : 'START'} →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ LESSON ══ */}
      {screen === 'lesson' && selectedTopic && selectedCourse && (() => {
        const pKnow = profile.knowledge[selectedTopic.id]?.pKnow ?? 0.1;
        const pred = getPredictedSat(selectedTopic.id, selectedTopic.difficulty);
        const adaptiveContent = getAdaptiveLesson(selectedTopic.id);
        return (
          <div style={{ maxWidth: 1060, margin: '0 auto', padding: '24px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
              <button onClick={() => setScreen('course')} style={{ background: 'transparent', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 20, padding: 0 }}>←</button>
              <span style={{ color: T.muted, fontSize: 10, letterSpacing: 2 }}>{selectedCourse.title.toUpperCase()}</span>
              <span style={{ color: T.muted }}>/</span>
              <span style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 13, letterSpacing: 2, color: T.text }}>{selectedTopic.title.toUpperCase()}</span>
              <div style={{ flex: 1 }} />
              <DifficultyToggle />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: 20, alignItems: 'start' }}>
              <div>
                {struggling && (
                  <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.22)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <div>
                      <div style={{ fontFamily: "'Bebas Neue',Impact", letterSpacing: 2, color: '#fbbf24', fontSize: 12 }}>STRUGGLE DETECTED</div>
                      <div style={{ color: T.muted, fontSize: 11, lineHeight: 1.55 }}>You've found <strong style={{ color: '#fde68a' }}>{selectedTopic.title}</strong> tricky before. Try switching to 🐣 ELI5 mode above. 💪</div>
                    </div>
                  </div>
                )}
                {lessonPhase === 'reading' && (
                  <div>
                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 30, marginBottom: 18 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
                        {[{ l: selectedCourse.title, c: selectedCourse.color }, { l: `⏱ ${selectedTopic.estimatedMinutes}MIN`, c: T.muted }, { l: difficultyMode === 'eli5' ? '🐣 ELI5 MODE' : difficultyMode === 'challenge' ? '🔥 CHALLENGE MODE' : `DIFFICULTY ${Math.round(selectedTopic.difficulty * 100)}%`, c: difficultyMode === 'eli5' ? '#10b981' : difficultyMode === 'challenge' ? '#ef4444' : '#818cf8' }].map(({ l, c }) => (
                          <span key={l} style={{ background: `${c}12`, color: c, border: `1px solid ${c}30`, borderRadius: 4, padding: '2px 8px', fontSize: 9, letterSpacing: 0.8 }}>{l}</span>
                        ))}
                      </div>
                      <h2 style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 28, letterSpacing: 3, color: T.text, margin: '0 0 22px' }}>{selectedTopic.title.toUpperCase()}</h2>
                      <div style={{ background: `${selectedCourse.color}0d`, border: `1px solid ${selectedCourse.color}28`, borderRadius: 12, padding: '16px 22px', marginBottom: 24, textAlign: 'center' }}>
                        <div style={{ color: T.muted, fontSize: 9, letterSpacing: 2, marginBottom: 8 }}>KEY FORMULA</div>
                        <KaTeX math={selectedTopic.formula} display />
                      </div>
                      <MathContent content={adaptiveContent} T={isDark ? D : L} />
                    </div>
                    <button onClick={() => setLessonPhase('quiz')} style={{ padding: '11px 28px', borderRadius: 8, background: selectedCourse.color, border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', fontFamily: "'Bebas Neue',Impact", letterSpacing: 2 }}>TAKE THE QUIZ →</button>
                  </div>
                )}
                {lessonPhase === 'quiz' && (
                  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 28 }}>
                    <div style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 20, letterSpacing: 3, color: T.text, marginBottom: 20 }}>KNOWLEDGE CHECK</div>
                    <ErrorBoundary>
                      <FullQuizBlock
                        questions={difficultyMode === 'challenge' && selectedTopic.quizHard ? [...selectedTopic.quiz, ...selectedTopic.quizHard] : selectedTopic.quiz}
                        topic={selectedTopic} pKnow={pKnow} isStruggling={struggling}
                        openAiKey={profile.openAiKey} onComplete={handleQuizComplete}
                      />
                    </ErrorBoundary>
                  </div>
                )}
                {lessonPhase === 'results' && lastResult && (
                  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 28 }}>
                    <LessonResults {...lastResult} onNext={nextTopic} onRetry={() => setLessonPhase('reading')} />
                  </div>
                )}
              </div>
              {/* Sidebar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                {lessonPhase === 'reading' && (
                  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: 18, textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Bebas Neue',Impact", letterSpacing: 2, fontSize: 11, color: T.text, marginBottom: 4 }}>PRE-LESSON PREDICTION</div>
                    <div style={{ color: T.muted, fontSize: 10, marginBottom: 14, lineHeight: 1.4 }}>ML model predicts satisfaction before you start</div>
                    <SatMeter value={pred} label="Predicted Satisfaction" />
                  </div>
                )}
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: 16 }}>
                  <div style={{ fontFamily: "'Bebas Neue',Impact", letterSpacing: 2, fontSize: 11, color: T.text, marginBottom: 12 }}>COURSE PROGRESS</div>
                  {selectedCourse.topics.map(t => {
                    const pk = profile.knowledge[t.id]?.pKnow ?? 0.1;
                    return (<div key={t.id} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 9, color: t.id === selectedTopic.id ? T.text : T.muted }}>{t.title.substring(0, 18)}</span>
                        <span style={{ fontSize: 9, color: selectedCourse.accent }}>{Math.round(pk * 100)}%</span>
                      </div>
                      <div style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', borderRadius: 99, height: 3 }}>
                        <div style={{ width: `${pk * 100}%`, background: t.id === selectedTopic.id ? selectedCourse.color : `${selectedCourse.color}70`, height: 3, borderRadius: 99, transition: 'width 0.8s' }} />
                      </div>
                    </div>);
                  })}
                </div>
                {profile.sessions.length > 0 && (
                  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: 16 }}>
                    <div style={{ fontFamily: "'Bebas Neue',Impact", letterSpacing: 2, fontSize: 11, color: T.text, marginBottom: 11 }}>SESSION STATS</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[{ l: 'XP', v: profile.xp, c: '#f59e0b' }, { l: 'STREAK', v: profile.streak, c: '#ef4444' }, { l: 'AVG SCORE', v: Math.round(profile.sessions.reduce((s: number, x: any) => s + x.quizScore, 0) / profile.sessions.length * 100) + '%', c: '#10b981' }, { l: 'AVG SAT', v: Math.round(profile.sessions.reduce((s: number, x: any) => s + x.satisfaction, 0) / profile.sessions.length * 100) + '%', c: '#818cf8' }].map(({ l, v, c }) => (
                        <div key={l} style={{ textAlign: 'center' }}><div style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 18, color: c, letterSpacing: 1 }}>{v}</div><div style={{ fontSize: 8, color: T.muted, letterSpacing: 1 }}>{l}</div></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ FEED ══ */}
      {screen === 'feed' && (
        <div style={{ maxWidth: 420, margin: '0 auto', padding: '14px 16px', height: 'calc(100vh - 54px)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 18, letterSpacing: 3, color: T.text }}>FOR YOU</div>
              <div style={{ fontSize: 9, color: T.muted, letterSpacing: 1 }}>CARD {feedIdx + 1} · {profile.xp} XP</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <DifficultyToggle />
              <button onClick={buildFeed} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, borderRadius: 6, padding: '5px 8px', fontSize: 9, cursor: 'pointer', letterSpacing: 1 }}>↺</button>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ErrorBoundary>
              {feedLoading ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                  <div style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 16, letterSpacing: 3, color: '#818cf8' }}>BUILDING YOUR FEED...</div>
                  <div style={{ fontSize: 11, color: T.muted, fontFamily: "'DM Mono',monospace" }}>Analysing knowledge graph · scoring topics</div>
                  <div style={{ width: 160, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#818cf8', borderRadius: 99, animation: 'pulse 1.5s infinite' }} />
                  </div>
                  <style>{`@keyframes pulse{0%{width:0%;margin-left:0}50%{width:60%}100%{width:0%;margin-left:100%}}`}</style>
                </div>
              ) : <ReelsFeed />}
            </ErrorBoundary>
          </div>
        </div>
      )}

      {/* ══ REVIEW ══ */}
      {screen === 'review' && <ReviewScreen />}

      {/* ══ GRAPH ══ */}
      {screen === 'graph' && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '30px 24px' }}>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 32, letterSpacing: 4, color: T.text, marginBottom: 4 }}>KNOWLEDGE GRAPH</div>
            <div style={{ color: T.muted, fontSize: 11, fontFamily: "'DM Mono',monospace" }}>Node size = mastery · Pulsing = mastered · Dashed = locked · Click → jump to topic</div>
          </div>
          <KnowledgeGraph knowledge={profile.knowledge} onSelect={() => setScreen('feed')} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginTop: 26 }}>
            {Object.values(COURSES).map(course => {
              const nodes = GRAPH_NODES.filter(n => n.courseId === course.id);
              const unlocked = nodes.filter(n => isUnlocked(n.id, profile.knowledge)).length;
              const mastered = nodes.filter(n => (profile.knowledge[n.id]?.pKnow ?? 0) >= 0.7).length;
              return (
                <div key={course.id} style={{ background: T.card, border: `1px solid ${course.color}28`, borderRadius: 13, padding: 20 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, marginBottom: 7 }}>{course.emoji}</div>
                  <div style={{ fontFamily: "'Bebas Neue',Impact", letterSpacing: 2, color: course.accent, marginBottom: 13 }}>{course.title.toUpperCase()}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                    {[{ val: `${unlocked}/${nodes.length}`, label: 'Unlocked', color: course.color }, { val: `${mastered}/${nodes.length}`, label: 'Mastered', color: '#10b981' }].map(({ val, label, color }) => (
                      <div key={label} style={{ textAlign: 'center', background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderRadius: 8, padding: '9px 6px' }}>
                        <div style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 20, color, letterSpacing: 1 }}>{val}</div>
                        <div style={{ fontSize: 8, color: T.muted, letterSpacing: 1 }}>{label.toUpperCase()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 22, background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: 20 }}>
            <div style={{ fontFamily: "'Bebas Neue',Impact", letterSpacing: 3, fontSize: 14, color: T.text, marginBottom: 13 }}>RECOMMENDED LEARNING PATH</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {GRAPH_NODES.filter(n => isUnlocked(n.id, profile.knowledge) && (profile.knowledge[n.id]?.pKnow ?? 0) < 0.7).sort((a, b) => a.difficulty - b.difficulty).slice(0, 5).map((node, i) => {
                const color = COURSE_COLORS[node.courseId]; const pk = profile.knowledge[node.id]?.pKnow ?? 0.1;
                return (<div key={node.id} style={{ display: 'flex', alignItems: 'center', gap: 7, background: `${color}0d`, border: `1px solid ${color}28`, borderRadius: 9, padding: '7px 13px', cursor: 'pointer' }} onClick={() => setScreen('feed')}>
                  <span style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 12, color, letterSpacing: 1 }}>{i + 1}</span>
                  <span style={{ fontSize: 11, color: T.text, fontFamily: "'DM Mono',monospace" }}>{node.label}</span>
                  <span style={{ fontSize: 9, color: T.muted }}>{Math.round(pk * 100)}%</span>
                </div>);
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ DASHBOARD ══ */}
      {screen === 'dashboard' && (
        <div style={{ maxWidth: 1060, margin: '0 auto', padding: '30px 24px 60px' }}>
          <div style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 30, letterSpacing: 4, color: T.text, marginBottom: 22 }}>LEARNING DASHBOARD</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 13, marginBottom: 24 }}>
            {[{ l: 'XP', v: profile.xp, c: '#f59e0b', i: '⚡' }, { l: 'STREAK', v: profile.streak, c: '#ef4444', i: '🔥' }, { l: 'SESSIONS', v: profile.sessions.length, c: '#818cf8', i: '📚' }, { l: 'DUE REVIEWS', v: dueReviews, c: '#f59e0b', i: '📅' }].map(({ l, v, c, i }) => (
              <div key={l} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{i}</div>
                <div style={{ fontFamily: "'Bebas Neue',Impact", fontSize: 26, color: c, letterSpacing: 2 }}>{v}</div>
                <div style={{ fontSize: 9, color: T.muted, letterSpacing: 1 }}>{l}</div>
              </div>
            ))}
          </div>
          {chartData.length > 1 && (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: 22, marginBottom: 24 }}>
              <div style={{ fontFamily: "'Bebas Neue',Impact", letterSpacing: 3, fontSize: 14, color: T.text, marginBottom: 3 }}>SATISFACTION vs PERFORMANCE</div>
              <div style={{ color: T.muted, fontSize: 10, fontFamily: "'DM Mono',monospace", marginBottom: 16 }}>predicted satisfaction tracks actual quiz performance over time</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} /><stop offset="100%" stopColor="#818cf8" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gq" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                  <XAxis dataKey="s" stroke={T.muted} /><YAxis stroke={T.muted} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }} formatter={(v: any) => `${v}%`} />
                  <Area type="monotone" dataKey="sat" stroke="#818cf8" fill="url(#gs)" strokeWidth={2} name="Satisfaction" />
                  <Area type="monotone" dataKey="quiz" stroke="#10b981" fill="url(#gq)" strokeWidth={2} name="Quiz Score" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 13, padding: 22 }}>
            <div style={{ fontFamily: "'Bebas Neue',Impact", letterSpacing: 3, fontSize: 14, color: T.text, marginBottom: 16 }}>KNOWLEDGE HEATMAP</div>
            <KnowledgeHeatmap knowledge={profile.knowledge} />
          </div>
        </div>
      )}
    </div>
  );
}
