import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const LANG_NAMES = { ja: '日本語', en: 'English', es: 'Español', ca: 'Català' }

export async function POST(req) {
  try {
    const { imageData, mimeType, tgtLang, tone } = await req.json()
    if (!imageData) return Response.json({ error: 'imageData is required' }, { status: 400 })

    const tgtName = LANG_NAMES[tgtLang] || tgtLang

    const promptText = tone === 'menu'
      ? `この画像に写っている全メニューを読み取り、1品も省略せず全て説明してください。

【厳守ルール】
- 画像内の全メニューを絶対に省略しない
- 各メニューの形式：
  [番号]. [メニュー名の${tgtName}訳]
  説明：[食材・調理法・味の特徴・食感を2文で説明]
- 前置き・後書き・コメント一切不要、結果のみ返す`
      : `この画像のテキストを読み取り、${tgtName}に自然なニュアンスで翻訳してください。翻訳結果のみを返してください。`

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageData}` } },
          { type: 'text', text: promptText }
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


