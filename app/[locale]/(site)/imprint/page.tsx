import { LegalPageView, legalMetadata } from "@/components/site/legal-page";

type Params = { params: Promise<{ locale: string }> };

export const generateMetadata = ({ params }: Params) => legalMetadata(params, "imprint");

export default function Page({ params }: Params) {
  return <LegalPageView params={params} page="imprint" slugLocale="en" />;
}
