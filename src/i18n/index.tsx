export type I18n<K extends string, L extends string> = {
    get: (key: K, lang: L) => string
    withLang: (lang: L) => I18WithLang<K, L>
    defaultLanguage: L
}

export type I18WithLang<K extends string, L extends string> = {
    get: (key: K) => string
    lang: L
    setLang: (lang: L) => void
    withLang: (lang: L) => I18WithLang<K, L>
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
}): I18n<Extract<keyof DefaultLangStrings, string>, SupportedLangs[number]> {
    return {
        defaultLanguage: opts.defaultLanguage,
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
        ): I18WithLang<Extract<keyof DefaultLangStrings, string>, SupportedLangs[number]> {
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
                lang,
                setLang: function (l: SupportedLangs[number]) {
                    this.lang = l
                },
                withLang: this.withLang,
            }
        },
    }
}
