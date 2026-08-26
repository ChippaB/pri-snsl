# Polytechnic Resources Inc. — Product & Agent Context

This file is the company-level brief for anyone (including coding agents) working on Polytechnic Resources Inc. (“PRI”) systems.

It is not a design-token file, not a runbook, and not a substitute for each repository’s own `AGENTS.md`, `CLAUDE.md`, `DESIGN.md`, or `DESIGN_ALIGNMENT.md`. Those files stay authoritative for that product. This file is the shared context that should not have to be re-explained at the start of every project.

---

## Company

PRI manufactures pulmonary function testing (PFT) filtration products for a B2B distributor network.

Primary operational contact for orders and related systems: `orders@polytechres.com`.

These repositories and applications are PRI company assets. Write them as if a successor maintainer, an auditor, or a new contractor will read them with no private chat history.

---

## Who uses these systems

Daily users are not software developers. Design and copy must assume that.

| Audience | Where they work | What they need |
|---|---|---|
| Production operators | Tablets and shop-floor browsers | One next action, large controls, plain result language (`Saved`, `Queued`, `Duplicate`, `Set aside`) |
| Supervisors | Same floor tools, plus review dashboards | Exception handling, not extra configuration |
| Office / admin staff | Portal admin, exports, shipment follow-up | Task steps, not schema or CLI |
| Distributor customers | Public site and B2B portal | Catalog, pricing, orders, shipment visibility |

Do not ship maintainer chrome to these audiences: environment badges, repo names, role jargon, raw barcodes on operator tables, stack traces, or “click here if you know SQL.”

If a screen needs a paragraph of training, the screen is wrong.

---

## Product map

Treat these as separate live products that share a company, not as one app.

| Product | Role | Live posture |
|---|---|---|
| **pri-web** | Public marketing site | Live. Static site. No application database. |
| **pri-b2b-store** | Distributor ordering portal (admin + customer) | Live. Orders, contract pricing, QuickBooks CSV export, shipment visibility. |
| **pri-snsl** | Serial-number scan log (PWA) | Live. Shop-floor scanning to Supabase, with local queue when the network is down. |
| **pri-ltl-skid-builder** | LTL / skid build and scan | Live operator tool. Visual rulebook is that repo’s `DESIGN.md`. |
| **pri-startup-verification** | WI030 start-up verification prototype | Prototype only. Paper / controlled build sheets remain the official quality record. |

Operational files (QuickBooks exports, WorldShip CSVs, reconciliation notes) are not product source. Keep them out of application repositories unless they are intentional fixtures or documentation samples.

Local feature worktrees and archives of `pri-b2b-store` are not additional products. The active application repo is the current storefront checkout, not a dated copy or a one-off branch folder.

---

## Rules that apply to every PRI product

1. **Read live systems as live.** Default to inspect and draft. Do not push, deploy, migrate, send email, trigger cron, call a carrier, or write production data without explicit written approval naming the target.
2. **One primary action per screen.** Prefer deleting or merging UI over adding surface area.
3. **Plain language.** Sentence case. Say what happened and what to do next. Operators should never need a developer to interpret a result.
4. **Fail closed and fail readable.** Export, scan, and checkout paths must be idempotent. Duplicates, retries, and double-submits must not create a second real record.
5. **Do not invent source-of-truth.** QuickBooks, WorldShip, controlled quality documents, and production databases win over assumptions. Off-site development machines do not have the client accounting or shipping workstations. Confirm those systems from client-provided exports, screenshots, or an on-site session.

Secrets, service-role keys, and production credentials never belong in git, tickets, or agent transcripts.

---

## Design: what is shared, what is not

**Public site and B2B portal** share company identity. Follow `DESIGN_ALIGNMENT.md` in those repositories: same PRI brand color foundation, same header/logo treatment, same container and control-radius language. Density may differ (marketing vs. operational portal). Primitives must not drift independently.

**Shop-floor tools** (serial scan, skid builder, start-up verification) are operator-first. They may use a calmer, denser visual system documented in that product’s `DESIGN.md`. Do not paste marketing layout, particle effects, or editorial chrome onto a scan surface.

Do not introduce a second brand palette, environment badges, or off-brand accent colors “to make it look like a demo.”

---

## How to use this file in a repository

Keep a copy of this file in each product repository. Put a short pointer at the top of that repository’s agent guide (`AGENTS.md` or `CLAUDE.md`). Keep product-specific rules in that repository:

- **Visual tokens / operator layout** → `DESIGN.md` or `DESIGN_ALIGNMENT.md`
- **How to build and change this codebase** → `AGENTS.md` / `CLAUDE.md`
- **How a person runs the tool today** → operator handbook or operations user guide

If a fact is true for every PRI product, it belongs here. If it is true for only one product, it does not.

---

## Out of scope

- One-off order numbers, incident logs, or production credentials
- Treating a prototype as the official quality record. Controlled paper (for example WI030 and build sheets) stays authoritative until quality leadership documents a change.
