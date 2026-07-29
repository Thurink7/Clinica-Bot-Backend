import { getStoredToken } from '@/lib/session';

const base = () =>
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

export type FetchJsonOptions = RequestInit & { skipAuth?: boolean };

export async function fetchJson<T>(path: string, init?: FetchJsonOptions): Promise<T> {
  const method = (init?.method || 'GET').toUpperCase();
  const { skipAuth, ...rest } = init || {};
  const headers = new Headers(rest?.headers as HeadersInit);
  if (method !== 'GET' && method !== 'HEAD' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!skipAuth && typeof window !== 'undefined') {
    const t = getStoredToken();
    if (t) headers.set('Authorization', `Bearer ${t}`);
  }

  const url = `${base()}${path}`;

  let res: Response;
  try {
    res = await fetch(url, { ...rest, headers });
  } catch (e) {
    const hint =
      typeof window !== 'undefined' &&
      !window.location.hostname.includes('localhost') &&
      base().includes('localhost')
        ? ' Defina NEXT_PUBLIC_API_URL no Vercel (Production e Preview) e faça redeploy.'
        : ' Verifique se a API está no ar, CORS e URL pública (HTTPS).';
    throw new Error(
      e instanceof Error && e.message === 'Failed to fetch'
        ? `Falha de rede ao chamar a API (${url}).${hint}`
        : e instanceof Error
          ? e.message
          : `${e}`
    );
  }

  if (!res.ok) {
    const text = await res.text();
    let message = text || res.statusText;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (j?.error) message = j.error;
    } catch {
      /* texto plano */
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type Consulta = {
  id: string;
  nomePaciente: string;
  telefone: string;
  data: string;
  hora: string;
  profissionalId?: string | null;
  servico?: string | null;
  cpf?: string | null;
  dataNascimento?: string | null;
  status: 'agendado' | 'confirmado' | 'cancelado';
};

export type Profissional = {
  id: string;
  nome: string;
  servicos: string[];
  ativo: boolean;
  especialidade?: string;
  telefone?: string;
  email?: string;
};

export type ClinicConfig = {
  open: string;
  close: string;
  duracaoMinutos: number;
  diasUteis: number[];
};

export type PacienteRow = {
  id?: string;
  telefone: string;
  nome: string;
  cpf?: string | null;
  dataNascimento?: string | null;
  observacoes?: string | null;
  consultas: {
    id: string;
    data: string;
    hora: string;
    status: string;
    profissionalId?: string | null;
    servico?: string | null;
  }[];
};
