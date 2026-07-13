import { redirect } from "next/navigation";
import { OpportunityBriefFactoryConsole } from "@/components/admin/OpportunityBriefFactoryConsole";
import { isCurrentRequestAdmin } from "@/lib/admin-page-auth";

export const dynamic = "force-dynamic";

export default async function OpportunityBriefFactoryPage() {
  if (!(await isCurrentRequestAdmin())) redirect("/admin/login");
  return <OpportunityBriefFactoryConsole />;
}
