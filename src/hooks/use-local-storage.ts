import { useCallback, useState } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T | undefined) {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key)
            return item ? JSON.parse(item) : initialValue
        } catch (error) {
            console.error(error)
            return initialValue
        }
    })

    const setValue = useCallback(
        (value: T | ((val: T) => T)) => {
            try {
                setStoredValue((prev) => {
                    const valueToStore = value instanceof Function ? value(prev) : value
                    window.localStorage.setItem(key, JSON.stringify(valueToStore))
                    return valueToStore
                })
            } catch (error) {
                console.error(error)
            }
        },
        [key],
    )

    return [storedValue, setValue] as const
}
