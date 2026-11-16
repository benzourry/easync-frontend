import { Service, computed, signal } from '@angular/core';
import { MESSAGES } from '../i18n/messages';
import type { Language, MessageKey } from '../i18n/messages';

const STORAGE_KEY = 'easync.language';
const DEFAULT_LANGUAGE: Language = 'en';

function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'bm';
}

function readStoredLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

/** Resolves user-visible strings for the selected interface language. */
@Service()
export class TranslationService {
  private readonly current = signal<Language>(readStoredLanguage());

  readonly language = this.current.asReadonly();

  private readonly dictionary = computed(() => MESSAGES[this.current()]);

  constructor() {
    document.documentElement.setAttribute('lang', this.current() === 'bm' ? 'ms' : 'en');
  }

  /** Translates a key. Reads a signal, so templates update when the language changes. */
  t(key: MessageKey, params?: Record<string, string | number>): string {
    const message = this.dictionary()[key];
    if (!params) return message;
    return message.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
  }

  setLanguage(language: Language): void {
    this.current.set(language);
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // A blocked storage API must not stop the user from switching language.
    }
    document.documentElement.setAttribute('lang', language === 'bm' ? 'ms' : 'en');
  }

  toggle(): void {
    this.setLanguage(this.current() === 'en' ? 'bm' : 'en');
  }
}
