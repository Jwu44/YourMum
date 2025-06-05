import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from '@/auth/AuthContext';
import { RouteGuard } from '@/auth/RouteGuard';
import { FormProvider } from "@/lib/FormContext";

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
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <FormProvider>
            <RouteGuard>
                {children}
            </RouteGuard>
          </FormProvider>
        </AuthProvider>
      </body>
    </html>
  );
}