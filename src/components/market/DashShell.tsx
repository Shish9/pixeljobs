import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Viewer } from "@/lib/auth";
import { Alert } from "@/components/ui/Alert";
import { Container } from "@/components/ui/Card";
import { unreadCount } from "@/lib/trust";
import { DashboardNav, PageHead } from "./parts";

/** Common frame for dashboard sub-pages: section nav, heading, optional mode gate. */
export async function DashShell({
  locale,
  dict,
  viewer,
  current,
  title,
  intro,
  action,
  requires,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  viewer: Viewer;
  current: string;
  title: string;
  intro?: string;
  action?: ReactNode;
  requires?: "freelancer" | "client";
  children: ReactNode;
}) {
  const unread = await unreadCount();
  const blocked =
    (requires === "freelancer" && !viewer.profile.is_freelancer) || (requires === "client" && !viewer.profile.is_client);
  return (
    <Container className="py-8 sm:py-12">
      <DashboardNav locale={locale} dict={dict} current={current} isFreelancer={viewer.profile.is_freelancer} isClient={viewer.profile.is_client} unread={unread} />
      <div className="mt-8"><PageHead title={title} intro={intro} action={blocked ? undefined : action} /></div>
      <div className="mt-8">
        {blocked ? <Alert>{requires === "freelancer" ? dict.market.freelancerOnly : dict.market.clientOnly}</Alert> : children}
      </div>
    </Container>
  );
}

export async function dashParams(params: Promise<{ lang: string }>) {
  const { lang } = await params;
  return lang;
}
