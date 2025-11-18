import { NextRequest, NextResponse } from "next/server";

/**
 * Google Cloud Text-to-Speech API Route
 * Uses the REST API with API key for authentication
 */

interface TTSRequest {
  text: string;
  languageCode?: string;
  voiceName?: string;
  ssmlGender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
  audioEncoding?: 'MP3' | 'LINEAR16' | 'OGG_OPUS';
  speakingRate?: number;
  pitch?: number;
}

interface GoogleTTSVoice {
  languageCodes: string[];
  name: string;
  ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  naturalSampleRateHertz: number;
}

const TTS_API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const VOICES_API_URL = 'https://texttospeech.googleapis.com/v1/voices';

/**
 * POST /api/tts - Synthesize speech from text
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google AI API key not configured' },
        { status: 500 }
      );
    }

    const body: TTSRequest = await request.json();
    const {
      text,
      languageCode = 'de-DE',
      voiceName,
      ssmlGender = 'FEMALE',
      audioEncoding = 'MP3',
      speakingRate = 1.0,
      pitch = 0.0,
    } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Build the request payload for Google Cloud TTS
    const ttsPayload = {
      input: { text },
      voice: {
        languageCode,
        ...(voiceName ? { name: voiceName } : { ssmlGender }),
      },
      audioConfig: {
        audioEncoding,
        speakingRate,
        pitch,
      },
    };

    // Call Google Cloud TTS API
    const response = await fetch(`${TTS_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ttsPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Google TTS API error:', errorData);
      return NextResponse.json(
        {
          error: 'Failed to synthesize speech',
          details: errorData,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return the audio content (base64 encoded)
    return NextResponse.json({
      audioContent: data.audioContent,
      audioEncoding,
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
 * GET /api/tts - Get available voices
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google AI API key not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const languageCode = searchParams.get('languageCode');

    // Build the URL with optional language filter
    let url = `${VOICES_API_URL}?key=${apiKey}`;
    if (languageCode) {
      url += `&languageCode=${languageCode}`;
    }

    // Call Google Cloud TTS API to get available voices
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Google TTS Voices API error:', errorData);
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
