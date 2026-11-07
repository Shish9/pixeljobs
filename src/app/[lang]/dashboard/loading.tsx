export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6" aria-busy="true">
      <div className="h-8 w-64 animate-pulse rounded-md bg-sunken" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="h-48 animate-pulse rounded-lg bg-sunken" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-lg bg-sunken" />)}
        </div>
      </div>
    </div>
  );
}
