# Task 03: Billing and Post-Purchase Operations

> Updated: 2026-04-07

## Objective

Close the commercial gaps that remain after basic Lemon Squeezy checkout and
redeem fulfillment.

## Why

Checkout alone is not enough. Launch quality depends on support, refunds,
balance recovery, and what happens when tokens run out.

## Current State

### Already done

- [x] Lemon Squeezy checkout exists
- [x] Lemon Squeezy webhook exists
- [x] monthly plans are configured
- [x] backend creates order/license/redeem fulfillment records
- [x] purchase email flow exists

### Not done yet

- [ ] refund lifecycle handling
- [ ] one-shot top-up flow attached to an existing license
- [ ] dedicated customer/subscriber view in manager
- [ ] explicit support workflow for depleted balances

## What

This task covers everything after the initial successful purchase.

Main sub-topics:

- refunds
- top-ups
- customer support lookup and actions
- product behavior when a user runs out of tokens before subscription renewal

## Where

### Payments and fulfillment

- `src/routes/api/payments/checkout.ts`
- `src/routes/api/payments/webhook.ts`
- `src/server/payments/checkout.ts`
- `src/server/payments/webhook.ts`

### Licensing and token ledger

- `prisma/schema.prisma`
- `src/server/licenses/schema.ts`
- `src/server/licenses/manual-grant.ts`
- `src/server/licenses/token-balance.ts`

### Manager and support

- `src/server/routers/license.ts`
- `src/features/license/manager/page-license.tsx`
- `src/features/license/manager/page-licenses.tsx`

## How

### Refunds

Need to define:

- which Lemon Squeezy events are treated as refund signals
- how token ledger should be reversed
- what happens if tokens were already spent
- what support/backoffice action is allowed vs automatic

### Top-ups

Need to define:

- whether a top-up is a new product/variant class
- whether top-up must attach to an existing license
- how checkout identifies target license
- how webhook fulfillment credits an existing license instead of creating a new one

### Support operations

Need to define:

- how support sees subscription + balance state quickly
- how support grants manual credit safely
- how support handles exhausted balance before renewal

## Checklist

### Refunds

- [ ] Identify required Lemon Squeezy refund events
- [ ] Define ledger behavior for full refund
- [ ] Define ledger behavior for partial refund
- [ ] Add backoffice support path for refund review
- [ ] Add automated or audited reversal entries

### Top-ups

- [ ] Decide if top-up is required before launch
- [ ] Design top-up product structure in Lemon Squeezy
- [ ] Add checkout path for existing-license crediting
- [ ] Add webhook fulfillment for existing-license crediting
- [ ] Decide UX for “out of tokens” in app and website

### Manager support

- [ ] Add better subscriber/customer view
- [ ] Add quick balance/subscription status lookup
- [ ] Add support notes or operational guidance if needed

## Risks

- refunding after token spend can create business logic conflicts
- top-ups attached to the wrong license would be a support disaster
- launch support load increases sharply without a dedicated subscriber view

## Decision Notes

- current subscription plans are monthly token plans
- current redeem flow is backend-driven
- current product direction suggests unlimited devices and token-limited usage

