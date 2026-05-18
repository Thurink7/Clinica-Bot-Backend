import Link from 'next/link';

export function CTA() {
  return (
    <section className="bg-background py-24 lg:py-32">
      <div className="container mx-auto px-6">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[hsl(224,80%,14%)] via-primary to-[hsl(217,91%,35%)] p-12 shadow-premium lg:p-20">
          <div className="absolute inset-0 grid-pattern opacity-10" />
          <div className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-[hsl(var(--primary-glow)/0.2)] blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-accent/30 blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 backdrop-blur">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary-foreground">
                Comece em menos de 24 horas
              </span>
            </div>

            <h2 className="font-display mb-6 text-4xl font-bold leading-[1.1] text-primary-foreground md:text-5xl lg:text-6xl">
              Pronto para reduzir faltas e <br />
              encantar seus pacientes?
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-lg text-primary-foreground/80">
              Teste o painel com seu usuário. Sem cartão neste MVP — foco em validar valor na sua clínica.
            </p>

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/cadastro"
              className="inline-flex h-14 items-center justify-center rounded-xl bg-accent px-10 text-base font-semibold text-accent-foreground shadow-md transition hover:bg-accent/90"
            >
              Quero aderir
            </Link>
            <Link
              href="/login"
              className="inline-flex h-14 items-center justify-center rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 px-10 text-base font-semibold text-primary-foreground backdrop-blur transition hover:bg-primary-foreground/15"
            >
              Acessar painel
            </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
