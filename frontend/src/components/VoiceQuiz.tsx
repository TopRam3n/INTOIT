import { useState, useRef, useEffect } from 'react';
import type { QuizQuestion } from '../types';
import { createVoiceRecognition, isVoiceSupported, VoiceState } from '../lib/voice';
import { gradeVoiceAnswer } from '../lib/openai';
import { useStore } from '../store';

interface VoiceQuizProps {
  question: QuizQuestion;
  topicTitle: string;
  onResult: (correct: boolean, transcript: string) => void;
}

export function VoiceQuiz({ question, topicTitle, onResult }: VoiceQuizProps) {
  const openAiKey = useStore(s => s.profile.openAiKey);
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const voiceRef = useRef<ReturnType<typeof createVoiceRecognition>>(null);
  const supported = isVoiceSupported();

  useEffect(() => {
    return () => { voiceRef.current?.abort(); };
  }, []);

  async function handleTranscript(text: string, final: boolean) {
    setTranscript(text);
    if (!final) return;

    setIsGrading(true);
    const correctAnswer = question.options[question.correctIndex];

    // First try simple string matching (fast, no API needed)
    const normalised = text.toLowerCase().replace(/[^a-z0-9+\-*/=.]/g, ' ').trim();
    const expected = correctAnswer.toLowerCase().replace(/[^a-z0-9+\-*/=.]/g, ' ').trim();
    const simpleMatch = normalised.includes(expected) || expected.includes(normalised);

    if (simpleMatch) {
      setIsCorrect(true);
      setFeedback('✓ Correct! Great answer.');
      onResult(true, text);
      setIsGrading(false);
      return;
    }

    // Use AI grading if key available
    if (openAiKey) {
      const result = await gradeVoiceAnswer({
        question: question.question,
        correctAnswer,
        voiceTranscript: text,
        topicTitle,
        apiKey: openAiKey,
      });
      if (result) {
        setIsCorrect(result.correct);
        setFeedback(result.feedback);
        onResult(result.correct, text);
        setIsGrading(false);
        return;
      }
    }

    // Fallback: mark incorrect, show correct answer
    setIsCorrect(false);
    setFeedback(`Correct answer: ${correctAnswer}`);
    onResult(false, text);
    setIsGrading(false);
  }

  function startListening() {
    voiceRef.current = createVoiceRecognition({
      onTranscript: handleTranscript,
      onStateChange: setState,
    });
    voiceRef.current?.start();
    setTranscript('');
    setFeedback('');
    setIsCorrect(null);
  }

  function stopListening() {
    voiceRef.current?.stop();
  }

  const isListening = state === 'listening';
  const isDone = isCorrect !== null;

  return (
    <div style={{ marginTop: 16 }}>
      {/* Voice button */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={!supported || isGrading || isDone}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: isListening ? '#ef4444' : supported ? '#6366f1' : 'rgba(255,255,255,0.05)',
            color: '#fff', fontSize: 13, fontFamily: "'DM Mono', monospace",
            cursor: supported && !isGrading && !isDone ? 'pointer' : 'not-allowed',
            opacity: !supported || isDone ? 0.5 : 1,
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Pulse ring when listening */}
          {isListening && (
            <span style={{ position: 'absolute', inset: 0, borderRadius: 10, border: '2px solid rgba(239,68,68,0.5)', animation: 'voicePulse 1s infinite' }} />
          )}
          <span style={{ fontSize: 18 }}>{isListening ? '⏹' : '🎤'}</span>
          {isListening ? 'Stop' : isGrading ? 'Grading...' : isDone ? 'Done' : 'Answer by Voice'}
        </button>

        {!supported && (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Mono', monospace" }}>
            Voice not supported in this browser
          </span>
        )}
      </div>

      <style>{`
        @keyframes voicePulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Live transcript */}
      {(transcript || isListening) && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: isListening ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isListening ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
          marginBottom: 10,
        }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Mono', monospace", marginBottom: 4, letterSpacing: 1 }}>
            {isListening ? '🔴 LISTENING...' : 'YOU SAID:'}
          </div>
          <div style={{ fontSize: 14, color: '#e8e8f0', fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>
            "{transcript || '...'}"
          </div>
        </div>
      )}

      {/* Grading indicator */}
      {isGrading && (
        <div style={{ fontSize: 12, color: '#818cf8', fontFamily: "'DM Mono', monospace", padding: '8px 0' }}>
          ⏳ AI is grading your answer...
        </div>
      )}

      {/* Result */}
      {isDone && feedback && (
        <div style={{
          padding: '12px 16px', borderRadius: 10,
          background: isCorrect ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          fontSize: 13, color: isCorrect ? '#6ee7b7' : '#fca5a5',
          fontFamily: "'DM Mono', monospace", lineHeight: 1.6,
        }}>
          {feedback}
        </div>
      )}
    </div>
  );
}
