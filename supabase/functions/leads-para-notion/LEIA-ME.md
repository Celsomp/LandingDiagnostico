# leads-para-notion

Edge Function do projecto Supabase **Claude** (`djmlvxjihzatuhlzfitx`). Cria ou actualiza a ficha
de cada lead na base "Leads · CRM" do Notion. É chamada pelo gatilho `leads_para_notion`
(AFTER INSERT OR UPDATE em `public.leads`).

- `index.ts`: a versão publicada (**v7**, 2026-10-17). As leads com `origem = 'mapa'` ficam de
  fora, na sincronização directa e no reenvio, porque vivem no systeme.io. As fichas antigas do
  Mapa no Notion ficam congeladas.
- `v6-referencia.ts`: a versão anterior, tal como estava publicada. Serve só para voltar atrás.

Este código **não é publicado a partir daqui**. Publica-se no Supabase (`verify_jwt: true`),
e esta pasta tem de ficar igual ao que está lá. A pasta está no `.vercelignore`.
