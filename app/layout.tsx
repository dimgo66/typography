import './globals.css'

export const metadata = {
  title: 'Типографский процессор',
  description: 'Обработка русского текста по правилам типографики',
  keywords: 'типографика, обработка текста, русский текст, docx, word, поэзия, неразрывные пробелы, тире, онлайн, Дмитрий Горяченков',
  url: 'https://typography.vercel.app/',
  image: '/favicon.svg',
  author: 'Дмитрий Горяченков',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <meta name="keywords" content={metadata.keywords} />
        <meta name="author" content={metadata.author} />
        <meta name="robots" content="index, follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={metadata.url} />
        {/* Open Graph */}
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={metadata.url} />
        <meta property="og:image" content={metadata.image} />
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metadata.title} />
        <meta name="twitter:description" content={metadata.description} />
        <meta name="twitter:image" content={metadata.image} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}