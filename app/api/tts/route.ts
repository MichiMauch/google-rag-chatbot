import { NextRequest, NextResponse } from "next/server";

/**
 * ElevenLabs Text-to-Speech API Route
 * Uses ElevenLabs API for high-quality voice synthesis
 */

interface TTSRequest {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels?: Record<string, string>;
  description?: string;
  preview_url?: string;
}

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

/**
 * POST /api/tts - Synthesize speech from text using ElevenLabs
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    const body: TTSRequest = await request.json();
    const {
      text,
      voiceId = '21m00Tcm4TlvDq8ikWAM', // Default: Rachel voice
      modelId = 'eleven_turbo_v2_5', // Fast and high quality
      stability = 0.5,
      similarityBoost = 0.75,
      style = 0,
      useSpeakerBoost = true,
    } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Build the request payload for ElevenLabs TTS
    const ttsPayload = {
      text,
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
        style,
        use_speaker_boost: useSpeakerBoost,
      },
    };

    // Call ElevenLabs TTS API
    const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify(ttsPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('ElevenLabs TTS API error:', errorData);
      return NextResponse.json(
        {
          error: 'Failed to synthesize speech',
          details: errorData,
        },
        { status: response.status }
      );
    }

    // Get the audio data as arrayBuffer
    const audioBuffer = await response.arrayBuffer();

    // Convert to base64
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    // Return the audio content (base64 encoded)
    return NextResponse.json({
      audioContent: base64Audio,
      audioEncoding: 'MP3',
    });
  } catch (error: any) {
    console.error('TTS API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tts - Get available ElevenLabs voices
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    // Call ElevenLabs API to get available voices
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('ElevenLabs Voices API error:', errorData);
      return NextResponse.json(
        {
          error: 'Failed to fetch voices',
          details: errorData,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return the voices
    return NextResponse.json({
      voices: data.voices || [],
    });
  } catch (error: any) {
    console.error('TTS Voices API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
