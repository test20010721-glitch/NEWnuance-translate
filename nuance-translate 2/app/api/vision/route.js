import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const LANG_NAMES = { ja: '日本語', en: 'English', es: 'Español', ca: 'Català' }

export async function POST(req) {
  try {
    const { imageData, mimeType, tgtLang, tone } = await req.json()
    if (!imageData) return Response.json({ error: 'imageData is required' }, { status: 400 })

    const tgtName = LANG_NAMES[tgtLang] || tgtLang
    const menuNote = tone === 'menu' ? 'メニューの場合は料理名の翻訳と説明を加えてください。' : ''

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageData}` } },
          { type: 'text', text: `この画像のテキストを読み取り、${tgtName}に自然なニュアンスで翻訳してください。${menuNote}翻訳結果のみを返してください。` }
        ]
      }]
    })

    const result = response.choices[0]?.message?.content || ''
    return Response.json({ result })
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }
