import './globals.css'
import { Montserrat } from 'next/font/google'

const montserrat = Montserrat({ subsets: ['latin'], weight: ['300', '400', '700', '900'] })

export const metadata = {
  title: 'Todde Bus Hub',
  description: 'Gestione Presenze e Permessi',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body className={montserrat.className}>{children}</body>
    </html>
  )
}