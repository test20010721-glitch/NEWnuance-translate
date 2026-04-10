import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const LANG_NAMES = { ja: '日本語', en: 'English', es: 'Español', ca: 'Català' }

export async function POST(req) {
  try {
    const { imageData, mimeType, tgtLang, tone } = await req.json()
    if (!imageData) return Response.json({ error: 'imageData is required' }, { status: 400 })

    const tgtName = LANG_NAMES[tgtLang] || tgtLang

    const promptText = tone === 'menu'
      ? `この画像に写っているメニューを全て読み取り、${tgtName}で説明してください。

【必須ルール】
- 画像内の全メニューを省略せず全て対象にする
- 各メニューを「1. 〇〇」のように番号付きで区切る
- メニュー名の翻訳（${tgtName}）
- 食材・調理法・味の特徴・食感を2〜3文で説明
- 前置き・後書き不要、結果のみ返す`
      : `この画像のテキストを読み取り、${tgtName}に自然なニュアンスで翻訳してください。翻訳結果のみを返してください。`

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 2000,
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


