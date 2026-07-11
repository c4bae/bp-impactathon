// =====================================================================
// Read-aloud hook — used by the card feed & event detail (Contributor 1)
// and voice-review (Contributor 4). Tries the server ElevenLabs TTS
// endpoint; if that 501s (mock mode / no key), falls back to the browser's
// built-in SpeechSynthesis. So read-aloud ALWAYS works, keys or not.
// =====================================================================
import { useCallback, useRef, useState } from 'react';
import { api } from '../api/client';

export function useReadAloud() {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    stop();
    setSpeaking(true);
    try {
      const blob = await api.tts(text); // null in mock mode
      if (blob) {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
        await audio.play();
        return;
      }
    } catch {
      /* fall through to browser speech */
    }
    // Browser fallback.
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      u.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    } else {
      setSpeaking(false);
    }
  }, [stop]);

  return { speak, stop, speaking };
}
