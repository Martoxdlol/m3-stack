import React from 'react'

export function Button(props: { children: React.ReactNode }) {
    return <button type="button">{props.children}</button>
}