'use client';

import Link from "next/link";
import { Sun, Droplets, Wind } from "lucide-react";
import { useState } from "react";
import { DiseaseScanner } from "@/components/DiseaseScanner";
import { useI18n } from "@/contexts/I18nContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface ScanResult {
  disease: string;
  confidence: number;
  treatment: string;
  severity: 'low' | 'medium' | 'high';
}

export default function Home() {
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const { t } = useI18n();

  const handleScanResult = (result: ScanResult) => {
    setScanResult(result);
    setShowScanner(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-4 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <span className="text-2xl">🌾</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">{t("dashboard.title", "FarmScan")}</h1>
              <p className="text-xs sm:text-sm text-emerald-100">
                {t("dashboard.subtitle", "Precision farming for every farmer")}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Weather Widget */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <Sun className="w-8 h-8 text-yellow-500 stroke-[1.5]" strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-4xl font-bold">32°C</div>
                <p className="text-gray-600 text-sm">Pune, Maharashtra</p>
              </div>
            </div>
            <div className="space-y-2 text-right">
              <div className="flex items-center gap-2 text-sm">
                <Droplets className="w-4 h-4 text-blue-500 stroke-[2]" strokeWidth={2} />
                <span className="text-gray-700">60%</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Wind className="w-4 h-4 text-gray-500 stroke-[1.5]" strokeWidth={1.5} />
                <span className="text-gray-700">12km/h</span>
              </div>
            </div>
          </div>
        </div>

        {/* Choose Service Section */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {t("dashboard.chooseService", "Choose Service")}
          </h2>
          
          {/* Scan Leaf - Offline Service */}
          <div 
            onClick={() => setShowScanner(true)}
            className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 mb-4 cursor-pointer hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-3xl">
                  📷
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {t("dashboard.scanLeaf", "Scan Leaf")}
                  </h3>
                  <p className="text-emerald-100 text-sm">
                    {t("dashboard.scanLeafDesc", "Scan crop leaf")}
                  </p>
                </div>
              </div>
              <div className="bg-emerald-800 bg-opacity-50 px-3 py-1 rounded-full">
                  <span className="text-white text-xs font-semibold flex items-center gap-1">
                    ⚡ {t("dashboard.offline", "Offline")}
                  </span>
              </div>
            </div>
            <p className="text-emerald-50 text-sm">
              {t(
                "dashboard.scanLeafDesc",
                "Instant AI disease detection • Works without internet"
              )}
            </p>
          </div>

          {/* Scan Field - Online Service */}
          <Link href="/fields">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 cursor-pointer hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-3xl">
                    🛰️
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {t("dashboard.scanField", "Scan Field")}
                    </h3>
                    <p className="text-orange-100 text-sm">
                      {t("dashboard.scanFieldSubtitle", "Scan your field from satellite")}
                    </p>
                  </div>
                </div>
                <div className="bg-orange-700 bg-opacity-50 px-3 py-1 rounded-full">
                  <span className="text-white text-xs font-semibold flex items-center gap-1">
                    🌐 {t("dashboard.online", "Online")}
                  </span>
                </div>
              </div>
              <p className="text-orange-50 text-sm">
                {t(
                  "dashboard.scanFieldDesc",
                  "Satellite analysis • Real-time heatmap"
                )}
              </p>
            </div>
          </Link>
        </div>

        {/* Result Card if scan was done */}
        {scanResult && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl">⚠️</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-800">Disease Detected</h3>
                <p className="text-sm text-gray-600">रोगाचा शोध लागला</p>
              </div>
              <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                {scanResult.confidence}%
              </div>
            </div>
            
            <div className="bg-red-50 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🍅</span>
                <span className="font-bold text-gray-800">{scanResult.disease}</span>
              </div>
              <p className="text-sm text-gray-600">
                {scanResult.disease === "Early Blight" && 
                  "Common tomato disease caused by fungus. Appears as dark spots on older leaves."}
              </p>
            </div>

            <button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
              <span>🔊</span>
              Play Treatment Advice
              <span className="text-sm text-orange-100">उपचार सल्ला ऐका</span>
            </button>

            <div className="flex gap-3 mt-3">
              <button className="flex-1 py-2 text-gray-700 font-medium text-sm">
                Save Result
              </button>
              <button 
                onClick={() => setShowScanner(true)}
                className="flex-1 py-2 text-emerald-600 font-medium text-sm"
              >
                Scan Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 max-w-md mx-auto">
        <div className="flex justify-around items-center">
          <button className="flex flex-col items-center gap-1 text-emerald-600">
            <span className="text-2xl">🏠</span>
            <span className="text-xs font-medium">
              {t("navigation.home", "Home")}
            </span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400">
            <span className="text-2xl">📊</span>
            <span className="text-xs font-medium">
              {t("navigation.history", "History")}
            </span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400">
            <span className="text-2xl">⚙️</span>
            <span className="text-xs font-medium">
              {t("navigation.settings", "Settings")}
            </span>
          </button>
        </div>
      </div>

      {/* Disease Scanner Modal */}
      {showScanner && (
        <DiseaseScanner
          onResult={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
