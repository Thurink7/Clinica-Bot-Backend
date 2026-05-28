'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass border-b border-border/40 py-3' : 'bg-transparent py-5'
      }`}
    >
      <nav className="container mx-auto flex items-center justify-between px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <Image
            src="/logo1.png"
            alt="Clínica Agenda"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-xl object-contain shadow-md transition-all group-hover:shadow-glow"
          />
          <span className="font-display text-lg font-bold tracking-tight text-primary">
            Clínica<span className="text-accent">Agenda</span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a href="#beneficios" className="transition-colors hover:text-primary">
            Benefícios
          </a>
          <a href="#funcionamento" className="transition-colors hover:text-primary">
            Como funciona
          </a>
          <a href="#recursos" className="transition-colors hover:text-primary">
            Recursos
          </a>
          <a href="#precos" className="transition-colors hover:text-primary">
            Preços
          </a>
          <a href="#faq" className="transition-colors hover:text-primary">
            FAQ
          </a>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden h-10 items-center rounded-lg px-3 text-sm font-medium text-primary hover:bg-secondary/60 sm:inline-flex"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="hidden h-10 items-center rounded-lg px-3 text-sm font-medium text-primary hover:bg-secondary/60 sm:inline-flex"
          >
            Aderir
          </Link>
          <Link
            href="/cadastro"
            className="inline-flex h-10 items-center rounded-xl bg-gradient-to-br from-[hsl(224,80%,14%)] via-primary to-[hsl(217,91%,35%)] px-5 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:shadow-glow"
          >
            Fale conosco
          </Link>
        </div>
      </nav>
    </header>
  );
}
