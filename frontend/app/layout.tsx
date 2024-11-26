import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { FormProvider } from "@/lib/FormContext";
import { OnboardingLayout } from '@/components/parts/OnboardingLayout';
import { Providers } from './providers';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "yourdAI",
  description: "your personalised and automated to do list",
  icons: {
    icon: '/yourdai.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <FormProvider>
            <OnboardingLayout>
              {children}
            </OnboardingLayout>
          </FormProvider>
        </Providers>
      </body>
    </html>
  );
}