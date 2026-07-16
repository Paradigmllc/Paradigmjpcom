import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  MANUAL_MESSAGE_ANGLE_LABELS,
  MANUAL_MESSAGE_ANGLES,
  type ManualAngleMetric,
  type ManualMessageAngleSelection,
} from "@/lib/sales/manual-japan-entry-angle"
import {
  MANUAL_MESSAGE_VARIANT_LABELS,
  MANUAL_MESSAGE_VARIANTS,
  type ManualExperimentMetric,
  type ManualMessageVariantSelection,
} from "@/lib/sales/manual-japan-entry-experiment"

function rate(count: number, denominator: number): string {
  return denominator > 0 ? `${Math.round((count / denominator) * 100)}%` : "—"
}

export function ManualWorkExperimentControls({
  variant,
  angle,
  running,
  metrics,
  angleMetrics,
  onVariantChange,
  onAngleChange,
}: {
  variant: ManualMessageVariantSelection
  angle: ManualMessageAngleSelection
  running: boolean
  metrics: ManualExperimentMetric[]
  angleMetrics: ManualAngleMetric[]
  onVariantChange: (value: ManualMessageVariantSelection) => void
  onAngleChange: (value: ManualMessageAngleSelection) => void
}) {
  return (
    <>
      <Card className="rounded-2xl border-zinc-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">初回文面のテストセル</CardTitle>
          <CardDescription>自動均等割付はdomainから安定して割り当てます。推定根拠が不足する場合は同じ価格条件の「推定なし」へ自動で落とします。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" variant={variant === "auto" ? "default" : "outline"} size="sm" onClick={() => onVariantChange("auto")} disabled={running}>自動均等割付</Button>
          {MANUAL_MESSAGE_VARIANTS.map((value) => <Button key={value} type="button" variant={variant === value ? "default" : "outline"} size="sm" onClick={() => onVariantChange(value)} disabled={running}>{MANUAL_MESSAGE_VARIANT_LABELS[value]}</Button>)}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-zinc-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">訴求角度</CardTitle>
          <CardDescription>競合はHTTPS公開根拠、推定機会は公開rank、モックアップは保存済み日本語ポジショニング案が必要です。根拠不足時は問題提起型へ自動変更し、理由を履歴に残します。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" variant={angle === "auto" ? "default" : "outline"} size="sm" onClick={() => onAngleChange("auto")} disabled={running}>自動安定割付</Button>
          {MANUAL_MESSAGE_ANGLES.map((value) => <Button key={value} type="button" variant={angle === value ? "default" : "outline"} size="sm" onClick={() => onAngleChange(value)} disabled={running}>{MANUAL_MESSAGE_ANGLE_LABELS[value]}</Button>)}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-zinc-200 shadow-sm">
        <CardHeader><CardTitle className="text-xl">テスト評価</CardTitle><CardDescription>返信率・Founder転送率・商談化率の分母は「手動フォーム送信済み」です。</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500"><tr><th scope="col" className="py-2 pr-4">セル</th><th scope="col" className="px-3 py-2">割付</th><th scope="col" className="px-3 py-2">送信</th><th scope="col" className="px-3 py-2">返信率</th><th scope="col" className="px-3 py-2">Founder転送率</th><th scope="col" className="px-3 py-2">商談化率</th></tr></thead>
            <tbody>{metrics.map((metric) => <tr key={metric.variant} className="border-b border-zinc-100"><td className="py-3 pr-4 font-medium">{MANUAL_MESSAGE_VARIANT_LABELS[metric.variant]}</td><td className="px-3 py-3">{metric.assigned}</td><td className="px-3 py-3">{metric.manuallySent}</td><td className="px-3 py-3">{metric.replies} / {rate(metric.replies, metric.manuallySent)}</td><td className="px-3 py-3">{metric.founderForwards} / {rate(metric.founderForwards, metric.manuallySent)}</td><td className="px-3 py-3">{metric.meetings} / {rate(metric.meetings, metric.manuallySent)}</td></tr>)}</tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-zinc-200 shadow-sm">
        <CardHeader><CardTitle className="text-xl">訴求角度の評価</CardTitle><CardDescription>実際に生成へ使った角度別に集計します。フォールバック前の希望角度は各履歴に残ります。</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500"><tr><th scope="col" className="py-2 pr-4">角度</th><th scope="col" className="px-3 py-2">適用</th><th scope="col" className="px-3 py-2">送信</th><th scope="col" className="px-3 py-2">返信率</th><th scope="col" className="px-3 py-2">Founder転送率</th><th scope="col" className="px-3 py-2">商談化率</th></tr></thead>
            <tbody>{angleMetrics.map((metric) => <tr key={metric.angle} className="border-b border-zinc-100"><td className="py-3 pr-4 font-medium">{MANUAL_MESSAGE_ANGLE_LABELS[metric.angle]}</td><td className="px-3 py-3">{metric.assigned}</td><td className="px-3 py-3">{metric.manuallySent}</td><td className="px-3 py-3">{metric.replies} / {rate(metric.replies, metric.manuallySent)}</td><td className="px-3 py-3">{metric.founderForwards} / {rate(metric.founderForwards, metric.manuallySent)}</td><td className="px-3 py-3">{metric.meetings} / {rate(metric.meetings, metric.manuallySent)}</td></tr>)}</tbody>
          </table>
        </CardContent>
      </Card>
    </>
  )
}
