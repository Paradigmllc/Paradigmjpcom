declare module "@browserbasehq/stagehand" {
  export class Stagehand {
    constructor(opts: { env: string; headless: boolean; logger: () => void })
    init(): Promise<void>
    close(): Promise<void>
    page: {
      goto(url: string, opts?: { waitUntil?: string; timeout?: number }): Promise<void>
      title(): Promise<string>
      evaluate(fn: () => any): Promise<any>
    }
  }
}
