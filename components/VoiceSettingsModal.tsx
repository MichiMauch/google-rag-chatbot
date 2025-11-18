"use client";

import { useState, useEffect } from "react";
import { X, Volume2, VolumeX, Play, Loader2, Sparkles } from "lucide-react";
import { PremiumTTSVoice } from "@/lib/textToSpeech";

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEnabled: boolean;
  autoPlay: boolean;
  rate: number;
  pitch: number;
  selectedVoice: SpeechSynthesisVoice | null;
  availableVoices: SpeechSynthesisVoice[];
  usePremiumTTS: boolean;
  premiumVoices: PremiumTTSVoice[];
  premiumVoiceId: string | null;
  onToggleEnabled: () => void;
  onToggleAutoPlay: () => void;
  onTogglePremiumTTS: () => void;
  onRateChange: (rate: number) => void;
  onPitchChange: (pitch: number) => void;
  onVoiceChange: (voice: SpeechSynthesisVoice | null) => void;
  onPremiumVoiceChange: (voiceId: string | null) => void;
  onTest: (text: string) => void;
}

export default function VoiceSettingsModal({
  isOpen,
  onClose,
  isEnabled,
  autoPlay,
  rate,
  pitch,
  selectedVoice,
  availableVoices,
  usePremiumTTS,
  premiumVoices,
  premiumVoiceId,
  onToggleEnabled,
  onToggleAutoPlay,
  onTogglePremiumTTS,
  onRateChange,
  onPitchChange,
  onVoiceChange,
  onPremiumVoiceChange,
  onTest,
}: VoiceSettingsModalProps) {
  const [testText, setTestText] = useState("Hallo! Das ist ein Test der Sprachausgabe.");
  const [isTesting, setIsTesting] = useState(false);

  // Group Web Speech voices by language
  const germanVoices = availableVoices.filter(v =>
    v.lang.startsWith('de-') || v.lang.startsWith('de_')
  );
  const englishVoices = availableVoices.filter(v =>
    v.lang.startsWith('en-') || v.lang.startsWith('en_')
  );
  const otherVoices = availableVoices.filter(v =>
    !v.lang.startsWith('de') && !v.lang.startsWith('en')
  );

  // Group Premium TTS voices by category (ElevenLabs categorizes by premade/cloned/etc)
  const premadeVoices = premiumVoices.filter(v => v.category === 'premade');
  const professionalVoices = premiumVoices.filter(v => v.category === 'professional');
  const otherPremiumVoices = premiumVoices.filter(v =>
    v.category !== 'premade' && v.category !== 'professional'
  );

  const handleTest = () => {
    setIsTesting(true);
    onTest(testText);
    // Reset after a delay
    setTimeout(() => setIsTesting(false), 2000);
  };

  const handleVoiceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const voiceURI = e.target.value;
    if (!voiceURI) {
      onVoiceChange(null);
      return;
    }
    const voice = availableVoices.find(v => v.voiceURI === voiceURI);
    onVoiceChange(voice || null);
  };

  const handlePremiumVoiceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const voiceId = e.target.value;
    onPremiumVoiceChange(voiceId || null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              {isEnabled ? (
                <Volume2 className="w-5 h-5 text-blue-600" />
              ) : (
                <VolumeX className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Sprachausgabe Einstellungen
              </h2>
              <p className="text-sm text-gray-500">
                Text-to-Speech Konfiguration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Enable TTS Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">
                Sprachausgabe aktivieren
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                Ermöglicht das Vorlesen von Bot-Antworten
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleEnabled}
              className={`${
                isEnabled ? 'bg-blue-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            >
              <span
                className={`${
                  isEnabled ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              />
            </button>
          </div>

          {isEnabled && (
            <>
              {/* Auto-Play Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Automatisch vorlesen
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Neue Bot-Antworten werden automatisch vorgelesen
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onToggleAutoPlay}
                  className={`${
                    autoPlay ? 'bg-blue-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                >
                  <span
                    className={`${
                      autoPlay ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
              </div>

              {/* Premium TTS Toggle */}
              <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg border border-blue-100">
                <div>
                  <label className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Premium Stimmen (ElevenLabs)
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Hochwertige KI-Stimmen mit natürlichem Klang
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onTogglePremiumTTS}
                  className={`${
                    usePremiumTTS ? 'bg-purple-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
                >
                  <span
                    className={`${
                      usePremiumTTS ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
              </div>

              {/* Voice Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {usePremiumTTS ? (
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      Premium Stimme
                    </span>
                  ) : (
                    'Stimme'
                  )}
                </label>
                {usePremiumTTS ? (
                  <select
                    value={premiumVoiceId || ''}
                    onChange={handlePremiumVoiceSelect}
                    className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gradient-to-r from-blue-50 to-purple-50"
                  >
                    <option value="">Automatisch (Standard: Rachel)</option>
                    {premadeVoices.length > 0 && (
                      <optgroup label="✨ Vorgefertigte Stimmen">
                        {premadeVoices.map(voice => (
                          <option key={voice.voice_id} value={voice.voice_id}>
                            {voice.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {professionalVoices.length > 0 && (
                      <optgroup label="💼 Professionelle Stimmen">
                        {professionalVoices.map(voice => (
                          <option key={voice.voice_id} value={voice.voice_id}>
                            {voice.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {otherPremiumVoices.length > 0 && (
                      <optgroup label="🎙️ Andere Stimmen">
                        {otherPremiumVoices.map(voice => (
                          <option key={voice.voice_id} value={voice.voice_id}>
                            {voice.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                ) : (
                  <select
                    value={selectedVoice?.voiceURI || ''}
                    onChange={handleVoiceSelect}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Automatisch (Spracherkennung)</option>
                    {germanVoices.length > 0 && (
                      <optgroup label="🇩🇪 Deutsch">
                        {germanVoices.map(voice => (
                          <option key={voice.voiceURI} value={voice.voiceURI}>
                            {voice.name} {voice.localService ? '(lokal)' : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {englishVoices.length > 0 && (
                      <optgroup label="🇬🇧 English">
                        {englishVoices.map(voice => (
                          <option key={voice.voiceURI} value={voice.voiceURI}>
                            {voice.name} {voice.localService ? '(local)' : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {otherVoices.length > 0 && (
                      <optgroup label="🌍 Andere Sprachen">
                        {otherVoices.map(voice => (
                          <option key={voice.voiceURI} value={voice.voiceURI}>
                            {voice.name} ({voice.lang})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                )}
              </div>

              {/* Speed Control */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Geschwindigkeit: {rate.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={rate}
                  onChange={(e) => onRateChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Langsamer</span>
                  <span>Normal</span>
                  <span>Schneller</span>
                </div>
              </div>

              {/* Pitch Control */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Tonhöhe: {pitch.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={pitch}
                  onChange={(e) => onPitchChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Tiefer</span>
                  <span>Normal</span>
                  <span>Höher</span>
                </div>
              </div>

              {/* Test Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Test
                </label>
                <input
                  type="text"
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder="Text zum Testen..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                />
                <button
                  onClick={handleTest}
                  disabled={isTesting || !testText}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Spricht...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Test abspielen
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
