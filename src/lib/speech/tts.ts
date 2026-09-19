// Regional Text-to-Speech Engine for Hindi, Telugu, and Indian English

export class VoiceSpeaker {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (this.synth) {
      this.voices = this.synth.getVoices();
    }
  }

  public speak(text: string, language: 'hi' | 'te' | 'en' = 'hi', onEnd?: () => void) {
    if (!this.synth) {
      console.warn('SpeechSynthesis is not supported in this browser environment.');
      if (onEnd) onEnd();
      return;
    }

    // Cancel any active utterance
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const langCode = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.lang = langCode;
    utterance.rate = 0.95; // Slightly measured rate for clear trade clarity
    utterance.pitch = 1.0;

    // Pick best matching voice
    const matchedVoice = this.voices.find((v) => v.lang.startsWith(language) || v.lang === langCode);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = () => onEnd();
    }

    this.synth.speak(utterance);
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const ttsEngine = new VoiceSpeaker();
