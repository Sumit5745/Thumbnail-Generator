import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Provider } from 'jotai';
import { Toaster } from 'sonner';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Thumbnail Generator - Create Beautiful Thumbnails",
  description: "Generate high-quality thumbnails from your images and videos with real-time processing updates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head suppressHydrationWarning />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Provider>
          <div suppressHydrationWarning>
            {children}
          </div>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: 'rgba(30, 41, 59, 0.95)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
              },
              className: 'dark-theme-toast',
            }}
          />
        </Provider>
      </body>
    </html>
  );
}
