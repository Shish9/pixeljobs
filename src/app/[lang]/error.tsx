"use client";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

// Client error boundary: dictionaries are server-only, so keep a minimal inline copy of this one message.
const MESSAGES: Record<string, { title: string; retry: string }> = {
  en: { title: "Something went wrong. Please try again.", retry: "Try again" },
  ar: { title: "حدث خطأ ما. يُرجى المحاولة مرة أخرى.", retry: "إعادة المحاولة" },
  ckb: { title: "هەڵەیەک ڕوویدا. تکایە دووبارە هەوڵ بدەرەوە.", retry: "دووبارە هەوڵبدەرەوە" },
  kmr: { title: "خەلەتیەک چێبوو. هیڤییە دووبارە هەول بدە.", retry: "دووبارە هەول بدە" },
};

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { lang } = useParams<{ lang: string }>();
  const m = MESSAGES[lang] ?? MESSAGES.en!;
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center" role="alert">
      <h1 className="text-xl font-bold">{m.title}</h1>
      {error.digest && <p className="ltr-isolate mt-2 text-xs text-ink-subtle">ref: {error.digest}</p>}
      <Button className="mt-6" onClick={reset}>
        {m.retry}
      </Button>
    </div>
  );
}
