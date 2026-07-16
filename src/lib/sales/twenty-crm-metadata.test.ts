import { describe, expect, it } from "vitest"
import { missingTwentyCrmFieldNames } from "./twenty-crm-metadata"

describe("missingTwentyCrmFieldNames", () => {
  const fields = [
    { fieldKey: "form_url", twentyFieldName: "paradigmFormUrl", label: "フォームURL", position: 1, isVisible: true, fieldType: "url" as const, description: null },
    { fieldKey: "outreach_target_url", twentyFieldName: "paradigmOutreachTargetUrl", label: "営業先URL", position: 2, isVisible: true, fieldType: "url" as const, description: null },
  ]

  it("detects metadata or Core API schema drift", () => {
    expect(missingTwentyCrmFieldNames(fields, ["paradigmFormUrl"])).toEqual(["paradigmOutreachTargetUrl"])
  })

  it("accepts a fully reflected workspace schema", () => {
    expect(missingTwentyCrmFieldNames(fields, ["paradigmFormUrl", "paradigmOutreachTargetUrl"])).toEqual([])
  })
})
