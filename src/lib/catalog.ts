/**
 * Catalog data-access (service-role only). Server routes import this —
 * never from client components.
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export type DomainRow = {
  id: string;
  key: string;
  name: string;
  weight_pct: number;
  sort: number;
};

export type ExamDetail = {
  id: string;
  code: string;
  name: string;
  version: string;
  blueprint_doc: string;
  status: string;
  pass_threshold_pct: number;
  question_count: number;
  duration_minutes: number;
  /** Unscored beta items mixed into exam sittings (CONTENT-002). */
  beta_mix_ratio: number;
  domains: DomainRow[];
};

export type VendorWithCerts = {
  id: string;
  key: string;
  name: string;
  certifications: {
    id: string;
    key: string;
    name: string;
    exams: {
      id: string;
      code: string;
      name: string;
      status: string;
      question_count: number;
      duration_minutes: number;
    }[];
  }[];
};

function admin() {
  if (!supabaseAdmin) {
    throw new Error('supabaseAdmin is not configured (SUPABASE_SERVICE_ROLE_KEY)');
  }
  return supabaseAdmin;
}

/** Live catalog: vendors → certs → live exams. */
export async function listCatalog(): Promise<VendorWithCerts[]> {
  const db = admin();
  const { data: vendors, error: vErr } = await db
    .from('vendors')
    .select('id, key, name')
    .order('key');
  if (vErr) throw vErr;
  const { data: certs, error: cErr } = await db
    .from('certifications')
    .select('id, key, name, vendor_id')
    .order('key');
  if (cErr) throw cErr;
  const { data: exams, error: eErr } = await db
    .from('exams')
    .select('id, code, name, status, question_count, duration_minutes, certification_id')
    .eq('status', 'live')
    .order('code');
  if (eErr) throw eErr;

  return (vendors ?? []).map((v) => ({
    id: v.id,
    key: v.key,
    name: v.name,
    certifications: (certs ?? [])
      .filter((c) => c.vendor_id === v.id)
      .map((c) => ({
        id: c.id,
        key: c.key,
        name: c.name,
        exams: (exams ?? [])
          .filter((e) => e.certification_id === c.id)
          .map((e) => ({
            id: e.id,
            code: e.code,
            name: e.name,
            status: e.status,
            question_count: e.question_count,
            duration_minutes: e.duration_minutes,
          })),
      })),
  }));
}

/** Live exam by code with domains, or null. */
export async function examByCode(code: string): Promise<ExamDetail | null> {
  const db = admin();
  const { data: exam, error } = await db
    .from('exams')
    .select(
      'id, code, name, version, blueprint_doc, status, pass_threshold_pct, question_count, duration_minutes, beta_mix_ratio'
    )
    .eq('code', code)
    .eq('status', 'live')
    .maybeSingle();
  if (error) throw error;
  if (!exam) return null;

  const { data: domains, error: dErr } = await db
    .from('domains')
    .select('id, key, name, weight_pct, sort')
    .eq('exam_id', exam.id)
    .order('sort');
  if (dErr) throw dErr;

  return {
    id: exam.id,
    code: exam.code,
    name: exam.name,
    version: exam.version,
    blueprint_doc: exam.blueprint_doc,
    status: exam.status,
    pass_threshold_pct: exam.pass_threshold_pct,
    question_count: exam.question_count,
    duration_minutes: exam.duration_minutes,
    beta_mix_ratio: Number(exam.beta_mix_ratio ?? 0),
    domains: (domains ?? []).map((d) => ({
      id: d.id,
      key: d.key,
      name: d.name,
      weight_pct: Number(d.weight_pct),
      sort: d.sort,
    })),
  };
}
