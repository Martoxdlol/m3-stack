export type I18n<K extends string, L extends string, D extends L> = {
    get: (key: K, lang: L) => string
    withLang: (lang: L) => I18nWithLang<K, L, D>
    defaultLanguage: D
    supportedLanguages: L[]
    matchLang: (lang: string | undefined | null) => L
}

export type I18nWithLang<K extends string, L extends string, D extends L> = {
    get: (key: K) => string
    currentLanguage: L
    setLang: (lang: L) => void
    withLang: (lang: L) => I18nWithLang<K, L, D>
    defaultLanguage: D
    supportedLanguages: L[]
    matchLang: (lang: string | undefined | null) => L
}

export function parseAcceptLanguage(acceptLanguage: string): string[] {
    return acceptLanguage
        .split(',')
        .map((str) => {
            const [lang] = str.split(';')
            return lang?.trim()
        })
        .filter(Boolean)
        .map((str) => str!)
}

export function matchLocale<L extends string>(languages: L[], locale: string): L | null {
    const [lang, region] = locale.split('-')
    if (!lang) {
        return null
    }

    if (region) {
        for (const l of languages) {
            if (l.toLowerCase() === locale.toLowerCase()) {
                return l
            }
        }
    }

    for (const l of languages) {
        if (l.toLowerCase() === lang.toLowerCase()) {
            return l
        }
    }

    return null
}

/**
 * It can match locales for example:
 * input = 'en-US', ['en', 'es'] => 'en'
 * input = 'es-ES', ['en', 'es', 'es-ES] => 'es-ES'
 * input = 'es-ES', ['en', 'es'] => 'es'
 *
 * It can match 'Accept-Language' header:
 * input = 'en-US,es-ES', ['en', 'es'] => 'en'
 * input = 'es-AR,es;q=0.9,en;q=0.8', ['en', 'es'] => 'es'
 */
export function matchLang<L extends string>(langs: L[], acceptLanguage: string, fallback: L): L {
    const inputLangs = parseAcceptLanguage(acceptLanguage)

    for (const inputLang of inputLangs) {
        const lang = matchLocale(langs, inputLang)
        if (lang) {
            return lang
        }
    }

    return fallback
}

/**
 * ```ts
 * const strings = createI18n({
 *   defaultLanguage: 'en',
 *   defaultStrings: {
 *     hello: 'Hello',
 *   },
 *   supportedLanguages: ['en', 'es'] as const,
 *   strings: {
 *     es: {
 *       hello: 'Hola',
 *     },
 *   }
 * })
 *
 * strings.get('hello', 'en')
 * ```
 */
export function createI18n<
    DefaultLang extends string,
    SupportedLangs extends string[],
    DefaultLangStrings extends Record<string, string>,
    AllStrings extends Partial<Record<SupportedLangs[number], Record<keyof DefaultLangStrings, string | null>>>,
>(opts: {
    defaultLanguage: DefaultLang
    supportedLanguages: SupportedLangs
    defaultStrings: DefaultLangStrings
    strings: AllStrings
}): I18n<Extract<keyof DefaultLangStrings, string>, SupportedLangs[number], DefaultLang> {
    return {
        defaultLanguage: opts.defaultLanguage,
        supportedLanguages: opts.supportedLanguages,
        matchLang: (lang: string | undefined | null): SupportedLangs[number] => {
            if (!lang) {
                return opts.defaultLanguage
            }

            return matchLang(opts.supportedLanguages, lang, opts.defaultLanguage)
        },
        get: (key: Extract<keyof DefaultLangStrings, string>, lang: SupportedLangs[number]): string => {
            const str = opts.strings[lang]?.[key]
            if (str) return str
            const s = opts.defaultStrings[key]

            if (!s) {
                throw new Error(`Missing string for key ${key}`)
            }

            return s
        },
        withLang: function (
            defaultLang: SupportedLangs[number],
        ): I18nWithLang<Extract<keyof DefaultLangStrings, string>, SupportedLangs[number], DefaultLang> {
            const lang = defaultLang

            return {
                get: (key: Extract<keyof DefaultLangStrings, string>): string => {
                    const str = opts.strings[lang]?.[key]
                    if (str) return str
                    const s = opts.defaultStrings[key]

                    if (!s) {
                        throw new Error(`Missing string for key ${key}`)
                    }

                    return s
                },
                currentLanguage: lang,
                setLang: function (l: SupportedLangs[number]) {
                    this.currentLanguage = l
                },
                withLang: this.withLang,
                defaultLanguage: opts.defaultLanguage,
                supportedLanguages: opts.supportedLanguages,
                matchLang: this.matchLang,
            }
        },
    }
}
