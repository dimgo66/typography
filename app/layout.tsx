import './globals.css'

export const metadata = {
  title: 'Типографский процессор',
  description: 'Обработка русского текста по правилам типографики',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}