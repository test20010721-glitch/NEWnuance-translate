import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { isSubscribed, getUserByEmail } from '@/lib/db'

import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const LANG_NAMES = { ja: '日本語', en: 'English', es: 'Español', ca: 'Català' }

// 翻訳モード（異なる言語間）のトーン指示
const TRANSLATE_TONE = {
  casual:   'カジュアルで友達同士が話すような自然な口語表現。スラングや略語も適切に使う。',
  business: 'ビジネスシーンで使えるプロフェッショナルだが自然な表現。',
  polite:   '丁寧で礼儀正しく、温かみのある表現。',
  email:    'ビジネスメールとしてそのままコピペできる形式。適切な挨拶から締めまで含める。',
  menu:     'メニュー名を翻訳し、各料理について食材・調理法・味の特徴・食感を2〜3文で必ず説明する。複数ある場合は全ての料理を番号付きで説明すること。'
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

  menu: (text, lang) => {
    const items = text.trim().split(/\n|、|,/).map(s => s.trim()).filter(Boolean)
    const count = items.length
    const numbered = items.map((item, i) => `${i+1}. ${item}`).join('\n')
    return `以下の${count}品のメニューを、1品も省略せず全て説明してください。

【厳守ルール】
- 必ず${count}品全て説明すること（絶対に省略しない）
- 各メニューの形式：
  [番号]. [メニュー名の${LANG_NAMES[lang]||lang}訳]
  説明：[食材・調理法・味の特徴・食感を2文で説明]
- 前置き・後書き・コメント一切不要、結果のみ返す

メニューリスト（${count}品）:
${numbered}`
  }
}

export async function POST(req) {
  try {
    // ログイン確認
    const session = await getServerSession(authOptions)
    if (!session) {
      return Response.json({ error: 'ログインが必要です', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    // サブスク確認（無料プランは1日5回まで）
    const subscribed = await isSubscribed(session.user.email)
    const { text, srcLang, tgtLang, tone, usageCount } = await req.json()
    if (!text) return Response.json({ error: 'text is required' }, { status: 400 })

    if (!subscribed && usageCount >= 5) {
      return Response.json({ error: '本日の無料枠（5回）を使い切りました。Proプランにアップグレードすると無制限で使えます。', code: 'LIMIT_REACHED' }, { status: 403 })
    }

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
      model: 'gpt-4o-mini',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })

    const result = response.choices[0]?.message?.content || ''
    return Response.json({ result })
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
