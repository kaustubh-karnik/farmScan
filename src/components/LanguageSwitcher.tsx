'use client';

import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { Languages } from 'lucide-react';

type Locale = 'en' | 'hi' | 'mr';

const languages: { code: Locale; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'EN' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिं' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मर' },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex gap-0.5 items-center bg-white/10 backdrop-blur-sm rounded-lg p-0.5">
      {languages.map(({ code, label, nativeLabel }) => (
        <button
          key={code}
          onClick={() => setLocale(code)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
            locale === code
              ? 'bg-white/20 text-white shadow-sm'
              : 'text-white/70 hover:text-white'
          }`}
          aria-label={`Switch to ${label}`}
          aria-pressed={locale === code}
        >
          {nativeLabel}
        </button>
      ))}
    </div>
  );
}
