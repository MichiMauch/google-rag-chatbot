"use client";

import { useState } from "react";
import { Shield, X, Save, Check } from "lucide-react";

interface AllowedDomainsModalProps {
  chatName: string;
  currentDomains: string[] | undefined;
  isOpen: boolean;
  onClose: () => void;
  onSave: (domains: string[]) => void;
}

export default function AllowedDomainsModal({
  chatName,
  currentDomains,
  isOpen,
  onClose,
  onSave,
}: AllowedDomainsModalProps) {
  const [domains, setDomains] = useState(
    currentDomains && currentDomains.length > 0 ? currentDomains.join(", ") : ""
  );
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  function handleSave() {
    const domainsArray = domains
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

    onSave(domainsArray);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1500);
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Erlaubte Domains</h2>
              <p className="text-sm text-gray-500">Domain-Whitelist für {chatName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Status */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">📊 Aktueller Status</h3>
            <p className="text-sm text-gray-600">
              {currentDomains && currentDomains.length > 0 ? (
                <>
                  <span className="font-medium text-gray-900">
                    {currentDomains.length} Domain(s) erlaubt:
                  </span>
                  <br />
                  {currentDomains.map((domain, i) => (
                    <span key={i} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2 mt-2">
                      {domain}
                    </span>
                  ))}
                </>
              ) : (
                <span className="text-amber-600 font-medium">⚠️ Keine Einschränkungen - Chat ist öffentlich zugänglich</span>
              )}
            </p>
          </div>

          {/* Domain Input */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Erlaubte Domains (kommagetrennt)
            </label>
            <textarea
              value={domains}
              onChange={(e) => setDomains(e.target.value)}
              placeholder="example.com, subdomain.example.com, *.example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              rows={4}
            />
            <p className="text-xs text-gray-500">
              Mehrere Domains mit Komma trennen. Wildcards werden unterstützt (z.B. *.example.com).
              Leer lassen für öffentlichen Zugriff.
            </p>
          </div>

          {/* Examples */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Beispiele</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <div>
                <code className="bg-blue-100 px-2 py-1 rounded">example.com</code>
                <span className="ml-2">- Nur example.com</span>
              </div>
              <div>
                <code className="bg-blue-100 px-2 py-1 rounded">*.example.com</code>
                <span className="ml-2">- Alle Subdomains von example.com</span>
              </div>
              <div>
                <code className="bg-blue-100 px-2 py-1 rounded">example.com, test.com</code>
                <span className="ml-2">- Mehrere Domains</span>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-semibold text-amber-900 mb-2">⚠️ Wichtig</h3>
            <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
              <li>Keine Protokolle (http://, https://) angeben</li>
              <li>Keine Schrägstriche am Ende</li>
              <li>Wildcards nur am Anfang (*.example.com)</li>
              <li>Localhost wird für Tests immer erlaubt</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={saved}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-green-500 text-white font-medium rounded-lg transition-colors"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Gespeichert!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Speichern</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
