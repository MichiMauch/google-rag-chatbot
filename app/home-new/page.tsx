"use client";

import { Bot, FileText } from "lucide-react";
import Link from "next/link";
import WizardForm from "@/components/WizardForm";

export default function HomeNewPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/home-new" className="flex items-center space-x-2 group">
              <div className="relative">
                <FileText className="w-8 h-8 text-digitaltag-navy" />
                <Bot className="w-4 h-4 text-digitaltag-violet absolute -bottom-0.5 -right-0.5" />
              </div>
              <span className="text-lg font-bold text-digitaltag-navy">NETNODE.AI</span>
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:inline">Digitaltag Zentralschweiz 2025</span>
              <Link
                href="/admin"
                className="text-sm font-medium text-digitaltag-navy hover:text-digitaltag-violet"
              >
                Admin
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Split Screen */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Minimal Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-digitaltag-navy/5 border border-digitaltag-navy/10 text-sm text-digitaltag-navy mb-4">
            <span className="w-2 h-2 bg-digitaltag-violet rounded-full mr-2 animate-pulse"></span>
            Live Demo
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-digitaltag-navy mb-4">
            KI-Chat in 2 Minuten
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Erstelle deinen eigenen KI-Chatbot für Dokumente oder Websites
          </p>
        </div>

        {/* Split Screen Layout */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left: Form Wizard */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 lg:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-digitaltag-navy mb-2">Chat konfigurieren</h2>
                <p className="text-gray-600">In wenigen Schritten zu deinem eigenen KI-Chat</p>
              </div>
              <WizardForm />
            </div>
          </div>

          {/* Right: Live Preview Mockup */}
          <div className="lg:sticky lg:top-24 space-y-4">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <div className="flex-1 h-8 bg-gray-100 rounded-lg ml-4 flex items-center px-3">
                  <span className="text-xs text-gray-400">https://your-chat.example.com</span>
                </div>
              </div>

              {/* Browser Content Mockup */}
              <div className="bg-gradient-to-br from-digitaltag-navy/5 to-digitaltag-violet/5 rounded-xl p-8 min-h-[500px] flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-digitaltag-navy/10 rounded-2xl flex items-center justify-center mb-6">
                  <Bot className="w-10 h-10 text-digitaltag-navy" />
                </div>
                <h3 className="text-xl font-bold text-digitaltag-navy mb-2">Dein Chat erscheint hier</h3>
                <p className="text-gray-600 text-center max-w-sm">
                  Sobald du das Formular ausfüllst, siehst du hier eine Vorschau deines Chatbots
                </p>

                {/* Mock Chat Bubbles */}
                <div className="mt-8 w-full max-w-md space-y-3">
                  <div className="bg-white rounded-2xl rounded-bl-sm p-4 shadow-sm">
                    <p className="text-sm text-gray-700">Hallo! Wie kann ich dir helfen?</p>
                  </div>
                  <div className="bg-digitaltag-navy text-white rounded-2xl rounded-br-sm p-4 shadow-sm ml-auto max-w-[80%]">
                    <p className="text-sm">Was kann dieser Chat?</p>
                  </div>
                  <div className="bg-white rounded-2xl rounded-bl-sm p-4 shadow-sm">
                    <p className="text-sm text-gray-700">Ich kann deine Dokumente analysieren und Fragen beantworten!</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-digitaltag-violet/5 border border-digitaltag-violet/20 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-digitaltag-violet/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-digitaltag-violet" />
                </div>
                <div>
                  <h4 className="font-semibold text-digitaltag-navy mb-1">Powered by Google Gemini</h4>
                  <p className="text-sm text-gray-600">Modernste KI-Technologie für präzise Antworten aus deinen Dokumenten</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
