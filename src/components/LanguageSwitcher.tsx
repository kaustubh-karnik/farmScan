'use client';

import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { Globe } from 'lucide-react';

type Locale = 'en' | 'hi' | 'mr';

const languages: { code: Locale; label: string }[] = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'hi', label: '🇮🇳 हिन्दी' },
  { code: 'mr', label: '🇮🇳 मराठी' },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex gap-2 items-center">
      {languages.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setLocale(code)}
          className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
            locale === code
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
