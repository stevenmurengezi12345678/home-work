import './globals.css'

export const metadata = {
  title: 'Money Tracker - Admin Dashboard',
  description: 'Track daily money and power usage across multiple places',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}