// Web Speech API wrapper with graceful fallback

export function isVoiceSupported(): boolean {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'done' | 'error' | 'unsupported';

export interface VoiceRecognition {
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export function createVoiceRecognition(args: {
  onTranscript: (text: string, final: boolean) => void;
  onStateChange: (state: VoiceState) => void;
  lang?: string;
}): VoiceRecognition | null {
  if (!isVoiceSupported()) {
    args.onStateChange('unsupported');
    return null;
  }

  const SpeechRecognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = args.lang ?? 'en-US';
  recognition.maxAlternatives = 1;

  recognition.onstart = () => args.onStateChange('listening');
  recognition.onend = () => args.onStateChange('done');
  recognition.onerror = () => args.onStateChange('error');

  recognition.onresult = (event: any) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) final += t;
      else interim += t;
    }
    if (final) {
      args.onTranscript(final.trim(), true);
      args.onStateChange('processing');
    } else if (interim) {
      args.onTranscript(interim.trim(), false);
    }
  };

  return {
    start: () => { try { recognition.start(); } catch {} },
    stop: () => { try { recognition.stop(); } catch {} },
    abort: () => { try { recognition.abort(); } catch {} },
  };
}
