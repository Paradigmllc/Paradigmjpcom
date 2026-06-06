"use client"

import { Keystatic } from "@keystatic/core/ui"
import config from "../../../../keystatic.config"

const keystaticConfig = config as Parameters<typeof Keystatic>[0]["config"]

const appSlug = {
  envName: "NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG",
  value: process.env.NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG,
}

export function KeystaticClient() {
  return <Keystatic appSlug={appSlug} config={keystaticConfig} />
}
