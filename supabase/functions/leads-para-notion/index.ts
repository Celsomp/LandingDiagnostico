// leads-para-notion
// Chamada pelo webhook da base de dados (INSERT/UPDATE em public.leads).
// Do pedido usa-se SÓ o id: a lead é sempre relida da tabela, por isso um pedido
// forjado não consegue escrever dados no Notion, só forçar a resincronização de uma lead que já existe.
// Escreve apenas os campos automáticos. Fase (só na criação), Próximo contacto e Notas são do Celso.
// Em cada chamada reenvia até 5 leads antigas que ainda não têm ficha (auto-reparação).
// Desde 2026-10-17 (v7), as leads do Mapa (origem 'mapa') não vão para o Notion: vivem no systeme.io.
// Ficam fora da sincronização e do reenvio; as fichas que já existem não mudam. As outras origens seguem iguais.
// Para diagnosticar falhas: net._http_response mostra { ok, sincronizadas, falhas }; o detalhe vai para os logs da função.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const NOTION_VERSION = "2022-06-28";
const DATABASE_ID = "ead62036d5ae4498b717aea510aa398a"; // Leads · CRM
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const NOTION_TOKEN = Deno.env.get("NOTION_TOKEN") ?? "";

const COLUNAS =
  "id,criado_em,origem,nome,email,whatsapp,nicho,oferta_e_preco,audiencia,trava,interesse,estado,resumo,respostas,anti_fit,notion_page_id";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ORIGEM: Record<string, string> = { whatsapp: "WhatsApp", mapa: "Mapa de automação" };
const INTERESSE: Record<string, string> = {
  website: "Website",
  funil: "Funil",
  agentes: "Agentes de IA",
  "crm-sdr": "CRM / SDR",
  estrategia: "Estratégia",
};
const TEMPERATURA: Record<string, string> = { quente: "Quente", morno: "Morno", frio: "Frio", "anti-fit": "Anti-fit" };

type Lead = Record<string, any>;

// Origens que não vão para o Notion. O reenvio filtra o mesmo na consulta (origem.neq.mapa).
const ORIGENS_FORA = new Set(["mapa"]);
const vaiParaNotion = (l: Lead) => !ORIGENS_FORA.has(l.origem);

function texto(valor: unknown, max = 2000) {
  if (valor === null || valor === undefined || valor === "") return [];
  return [{ type: "text", text: { content: String(valor).slice(0, max) } }];
}
const rico = (v: unknown) => ({ rich_text: texto(v) });
const escolha = (v: string | null | undefined) => ({ select: v ? { name: v } : null });

function propriedades(l: Lead, criar: boolean) {
  const interesse = (l.interesse && INTERESSE[l.interesse]) || null;
  const temperatura = (l.estado && TEMPERATURA[l.estado]) || (l.anti_fit ? "Anti-fit" : null);
  const p: Record<string, unknown> = {
    "Nome": { title: texto(l.nome || l.email || l.whatsapp || "Sem nome", 200) },
    "Email": { email: l.email ?? null },
    "WhatsApp": { phone_number: l.whatsapp ?? null },
    "Origem": escolha(ORIGEM[l.origem]),
    "Interesse": escolha(interesse),
    "Temperatura": escolha(temperatura),
    "Nas palavras dela": rico(l.trava),
    "Frase do Mapa": rico(l.respostas?.motivo),
    "Resumo": rico(l.resumo),
    "Nicho": rico(l.nicho),
    "Oferta e preço": rico(l.oferta_e_preco),
    "Audiência": rico(l.audiencia),
    "Entrou em": { date: { start: l.criado_em } },
    "ID Supabase": rico(l.id),
  };
  if (criar) p["Fase"] = escolha(l.anti_fit || l.estado === "anti-fit" ? "Nutrir 90 dias" : l.origem === "mapa" ? "Mapa feito" : "Novo");
  return p;
}

async function notion(caminho: string, metodo: string, corpo?: unknown) {
  const res = await fetch(`https://api.notion.com/v1${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${NOTION_TOKEN}`, "Notion-Version": NOTION_VERSION, "Content-Type": "application/json" },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (!res.ok) throw new Error(`notion ${metodo}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return await res.json();
}

async function tabela(caminho: string, init: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${caminho}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`supabase ${init.method ?? "GET"}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res.status === 204 ? null : await res.json().catch(() => null);
}

async function obterLead(id: string): Promise<Lead | null> {
  const linhas = await tabela(`/leads?select=${COLUNAS}&id=eq.${id}&limit=1`);
  return Array.isArray(linhas) && linhas[0] ? linhas[0] : null;
}

/** Evita fichas duplicadas: procura no Notion uma ficha com o mesmo ID Supabase. */
async function fichaExistente(id: string): Promise<string | null> {
  const r = await notion(`/databases/${DATABASE_ID}/query`, "POST", { filter: { property: "ID Supabase", rich_text: { equals: id } }, page_size: 1 });
  return r?.results?.[0]?.id ?? null;
}

async function sincronizar(l: Lead) {
  let pagina = l.notion_page_id ?? (await fichaExistente(l.id));
  if (pagina) {
    await notion(`/pages/${pagina}`, "PATCH", { properties: propriedades(l, false) });
  } else {
    const criada = await notion("/pages", "POST", { parent: { database_id: DATABASE_ID }, properties: propriedades(l, true) });
    pagina = criada.id as string;
  }
  if (pagina && pagina !== l.notion_page_id) {
    await tabela(`/leads?id=eq.${l.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ notion_page_id: pagina }) });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return Response.json({ ok: false }, { status: 405 });
  if (!NOTION_TOKEN || !SUPABASE_URL || !SERVICE_KEY) {
    console.error("[leads-para-notion] falta NOTION_TOKEN ou a configuração do Supabase");
    return Response.json({ ok: false }, { status: 500 });
  }

  let id: unknown = null;
  try { id = (await req.json())?.record?.id; } catch { /* sem corpo: só corre o reenvio */ }

  let sincronizadas = 0;
  let falhas = 0;

  if (typeof id === "string" && UUID.test(id)) {
    try {
      const lead = await obterLead(id);
      if (lead && vaiParaNotion(lead)) { await sincronizar(lead); sincronizadas++; }
    } catch (e) {
      falhas++;
      console.error("[leads-para-notion] lead", id, (e as Error).message);
    }
  }

  // Reenvio: leads com mais de 2 minutos ainda sem ficha (falhas anteriores).
  try {
    const limite = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const pendentes = (await tabela(`/leads?select=${COLUNAS}&notion_page_id=is.null&or=(origem.is.null,origem.neq.mapa)&criado_em=lt.${encodeURIComponent(limite)}&order=criado_em.asc&limit=5`)) as Lead[];
    for (const lead of pendentes ?? []) {
      if (lead.id === id || !vaiParaNotion(lead)) continue;
      try { await sincronizar(lead); sincronizadas++; }
      catch (e) { falhas++; console.error("[leads-para-notion] reenvio", lead.id, (e as Error).message); }
    }
  } catch (e) {
    console.error("[leads-para-notion] leitura de pendentes", (e as Error).message);
  }

  return Response.json({ ok: falhas === 0, sincronizadas, falhas });
});
