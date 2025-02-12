import { authClient } from "../lib/auth-client"

function App() {
  return (
    <div className="size-full border-2 border-dashed border-red-500">
      <button
        type="button"
        onClick={() => {
          authClient.signUp.email({
            email: 'tomascichero@gmail.com',
            password: 'password',
            name: 'Tomas Cichero'
          }).then(console.log)
        }}
      >Click me</button>
    </div>
  )
}

export default App
