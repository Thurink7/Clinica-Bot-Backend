/** Remove não dígitos e valida tamanho + dígitos verificadores (CPF BR). */
export function validarCpfBr(cpfRaw) {
  const d = String(cpfRaw || '').replace(/\D/g, '');
  if (d.length !== 11) return { ok: false, message: 'O CPF deve ter 11 dígitos.' };
  if (/^(\d)\1{10}$/.test(d)) return { ok: false, message: 'CPF inválido (sequência repetida).' };
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(d[i], 10) * (10 - i);
  let r = (s * 10) % 11;
  if (r === 10) r = 0;
  if (r !== parseInt(d[9], 10)) return { ok: false, message: 'CPF inválido (dígito verificador).' };
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(d[i], 10) * (11 - i);
  r = (s * 10) % 11;
  if (r === 10) r = 0;
  if (r !== parseInt(d[10], 10)) return { ok: false, message: 'CPF inválido (dígito verificador).' };
  return { ok: true, digits: d };
}

/** DD/MM/AAAA -> { ok, iso } ou erro */
export function parseDataNascimentoBr(texto) {
  const t = String(texto || '').trim();
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return { ok: false, message: 'Use a data de nascimento no formato DD/MM/AAAA (ex.: 05/12/1990).' };
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  if (month < 1 || month > 12) return { ok: false, message: 'Mês inválido na data de nascimento.' };
  if (day < 1 || day > 31) return { ok: false, message: 'Dia inválido na data de nascimento.' };
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) {
    return { ok: false, message: 'Data de nascimento inexistente (verifique dia/mês/ano).' };
  }
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (dt > today) return { ok: false, message: 'A data de nascimento não pode ser no futuro.' };
  const ageYears = (today - dt) / (365.25 * 24 * 3600 * 1000);
  if (ageYears > 130) return { ok: false, message: 'Data de nascimento improvável.' };
  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { ok: true, iso, date: dt };
}
