import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Baugesuchsassistent - Gemeinde Muhen",
  description: "KI-gestützter Assistent für Fragen rund um Baugesuche und Bauverwaltung der Gemeinde Muhen",
  icons: {
    icon: "/favicon.png",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
