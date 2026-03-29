'use client'
import { useState, useEffect, useRef } from 'react'

const LANGS = {
  ja: { src: '原文', result: '翻訳結果', placeholder: '翻訳したいテキストを入力...', history: '翻訳履歴', translate: '翻訳する', chars: '文字', empty: '履歴はまだありません', clearAll: 'すべて削除', copy: 'コピーしました', iosmic: 'キーボードの🎤で話してください', tapStop: 'タップして停止', listening: '🎙 聞いています...' },
  en: { src: 'Source', result: 'Translation', placeholder: 'Enter text to translate...', history: 'History', translate: 'Translate', chars: 'chars', empty: 'No history yet', clearAll: 'Clear all', copy: 'Copied!', iosmic: 'Tap 🎤 on keyboard to speak', tapStop: 'Tap to stop', listening: '🎙 Listening...' },
  es: { src: 'Texto original', result: 'Traducción', placeholder: 'Escribe el texto a traducir...', history: 'Historial', translate: 'Traducir', chars: 'caracteres', empty: 'Sin historial', clearAll: 'Borrar todo', copy: '¡Copiado!', iosmic: 'Usa 🎤 del teclado', tapStop: 'Toca para detener', listening: '🎙 Escuchando...' },
  ca: { src: 'Text original', result: 'Traducció', placeholder: 'Escriu el text a traduir...', history: 'Historial', translate: 'Traduir', chars: 'caràcters', empty: 'Sense historial', clearAll: 'Esborrar tot', copy: 'Copiat!', iosmic: 'Usa 🎤 del teclat', tapStop: 'Toca per aturar', listening: '🎙 Escoltant...' }
}

const TONES = {
  casual:   { ja:'カジュアル', en:'Casual',   es:'Casual',  ca:'Informal' },
  business: { ja:'ビジネス',   en:'Business', es:'Negocio', ca:'Negoci' },
  polite:   { ja:'丁寧',       en:'Polite',   es:'Educado', ca:'Educat' },
  email:    { ja:'メール用',   en:'Email',    es:'Correo',  ca:'Correu' },
  menu:     { ja:'メニュー',   en:'Menu',     es:'Menú',    ca:'Menú' }
}

const s = {
  app: { maxWidth: 760, margin: '0 auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  header: { textAlign: 'center', padding: '16px 0 8px' },
  h1: { fontSize: 26, fontWeight: 600, color: '#1a1a1a', letterSpacing: -0.5, margin: 0 },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  card: { background: '#fff', border: '1px solid #e0e0d8', borderRadius: 12, overflow: 'hidden' },
  langBar: { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e0e0d8', borderRadius: 12, padding: '10px 14px' },
  select: { flex: 1, fontSize: 14, fontWeight: 500, color: '#1a1a1a', background: '#f5f5f0', border: '1px solid #e0e0d8', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontFamily: 'inherit' },
  swapBtn: { width: 36, height: 36, borderRadius: '50%', border: '1px solid #d0d0c8', background: '#fff', cursor: 'pointer', fontSize: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  toneBar: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  toneBtn: (active) => ({ fontSize: 12, padding: '5px 14px', borderRadius: 20, border: `1px solid ${active ? '#c5d5f8' : '#d0d0c8'}`, background: active ? '#e8f0fe' : '#fff', color: active ? '#1a56db' : '#555', cursor: 'pointer', fontWeight: active ? 600 : 400, fontFamily: 'inherit' }),
  panelHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 6px' },
  panelLabel: { fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
  panelActions: { display: 'flex', gap: 6 },
  iconBtn: (active) => ({ width: 32, height: 32, borderRadius: 8, border: `1px solid ${active ? '#c5d5f8' : '#e0e0d8'}`, background: active ? '#e8f0fe' : 'transparent', cursor: 'pointer', fontSize: 15, color: active ? '#1a56db' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }),
  textarea: { width: '100%', border: 'none', outline: 'none', resize: 'none', fontSize: 16, fontFamily: 'inherit', color: '#1a1a1a', background: 'transparent', padding: '8px 14px 14px', minHeight: 130, lineHeight: 1.6, boxSizing: 'border-box' },
  resultArea: { padding: '8px 14px 14px', minHeight: 130, fontSize: 16, lineHeight: 1.6, color: '#1a1a1a', whiteSpace: 'pre-wrap', position: 'relative' },
  bottomBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px 10px', borderTop: '1px solid #f0f0e8' },
  charCount: { fontSize: 11, color: '#bbb' },
  translateBtn: (disabled) => ({ fontSize: 13, fontWeight: 600, padding: '8px 20px', borderRadius: 8, border: 'none', background: disabled ? '#ccc' : '#1a1a1a', color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }),
  histSection: { background: '#fff', border: '1px solid #e0e0d8', borderRadius: 12, overflow: 'hidden' },
  histHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #f0f0e8' },
  histTitle: { fontSize: 13, fontWeight: 600, color: '#1a1a1a' },
  clearAllBtn: { fontSize: 11, color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '2px 6px', borderRadius: 6 },
  histEmpty: { padding: 20, fontSize: 13, color: '#bbb', textAlign: 'center' },
  histItem: { padding: '10px 14px', borderBottom: '1px solid #f0f0e8', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 8 },
  histSrc: { fontSize: 13, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  histTgt: { fontSize: 12, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 },
  histMeta: { fontSize: 11, color: '#bbb', marginTop: 2 },
  delBtn: { width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#bbb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'inherit' },
  banner: (color) => ({ background: color === 'blue' ? '#e8f0fe' : '#fef9ec', border: `1px solid ${color === 'blue' ? '#c5d5f8' : '#fde68a'}`, borderRadius: 10, padding: '8px 14px', fontSize: 13, color: color === 'blue' ? '#1a56db' : '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }),
  stopBtn: { fontSize: 11, color: '#1a56db', background: 'none', border: '1px solid #c5d5f8', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 },
  dot: (delay) => ({ width: 8, height: 8, borderRadius: '50%', background: '#ccc', animation: 'bounce 1.2s infinite', animationDelay: delay }),
  toast: (show) => ({ position: 'absolute', right: 14, bottom: 10, fontSize: 12, background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: 8, opacity: show ? 1 : 0, transition: 'opacity 0.2s', pointerEvents: 'none' })
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
  const recognitionRef = useRef(null)
  const textareaRef = useRef(null)
  const prevInputRef = useRef('')
  const L = LANGS[srcLang] || LANGS.en
  const isSameMode = srcLang === tgtLang

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem('nuance_history') || '[]')) } catch(e) {}
  }, [])

  // iOSモードのとき、テキストが変わったら自動翻訳
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
    setIsLoading(true); setResult('')
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t, srcLang, tgtLang, tone })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data.result)
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

  const handleMic = () => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition

    if (isIOS) {
      // iOSはキーボードの🎤ボタンを使う方式
      prevInputRef.current = inputText
      setShowIOSHint(true)
      setIsListening(true)
      textareaRef.current?.focus()
      // 10秒後に案内を自動非表示
      setTimeout(() => { setShowIOSHint(false); setIsListening(false) }, 10000)
      return
    }

    if (!SR) {
      alert('このブラウザは音声入力に対応していません。Chromeをお使いください。')
      return
    }

    // PC / Android Chrome
    if (isListening) { recognitionRef.current?.stop(); return }

    const rec = new SR()
    recognitionRef.current = rec
    rec.continuous = false
    rec.interimResults = false
    rec.lang = srcLang === 'ja' ? 'ja-JP' : srcLang === 'es' ? 'es-ES' : srcLang === 'ca' ? 'ca-ES' : 'en-US'
    rec.onstart = () => setIsListening(true)
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('')
      setInputText(transcript)
      translate(transcript)
    }
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') alert('マイクへのアクセスを許可してください。')
      setIsListening(false)
    }
    rec.onend = () => setIsListening(false)
    try { rec.start() } catch(e) { setIsListening(false) }
  }

  const stopListening = () => {
    setIsListening(false)
    setShowIOSHint(false)
    recognitionRef.current?.stop()
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
        if (!data.result?.trim()) { setResult('文字が検出できませんでした。文字がはっきり写った画像をお試しください。'); return }
        setResult(data.result)
        setInputText('[📷 カメラ画像から読み取り]')
        const now = new Date()
        saveHistory([...history, {
          src: '[📷 カメラ画像]', tgt: data.result,
          srcLang: 'Camera', tgtLang: LANGS[tgtLang]?.src || tgtLang,
          tone, time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }].slice(-50))
      } catch(e) { setResult('エラー: ' + (e.message || '画像の処理に失敗しました')) }
      finally { setIsLoading(false) }
    }
    input.click()
  }

  return (
    <div style={s.app}>
      <style>{`
        @keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        *{-webkit-tap-highlight-color:transparent;}
      `}</style>

      <div style={s.header}>
        <h1 style={s.h1}>NuanceTranslate</h1>
        <p style={s.subtitle}>ニュアンス・感情・スラングを保った自然な翻訳</p>
      </div>

      <div style={s.langBar}>
        <select style={s.select} value={srcLang} onChange={e => setSrcLang(e.target.value)}>
          <option value="ja">日本語</option>
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="ca">Català</option>
        </select>
        <button style={s.swapBtn} onClick={handleSwap}>⇄</button>
        <select style={s.select} value={tgtLang} onChange={e => setTgtLang(e.target.value)}>
          <option value="ja">日本語</option>
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="ca">Català</option>
        </select>
      </div>

      <div style={s.toneBar}>
        {Object.keys(TONES).map(t => (
          <button key={t} style={s.toneBtn(tone === t)} onClick={() => setTone(t)}>
            {TONES[t][srcLang] || TONES[t].en}
          </button>
        ))}
      </div>

      {isSameMode && (
        <div style={s.banner('yellow')}>
          💡 同じ言語モード：トーンを選んで「変換する」を押すとスタイル変換します（メール文作成・メニュー説明など）
        </div>
      )}

      <div style={s.card}>
        <div style={s.panelHeader}>
          <span style={s.panelLabel}>{L.src}</span>
          <div style={s.panelActions}>
            <button style={s.iconBtn(isListening)} onClick={handleMic} title="音声入力">
              {isListening ? '⏹' : '🎙'}
            </button>
            <button style={s.iconBtn(false)} onClick={handleCam} title="カメラ">📷</button>
            <button style={s.iconBtn(false)} onClick={() => { setInputText(''); setResult('') }}>✕</button>
          </div>
        </div>

        {/* iOSの音声入力案内 */}
        {showIOSHint && (
          <div style={{ ...s.banner('blue'), margin: '0 14px 10px', animation: 'pulse 2s infinite' }}>
            <span style={{ fontSize: 13 }}>キーボード右下の 🎤 をタップして話してください</span>
            <button style={s.stopBtn} onClick={stopListening}>閉じる</button>
          </div>
        )}

        {/* PC/Android の音声入力中表示 */}
        {isListening && !showIOSHint && (
          <div style={{ ...s.banner('blue'), margin: '0 14px 10px' }}>
            <span style={{ fontSize: 13, animation: 'pulse 1.5s infinite' }}>{L.listening}</span>
            <button style={s.stopBtn} onClick={stopListening}>{L.tapStop}</button>
          </div>
        )}

        <textarea
          ref={textareaRef}
          style={s.textarea}
          placeholder={L.placeholder}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) translate() }}
          onBlur={() => { if (showIOSHint) { setShowIOSHint(false); setIsListening(false) } }}
        />
        <div style={s.bottomBar}>
          <span style={s.charCount}>{inputText.length} {L.chars}</span>
          <button style={s.translateBtn(isLoading)} onClick={() => translate()} disabled={isLoading}>
            {isLoading ? '...' : isSameMode ? '変換する' : L.translate}
          </button>
        </div>
      </div>

      <div style={{ ...s.card, position: 'relative' }}>
        <div style={s.panelHeader}>
          <span style={s.panelLabel}>{L.result}</span>
          <div style={s.panelActions}>
            <button style={s.iconBtn(false)} onClick={handleCopy}>⎘</button>
            <button style={s.iconBtn(isFav)} onClick={() => setIsFav(!isFav)}>{isFav ? '★' : '☆'}</button>
          </div>
        </div>
        <div style={s.resultArea}>
          {isLoading
            ? <div style={{ display: 'flex', gap: 4, padding: '8px 0' }}><div style={s.dot('0s')}/><div style={s.dot('0.2s')}/><div style={s.dot('0.4s')}/></div>
            : result || <span style={{ color: '#bbb' }}>{L.result}</span>
          }
          <div style={s.toast(showToast)}>{L.copy}</div>
        </div>
      </div>

      <div style={s.histSection}>
        <div style={s.histHeader}>
          <span style={s.histTitle}>{L.history}</span>
          <button style={s.clearAllBtn} onClick={() => saveHistory([])}>{L.clearAll}</button>
        </div>
        {history.length === 0 ? (
          <div style={s.histEmpty}>{L.empty}</div>
        ) : [...history].reverse().map((item, idx) => {
          const realIdx = history.length - 1 - idx
          return (
            <div key={idx} style={{ ...s.histItem, borderBottom: idx < history.length - 1 ? '1px solid #f0f0e8' : 'none' }}
              onClick={() => { setInputText(item.src); setResult(item.tgt) }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.histSrc}>{item.src}</div>
                <div style={s.histTgt}>{item.tgt}</div>
                <div style={s.histMeta}>{item.srcLang} → {item.tgtLang} · {item.tone} · {item.time}</div>
              </div>
              <button style={s.delBtn} onClick={e => { e.stopPropagation(); const h = [...history]; h.splice(realIdx, 1); saveHistory(h) }}>✕</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
