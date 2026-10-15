// 浏览器原生离线 Web Speech API 发音引擎

class SpeechEngine {
  private synth: SpeechSynthesis | null = null;
  private preferredVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  private initVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // 优先匹配高品质英语发音 (如 Google US English, Samantha, Daniel, Microsoft Zira)
    this.preferredVoice =
      voices.find(v => v.lang === 'en-US' && (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google'))) ||
      voices.find(v => v.lang.startsWith('en')) ||
      null;
  }

  public speak(text: string, rate = 1.0) {
    if (!this.synth) {
      this.fallbackAudio(text);
      return;
    }

    // 取消上一条未播完的声音，确保按 J/K 连击发音不积压延迟
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.pitch = 1.0;
    if (this.preferredVoice) {
      utterance.voice = this.preferredVoice;
    }

    utterance.onerror = () => {
      this.fallbackAudio(text);
    };

    this.synth.speak(utterance);
  }

  private fallbackAudio(word: string) {
    try {
      // 备用线上 CDN 音频源 (有道英音/美音)
      const audio = new Audio(`https://dict.youdao.com/dictvoice?type=2&audio=${encodeURIComponent(word)}`);
      audio.play().catch(() => {});
    } catch {
      // 忽略音频播放错误
    }
  }
}

export const speechEngine = new SpeechEngine();
