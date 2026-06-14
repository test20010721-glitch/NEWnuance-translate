import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const LANG_CODES = {
  ja: 'ja',
  en: 'en',
  es: 'es',
  ca: 'ca'
}

export async function POST(req) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio')
    const srcLang = formData.get('srcLang') || 'ja'

    if (!audioFile) {
      return Response.json({ error: '音声ファイルがありません' }, { status: 400 })
    }

    // Whisper APIで文字起こし（言語を明示指定することでカタカナ問題を解決）
    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: LANG_CODES[srcLang] || 'ja',
      response_format: 'text'
    })

    return Response.json({ text: transcription })
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
