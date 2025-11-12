import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Google RAG Chatbot",
  description: "RAG Chatbot mit Google Gemini File Search API",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
