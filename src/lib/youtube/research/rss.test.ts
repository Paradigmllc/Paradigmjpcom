import { describe, expect, it } from "vitest"

import { decodeXmlEntities, googleNewsParams, parseRelatedHeadlines, parseRssItems } from "./rss"

/** 実際の Google News RSS から採った item。description はエンティティ符号化されている。 */
const REAL_ITEM = `<rss><channel><item><title>台風13号 沖縄・奄美で風が強まる - NHKニュース</title><link>https://news.google.com/rss/articles/CBMiX0FV?oc=5</link><guid isPermaLink="false">CBMiX0FV</guid><pubDate>Wed, 05 Aug 2026 21:23:15 GMT</pubDate><description>&lt;ol&gt;&lt;li&gt;&lt;a href="https://news.google.com/x?oc=5" target="_blank"&gt;台風13号 沖縄・奄美で風が強まる&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;NHKニュース&lt;/font&gt;&lt;/li&gt;&lt;li&gt;&lt;a href="https://news.google.com/y?oc=5" target="_blank"&gt;台風13号あす沖縄に最接近 警戒を&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;Yahoo!ニュース&lt;/font&gt;&lt;/li&gt;&lt;/ol&gt;</description><source url="https://www3.nhk.or.jp">NHKニュース</source></item></channel></rss>`

describe("googleNewsParams", () => {
  it("日本語ロケールでは日本の設定を返す", () => {
    expect(googleNewsParams("ja")).toEqual({ hl: "ja", gl: "JP", ceid: "JP:ja" })
  })

  it("それ以外は米国英語にフォールバックする", () => {
    expect(googleNewsParams("en").gl).toBe("US")
  })
})

describe("decodeXmlEntities", () => {
  it("&amp; を最後に戻して二重デコードを避ける", () => {
    expect(decodeXmlEntities("&amp;lt;b&amp;gt;")).toBe("&lt;b&gt;")
    expect(decodeXmlEntities("&lt;b&gt;")).toBe("<b>")
  })
})

describe("parseRssItems", () => {
  it("必要な4フィールドを取り出す", () => {
    const items = parseRssItems(REAL_ITEM)
    expect(items.length).toBe(1)
    expect(items[0].title).toContain("台風13号")
    expect(items[0].link).toContain("news.google.com")
    expect(items[0].pubDate).toBe("Wed, 05 Aug 2026 21:23:15 GMT")
    expect(items[0].source).toBe("NHKニュース")
  })

  it("description から関連見出しを取り出す", () => {
    const [item] = parseRssItems(REAL_ITEM)
    expect(item.relatedHeadlines.length).toBe(2)
    expect(item.relatedHeadlines[0]).toEqual({
      title: "台風13号 沖縄・奄美で風が強まる",
      source: "NHKニュース",
      url: "https://news.google.com/x?oc=5",
    })
    expect(item.relatedHeadlines[1].source).toBe("Yahoo!ニュース")
  })
})

describe("parseRelatedHeadlines", () => {
  it("媒体名が無い項目も拾う", () => {
    const html = "&lt;ol&gt;&lt;li&gt;&lt;a href=\"#\"&gt;見出しだけ&lt;/a&gt;&lt;/li&gt;&lt;/ol&gt;"
    expect(parseRelatedHeadlines(html)).toEqual([
      { title: "見出しだけ", source: null, url: "#" },
    ])
  })

  it("同じ見出しは重複排除する", () => {
    const html =
      "&lt;ol&gt;&lt;li&gt;&lt;a href=\"#\"&gt;同じ&lt;/a&gt;&lt;/li&gt;&lt;li&gt;&lt;a href=\"#\"&gt;同じ&lt;/a&gt;&lt;/li&gt;&lt;/ol&gt;"
    expect(parseRelatedHeadlines(html).length).toBe(1)
  })

  it("関連見出しが無ければ空を返す", () => {
    expect(parseRelatedHeadlines("本文なし")).toEqual([])
  })
})
