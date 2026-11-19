import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-jakarta',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'SkillGraph AI — Career Intelligence & Skill Gap Roadmap Engine',
  description:
    'AI-Powered Skill Gap Analysis & Career Roadmap Engine for students, graduates, and software engineers.',
  openGraph: {
    title: 'SkillGraph AI — Career Intelligence & Skill Gap Roadmap Engine',
    description:
      'AI-powered career intelligence that transforms your current skills into a personalized roadmap for your dream role.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SkillGraph AI',
    description:
      'AI-powered career intelligence that transforms your current skills into a personalized roadmap for your dream role.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${dmSans.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
