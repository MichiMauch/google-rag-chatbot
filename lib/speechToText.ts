// Speech-to-Text library using Web Speech API
// Similar architecture to textToSpeech.ts

export interface STTPreferences {
  enabled?: boolean;
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export interface STTResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

// Browser SpeechRecognition types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const PREFERENCES_KEY = 'stt-preferences';

class SpeechToTextService {
  private recognition: SpeechRecognition | null = null;
  private isRecognizing = false;

  /**
   * Check if Speech Recognition is supported
   */
  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Initialize speech recognition
   */
  private initRecognition(): SpeechRecognition | null {
    if (!this.isSupported()) return null;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;

    return new SpeechRecognitionAPI();
  }

  /**
   * Start listening
   */
  startListening(
    config: {
      language?: string;
      continuous?: boolean;
      interimResults?: boolean;
      onResult?: (result: STTResult) => void;
      onError?: (error: string) => void;
      onEnd?: () => void;
      onStart?: () => void;
    }
  ): boolean {
    if (!this.isSupported()) {
      config.onError?.('Speech recognition not supported in this browser');
      return false;
    }

    // Stop any existing recognition
    if (this.recognition) {
      this.recognition.stop();
    }

    this.recognition = this.initRecognition();
    if (!this.recognition) {
      config.onError?.('Failed to initialize speech recognition');
      return false;
    }

    // Configure recognition
    this.recognition.continuous = config.continuous ?? false;
    this.recognition.interimResults = config.interimResults ?? true;
    this.recognition.lang = config.language || this.detectLanguage();
    this.recognition.maxAlternatives = 1;

    // Event handlers
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results;
      const result = results[event.resultIndex];

      if (result) {
        const alternative = result[0];
        if (alternative) {
          config.onResult?.({
            transcript: alternative.transcript,
            isFinal: result.isFinal,
            confidence: alternative.confidence,
          });
        }
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = event.error;

      switch (event.error) {
        case 'no-speech':
          errorMessage = 'Keine Sprache erkannt';
          break;
        case 'audio-capture':
          errorMessage = 'Mikrofon nicht verfügbar';
          break;
        case 'not-allowed':
          errorMessage = 'Mikrofon-Berechtigung verweigert';
          break;
        case 'network':
          errorMessage = 'Netzwerkfehler';
          break;
        case 'aborted':
          errorMessage = 'Aufnahme abgebrochen';
          break;
      }

      config.onError?.(errorMessage);
      this.isRecognizing = false;
    };

    this.recognition.onend = () => {
      this.isRecognizing = false;
      config.onEnd?.();
    };

    this.recognition.onstart = () => {
      this.isRecognizing = true;
      config.onStart?.();
    };

    // Start recognition
    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Failed to start recognition:', error);
      config.onError?.('Failed to start recognition');
      return false;
    }
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (this.recognition && this.isRecognizing) {
      this.recognition.stop();
    }
  }

  /**
   * Abort listening (immediate stop without final results)
   */
  abort(): void {
    if (this.recognition && this.isRecognizing) {
      this.recognition.abort();
    }
  }

  /**
   * Check if currently recognizing
   */
  getIsRecognizing(): boolean {
    return this.isRecognizing;
  }

  /**
   * Detect language based on browser language
   */
  private detectLanguage(): string {
    if (typeof window === 'undefined') return 'de-DE';

    const browserLang = navigator.language || 'de-DE';

    // Normalize to supported languages
    if (browserLang.startsWith('de')) {
      return 'de-DE';
    } else if (browserLang.startsWith('en')) {
      return 'en-US';
    } else if (browserLang.startsWith('fr')) {
      return 'fr-FR';
    } else if (browserLang.startsWith('it')) {
      return 'it-IT';
    }

    return 'de-DE'; // Default fallback
  }

  /**
   * Save preferences to localStorage
   */
  savePreferences(preferences: STTPreferences): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save STT preferences:', error);
    }
  }

  /**
   * Load preferences from localStorage
   */
  loadPreferences(): STTPreferences {
    if (typeof window === 'undefined') return {};

    try {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load STT preferences:', error);
      return {};
    }
  }
}

// Export singleton instance
export const STT = new SpeechToTextService();
