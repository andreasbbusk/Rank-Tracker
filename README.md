# Rank Tracker

Rank Tracker is an SEO operations product for teams that need a single place to monitor domain performance, manage keyword execution, and generate decision-ready reports.

Instead of treating rank data as static exports, the project is designed around an active workflow: track movement across date ranges, identify opportunities, adjust keyword strategy, and package insights for stakeholders.

It is built to reflect the day-to-day reality of SEO execution: frequent filtering, prioritization under uncertainty, and continuous iteration between analysis and action.

## Product Overview

Rank Tracker combines three connected layers of work:

- Domain monitoring: Compare visibility trends, clicks, impressions, and ranking movement across tracked sites.
- Keyword operations: Manage keywords with tagging, notes, country targeting, and star-based prioritization.
- Reporting: Build and share structured reports with modular blocks that can be reordered and resized.

The interaction model is intentionally workflow-first. Changes made in keyword and domain views are meant to feed directly into reporting and planning, rather than living in isolated screens.

## Experience Highlights

- Data-dense domain and keyword tables with filtering built for real operator workflows.
- Search Console-style keyword context to support prioritization decisions.
- Content gap intelligence views that surface opportunity areas.
- Report builder UX with drag-and-drop composition for custom stakeholder narratives.
- Stateful client interactions (optimistic updates + persisted UI state) to keep operational flows fast.

## Architecture at a Glance

The codebase is organized by feature boundaries rather than page-only structure:

- `app/(client)` contains route composition and layout orchestration.
- `modules/rank-tracker` holds product logic: actions, persistence, components, and stores.
- `modules/analytics` and `modules/core` provide shared analytics helpers and UI primitives.

The data layer uses MongoDB + Mongoose with deterministic seeded data, so core product flows are always reproducible for evaluation and iteration.

## Sandbox Isolation

Each visitor gets an isolated Mongo-backed sandbox keyed by a session cookie (`rt_demo_session`).
Seeded data is stored once in a shared immutable tenant and each sandbox tenant uses an overlay model:
- Reads merge shared seed docs with tenant-local docs.
- Tenant-local docs override shared docs (copy-on-write).
- Deleting shared seeded docs creates tenant tombstones so removals stay isolated.
CRUD changes persist inside each session-only overlay without duplicating the full seed dataset per tenant.
All non-seed tenant overlays are pruned automatically by cron, while the shared seed tenant remains intact.
Security headers are enabled globally in `next.config.mjs` (CSP, frame denial, referrer policy, etc.).

## Background

Rank Tracker originally lived as a larger feature area inside **Conversio Hub**. This repository captures that feature set as a standalone product surface.

Because of that origin, you may notice existing functionality and components that are broader than the current Rank Tracker scope. Those pieces are retained deliberately where they support continuity, preserve working flows, or reflect integration points from the original platform architecture.

## Scope

This project focuses on product thinking and implementation quality in a modern React stack: stateful UX, modular architecture, and analytics-driven interfaces.
