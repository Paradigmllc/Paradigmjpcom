import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { ManualWorkIntake } from "./ManualWorkIntake"

const noop = vi.fn()

describe("ManualWorkIntake multi-batch queue", () => {
  it("keeps fast intake available while a queued batch is processed in the background", () => {
    const html = renderToStaticMarkup(<ManualWorkIntake
      input="https://next.example"
      sourceSlug="manual_input"
      sourcePageUrl=""
      sources={[]}
      queue={{ "https://queued.example/": "waiting" }}
      submitting={false}
      queueActive
      batchStatus="queued"
      queuePosition={2}
      queueSummary={{
        batchCount: 3,
        companyCount: 1_200,
        runningBatchId: "11111111-1111-4111-8111-111111111111",
        queuedBatchCount: 2,
        queuedCompanyCount: 700,
      }}
      urlCount={1}
      maxUrls={500}
      finished={0}
      batchError={null}
      canResume={false}
      onInputChange={noop}
      onSourceChange={noop}
      onSourcePageUrlChange={noop}
      onStart={noop}
      onResume={noop}
    />)

    expect(html).toContain("永続キューで待機中（前方2バッチ）")
    expect(html).toContain("待機・実行中 3バッチ / 1,200社")
    expect(html).toContain("次の高速バッチを追加")
    expect(html).toContain('aria-label="一次判定する海外企業URL"')
    expect(html).not.toContain('aria-label="一次判定する海外企業URL" disabled=""')
    expect(html).toContain("最大15社をChatGPT Proへまとめて渡し")
    expect(html).toContain("外部AI APIを使わず")
  })
})
