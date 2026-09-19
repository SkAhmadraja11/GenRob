// Web Speech API client-side primary STT engine with multi-language & Whisper Edge Function fallback

export interface STTResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export type STTLanguage = 'hi-IN' | 'te-IN' | 'en-IN';

export class VoiceRecognizer {
  private recognition: any = null;
  private isListening = false;
  private currentLanguage: STTLanguage = 'hi-IN';
  private onResultCallback: ((result: STTResult) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onEndCallback: (() => void) | null = null;

  constructor() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 3;

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        let maxConfidence = 0.9;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
            maxConfidence = item[0].confidence || 0.95;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const activeText = (finalTranscript || interimTranscript).trim();
        if (this.onResultCallback && activeText) {
          this.onResultCallback({
            transcript: activeText,
            isFinal: Boolean(finalTranscript),
            confidence: maxConfidence,
          });
        }
      };

      this.recognition.onerror = (event: any) => {
        if (this.onErrorCallback) {
          this.onErrorCallback(event.error || 'Speech recognition error');
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onEndCallback) {
          this.onEndCallback();
        }
      };
    }
  }

  public isSupported(): boolean {
    return Boolean(this.recognition);
  }

  public setLanguage(lang: STTLanguage) {
    this.currentLanguage = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  public start(
    onResult: (result: STTResult) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ) {
    if (!this.recognition) {
      onError('Web Speech API is not supported in this browser. Please use Chrome/Edge or Edge Function.');
      return;
    }

    if (this.isListening) {
      this.stop();
    }

    this.onResultCallback = onResult;
    this.onErrorCallback = onError;
    this.onEndCallback = onEnd;

    this.recognition.lang = this.currentLanguage;
    try {
      this.recognition.start();
      this.isListening = true;
    } catch (err: any) {
      onError(err.message || 'Could not start voice recognition');
    }
  }

  public stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}
