/**
 * Custom React Hook for Speech-to-Text functionality
 * Manages STT state, preferences, and speech recognition
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { STT, type STTResult, type STTPreferences } from '@/lib/speechToText';

export interface UseSpeechToTextReturn {
  // State
  isSupported: boolean;
  isEnabled: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  language: string;

  // Actions
  toggleEnabled: () => void;
  startListening: () => boolean;
  stopListening: () => void;
  abort: () => void;
  setLanguage: (lang: string) => void;
  clearTranscript: () => void;
}

export function useSpeechToText(
  options?: {
    onFinalResult?: (transcript: string) => void;
    autoSend?: boolean;
  }
): UseSpeechToTextReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguageState] = useState('de-DE');

  const finalTranscriptRef = useRef('');

  // Initialize on mount
  useEffect(() => {
    // Check if STT is supported
    const supported = STT.isSupported();
    setIsSupported(supported);

    if (!supported) return;

    // Load preferences
    const prefs = STT.loadPreferences();
    setIsEnabled(prefs.enabled ?? false);
    setLanguageState(prefs.language || 'de-DE');

    // Cleanup on unmount
    return () => {
      STT.stopListening();
    };
  }, []);

  // Toggle enabled
  const toggleEnabled = useCallback(() => {
    setIsEnabled(prev => {
      const newValue = !prev;
      STT.savePreferences({ enabled: newValue });

      if (!newValue && isListening) {
        STT.stopListening();
        setIsListening(false);
      }

      return newValue;
    });
  }, [isListening]);

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported || !isEnabled) {
      setError('Spracherkennung nicht verfügbar');
      return false;
    }

    if (isListening) {
      return true; // Already listening
    }

    // Reset state
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';

    const success = STT.startListening({
      language,
      continuous: false, // Single utterance mode
      interimResults: true, // Show interim results

      onStart: () => {
        setIsListening(true);
        setError(null);
      },

      onResult: (result: STTResult) => {
        if (result.isFinal) {
          // Final result
          const finalText = result.transcript.trim();
          finalTranscriptRef.current = finalText;
          setTranscript(finalText);
          setInterimTranscript('');

          // Call callback if provided
          if (options?.onFinalResult) {
            options.onFinalResult(finalText);
          }
        } else {
          // Interim result
          setInterimTranscript(result.transcript);
        }
      },

      onError: (errorMessage: string) => {
        setError(errorMessage);
        setIsListening(false);
        setInterimTranscript('');
      },

      onEnd: () => {
        setIsListening(false);
        setInterimTranscript('');

        // Auto-send if configured and we have a final result
        if (options?.autoSend && finalTranscriptRef.current && options?.onFinalResult) {
          // Already called in onResult, so no need to call again
        }
      },
    });

    if (!success) {
      setError('Spracherkennung konnte nicht gestartet werden');
    }

    return success;
  }, [isSupported, isEnabled, isListening, language, options]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (isListening) {
      STT.stopListening();
      setIsListening(false);
      setInterimTranscript('');
    }
  }, [isListening]);

  // Abort listening
  const abort = useCallback(() => {
    if (isListening) {
      STT.abort();
      setIsListening(false);
      setTranscript('');
      setInterimTranscript('');
      finalTranscriptRef.current = '';
    }
  }, [isListening]);

  // Set language
  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    STT.savePreferences({ language: lang });
  }, []);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
  }, []);

  return {
    // State
    isSupported,
    isEnabled,
    isListening,
    transcript,
    interimTranscript,
    error,
    language,

    // Actions
    toggleEnabled,
    startListening,
    stopListening,
    abort,
    setLanguage,
    clearTranscript,
  };
}
