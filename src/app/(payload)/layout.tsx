/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from '@payload-config'
import '@payloadcms/next/css'
import type { ServerFunctionClient } from 'payload'
import { getPayload } from 'payload'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import React from 'react'
import { isPayloadInitCoolingDown, markPayloadInitFailure } from '@/lib/payload-availability'

import { importMap } from './admin/importMap.js'
import './custom.scss'

type Args = {
  children: React.ReactNode
}

function FallbackLayout({ children }: Args) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

const Layout = async ({ children }: Args) => {
  if (isPayloadInitCoolingDown()) {
    return <FallbackLayout>{children}</FallbackLayout>
  }

  try {
    await getPayload({ config })
  } catch (e) {
    console.error('[payload-admin-layout] Payload init failed:', e)
    markPayloadInitFailure(e)
    return <FallbackLayout>{children}</FallbackLayout>
  }

  return (
    <RootLayout
      config={config}
      importMap={importMap}
      serverFunction={serverFunction}
    >
      {children}
    </RootLayout>
  )
}

export default Layout
