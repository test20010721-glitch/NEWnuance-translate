import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const TONE_MAP = {
  casual: 'カジュアルで友達同士が話すような自然な口語表現。スラングや略語も適切に使う。',
  business: 'ビジネスシーンで使えるプロフェッショナルだが自然な表現。',
  polite: '丁寧で礼儀正しく、温かみのある表現。',
  email: 'ビジネスメールとしてそのままコピペできる形式。適切な挨拶から締めまで含める。',
  menu: 'メニュー名の翻訳＋料理の説明（食材・調理法・味の特徴）を加える。'
}

const LANG_NAMES = { ja: '日本語', en: 'English', es: 'Español', ca: 'Català' }

export async function POST(req) {
  try {
    const { text, srcLang, tgtLang, tone } = await req.json()
    if (!text) return Response.json({ error: 'text is required' }, { status: 400 })

    const prompt = `以下の文章を翻訳してください。
翻訳方向: ${LANG_NAMES[srcLang] || srcLang} → ${LANG_NAMES[tgtLang] || tgtLang}
スタイル: ${TONE_MAP[tone] || TONE_MAP.casual}

ルール:
- 直訳禁止
- ニュアンス・感情・スラングを維持
- ネイティブが自然に使う表現
- 翻訳結果のみ返す（説明不要）

原文:
${text}`

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })

    const result = response.choices[0]?.message?.content || ''
    return Response.json({ result })
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
