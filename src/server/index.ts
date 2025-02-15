export * from './database'
import 'hono'

declare global {
    interface M3StackGlobals {}
}

declare module 'hono' {
    interface ContextVariableMap extends M3StackGlobals {}
}
