import { useEffect } from 'react'
import { useLocalStorage } from './use-local-storage'

export function useCacheValue<T>(key: string, value: T | undefined, ready?: boolean) {
    const isReady = ready ?? !!value

    const [savedValue, setSavedValue] = useLocalStorage<T | undefined>(key, value)

    useEffect(() => {
        if (isReady) {
            setSavedValue(value)
        }
    }, [isReady, value, setSavedValue])

    if (isReady) {
        return value
    }

    return savedValue
}
