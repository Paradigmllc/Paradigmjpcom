import HomeClient from "./HomeClient"

export const revalidate = 300

interface Props {
  params: Promise<{ locale: string }>
}

export default async function HomePage({ params }: Props) {
  return <HomeClient />
}
