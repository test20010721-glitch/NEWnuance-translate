export const metadata = {
  title: 'NuanceTranslate',
  description: 'ニュアンス・感情・スラングを保った自然な翻訳アプリ',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, padding: 0, background: '#f5f5f0', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
