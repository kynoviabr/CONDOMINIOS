# Kynovia Design Tokens

Fonte: Clinova (`/Users/dempas/Documents/remix-of-clinic-journey`).

## Princípios

- Clareza operacional em poucos segundos.
- Superfícies administrativas densas, porém legíveis.
- Tokens semânticos em vez de cores hardcoded nas telas.
- Foco visível, contraste AA e estados consistentes.
- Modais/drawers para manutenção; listas/tabelas para leitura em escala.

## Cores Base

| Token | HSL | Uso |
| --- | --- | --- |
| `--background` | `210 38% 97%` | Fundo principal da página |
| `--foreground` | `210 72% 15%` | Texto principal |
| `--bg-navy` | `210 72% 15%` | Sidebar/nav escura |
| `--bg-page` | `210 38% 97%` | Fundo de app |
| `--bg-surface` | `0 0% 100%` | Cards e painéis |
| `--bg-subtle` | `210 38% 96%` | Áreas sutis e filtros |
| `--card` | `0 0% 100%` | Card padrão |
| `--card-foreground` | `210 72% 15%` | Texto em card |
| `--popover` | `0 0% 100%` | Popovers/modais |
| `--popover-foreground` | `210 72% 15%` | Texto em popover |

## Marca

| Token | HSL | Uso |
| --- | --- | --- |
| `--primary` | `243 100% 68%` | Ação primária |
| `--primary-foreground` | `0 0% 100%` | Texto sobre primária |
| `--primary-dark` | `243 75% 59%` | Hover/ênfase |
| `--primary-light` | `243 100% 95%` | Fundo de destaque |
| `--accent` | `190 100% 50%` | Acento informativo |
| `--accent-foreground` | `210 72% 15%` | Texto sobre acento |

## Texto e Superfícies

| Token | HSL | Uso |
| --- | --- | --- |
| `--secondary` | `210 38% 96%` | Botões/áreas secundárias |
| `--secondary-foreground` | `210 72% 15%` | Texto secundário |
| `--muted` | `210 38% 96%` | Fundo discreto |
| `--muted-foreground` | `213 19% 33%` | Texto de apoio |
| `--text-secondary` | `213 19% 33%` | Texto secundário |
| `--text-muted` | `211 17% 57%` | Texto auxiliar |

## Estados

| Token | HSL | Uso |
| --- | --- | --- |
| `--destructive` | `348 78% 49%` | Erro/destrutivo |
| `--danger-bg` | `343 71% 94%` | Fundo de erro |
| `--success` | `152 79% 27%` | Sucesso |
| `--success-bg` | `144 64% 89%` | Fundo de sucesso |
| `--warning` | `31 100% 29%` | Atenção |
| `--warning-bg` | `48 100% 90%` | Fundo de atenção |
| `--info` | `243 75% 59%` | Informação |
| `--info-bg` | `243 100% 95%` | Fundo informativo |

## Bordas, Foco e Layout

| Token | Valor | Uso |
| --- | --- | --- |
| `--border` | `214 32% 91%` | Borda padrão |
| `--input` | `214 32% 91%` | Borda de campo |
| `--border-hover` | `214 14% 79%` | Hover de borda |
| `--ring` | `243 100% 68%` | Focus ring |
| `--radius` | `0.625rem` | Raio base |
| `--radius-chip` | `4px` | Chips/badges |
| `--radius-btn` | `6px` | Botões |
| `--radius-card` | `10px` | Cards |
| `--radius-modal` | `20px` | Modais |
| `--radius-pill` | `9999px` | Pills |

## Sombras

| Token | Valor |
| --- | --- |
| `--shadow-sm` | `0 2px 5px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.08)` |
| `--shadow-md` | `0 8px 24px rgba(149,157,165,.15)` |
| `--shadow-lg` | `0 16px 48px rgba(10,37,64,.12)` |
| `--shadow-xl` | `0 24px 64px rgba(0,0,0,.32)` |
| `--shadow-focus` | `0 0 0 3px rgba(99,91,255,.18)` |
| `--shadow-glow` | `0 8px 24px rgba(99,91,255,.18)` |

## Tipografia

- Heading: `DM Sans`.
- Body: `Inter`.
- Mono: `SF Mono`, Menlo, Consolas.
- H1: 30-36px, semibold.
- H2: 24-28px, semibold.
- Body: 14-16px, regular.
- Label/auxiliar: 12-14px, medium/regular conforme densidade.

## Utilitários Compartilhados

- `.gradient-primary`
- `.gradient-accent`
- `.gradient-hero`
- `.gradient-surface`
- `.shadow-card`
- `.shadow-card-hover`
- `.shadow-glow`
- `.shadow-focus-ring`
- `.glass`
- `.glass-navy`
- `.label-stripe`
- `.focus-stripe`
- `.skeleton-shimmer`
