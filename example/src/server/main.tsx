console.log('Server')


console.log(new URL(import.meta.url).pathname)


const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

for (let i = 0; i < 6; i++) {
    console.log(`Server ${i}`)
    await wait(1000)
}

1 + 1

throw new Error('Server Error')