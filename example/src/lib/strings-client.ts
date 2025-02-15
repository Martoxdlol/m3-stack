import { createStrings } from './strings'

export const strings = createStrings()

export const stringsWithLang = strings.withLang(strings.defaultLanguage)

export function getString(key: Parameters<(typeof stringsWithLang)['get']>[0]): string {
    return stringsWithLang.get(key)
}

export function setLanguage(lang: Parameters<(typeof strings)['get']>[1]) {
    stringsWithLang.setLang(lang)
}
