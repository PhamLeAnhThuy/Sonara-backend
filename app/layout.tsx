import React from 'react';

export const metadata = {
  title: 'Sonara Backend',
  description: 'Next.js API for Sonara music delivery and playback metadata.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
