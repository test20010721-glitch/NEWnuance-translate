'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const LANGS = {
  ja: { src: '原文', result: '翻訳結果', placeholder: '翻訳したいテキストを入力...', history: '翻訳履歴', translate: '翻訳する', chars: '文字', empty: '履歴はまだありません', clearAll: 'すべて削除', copy: 'コピーしました', listening: '🎙 聞いています...', tapStop: 'タップして停止' },
  en: { src: 'Source', result: 'Translation', placeholder: 'Enter text to translate...', history: 'History', translate: 'Translate', chars: 'chars', empty: 'No history yet', clearAll: 'Clear all', copy: 'Copied!', listening: '🎙 Listening...', tapStop: 'Tap to stop' },
  es: { src: 'Texto original', result: 'Traducción', placeholder: 'Escribe el texto a traducir...', history: 'Historial', translate: 'Traducir', chars: 'caracteres', empty: 'Sin historial', clearAll: 'Borrar todo', copy: '¡Copiado!', listening: '🎙 Escuchando...', tapStop: 'Toca para detener' },
  ca: { src: 'Text original', result: 'Traducció', placeholder: 'Escriu el text a traduir...', history: 'Historial', translate: 'Traduir', chars: 'caràcters', empty: 'Sense historial', clearAll: 'Esborrar tot', copy: 'Copiat!', listening: '🎙 Escoltant...', tapStop: 'Toca per aturar' }
}
const TONES = {
  casual:   { ja:'カジュアル', en:'Casual',   es:'Casual',  ca:'Informal' },
  business: { ja:'ビジネス',   en:'Business', es:'Negocio', ca:'Negoci' },
  polite:   { ja:'丁寧',       en:'Polite',   es:'Educado', ca:'Educat' },
  email:    { ja:'メール用',   en:'Email',    es:'Correo',  ca:'Correu' },
  menu:     { ja:'メニュー',   en:'Menu',     es:'Menú',    ca:'Menú' }
}

// 言語コードを音声認識用に変換
const SPEECH_LANG = {
  ja: 'ja-JP',
  en: 'en-US',
  es: 'es-ES',
  ca: 'ca-ES'
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1024
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      resolve({ b64: canvas.toDataURL('image/jpeg', 0.85).split(',')[1], mimeType: 'image/jpeg' })
    }
    img.onerror = reject
    img.src = url
  })
}

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [srcLang, setSrcLang] = useState('ja')
  const [tgtLang, setTgtLang] = useState('en')
  const [tone, setTone] = useState('casual')
  const [inputText, setInputText] = useState('')
  const [result, setResult] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [showToast, setShowToast] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [showIOSHint, setShowIOSHint] = useState(false)
  const [isFav, setIsFav] = useState(false)
  const [usageCount, setUsageCount] = useState(0)
  const [showUpgradeMsg, setShowUpgradeMsg] = useState(false)
  const recognitionRef = useRef(null)
  const textareaRef = useRef(null)
  const prevInputRef = useRef('')
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const L = LANGS[srcLang] || LANGS.en
  const isSameMode = srcLang === tgtLang
  const isSubscribed = session?.user?.subscriptionStatus === 'active'

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem('nuance_history') || '[]')) } catch(e) {}
    try { setUsageCount(parseInt(localStorage.getItem('nuance_usage_today') || '0')) } catch(e) {}
  }, [])

  useEffect(() => {
    if (!showIOSHint) return
    if (inputText && inputText !== prevInputRef.current) {
      prevInputRef.current = inputText
      const timer = setTimeout(() => translate(inputText), 800)
      return () => clearTimeout(timer)
    }
  }, [inputText, showIOSHint])

  const saveHistory = (h) => { setHistory(h); localStorage.setItem('nuance_history', JSON.stringify(h)) }

  const translate = async (text = inputText) => {
    const t = (text || '').trim()
    if (!t || isLoading) return
    if (!session) { router.push('/login'); return }
    setIsLoading(true); setResult(''); setShowUpgradeMsg(false)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t, srcLang, tgtLang, tone, usageCount })
      })
      const data = await res.json()
      if (data.code === 'UNAUTHORIZED') { router.push('/login'); return }
      if (data.code === 'LIMIT_REACHED') { setShowUpgradeMsg(true); setResult(''); return }
      if (data.error) throw new Error(data.error)
      setResult(data.result)
      const newCount = usageCount + 1
      setUsageCount(newCount)
      localStorage.setItem('nuance_usage_today', String(newCount))
      const now = new Date()
      saveHistory([...history, {
        src: t, tgt: data.result,
        srcLang: LANGS[srcLang]?.src || srcLang,
        tgtLang: LANGS[tgtLang]?.src || tgtLang,
        tone: TONES[tone][srcLang] || tone,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }].slice(-50))
    } catch(e) { setResult('エラー: ' + e.message) }
    finally { setIsLoading(false) }
  }

  const handleSwap = () => {
    setSrcLang(tgtLang); setTgtLang(srcLang)
    if (result) { setInputText(result); setResult(inputText) }
  }

  const handleCopy = () => {
    if (!result) return
    navigator.clipboard.writeText(result).then(() => { setShowToast(true); setTimeout(() => setShowToast(false), 2000) })
  }

  const handleMic = async () => {
    // 録音中なら停止して文字起こし
    if (isListening) {
      mediaRecorderRef.current?.stop()
      return
    }

    // マイクへのアクセスを要求
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        // ストリームを停止
        stream.getTracks().forEach(track => track.stop())
        setIsListening(false)

        if (audioChunksRef.current.length === 0) return

        setIsLoading(true)
        setResult('🎙 音声を認識中...')

        try {
          // 音声データをBlobに変換
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' })

          // Whisper APIに送信
          const formData = new FormData()
          formData.append('audio', audioFile)
          formData.append('srcLang', srcLang)

          const res = await fetch('/api/whisper', {
            method: 'POST',
            body: formData
          })
          const data = await res.json()
          if (data.error) throw new Error(data.error)

          const transcript = data.text?.trim()
          if (!transcript) { setResult('音声が認識できませんでした。もう一度お試しください。'); setIsLoading(false); return }

          setInputText(transcript)
          setIsLoading(false)
          // 文字起こし後に自動翻訳
          await translate(transcript)
        } catch(e) {
          setResult('音声認識エラー: ' + e.message)
          setIsLoading(false)
        }
      }

      mediaRecorder.start()
      setIsListening(true)
    } catch(e) {
      if (e.name === 'NotAllowedError') {
        alert('マイクへのアクセスを許可してください。\nブラウザの設定でマイクを許可してください。')
      } else {
        alert('マイクを開始できませんでした: ' + e.message)
      }
    }
  }

  const handleCam = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment'
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      setIsLoading(true); setResult('📷 画像を解析中...')
      try {
        const { b64, mimeType } = await resizeImage(file)
        const res = await fetch('/api/vision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData: b64, mimeType, tgtLang, tone })
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        if (!data.result?.trim()) { setResult('文字が検出できませんでした。'); return }
        setResult(data.result); setInputText('[📷 カメラ画像から読み取り]')
        const now = new Date()
        saveHistory([...history, { src: '[📷 カメラ画像]', tgt: data.result, srcLang: 'Camera', tgtLang: LANGS[tgtLang]?.src || tgtLang, tone, time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }].slice(-50))
      } catch(e) { setResult('エラー: ' + e.message) }
      finally { setIsLoading(false) }
    }
    input.click()
  }

  const c = {
    app: { maxWidth: 760, margin: '0 auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' },
    h1: { fontSize: 20, fontWeight: 600, color: '#1a1a1a', margin: 0 },
    headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
    userBadge: { fontSize: 12, color: '#666', background: isSubscribed ? '#e8f0fe' : '#f5f5f0', border: isSubscribed ? '1px solid #c5d5f8' : '1px solid #e0e0d8', borderRadius: 20, padding: '3px 10px' },
    navBtn: (primary) => ({ fontSize: 12, fontWeight: primary ? 600 : 400, padding: '5px 12px', borderRadius: 8, border: primary ? 'none' : '1px solid #e0e0d8', background: primary ? '#1a1a1a' : '#fff', color: primary ? '#fff' : '#555', cursor: 'pointer', fontFamily: 'inherit' }),
    usageBar: { background: '#fef9ec', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    upgradeMsg: { background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    langBar: { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e0e0d8', borderRadius: 12, padding: '10px 14px' },
    select: { flex: 1, fontSize: 14, fontWeight: 500, color: '#1a1a1a', background: '#f5f5f0', border: '1px solid #e0e0d8', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontFamily: 'inherit' },
    swapBtn: { width: 36, height: 36, borderRadius: '50%', border: '1px solid #d0d0c8', background: '#fff', cursor: 'pointer', fontSize: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    toneBar: { display: 'flex', gap: 6, flexWrap: 'wrap' },
    toneBtn: (active) => ({ fontSize: 12, padding: '5px 14px', borderRadius: 20, border: `1px solid ${active ? '#c5d5f8' : '#d0d0c8'}`, background: active ? '#e8f0fe' : '#fff', color: active ? '#1a56db' : '#555', cursor: 'pointer', fontWeight: active ? 600 : 400, fontFamily: 'inherit' }),
    card: { background: '#fff', border: '1px solid #e0e0d8', borderRadius: 12, overflow: 'hidden' },
    panelHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 6px' },
    panelLabel: { fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
    panelActions: { display: 'flex', gap: 6 },
    iconBtn: (active) => ({ width: 32, height: 32, borderRadius: 8, border: `1px solid ${active ? '#c5d5f8' : '#e0e0d8'}`, background: active ? '#e8f0fe' : 'transparent', cursor: 'pointer', fontSize: 15, color: active ? '#1a56db' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }),
    textarea: { width: '100%', border: 'none', outline: 'none', resize: 'none', fontSize: 16, fontFamily: 'inherit', color: '#1a1a1a', background: 'transparent', padding: '8px 14px 14px', minHeight: 130, lineHeight: 1.6, boxSizing: 'border-box' },
    resultArea: { padding: '8px 14px 14px', minHeight: 130, fontSize: 16, lineHeight: 1.6, color: '#1a1a1a', whiteSpace: 'pre-wrap', position: 'relative' },
    bottomBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px 10px', borderTop: '1px solid #f0f0e8' },
    charCount: { fontSize: 11, color: '#bbb' },
    translateBtn: (disabled) => ({ fontSize: 13, fontWeight: 600, padding: '8px 20px', borderRadius: 8, border: 'none', background: disabled ? '#ccc' : '#1a1a1a', color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }),
    banner: (color) => ({ background: color === 'blue' ? '#e8f0fe' : '#fef9ec', border: `1px solid ${color === 'blue' ? '#c5d5f8' : '#fde68a'}`, borderRadius: 10, padding: '8px 14px', fontSize: 13, color: color === 'blue' ? '#1a56db' : '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '0 14px 10px' }),
    stopBtn: { fontSize: 11, color: '#1a56db', background: 'none', border: '1px solid #c5d5f8', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 },
    dot: (delay) => ({ width: 8, height: 8, borderRadius: '50%', background: '#ccc', animation: 'bounce 1.2s infinite', animationDelay: delay }),
    toast: (show) => ({ position: 'absolute', right: 14, bottom: 10, fontSize: 12, background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: 8, opacity: show ? 1 : 0, transition: 'opacity 0.2s', pointerEvents: 'none' }),
    histSection: { background: '#fff', border: '1px solid #e0e0d8', borderRadius: 12, overflow: 'hidden' },
    histHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #f0f0e8' },
    histTitle: { fontSize: 13, fontWeight: 600, color: '#1a1a1a' },
    clearAllBtn: { fontSize: 11, color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '2px 6px', borderRadius: 6 },
    histEmpty: { padding: 20, fontSize: 13, color: '#bbb', textAlign: 'center' },
    histItem: { padding: '10px 14px', borderBottom: '1px solid #f0f0e8', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 8 },
    histSrc: { fontSize: 13, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    histTgt: { fontSize: 12, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 },
    histMeta: { fontSize: 11, color: '#bbb', marginTop: 2 },
    delBtn: { width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#bbb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'inherit' }
  }

  if (status === 'loading') return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: 14, color: '#666' }}>読み込み中...</div>

  return (
    <div style={c.app}>
      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}*{-webkit-tap-highlight-color:transparent;}`}</style>

      <div style={c.header}>
        <h1 style={c.h1}>NuanceTranslate</h1>
        <div style={c.headerRight}>
          {session ? (
            <>
              <span style={c.userBadge}>{isSubscribed ? '★ Pro' : '無料'}</span>
              {!isSubscribed && <button style={c.navBtn(true)} onClick={() => router.push('/pricing')}>アップグレード</button>}
              <button style={c.navBtn(false)} onClick={() => signOut({ callbackUrl: '/login' })}>ログアウト</button>
            </>
          ) : (
            <button style={c.navBtn(true)} onClick={() => router.push('/login')}>ログイン</button>
          )}
        </div>
      </div>

      {session && !isSubscribed && (
        <div style={c.usageBar}>
          <span>今日の翻訳回数：{usageCount} / 5回（無料枠）</span>
          <button style={{ fontSize: 11, color: '#92400e', background: 'none', border: '1px solid #f59e0b', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => router.push('/pricing')}>Proにする</button>
        </div>
      )}

      {showUpgradeMsg && (
        <div style={c.upgradeMsg}>
          <span>本日の無料枠（5回）を使い切りました</span>
          <button style={{ fontSize: 11, color: '#fff', background: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => router.push('/pricing')}>Proにアップグレード</button>
        </div>
      )}

      <div style={c.langBar}>
        <select style={c.select} value={srcLang} onChange={e => setSrcLang(e.target.value)}>
          <option value="ja">日本語</option>
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="ca">Català</option>
        </select>
        <button style={c.swapBtn} onClick={handleSwap}>⇄</button>
        <select style={c.select} value={tgtLang} onChange={e => setTgtLang(e.target.value)}>
          <option value="ja">日本語</option>
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="ca">Català</option>
        </select>
      </div>

      <div style={c.toneBar}>
        {Object.keys(TONES).map(t => (
          <button key={t} style={c.toneBtn(tone === t)} onClick={() => setTone(t)}>
            {TONES[t][srcLang] || TONES[t].en}
          </button>
        ))}
      </div>

      {isSameMode && (
        <div style={{ background: '#fef9ec', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: '#92400e' }}>
          💡 同じ言語モード：トーンを選んで「変換する」を押すとスタイル変換します
        </div>
      )}

      <div style={c.card}>
        <div style={c.panelHeader}>
          <span style={c.panelLabel}>{L.src}</span>
          <div style={c.panelActions}>
            <button style={c.iconBtn(isListening)} onClick={handleMic} title="音声入力（Whisper AI）">
              {isListening ? '⏹' : '🎙'}
            </button>
            <button style={c.iconBtn(false)} onClick={handleCam}>📷</button>
            <button style={c.iconBtn(false)} onClick={() => { setInputText(''); setResult('') }}>✕</button>
          </div>
        </div>

        {isListening && (
          <div style={c.banner('blue')}>
            <span style={{ animation: 'pulse 1.5s infinite' }}>🔴 録音中... 話し終わったら🎙をタップして停止</span>
            <button style={c.stopBtn} onClick={() => mediaRecorderRef.current?.stop()}>停止</button>
          </div>
        )}

        <textarea ref={textareaRef} style={c.textarea} placeholder={L.placeholder} value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) translate() }}
          onBlur={() => { if (showIOSHint) { setShowIOSHint(false); setIsListening(false) } }}
        />
        <div style={c.bottomBar}>
          <span style={c.charCount}>{inputText.length} {L.chars}</span>
          <button style={c.translateBtn(isLoading)} onClick={() => translate()} disabled={isLoading}>
            {isLoading ? '...' : isSameMode ? '変換する' : L.translate}
          </button>
        </div>
      </div>

      <div style={{ ...c.card, position: 'relative' }}>
        <div style={c.panelHeader}>
          <span style={c.panelLabel}>{L.result}</span>
          <div style={c.panelActions}>
            <button style={c.iconBtn(false)} onClick={handleCopy}>⎘</button>
            <button style={c.iconBtn(isFav)} onClick={() => setIsFav(!isFav)}>{isFav ? '★' : '☆'}</button>
          </div>
        </div>
        <div style={c.resultArea}>
          {isLoading
            ? <div style={{ display: 'flex', gap: 4, padding: '8px 0' }}><div style={c.dot('0s')}/><div style={c.dot('0.2s')}/><div style={c.dot('0.4s')}/></div>
            : result || <span style={{ color: '#bbb' }}>{L.result}</span>
          }
          <div style={c.toast(showToast)}>{L.copy}</div>
        </div>
      </div>

      <div style={c.histSection}>
        <div style={c.histHeader}>
          <span style={c.histTitle}>{L.history}</span>
          <button style={c.clearAllBtn} onClick={() => saveHistory([])}>{L.clearAll}</button>
        </div>
        {history.length === 0 ? (
          <div style={c.histEmpty}>{L.empty}</div>
        ) : [...history].reverse().map((item, idx) => {
          const realIdx = history.length - 1 - idx
          return (
            <div key={idx} style={{ ...c.histItem, borderBottom: idx < history.length - 1 ? '1px solid #f0f0e8' : 'none' }}
              onClick={() => { setInputText(item.src); setResult(item.tgt) }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={c.histSrc}>{item.src}</div>
                <div style={c.histTgt}>{item.tgt}</div>
                <div style={c.histMeta}>{item.srcLang} → {item.tgtLang} · {item.tone} · {item.time}</div>
              </div>
              <button style={c.delBtn} onClick={e => { e.stopPropagation(); const h = [...history]; h.splice(realIdx, 1); saveHistory(h) }}>✕</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
