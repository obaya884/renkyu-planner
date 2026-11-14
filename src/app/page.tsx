import { APP_DESCRIPTION, APP_NAME } from './site'

export default function Page() {
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold">{APP_NAME}</h1>
      <p>{APP_DESCRIPTION}</p>
    </main>
  )
}
