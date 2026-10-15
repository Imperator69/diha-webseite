import { requireViewer } from "@/lib/auth/current";
import { PageHeader } from "@/components/ui/card";
import { translator } from "@/lib/i18n/t";
import { localeParam, type PageProps } from "@/lib/portal/params";

export default async function PortalHome({ params }: PageProps) {
  const locale = await localeParam(params);
  const viewer = await requireViewer(locale);
  const t = translator(locale);
  return <PageHeader title={`${t("Willkommen", "Welcome")}, ${viewer.name}`} description={t("Übersicht folgt.", "Overview to follow.")} />;
}
