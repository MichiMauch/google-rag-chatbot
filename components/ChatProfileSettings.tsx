"use client";

import { useState, useEffect } from "react";
import { Save, X, Shield, Palette, FileText, Calendar, Globe } from "lucide-react";
import { themes } from "@/lib/themes";
import AllowedDomainsModal from "./AllowedDomainsModal";
import ContentUpdateManager from "./ContentUpdateManager";
import UpdateHistoryTable from "./UpdateHistoryTable";
import toast from "react-hot-toast";

interface ChatConfig {
  chatName: string;
  displayName: string;
  uploadType: "documents" | "website";
  themeId: string;
  fileSearchStoreName?: string;
  files: Array<{
    name: string;
    mimeType: string;
    uri: string;
    displayName?: string;
    url?: string;
    images?: string[];
  }>;
  sitemapUrls?: string[];
  allowedDomains?: string[];
  systemInstruction?: string;
  createdAt: number;
}

interface ChatProfileSettingsProps {
  chatName: string;
  initialConfig: ChatConfig;
  onConfigUpdate?: () => void;
}

export default function ChatProfileSettings({
  chatName,
  initialConfig,
  onConfigUpdate,
}: ChatProfileSettingsProps) {
  const [config, setConfig] = useState<ChatConfig>(initialConfig);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDomainsModal, setShowDomainsModal] = useState(false);

  // Reset config when initialConfig changes
  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/save-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatConfig: config,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Speichern");
      }

      toast.success("Einstellungen erfolgreich gespeichert");
      setIsEditing(false);
      if (onConfigUpdate) {
        onConfigUpdate();
      }
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.message || "Fehler beim Speichern der Einstellungen");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setConfig(initialConfig);
    setIsEditing(false);
  };

  const handleSaveAllowedDomains = (domains: string[]) => {
    setConfig({
      ...config,
      allowedDomains: domains,
    });
    setIsEditing(true);
  };

  return (
    <>
      <AllowedDomainsModal
        chatName={chatName}
        currentDomains={config.allowedDomains}
        isOpen={showDomainsModal}
        onClose={() => setShowDomainsModal(false)}
        onSave={handleSaveAllowedDomains}
      />

      <div className="space-y-8">
        {/* Basic Info Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Grundinformationen
          </h3>

          <div className="space-y-4">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anzeigename
              </label>
              <input
                type="text"
                value={config.displayName}
                onChange={(e) => {
                  setConfig({ ...config, displayName: e.target.value });
                  setIsEditing(true);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Mein Chat Bot"
              />
            </div>

            {/* Upload Type (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Typ
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                {config.uploadType === "documents" ? "📄 Dokumente" : "🌐 Website"}
              </div>
            </div>

            {/* Created At */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Erstellt am
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                {new Date(config.createdAt).toLocaleString("de-DE")}
              </div>
            </div>
          </div>
        </div>

        {/* Theme Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Palette className="w-5 h-5 mr-2" />
            Farbschema
          </h3>

          <div className="grid grid-cols-5 gap-3">
            {themes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  setConfig({ ...config, themeId: theme.id });
                  setIsEditing(true);
                }}
                className={`p-3 border-2 rounded-lg text-center transition-all ${
                  config.themeId === theme.id
                    ? "border-gray-900 shadow-md"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className="w-full h-8 rounded mb-2"
                  style={{ backgroundColor: theme.colors.primary }}
                />
                <div className="text-xs font-medium text-gray-900">{theme.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Configuration Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            Konfiguration
          </h3>

          <div className="space-y-4">
            {/* Allowed Domains */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Erlaubte Domains
              </label>
              <button
                onClick={() => setShowDomainsModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Shield className="w-4 h-4 mr-2" />
                Domains verwalten
                {config.allowedDomains && config.allowedDomains.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {config.allowedDomains.length}
                  </span>
                )}
              </button>
              {config.allowedDomains && config.allowedDomains.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  {config.allowedDomains.join(", ")}
                </div>
              )}
            </div>

            {/* System Instruction */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Instruction
              </label>
              <textarea
                value={config.systemInstruction || ""}
                onChange={(e) => {
                  setConfig({ ...config, systemInstruction: e.target.value });
                  setIsEditing(true);
                }}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optionale Anweisungen für den AI-Assistenten..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Diese Anweisung bestimmt das Verhalten und den Ton des Chat-Assistenten.
              </p>
            </div>
          </div>
        </div>

        {/* Content Updates Section (only for website chats) */}
        {config.uploadType === "website" && config.sitemapUrls && config.sitemapUrls.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Content Updates
            </h3>

            <div className="space-y-6">
              {config.sitemapUrls.map((sitemapUrl, index) => (
                <div key={index}>
                  <ContentUpdateManager
                    chatName={chatName}
                    sitemapUrl={sitemapUrl}
                  />
                </div>
              ))}

              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Update-Historie</h4>
                <UpdateHistoryTable chatName={chatName} limit={5} />
              </div>
            </div>
          </div>
        )}

        {/* Save/Cancel Buttons */}
        {isEditing && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-lg p-4 flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              <X className="w-4 h-4 mr-2" />
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Speichert..." : "Speichern"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
