import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const LANG_NAMES = { ja: '日本語', en: 'English', es: 'Español', ca: 'Català' }

// 翻訳モード（異なる言語間）のトーン指示
const TRANSLATE_TONE = {
  casual:   'カジュアルで友達同士が話すような自然な口語表現。スラングや略語も適切に使う。',
  business: 'ビジネスシーンで使えるプロフェッショナルだが自然な表現。',
  polite:   '丁寧で礼儀正しく、温かみのある表現。',
  email:    'ビジネスメールとしてそのままコピペできる形式。適切な挨拶から締めまで含める。',
  menu:     'メニュー名の翻訳＋料理の説明（食材・調理法・味の特徴）を加える。'
}

// スタイル変換モード（同じ言語内）のプロンプト
const STYLE_PROMPTS = {
  casual: (text, lang) => `以下の文章を${LANG_NAMES[lang]||lang}のカジュアルな口語表現に書き換えてください。
友達同士で話すような自然な言葉遣いにしてください。スラングや略語も自然に使ってOKです。
結果のみを返してください（説明不要）。

元の文章:
${text}`,

  business: (text, lang) => `以下の文章を${LANG_NAMES[lang]||lang}のビジネス向け表現に書き換えてください。
プロフェッショナルで読みやすく、自然なビジネス文体にしてください。
結果のみを返してください（説明不要）。

元の文章:
${text}`,

  polite: (text, lang) => `以下の文章を${LANG_NAMES[lang]||lang}の丁寧な表現に書き換えてください。
礼儀正しく温かみのある、敬語・丁寧語を使った文体にしてください。
結果のみを返してください（説明不要）。

元の文章:
${text}`,

  email: (text, lang) => `以下の内容をもとに、${LANG_NAMES[lang]||lang}のビジネスメールを作成してください。
そのままコピー＆ペーストして使えるよう、適切な挨拶文・本文・締めの言葉を含めた完全なメール文を書いてください。
結果のみを返してください（説明不要）。

メールの内容・目的:
${text}`,

  menu: (text, lang) => `以下のメニュー名または料理名について、${LANG_NAMES[lang]||lang}で説明文を作成してください。
食材・調理法・味の特徴・食感などを含めた、お客様に伝わる魅力的な説明にしてください。
複数ある場合は各料理を丁寧に説明してください。
結果のみを返してください（説明不要）。

メニュー:
${text}`
}

export async function POST(req) {
  try {
    const { text, srcLang, tgtLang, tone } = await req.json()
    if (!text) return Response.json({ error: 'text is required' }, { status: 400 })

    const isSameLang = srcLang === tgtLang
    let prompt

    if (isSameLang) {
      // 同じ言語 → スタイル変換モード
      const styleFn = STYLE_PROMPTS[tone] || STYLE_PROMPTS.casual
      prompt = styleFn(text, srcLang)
    } else {
      // 異なる言語 → 通常翻訳モード
      prompt = `以下の文章を翻訳してください。
翻訳方向: ${LANG_NAMES[srcLang] || srcLang} → ${LANG_NAMES[tgtLang] || tgtLang}
スタイル: ${TRANSLATE_TONE[tone] || TRANSLATE_TONE.casual}

ルール:
- 直訳禁止
- ニュアンス・感情・スラングを維持
- ネイティブが自然に使う表現
- 翻訳結果のみ返す（説明不要）

原文:
${text}`
    }

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })

    const result = response.choices[0]?.message?.content || ''
    return Response.json({ result })
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
