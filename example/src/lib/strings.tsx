import { createI18n } from 'm3-stack/i18n'

export function createStrings() {
    return createI18n({
        supportedLanguages: ['en', 'es'] as const,
        defaultLanguage: 'en',
        defaultStrings: {
            login: 'Login',
        },
        strings: {
            en: {
                login: 'Login',
            },
            es: {
                login: 'Iniciar sesión',
            },
        },
    })
}

export type Strings = ReturnType<typeof createStrings>
