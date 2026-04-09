import type { Metadata } from "next"
import { RootPage, generatePageMetadata } from "@payloadcms/next/views"
import { importMap } from "../importMap.js"

type Args = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] }>
}

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ params, searchParams, importMap })

const Page = ({ params, searchParams }: Args) => RootPage({ params, searchParams, importMap })

export default Page
