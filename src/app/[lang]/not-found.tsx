import { headers } from "next/headers";
import { defaultLocale, isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Card";

export default async function NotFound() {
  // not-found receives no params; infer locale from the request path set by the proxy.
  const path = (await headers()).get("x-pathname") ?? "";
  const seg = path.split("/")[1];
  const locale = isLocale(seg) ? seg : defaultLocale;
  const dict = await getDictionary(locale);
  return (
    <Container className="py-24 text-center">
      <p className="text-sm font-semibold text-brand-700">404</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{dict.errors.notFoundTitle}</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-muted">{dict.errors.notFoundBody}</p>
      <ButtonLink href={`/${locale}`} className="mt-8">
        {dict.errors.goHome}
      </ButtonLink>
    </Container>
  );
}
