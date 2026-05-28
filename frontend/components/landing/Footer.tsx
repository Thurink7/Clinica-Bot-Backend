import Image from 'next/image';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-primary-deep py-16 text-primary-foreground">
      <div className="container mx-auto px-6">
        <div className="mb-12 grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="mb-4 flex items-center gap-2.5">
              <Image src="/logo1.png" alt="Clínica Agenda" width={36} height={36} className="h-9 w-9 rounded-xl object-contain" />
              <span className="font-display text-lg font-bold">
                Clínica<span className="text-accent">Agenda</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-primary-foreground/60">
              A plataforma B2B que reduz faltas e automatiza o WhatsApp da sua clínica.
            </p>
          </div>

          {[
            { title: 'Produto', links: ['Recursos', 'Preços', 'Integrações', 'Segurança'] },
            { title: 'Empresa', links: ['Sobre', 'Blog', 'Carreiras', 'Contato'] },
            { title: 'Suporte', links: ['Central de ajuda', 'Documentação', 'LGPD', 'Termos'] },
          ].map((col) => (
            <div key={col.title}>
              <p className="font-display mb-4 text-sm font-semibold">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-primary-foreground/60 transition-colors hover:text-accent">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-primary-foreground/10 pt-8 sm:flex-row">
          <p className="text-sm text-primary-foreground/50">
            © {new Date().getFullYear()} ClínicaAgenda. Todos os direitos reservados.
          </p>
          <p className="text-xs text-primary-foreground/40">
            <Link href="/login" className="hover:text-accent">
              Entrar no painel
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
