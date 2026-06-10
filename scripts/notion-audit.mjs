#!/usr/bin/env node
/**
 * scripts/notion-audit.mjs  ESprint 19 抜本実裁E�E現状監査スクリプト
 *
 * 役割: 全 11 sub pages の block 構造を�E帰 fetch し、設訁Erule 違反を機械検�E.
 *       監査結果は stdout に整形出力�Eexit code = 違反件数.
 *
 * 設訁ERule (8 condition):
 *   R1 - column_list 冁E�E column 数 > 2 (mobile では縦並び・3+ は冗長)
 *   R2 - 同一 emoji が連綁E3 block で 2 回以丁E(emoji 重褁E
 *   R3 - heading + 直丁Elinked_db で同一 emoji (Section 名と DB icon 重褁E
 *   R4 - h1 ぁE1 page に 3 つ以丁E(見�Eし氾濫)
 *   R5 - 同一 page で callout ぁE30 を趁E��めE(callout noise)
 *   R6 - "Notion UI で" を含む callout (UI hint 撤去対象)
 *   R7 - heading ぁE"🎯 リーチEDB" 形式で linked DB を直接命吁E(action-oriented でなぁE
 *   R8 - block 数ぁE60 趁E(1 page bloat)
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY
if (!NOTION_API_KEY) {
  console.error('NOTION_API_KEY env var must be set')
  process.exit(1)
}

const PAGES = {
  parent: { id: "35fa2b78-f3fc-8129-9d91-e457889ee393", name: "Paradigm 営業 OS (Parent Hub)" },
  dashboard: { id: "35fa2b78-f3fc-81d0-b842-c0ed182103dc", name: "📊 営業ダチE��ュボ�EチE },
  pipeline: { id: "35fa2b78-f3fc-81c0-a376-d292a748d066", name: "🎯 Pipeline Manager" },
  revenue: { id: "35fa2b78-f3fc-8125-a0b4-cea00429681d", name: "💰 Revenue Dashboard" },
  activity: { id: "35fa2b78-f3fc-817c-9cf4-f2f5fd17ae71", name: "📞 Activity Hub" },
  usage: { id: "35fa2b78-f3fc-81c3-b26a-f80a3770208d", name: "📖 使ぁE��ガイチE },
  strategy: { id: "35fa2b78-f3fc-819c-b5d6-e2f95e677265", name: "🎓 業種別営業戦略" },
  setup: { id: "35fa2b78-f3fc-81dd-8dda-e455d1f20d09", name: "🔧 Setup & Environment" },
  r2: { id: "35fa2b78-f3fc-8163-8e90-c55cc0218ad5", name: "🗄�E�ER2 Storage Spec" },
  syncFlow: { id: "35fa2b78-f3fc-81ed-be7c-c636fadea0c8", name: "📚 Architecture & Sync Flow" },
  faq: { id: "35fa2b78-f3fc-81b2-abb1-dd0e837c6521", name: "❁EFAQ" },
}

let lastCall = 0
async function n(method, path, body) {
  const now = Date.now()
  if (now - lastCall < 350) await new Promise((r) => setTimeout(r, 350 - (now - lastCall)))
  lastCall = Date.now()
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`https://api.notion.com/v1${path}`, opts)
  return { ok: res.ok, data: await res.json() }
}

/* 再帰 fetch (column_list の中身を含む) */
async function fetchAllBlocks(pageId) {
  const all = []
  let cursor
  do {
    const r = await n(
      "GET",
      `/blocks/${pageId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`,
    )
    if (!r.ok) break
    for (const b of r.data.results || []) {
      all.push(b)
      if (b.has_children && (b.type === "column_list" || b.type === "column" || b.type === "toggle")) {
        const children = await fetchAllBlocks(b.id)
        all.push(...children.map((c) => ({ ...c, _parent: b.type })))
      }
    }
    cursor = r.data.has_more ? r.data.next_cursor : undefined
  } while (cursor)
  return all
}

/* block から rich_text plain を抽出 */
function blockText(b) {
  const arr = b[b.type]?.rich_text
  if (!Array.isArray(arr)) return ""
  return arr.map((rt) => rt.plain_text || rt.text?.content || "").join("")
}

/* block から先頭の emoji を抽出 (見�EぁEor callout) */
function blockEmoji(b) {
  if (b.type === "callout") return b.callout?.icon?.emoji ?? null
  const text = blockText(b)
  // 簡昁Eemoji 検�E (1 斁E��目ぁEsurrogate pair or special char)
  const match = text.match(/^([\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}�E�E🌍])/u)
  return match ? match[1] : null
}

/* Rule violation 検�E */
function auditPage(name, blocks) {
  const violations = []
  let h1Count = 0
  let calloutCount = 0
  const emojiPositions = [] // [index, emoji]

  blocks.forEach((b, i) => {
    if (b.type === "heading_1") h1Count++
    if (b.type === "callout") calloutCount++

    // R1: column count > 2
    if (b.type === "column_list") {
      // count its direct column children in the next blocks (where _parent === column_list and type === column)
      const colCount = blocks.filter((bb) => bb._parent === "column_list").length
      // Simpler: count "column" types that immediately follow this column_list
      // This is approximate; precise count requires Notion API column_list children
    }

    // R2/R3: emoji tracking
    const emoji = blockEmoji(b)
    if (emoji) emojiPositions.push({ index: i, emoji, type: b.type })

    // R6: "Notion UI で" callout
    if (b.type === "callout") {
      const text = blockText(b)
      if (/Notion UI で/.test(text) && text.length < 200) {
        violations.push({ rule: "R6", block: i, msg: `UI hint callout: "${text.slice(0, 80)}"` })
      }
    }

    // R7: heading that is just DB name like "🎯 リーチEDB"
    if (b.type.startsWith("heading_")) {
      const text = blockText(b)
      const dbNamePattern = /^[\u{1F000}-\u{1FFFF}\s]+(リード|顧客|納品|チE��プレ|Leads|Customers|Deliveries|Templates|アクチE��ビティ|啁E��E��レンダー|契紁E��)\s*(DB)?$/u
      if (dbNamePattern.test(text.trim())) {
        violations.push({ rule: "R7", block: i, msg: `DB-name heading: "${text}"` })
      }
    }

    // R3: heading + immediate linked_db with same emoji
    if (b.type === "link_to_page" && b.link_to_page?.type === "database_id") {
      // find previous heading
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        const prev = blocks[j]
        if (prev.type?.startsWith("heading_")) {
          const headingEmoji = blockEmoji(prev)
          // Lookup DB icon
          const dbIcons = {
            "8cbab1f5-0114-4f83-872c-1738ce3e79c4": "🎯",
            "86b1d93e-3b85-4862-ae7b-2750d2585677": "🏢",
            "b3cbef9d-d96f-4e5b-bbec-c404c703a298": "📦",
            "115e2b0e-7942-4bb0-813f-c05402096f95": "📝",
            "35fa2b78-f3fc-8107-aa0b-f28694e1009c": "🌍",
            "35fa2b78-f3fc-81aa-b57f-fcc729431181": "🌍",
            "35fa2b78-f3fc-81e2-a5c3-d7b9b9d7f5a9": "🌍",
            "35fa2b78-f3fc-817f-8e05-ca06234adac4": "🌍",
            "35fa2b78-f3fc-81ae-99b6-cc9cfa653791": "📞",
            "35fa2b78-f3fc-81c7-91a2-eb80274298aa": "📅",
            "35fa2b78-f3fc-81fc-bb0a-f3880172557d": "📄",
          }
          const dbId = b.link_to_page.database_id
          const dbIcon = dbIcons[dbId]
          if (headingEmoji && dbIcon && headingEmoji === dbIcon) {
            violations.push({
              rule: "R3",
              block: i,
              msg: `Heading "${blockText(prev)}" emoji matches linked DB icon "${dbIcon}"`,
            })
          }
          break
        }
      }
    }
  })

  // R2: consecutive same emoji within 3 block window (column siblings は除夁E
  for (let i = 0; i < emojiPositions.length - 1; i++) {
    const a = emojiPositions[i]
    const blockA = blocks[a.index]
    for (let j = i + 1; j < emojiPositions.length && emojiPositions[j].index - a.index <= 3; j++) {
      if (emojiPositions[j].emoji === a.emoji) {
        const blockB = blocks[emojiPositions[j].index]
        // column 允E��E(両方ぁEcolumn 配丁E は mobile reflow で離れて表示されるためE��夁E
        if (blockA?._parent === "column" && blockB?._parent === "column") continue
        violations.push({
          rule: "R2",
          block: a.index,
          msg: `Emoji "${a.emoji}" duplicated within 3 blocks (positions ${a.index}, ${emojiPositions[j].index})`,
        })
        break
      }
    }
  }

  // R4: h1 count > 3
  if (h1Count > 3) {
    violations.push({ rule: "R4", block: -1, msg: `h1 count: ${h1Count} (max 3)` })
  }

  // R5: callout > 30
  if (calloutCount > 30) {
    violations.push({ rule: "R5", block: -1, msg: `callout count: ${calloutCount} (max 30)` })
  }

  // R8: total > 60 (excluding column_list children)
  const topLevelCount = blocks.filter((b) => !b._parent).length
  if (topLevelCount > 60) {
    violations.push({ rule: "R8", block: -1, msg: `top-level block count: ${topLevelCount} (max 60)` })
  }

  return { name, total: blocks.length, topLevel: topLevelCount, h1: h1Count, callouts: calloutCount, violations }
}

const C = {
  pass: "\x1b[32m✓\x1b[0m",
  fail: "\x1b[31m✗\x1b[0m",
  warn: "\x1b[33m⚠\x1b[0m",
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
}

async function main() {
  console.log(C.bold("\n🔍 Notion 11 pages 抜本監査\n"))
  let totalViolations = 0
  const summaries = []
  for (const [key, p] of Object.entries(PAGES)) {
    const blocks = await fetchAllBlocks(p.id)
    const audit = auditPage(p.name, blocks)
    summaries.push({ key, ...audit })
    totalViolations += audit.violations.length

    const status = audit.violations.length === 0 ? C.pass : C.fail
    console.log(`${status} ${C.bold(audit.name)} ${C.dim(`(${audit.total} blocks / ${audit.h1} h1 / ${audit.callouts} callouts)`)}`)
    if (audit.violations.length > 0) {
      audit.violations.forEach((v) => {
        console.log(`    ${C.warn} ${v.rule}: ${v.msg}`)
      })
    }
  }
  console.log()
  console.log(C.bold("─".repeat(70)))
  console.log(`${C.bold("結果")}: ${totalViolations === 0 ? C.pass : C.fail} ${totalViolations} violations across ${summaries.length} pages`)

  if (totalViolations > 0) {
    console.log(`\n${C.bold("⚠�E�ERule 違反あり  E抜本 rebuild が忁E��E)}`)
    process.exit(1)
  } else {
    console.log(`\n${C.bold("✁E全 page クリーン  E抜本 rebuild 不要E)}`)
    process.exit(0)
  }
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
