/**
 * lib/youtube/research/quota.ts — YouTube Data API の割当管理
 *
 * なぜ必要か: Data API の既定枠は 1日 10,000 ユニットで、search.list は
 * 1回 100 ユニット消費する。素朴に検索を回すと 100 回で枯渇し、
 * その日のチャンネル運用が全部止まる。複数チャンネルを回す前提では
 * 「1回いくら使うか」を型と関数で強制しないと必ず事故る。
 *
 * リセットは太平洋時間の午前0時。UTC でも実行環境のローカル時間でもない。
 */

/** Data API v3 の1回あたり消費ユニット。 */
export const YOUTUBE_API_UNIT_COST = {
  search: 100,
  videos: 1,
  channels: 1,
  playlistItems: 1,
  videoCategories: 1,
} as const

export type YoutubeApiOperation = keyof typeof YOUTUBE_API_UNIT_COST

export const DEFAULT_DAILY_QUOTA = 10_000

/**
 * 割当の集計単位となる日付キー。
 * Google の枠は太平洋時間でリセットされるため、その暦日で数える。
 */
export function pacificDateKey(now: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now))
}

/**
 * 消費量の記録先。既定はプロセス内メモリ。
 * 複数プロセスで運用するときは Supabase 実装を差し込む。
 */
export interface QuotaStore {
  get(dateKey: string): Promise<number>
  add(dateKey: string, units: number): Promise<void>
}

export function createInMemoryQuotaStore(): QuotaStore {
  const spent = new Map<string, number>()
  return {
    async get(dateKey) {
      return spent.get(dateKey) ?? 0
    },
    async add(dateKey, units) {
      spent.set(dateKey, (spent.get(dateKey) ?? 0) + units)
    },
  }
}

export interface QuotaGuardOptions {
  store?: QuotaStore
  dailyQuota?: number
  /** テスト用の時刻注入。 */
  now?: () => number
  /**
   * 予備として残す割合。枠を使い切ると当日の他の処理も止まるため、
   * 既定で1割を手元に残す。
   */
  reserveRatio?: number
}

export interface QuotaStatus {
  dateKey: string
  spent: number
  limit: number
  usable: number
  remaining: number
}

export class QuotaExceededError extends Error {
  constructor(
    readonly operation: YoutubeApiOperation,
    readonly status: QuotaStatus,
  ) {
    super(
      `[youtube/quota] ${operation} は ${YOUTUBE_API_UNIT_COST[operation]} ユニット必要ですが、` +
        `本日の残りは ${status.remaining} ユニットです (${status.spent}/${status.usable} 使用済み、太平洋時間 ${status.dateKey})。`,
    )
    this.name = "QuotaExceededError"
  }
}

export interface QuotaGuard {
  status(): Promise<QuotaStatus>
  /** 消費できるかを事前に確認する。副作用なし。 */
  canSpend(operation: YoutubeApiOperation): Promise<boolean>
  /** 消費を記録する。枠が足りなければ QuotaExceededError を投げる。 */
  spend(operation: YoutubeApiOperation): Promise<QuotaStatus>
}

export function createQuotaGuard(options: QuotaGuardOptions = {}): QuotaGuard {
  const store = options.store ?? createInMemoryQuotaStore()
  const dailyQuota = options.dailyQuota ?? DEFAULT_DAILY_QUOTA
  const now = options.now ?? (() => Date.now())
  const reserveRatio = options.reserveRatio ?? 0.1

  const readStatus = async (): Promise<QuotaStatus> => {
    const dateKey = pacificDateKey(now())
    const spent = await store.get(dateKey)
    const usable = Math.floor(dailyQuota * (1 - reserveRatio))
    return { dateKey, spent, limit: dailyQuota, usable, remaining: Math.max(0, usable - spent) }
  }

  return {
    status: readStatus,

    async canSpend(operation) {
      const status = await readStatus()
      return YOUTUBE_API_UNIT_COST[operation] <= status.remaining
    },

    async spend(operation) {
      const status = await readStatus()
      const cost = YOUTUBE_API_UNIT_COST[operation]
      if (cost > status.remaining) {
        throw new QuotaExceededError(operation, status)
      }
      await store.add(status.dateKey, cost)
      return readStatus()
    },
  }
}
