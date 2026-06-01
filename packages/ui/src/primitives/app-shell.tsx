export type AppShellProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function AppShell({ eyebrow, title, description }: AppShellProps) {
  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col justify-center">
        <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-medium text-slate-950">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          {description}
        </p>
      </section>
    </main>
  );
}
