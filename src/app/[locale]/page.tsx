import HomeClient from "./HomeClient"

export const dynamic = "force-dynamic"

export default function HomePage() {
  try {
    return <HomeClient />
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return <div className="p-20"><h1>SSR Error</h1><pre className="text-red-500">{msg}</pre></div>
  }
}
