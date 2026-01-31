import '../styles/globals.css'



export const metadata = { title: 'ai2business dashboard' }

export default function RootLayout({ children }: { children: React.ReactNode }){
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
