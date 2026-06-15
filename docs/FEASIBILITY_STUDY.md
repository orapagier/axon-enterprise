# Mindanao Fresh Hub (MFH) — Feasibility Study & Business Assessment

*Independent commercial review. Assesses the as-built system (Medusa v2 + Next.js,
Phases A–H complete), the founder's locked-in business decisions, and the Tagum
City / Philippine agri-ecommerce market. Prepared 2026-06-15.*

> Companion artifact: [`unit-economics.html`](./unit-economics.html) — an interactive
> per-order break-even calculator. Open it in a browser and plug in real numbers.

---

## 1. Bottom line up front (the verdict)

**MFH is feasible as a profitable local SME — but only if it is run primarily as a
physical produce-aggregation hub with a digital storefront bolted on, not as a tech
marketplace that happens to sell vegetables.** The software is far ahead of the
business. Build risk is essentially zero; *demand and unit-economics risk* is
essentially unvalidated.

| Outcome | Likelihood | What it looks like |
|---|---|---|
| **Viable single-hub local business** (Tagum cash-flow positive, founder-run, modest profit) | **Moderate–good (~50–60%)** | Hub buys/resells produce + a few hundred online orders/week within 18–24 months |
| **Multi-city expansion** (3+ hubs, real regional brand) | **Low (~15–20%)** | Requires hub #1 to prove unit economics *and* external capital or strong reinvestment |
| **Venture-scale "the Mayani of Mindanao"** | **Very low (<5%)** | Wrong structure/capital for it; lane already contested |

**Pace:** Slow first 6–12 months (normal, not a failure signal), gradual traction
in months 12–24 if the wedge is right, real expansion go/no-go at ~month 18–24.

---

## 2. What you've actually built (grounding)

A hub-and-spoke fresh-produce platform for **Tagum City (pop. 300,042, 2024 census)**,
the largest component city in Mindanao, in a province where agriculture is **27.5% of
the economy**.

- **One physical hub per city** (Tagum only at launch); all operations hub-local.
- **Four stackable roles:** Consumer, Producer (farmer-seller), Trader (B2B, −10% default), Rider.
- **Two supply modes:** *direct-to-consumer* (producer is seller, you take commission)
  and *sell-to-freshhub* (you buy at pickup and resell at a margin — you become a
  produce wholesaler/retailer).
- **Payments: COD + walk-in OTC only** (no online gateway — no PayMongo budget). OTC
  doubles as the prepay rail for distrusted buyers.
- **Rider-driven batch delivery** (noon cutoff → 4pm dispatch); cash ledger where
  *delivered ≠ remitted*; rider strikes for aged unremitted cash.
- **Buyer accountability:** refusal → dispute → strike → prepay-lock, with SLAs/appeals.
- **Revenue streams:** yearly seller/trader registration fees, DTC commission, retail
  margin on sell-to-hub produce, delivery fees, walk-in counter sales.

A genuinely sophisticated, complete system — the good news and a yellow flag at once
(see §7).

---

## 3. Market opportunity

**Demand (consumers):** ~300k people, growing region (Davao del Norte GDP +5.4% in
2024; agri-industrial development a stated provincial priority through 2028). But fresh
produce is the *hardest* category to move online: low-margin, high-frequency,
touch-and-feel, habitual. Filipinos overwhelmingly still buy vegetables at the
**palengke, talipapa, and sari-sari stores**. Realistic early adopters: time-poor
dual-income households, OFW families, small carinderias/eateries, and volume traders —
*not* the mass market.

**Supply (producers):** Structural advantage. You sit in a region that *grows* rice,
bananas, coconut, and vegetables. The *sell-to-freshhub* mode lets you control
inventory directly rather than wait for farmer self-service adoption.

**Realistic addressable market:** Think households (~75–80k), not population. A
serviceable obtainable market of a **few hundred to low-thousands of active buyers** in
24 months would be real success at this scale. Model ~1–3k reachable buying households,
not 300k.

---

## 4. Competitive landscape

| Competitor | Threat | Edge dynamics |
|---|---|---|
| **Palengke / talipapa / sari-sari** | The real incumbent | They win on price, freshness perception, habit, instant gratification. You win on convenience + delivery + transparency. |
| **Facebook Marketplace / FB Live / Viber groups** | High, underrated | Free, zero-friction, where local sellers already are. Your edge: structured logistics, accountability, COD reconciliation, trust. |
| **Mayani / national agritech** | Low locally | Manila-based, B2B/institutional, $1.7M-funded (AgFunder/ADB), 60k–144k farmers — focused on supply chain & institutional buyers, not Tagum retail. Potential partner/acquirer, not street competitor. |
| **Grab/foodpanda mart, Lazada/Shopee grocery** | Low–medium | Weak in fresh produce and Tagum-specific sourcing. |

**Most dangerous competitor:** a **free Facebook group** and the **palengke** — not a
startup. Defensible wedge = reliable batched delivery + cash accountability + dispute
fairness + curated quality guarantee, which informal channels can't offer.

---

## 5. Unit economics — the make-or-break

Produce is thin-margin (typically 15–30% gross at retail; lower for staples). This is
where most agri-ecommerce dies. Illustrative shape (replace with real numbers via the
calculator):

```
Avg basket ............................... ₱500
Gross margin on sell-to-hub produce ...... 25%   → ₱125 gross
DTC commission (when applicable) ......... 10–15%
Delivery cost per order (batched) ........ ₱40–₱90 (fuel + rider share, amortized)
Spoilage / shrink on perishables ......... 5–15% of inventory value
Payment leakage (COD shortfall/refusal) .. real
```

**Two structural margin leaks, both real here:**

1. **Free delivery tier.** "Free if in-city + before noon cutoff" gives away the whole
   delivery cost on a ₱125-gross order. **Enforce a free-delivery minimum basket**
   (e.g. ₱400–600) or it bleeds silently.
2. **COD leakage.** Nationally ~68% prefer COD, but COD **failed-delivery ~15%** and
   **RTO/returns 12–40%** in SEA — worse for perishables (refused produce often can't be
   restocked). Your strike/prepay-lock/same-day-resale design is a strong mitigation and
   probably your best risk feature, but it caps damage, not first-refusal write-off.

**Implication:** the **sell-to-freshhub + walk-in OTC counter** is the reliable profit
engine (controlled inventory, immediate cash, no delivery/COD risk). **DTC + delivery is
the growth layer that must stay margin-disciplined.** Run the business in that priority.

---

## 6. Operational feasibility

**Strengths**
- **The physical hub solves the marketplace cold-start** most two-sided platforms die
  from — you can buy/sell inventory yourself from day one. Smartest structural decision
  in the design.
- **Batch dispatch** (not on-demand) is right at this density; deferring the rider
  first-grab PWA was correct.
- **Cash accountability** (rider strikes, delivered≠remitted, aging reconciliation) is
  unusually rigorous and targets the #1 local loss vector: cash walking off.

**Hard risks**
- **"Special ~1h delivery" vs. batch reality.** A batch model can't reliably do 1-hour
  delivery. Build a real on-demand lane or rename/reprice it honestly.
- **Cold chain in tropical heat.** Quality degrades between pickup, hub, and 4pm
  dispatch — a capex/handling question software can't solve.
- **Founder bandwidth.** Manual ops at launch (GCash verification, listing approval,
  cash reconciliation, disputes). Plan the first ops/hub-manager hire *before* scaling
  demand.
- **Rider supply & honesty.** Cash-bond + strikes help, but recruiting/retaining honest
  riders in a cash business is a perpetual grind.

---

## 7. Financial feasibility & the build-vs-validation gap

**Cost structure is favorable** — no online-payment fees (COD/OTC), self-hosted
open-source stack, no paid marketing, in-house software. Launch capex is modest: hub
rent, refrigeration/handling, inventory float, rider bonds, COD working-capital float.
This is a **lifestyle-business cost structure, not a venture burn** — appropriate and
de-risking.

**Yellow flag:** An enormous amount of software (Phases A–H, AI assistant, web push,
PWA, referral credits, Telegram alerts, trader pricing, producer payouts, dispute
appeals) was built **before validating that Tagum consumers will repeatedly buy produce
online.** Classic pre-PMF over-engineering. The riskiest assumption —

> *Will enough Tagum households reorder produce online at a basket size and frequency
> that covers delivery + spoilage?*

— **cannot be answered with more code.** **Freeze features; run a 90-day commercial
pilot.** You are over-built, not under-built.

---

## 8. Key risks, ranked

1. **Demand adoption (existential).** Changing habitual palengke behavior is unproven.
   *Mitigate:* tight beachhead, free-delivery minimum, referral push.
2. **Perishable margin economics.** Spoilage + free delivery + COD write-offs can turn
   every order unprofitable. *Mitigate:* basket minimums, lead with sell-to-hub, measure
   margin per order from day 1.
3. **COD cash leakage & refusals.** Mitigated better than most, still bleeds on perishables.
4. **Premium "1h" over-promise.** Reputational; fix the promise.
5. **Founder/ops capacity ceiling.** Plan the first ops hire.
6. **Cold-chain quality** in tropical conditions.
7. **Membership friction.** Charging sellers a yearly fee *before* proving you drive them
   sales is a cold-start tax — consider waiving/deferring early-seller fees.

---

## 9. Success likelihood & realistic pace

**Phase 0 — Pilot (Months 0–6):** Slow, manual. A few dozen orders/week. Walk-in
counter + sell-to-hub resale carry cash flow. *Slowness is expected — don't
panic-pivot.* Goal: prove reorder behavior and per-order margin on a small real cohort.

**Phase 1 — Traction (Months 6–18):** If a repeatable wedge is found, grind to ~50–150
orders/week. Build seller density, hire first ops person, tighten delivery economics.
Target: single-hub contribution-positive.

**Phase 2 — Go/No-Go (Months 18–24):** Consider a 2nd city only if Tagum is genuinely
unit-profitable and repeatable. Multi-hub code is ready; *business-model proof* is the
gate, not software.

**Leading indicators (your real KPIs):**
- 30/60-day **buyer reorder rate** (the single most important number)
- **Margin per delivered order** *after* delivery + spoilage + COD loss
- **Free-tier % of orders** and its margin drag
- **COD refusal/RTO rate** and write-off pesos
- **Active sellers with real inventory** (supply density)

---

## 10. Strategic recommendations

1. **Reframe: physical hub first, app second.** Lead with sell-to-hub resale + walk-in
   counter; treat DTC delivery as the growth layer.
2. **Freeze features. Run a 90-day commercial pilot.** You are over-built.
3. **Put a minimum basket on free delivery immediately.** Most likely silent profit killer.
4. **Fix or rename the "1-hour Special" tier** to match batch reality.
5. **Waive/defer early seller fees** to bootstrap supply density; turn on once you
   demonstrably drive sellers volume.
6. **Instrument margin-per-order and reorder-rate now** — these decide the company.
7. **Don't expand to a 2nd city until Tagum is unit-profitable**, regardless of code readiness.

**Net:** A real business with an unusually strong technical/operational backbone and a
genuinely smart cold-start solution (the physical hub). Most likely succeeds as a
**profitable Tagum SME**, grows **slowly but durably**, and is tested not in engineering
but in **consumer habit change and perishable margins**. Bet on it as a disciplined
local operator; not as a rocket.

---

## Sources

- [PSA — Tagum / Davao del Norte 2024 Census (pop. 300,042)](https://rsso11.psa.gov.ph/content/highlights-davao-del-nortes-total-population-based-2024-census-population-popcen)
- [PIA — Davao del Norte 2024 economy +5.4%, agri 27.5%](https://pia.gov.ph/news/davao-del-norte-2024-economy-still-grows-by-5-4-percent/)
- [PhilAtlas — Tagum City profile](https://www.philatlas.com/mindanao/r11/davao-del-norte/tagum.html)
- [AgFunder — Mayani $1.7M seed / farm-to-table marketplace](https://agfundernews.com/agfunder-impact-fund-leads-mayanis-1-7m-seed-round-to-scale-filipino-farm-and-fisheries-produce-marketplace)
- [BusinessWorld — Mayani social enterprise / scale](https://www.bworldonline.com/opinion/2025/04/23/667377/digital-transformation-in-philippine-agribusiness-mayanis-social-enterprise/)
- [Locad — Cash on Delivery in the Philippines (68% COD preference)](https://golocad.com/blog/cash-on-delivery-philippines/)
- [Cloud Ecommerce — COD RTO rates Philippines 2026 (~15% failed, 12–40% RTO)](https://www.cloudecommerce.com/blog/how-to-reduce-cod-rto-rates-in-the-philippines-7-proven-strategies-for-2026/)

*Figures labelled illustrative are placeholders for the pilot — replace with measured
data via `unit-economics.html`.*
