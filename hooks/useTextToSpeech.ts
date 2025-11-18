/**
 * Custom React Hook for Text-to-Speech functionality
 * Manages TTS state, preferences, and speech synthesis
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as TTS from '@/lib/textToSpeech';

export interface UseTextToSpeechReturn {
  // State
  isSupported: boolean;
  isEnabled: boolean;
  autoPlay: boolean;
  isSpeaking: boolean;
  currentlySpeakingMessageId: string | null;
  rate: number;
  pitch: number;
  availableVoices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;

  // Actions
  toggleEnabled: () => void;
  toggleAutoPlay: () => void;
  speak: (text: string, messageId?: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
  setVoice: (voice: SpeechSynthesisVoice | null) => void;

  // Utilities
  speakIfAutoPlay: (text: string, messageId?: string) => void;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentlySpeakingMessageId, setCurrentlySpeakingMessageId] = useState<string | null>(null);
  const [rate, setRateState] = useState(1.0);
  const [pitch, setPitchState] = useState(1.0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize on mount
  useEffect(() => {
    // Check if TTS is supported
    const supported = TTS.isTTSSupported();
    setIsSupported(supported);

    if (!supported) return;

    // Load preferences
    const prefs = TTS.loadPreferences();
    setIsEnabled(prefs.enabled);
    setAutoPlay(prefs.autoPlay);
    setRateState(prefs.rate);
    setPitchState(prefs.pitch);

    // Load voices
    const loadVoices = () => {
      const voices = TTS.getAvailableVoices();
      setAvailableVoices(voices);

      // Set initial voice based on preferences
      if (prefs.voiceURI) {
        const voice = voices.find(v => v.voiceURI === prefs.voiceURI);
        setSelectedVoice(voice || null);
      }
    };

    // Voices might not be immediately available
    loadVoices();

    // Some browsers load voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Cleanup
    return () => {
      TTS.stop();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Toggle enabled
  const toggleEnabled = useCallback(() => {
    setIsEnabled(prev => {
      const newValue = !prev;
      TTS.savePreferences({ enabled: newValue });
      if (!newValue) {
        TTS.stop();
        setIsSpeaking(false);
        setCurrentlySpeakingMessageId(null);
      }
      return newValue;
    });
  }, []);

  // Toggle auto-play
  const toggleAutoPlay = useCallback(() => {
    setAutoPlay(prev => {
      const newValue = !prev;
      TTS.savePreferences({ autoPlay: newValue });
      return newValue;
    });
  }, []);

  // Speak text
  const speak = useCallback((text: string, messageId?: string) => {
    if (!isSupported || !isEnabled) return;

    // Stop any current speech
    TTS.stop();

    // Create utterance
    const utterance = TTS.speak(text, {
      rate,
      pitch,
      voice: selectedVoice,
      onStart: () => {
        setIsSpeaking(true);
        if (messageId) {
          setCurrentlySpeakingMessageId(messageId);
        }
      },
      onEnd: () => {
        setIsSpeaking(false);
        setCurrentlySpeakingMessageId(null);
        currentUtteranceRef.current = null;
      },
      onError: (error) => {
        console.error('TTS error:', error);
        setIsSpeaking(false);
        setCurrentlySpeakingMessageId(null);
        currentUtteranceRef.current = null;
      },
    });

    currentUtteranceRef.current = utterance;
  }, [isSupported, isEnabled, rate, pitch, selectedVoice]);

  // Stop speaking
  const stop = useCallback(() => {
    TTS.stop();
    setIsSpeaking(false);
    setCurrentlySpeakingMessageId(null);
    currentUtteranceRef.current = null;
  }, []);

  // Pause speaking
  const pause = useCallback(() => {
    TTS.pause();
  }, []);

  // Resume speaking
  const resume = useCallback(() => {
    TTS.resume();
  }, []);

  // Set rate
  const setRate = useCallback((newRate: number) => {
    setRateState(newRate);
    TTS.savePreferences({ rate: newRate });
  }, []);

  // Set pitch
  const setPitch = useCallback((newPitch: number) => {
    setPitchState(newPitch);
    TTS.savePreferences({ pitch: newPitch });
  }, []);

  // Set voice
  const setVoice = useCallback((voice: SpeechSynthesisVoice | null) => {
    setSelectedVoice(voice);
    TTS.savePreferences({ voiceURI: voice?.voiceURI });
  }, []);

  // Speak if auto-play is enabled
  const speakIfAutoPlay = useCallback((text: string, messageId?: string) => {
    if (isEnabled && autoPlay) {
      speak(text, messageId);
    }
  }, [isEnabled, autoPlay, speak]);

  return {
    // State
    isSupported,
    isEnabled,
    autoPlay,
    isSpeaking,
    currentlySpeakingMessageId,
    rate,
    pitch,
    availableVoices,
    selectedVoice,

    // Actions
    toggleEnabled,
    toggleAutoPlay,
    speak,
    stop,
    pause,
    resume,
    setRate,
    setPitch,
    setVoice,

    // Utilities
    speakIfAutoPlay,
  };
}
