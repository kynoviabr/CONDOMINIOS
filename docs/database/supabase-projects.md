# Supabase Projects

Kynovia Access separates Supabase resources by environment.

## Known Projects

| Environment | Project name | Project ref | Region | Status |
| --- | --- | --- | --- | --- |
| DEV (Ativo) | `Condominios` | `moriphxbocijjjhnblez` | `us-west-2` | Active |
| DEV (Anterior) | `Condominios` | `fviiwvpcbsriemmxpjxo` | `us-west-2` | Migrado |
| DEV (Legado) | `kynovia-access-dev` | `gexmghjenqourlovtelj` | `sa-east-1` | Inativo |
| STAGING | Pending | Pending | `sa-east-1` preferred | Requires cost confirmation |
| PROD | Pending | Pending | `sa-east-1` preferred | Requires cost confirmation |

## Creation Rules

- Create STAGING and PROD only after cost confirmation.
- Use separate projects for DEV, STAGING, and PROD.
- Apply migrations through the Supabase workflow; never edit remote schema manually.
- Keep production data out of DEV and STAGING seeds.
- Store credentials in GitHub Environments, Vercel, and local `.env.local`, never in Git.

## Environment Variables

Each environment must provide:

- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_ACCESS_TOKEN`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The repo also exposes explicit environment-specific placeholders in `.env.example`:

- `*_DEV`
- `*_STAGING`
- `*_PROD`

## Promotion Path

1. Develop and validate migrations locally.
2. Apply to DEV.
3. Validate DEV with seed data.
4. Apply to STAGING with production-like configuration.
5. Validate release candidate.
6. Apply to PROD after release approval.
