export type I18nOptions<
    L extends string[],
    E extends L[number],
    D extends Record<string, string>,
    S extends Record<Extract<Omit<L[number], E>, string>, Record<Extract<keyof D, string>, string | null>>,
> = {
    supportedLanguages: L
    defaultStrings: D
    defaultLanguage: L[number]
    strings: S
}

export type I18n<K extends string, L extends string> = {
    get: (key: K, lang: L) => string
    withLang: (lang: L) => I18WithLang<K, L>
}

export type I18WithLang<K extends string, L extends string> = {
    get: (key: K) => string
    lang: L
}

export function createI18n<
    L extends string[],
    E extends L[number],
    D extends Record<string, string>,
    S extends Record<Extract<Omit<L[number], E>, string>, Record<Extract<keyof D, string>, string | null>>,
>(opts: I18nOptions<L, E, D, S>): I18n<Extract<keyof D, string>, Extract<L[number], string>> {
    return {
        get: (key: Extract<keyof D, string>, lang: Extract<L[number], string>): string => {
            const str = opts.strings[lang]?.[key]
            if (str) return str
            const s = opts.defaultStrings[key]

            if (!s) {
                throw new Error(`Missing string for key ${key}`)
            }

            return s
        },
        withLang: (
            lang: Extract<L[number], string>,
        ): I18WithLang<Extract<keyof D, string>, Extract<L[number], string>> => {
            return {
                get: (key: Extract<keyof D, string>): string => {
                    const str = opts.strings[lang]?.[key]
                    if (str) return str
                    const s = opts.defaultStrings[key]

                    if (!s) {
                        throw new Error(`Missing string for key ${key}`)
                    }

                    return s
                },
                lang,
            }
        },
    }
}

// const strings = createI18n({
//     defaultLanguage: 'en',
//     defaultStrings: {
//         hello: 'Hello',
//     },
//     supportedLanguages: ['en', 'es'],
//     strings: {
//         es: {
//             hello: 'Hola',
//         },
//     },
// })
