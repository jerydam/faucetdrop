import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Footer from "@/components/Footer";
import SplashScreen from "@/components/SplashScreen";
import AnimatedBackground from "@/components/AnimatedBackground";
import FloatingElements from "@/components/FloatingElements";
import ChatBot from '@/components/landingPage/ChatBot';
import ConditionalHeader from "@/components/ConditionalHeader";

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'FaucetDrops - Automated Onchain Reward and Engagement Platform',
    template: '%s | FaucetDrops'
  },
  description: 'Automated onchain reward and engagement platform 💧. Quest, Quiz, and distribute tokens effortlessly across multiple chains.',
  keywords: ['token drops', 'crypto faucet', 'onchain rewards', 'web3 engagement', 'token distribution', 'blockchain rewards', 'quests', 'quizzes'],
  authors: [{ name: 'FaucetDrops' }],
  metadataBase: new URL('https://faucetdrops.io'),
  alternates: {
    canonical: '/',
  },
  
  openGraph: {
    type: 'website',
    url: 'https://faucetdrops.io/',
    siteName: 'FaucetDrops',
    title: 'FaucetDrops - Automated Onchain Reward and Engagement Platform',
    description: 'Automated onchain reward and engagement platform 💧. Distribute tokens and drive growth through Quests and Quizzes.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'FaucetDrops - Automated onchain reward and engagement platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FaucetDrops - Automated Onchain Reward and Engagement Platform',
    description: 'Automated onchain reward and engagement platform 💧. Distribute tokens and drive growth through Quests and Quizzes.',
    images: ['/opengraph-image'],
  },
  themeColor: '#020817',
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
      <meta name="talentapp:project_verification" content="b30a81da8fe68c308c2b4978535103484c8acb90b729ec9625b7eff07309c1fb86809ee621e63c5eedc5c592ddde2c2d2c2c0e8afa73980dcf6339e92b0839d7"></meta>
      </head>
      <body className={`${inter.className} antialiased relative`}>
          <AnimatedBackground />
          <FloatingElements />
          <div className="relative z-20">
            <SplashScreen />
            <ConditionalHeader /> 
            {children}
            <ChatBot /> 
            <Footer />
          </div>
      </body>
    </html>
  )
}