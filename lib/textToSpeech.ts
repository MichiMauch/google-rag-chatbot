/**
 * Text-to-Speech Library using Web Speech API
 * Supports auto language detection (German/English)
 */

export interface TTSPreferences {
  enabled: boolean;
  autoPlay: boolean;
  rate: number;
  pitch: number;
  voiceURI?: string;
  language?: 'de-DE' | 'en-US' | 'auto';
  usePremiumTTS?: boolean; // Use ElevenLabs TTS instead of Web Speech API
  premiumVoiceId?: string; // ElevenLabs voice ID (e.g., '21m00Tcm4TlvDq8ikWAM')
}

export interface TTSVoice {
  name: string;
  lang: string;
  voiceURI: string;
  localService: boolean;
}

const STORAGE_KEY = 'tts_preferences';

const DEFAULT_PREFERENCES: TTSPreferences = {
  enabled: false,
  autoPlay: true,
  rate: 1.0,
  pitch: 1.0,
  language: 'auto',
};

/**
 * Check if browser supports Web Speech API
 */
export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Get all available voices
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isTTSSupported()) return [];
  return window.speechSynthesis.getVoices();
}

/**
 * Get German voices
 */
export function getGermanVoices(): SpeechSynthesisVoice[] {
  return getAvailableVoices().filter(voice =>
    voice.lang.startsWith('de-') || voice.lang.startsWith('de_')
  );
}

/**
 * Get English voices
 */
export function getEnglishVoices(): SpeechSynthesisVoice[] {
  return getAvailableVoices().filter(voice =>
    voice.lang.startsWith('en-') || voice.lang.startsWith('en_')
  );
}

/**
 * Detect language from text content
 */
export function detectLanguage(text: string): 'de-DE' | 'en-US' {
  // German indicators
  const germanPatterns = [
    /[äöüß]/i,
    /\b(der|die|das|und|oder|aber|ist|sind|haben|werden|wurde|können|müssen|sollen)\b/i,
    /\b(ich|du|er|sie|es|wir|ihr|sie)\b/i,
  ];

  // Check for German patterns
  const hasGermanIndicators = germanPatterns.some(pattern => pattern.test(text));

  if (hasGermanIndicators) {
    return 'de-DE';
  }

  // Default to English
  return 'en-US';
}

/**
 * Get best voice for detected language
 */
export function getBestVoice(language: 'de-DE' | 'en-US', preferredVoiceURI?: string): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();

  // If user has a preferred voice, try to find it
  if (preferredVoiceURI) {
    const preferredVoice = voices.find(v => v.voiceURI === preferredVoiceURI);
    if (preferredVoice) return preferredVoice;
  }

  // Get voices for the detected language
  const langVoices = voices.filter(v => v.lang.startsWith(language.substring(0, 2)));

  if (langVoices.length === 0) {
    // Fallback to any voice
    return voices[0] || null;
  }

  // Prefer local voices (better quality, no network)
  const localVoices = langVoices.filter(v => v.localService);
  if (localVoices.length > 0) {
    // Prefer female voices (often sound more natural)
    const femaleVoice = localVoices.find(v =>
      v.name.toLowerCase().includes('female') ||
      v.name.toLowerCase().includes('frau') ||
      v.name.toLowerCase().includes('anna') ||
      v.name.toLowerCase().includes('amelie')
    );
    return femaleVoice || localVoices[0];
  }

  return langVoices[0];
}

/**
 * Load TTS preferences from localStorage
 */
export function loadPreferences(): TTSPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCES;

    const parsed = JSON.parse(stored);
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch (error) {
    console.error('Failed to load TTS preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Save TTS preferences to localStorage
 */
export function savePreferences(preferences: Partial<TTSPreferences>): void {
  if (typeof window === 'undefined') return;

  try {
    const current = loadPreferences();
    const updated = { ...current, ...preferences };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save TTS preferences:', error);
  }
}

/**
 * Speak text using Web Speech API
 */
export function speak(
  text: string,
  options?: {
    rate?: number;
    pitch?: number;
    voice?: SpeechSynthesisVoice | null;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: SpeechSynthesisErrorEvent) => void;
  }
): SpeechSynthesisUtterance | null {
  if (!isTTSSupported()) {
    console.warn('Text-to-Speech not supported in this browser');
    return null;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Create utterance
  const utterance = new SpeechSynthesisUtterance(text);

  // Auto-detect language if no voice specified
  const detectedLang = detectLanguage(text);
  const voice = options?.voice || getBestVoice(detectedLang);

  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = detectedLang;
  }

  // Set options
  utterance.rate = options?.rate ?? 1.0;
  utterance.pitch = options?.pitch ?? 1.0;

  // Event handlers
  if (options?.onStart) {
    utterance.onstart = options.onStart;
  }

  if (options?.onEnd) {
    utterance.onend = options.onEnd;
  }

  if (options?.onError) {
    utterance.onerror = options.onError;
  }

  // Speak
  window.speechSynthesis.speak(utterance);

  return utterance;
}

/**
 * Stop current speech
 */
export function stop(): void {
  if (isTTSSupported()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Check if currently speaking
 */
export function isSpeaking(): boolean {
  if (!isTTSSupported()) return false;
  return window.speechSynthesis.speaking;
}

/**
 * Pause current speech
 */
export function pause(): void {
  if (isTTSSupported()) {
    window.speechSynthesis.pause();
  }
}

/**
 * Resume paused speech
 */
export function resume(): void {
  if (isTTSSupported()) {
    window.speechSynthesis.resume();
  }
}

/**
 * ElevenLabs Voice Interface
 */
export interface PremiumTTSVoice {
  voice_id: string;
  name: string;
  category: string;
  labels?: Record<string, string>;
  description?: string;
  preview_url?: string;
}

/**
 * Get available ElevenLabs voices
 */
export async function getPremiumVoices(): Promise<PremiumTTSVoice[]> {
  try {
    const url = `/api/tts`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error('Failed to fetch ElevenLabs voices:', response.statusText);
      return [];
    }

    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error('Error fetching ElevenLabs voices:', error);
    return [];
  }
}

/**
 * Speak text using ElevenLabs TTS
 */
export async function speakPremiumTTS(
  text: string,
  options?: {
    voiceId?: string;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: any) => void;
  }
): Promise<void> {
  try {
    // Call the TTS API
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voiceId: options?.voiceId || '21m00Tcm4TlvDq8ikWAM', // Default: Rachel voice
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to synthesize speech');
    }

    const data = await response.json();
    const audioContent = data.audioContent;

    // Convert base64 to audio and play
    const audioBlob = base64ToBlob(audioContent, 'audio/mp3');
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    // Set up event handlers
    if (options?.onStart) {
      audio.addEventListener('play', options.onStart);
    }

    if (options?.onEnd) {
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
        options.onEnd?.();
      });
    }

    if (options?.onError) {
      audio.addEventListener('error', (event) => {
        URL.revokeObjectURL(audioUrl);
        options.onError?.(event);
      });
    }

    // Play the audio
    await audio.play();
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    options?.onError?.(error);
    throw error;
  }
}

/**
 * Helper function to convert base64 to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Speak text with automatic fallback (ElevenLabs TTS -> Web Speech API)
 */
export async function speakWithFallback(
  text: string,
  options?: {
    usePremiumTTS?: boolean;
    rate?: number;
    pitch?: number;
    voice?: SpeechSynthesisVoice | null;
    premiumVoiceId?: string;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: any) => void;
  }
): Promise<SpeechSynthesisUtterance | null> {
  // Try ElevenLabs TTS first if enabled
  if (options?.usePremiumTTS) {
    try {
      await speakPremiumTTS(text, {
        voiceId: options.premiumVoiceId,
        onStart: options.onStart,
        onEnd: options.onEnd,
        onError: (error) => {
          console.error('ElevenLabs TTS failed, falling back to Web Speech API:', error);
          // Fallback to Web Speech API
          speak(text, options);
        },
      });
      return null; // ElevenLabs TTS doesn't return an utterance
    } catch (error) {
      console.error('ElevenLabs TTS failed, falling back to Web Speech API:', error);
      // Fallback to Web Speech API
      return speak(text, options);
    }
  }

  // Use Web Speech API
  return speak(text, options);
}
