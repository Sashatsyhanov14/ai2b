import '../styles/globals.css'



export const metadata = { title: 'ai2business dashboard' }

export default function RootLayout({ children }: { children: React.ReactNode }){
  return (
    <html lang="ru">
      <head>
        <meta charSet="UTF-8" />
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
