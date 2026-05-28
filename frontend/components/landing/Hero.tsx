import Image from 'next/image';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background pb-20 pt-28 lg:pb-28 lg:pt-36">
      <div className="absolute inset-0 gradient-hero opacity-90" />
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute -right-40 top-0 h-[600px] w-[600px] rounded-full bg-[hsl(var(--primary-glow)/0.1)] blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full bg-accent/10 blur-3xl" />

      <div className="container relative mx-auto px-6">
        <div className="animate-fade-up mx-auto mb-14 max-w-5xl text-center">
          <h1 className="font-display mb-7 text-[2.75rem] font-bold leading-[1.02] tracking-tight text-primary md:text-6xl lg:text-7xl xl:text-[5.5rem]">
            A inteligência por trás <br className="hidden md:block" />
            de uma{' '}
            <span className="relative inline-block">
              <span className="font-display text-gradient-primary italic">clínica moderna</span>
              <svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 200 12"
                fill="none"
                preserveAspectRatio="none"
                aria-hidden
              >
                <path
                  d="M2 9C50 4 100 4 198 9"
                  stroke="hsl(var(--accent))"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-xl">
            Agendamentos, lembretes e gestão integrada — desenhado para clínicas que buscam excelência operacional e
            cuidado contínuo com o paciente.
          </p>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex h-14 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(224,80%,14%)] via-primary to-[hsl(217,91%,35%)] px-10 text-base font-semibold text-primary-foreground shadow-premium transition hover:shadow-glow"
            >
              Solicitar demonstração
            </Link>
            <Link
              href="/login"
              className="inline-flex h-14 items-center justify-center rounded-xl border border-primary/10 bg-secondary px-10 text-base font-semibold text-primary transition hover:border-primary/20 hover:bg-secondary/80"
            >
              Conheça a plataforma
            </Link>
          </div>
        </div>

        <div
          className="animate-fade-up relative mt-20 grid gap-6 lg:grid-cols-12 lg:gap-8"
          style={{ animationDelay: '0.15s' }}
        >
          <div className="group relative lg:col-span-7">
            <div className="relative aspect-[16/11] overflow-hidden rounded-[2rem] border border-border/40 shadow-premium">
              <Image
                src="/hero-clinic.jpg"
                alt="Profissional de saúde utilizando a plataforma ClínicaAgenda em um tablet"
                fill
                className="scale-105 object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-100"
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/50 via-primary/10 to-transparent mix-blend-multiply" />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(224,80%,14%)]/60 via-transparent to-transparent" />

              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4">
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-primary-foreground/70">
                    Em uso · todos os dias
                  </p>
                  <p className="font-display max-w-sm text-2xl font-semibold leading-tight text-primary-foreground md:text-3xl">
                    Tecnologia que respeita o tempo do médico.
                  </p>
                </div>
                <div className="hidden shrink-0 flex-col items-end sm:flex">
                  <span className="font-display text-4xl font-bold leading-none text-primary-foreground md:text-5xl">
                    120+
                  </span>
                  <span className="mt-1 text-[10px] uppercase tracking-widest text-primary-foreground/60">
                    clínicas ativas
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5 lg:col-span-5">
            <div className="relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-gradient-to-b from-card to-secondary/30 p-7 shadow-elegant">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.25em] text-accent">
                Redução média de faltas
              </p>
              <div className="mb-3 flex items-baseline gap-2">
                <span className="font-display text-7xl font-bold leading-none tracking-tighter text-primary md:text-8xl">
                  42
                </span>
                <span className="font-display text-3xl font-bold text-accent">%</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Pacientes confirmam, reagendam ou cancelam diretamente pelo canal que já utilizam todos os dias.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-secondary/20 p-5 shadow-card">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Confirmações / mês
                </p>
                <p className="font-display text-3xl font-bold tracking-tight text-primary">4.8k</p>
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="gradient-primary h-full w-2/3 rounded-full" />
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-secondary/20 p-5 shadow-card">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Tempo de implantação
                </p>
                <p className="font-display text-3xl font-bold tracking-tight text-primary">
                  24<span className="ml-1 text-lg text-muted-foreground">h</span>
                </p>
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="gradient-accent h-full w-1/2 rounded-full" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-secondary/40 p-5 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Conformidade
                  </p>
                  <p className="font-display mt-1 text-sm font-semibold text-primary">LGPD · boas práticas de dados</p>
                </div>
                <div className="flex -space-x-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="gradient-primary h-8 w-8 rounded-full border-2 border-background" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-24 border-t border-border/40 pt-10">
          <p className="mb-7 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            Confiado por clínicas em todo o Brasil
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-5 opacity-50">
            {['MedCare', 'VitaClin', 'SaúdeMais', 'ClinPro', 'BemEstar', 'VidaPlena'].map((name) => (
              <span key={name} className="font-display text-xl font-bold tracking-tight text-primary">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
