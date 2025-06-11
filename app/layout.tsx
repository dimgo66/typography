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
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}