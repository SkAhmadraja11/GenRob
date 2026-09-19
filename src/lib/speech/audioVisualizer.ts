// Web Audio API live waveform analyzer for microphone input

export class AudioVisualizer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private isAnalyzing = false;

  public async start(onWaveformData: (frequencies: number[]) => void): Promise<boolean> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64; // 32 frequency bins
      this.analyser.smoothingTimeConstant = 0.8;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.isAnalyzing = true;

      const updateLoop = () => {
        if (!this.isAnalyzing || !this.analyser) return;

        this.analyser.getByteFrequencyData(dataArray);

        // Normalize between 0 and 100
        const frequencies = Array.from(dataArray).map((val) => Math.round((val / 255) * 100));
        onWaveformData(frequencies);

        this.animationFrameId = requestAnimationFrame(updateLoop);
      };

      updateLoop();
      return true;
    } catch (err) {
      console.warn('Microphone access denied or audio context failed:', err);
      return false;
    }
  }

  public stop() {
    this.isAnalyzing = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
  }
}
