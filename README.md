# GenRob — Voice-First Inventory Management for Indian Small Businesses

GenRob is a production-grade, voice-first inventory operating system and PWA engineered specifically for Indian kirana stores, grain merchants, provision traders, and wholesalers who operate in regional languages (Hindi, Telugu, English, and mixed-language vernacular) and trade units (*bora, bag, tin, pipa, peti, patti, quintal, kg, litre, piece*).

Built **100% Supabase-Native**: Postgres database triggers, pgvector semantic similarity, Row Level Security (RLS), Supabase Realtime subscriptions, Supabase Storage, and Deno Edge Functions.

---

## ⚡ Key Highlights & Core Features

1. **Voice-Based Stock In / Out**: Speak natural trade sentences (e.g. *"पांच बोरा आशीर्वाद आटा आया 2100 में"*, *"రెండు డబ్బాల ఫార్చూన్ నూనె అమ్మాము"*). Visual voice feedback with live waveform and confidence scoring (Green > 85%, Yellow 60-84%, Red < 60%).
2. **Never Silently Commit**: Ambiguous or unconfirmed speech commands always display an interactive confirmation card with unit conversion breakdowns before writing to the database.
3. **Database Running Balances via Postgres Triggers**: Stock movements and balances are recalculated in Postgres (`fn_sync_product_stock`), not through fragile client-side math.
4. **Postgres Low-Stock Alert Triggers & Realtime Badges**: When stock drops below `reorder_threshold`, a Postgres trigger (`fn_evaluate_product_alerts`) auto-populates the alerts table, firing live Supabase Realtime updates without polling.
5. **Trade Vocabulary Engine (pgvector)**: Hybrid semantic vector matching and `pg_trgm` fuzzy text matching for local trade nicknames and colloquial units.
6. **5+ Differentiating Features**:
   - **WhatsApp Voice-Note Ingestion**: Ingests voice notes via webhook Edge Function, updates Postgres stock, and auto-replies via WhatsApp.
   - **Challan Photo OCR + Voice Combo**: Vision OCR extracts line items from wholesale supplier delivery slips; owner confirms each item one-by-one by voice.
   - **Khata / Credit Book**: Log customer "udhaar" (credit) and "jama" (payments) by voice, maintaining running customer balances.
   - **Daily Voice Briefing**: Spoken summary computed from the last 24 hours of real database transactions (sales, inward deliveries, low stock warnings, new khata).
   - **Predictive Reorder Suggestions**: Calculates consumption rate (rolling average) to project stockout days and suggested replenishment quantity.
   - **Dead Stock Report**: Identifies products with zero stock-out sales over 30+ days and calculates tied-up capital.
   - **RAG Color-Coded Dashboard**: Real-time Red / Yellow / Green inventory health indicators based on real stock vs thresholds.

---

## 🏗️ Architecture & Voice Pipeline Flow

See [ARCHITECTURE.md](file:///c:/GENRob/ARCHITECTURE.md) for full sequence diagrams and future roadmap (Supplier Marketplace, B2B Inventory Sharing, Monetization, On-Device ML).

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Kirana Shop Owner
    participant Mic as Web Audio / Mic
    participant STT as Web Speech API (Client) / Whisper Edge Function
    participant NLU as NLU Parser Edge Function (Deno)
    participant PGV as Supabase Postgres (pgvector match_product_aliases)
    participant UI as Visual Voice Feedback Card (Waveform + Confidence)
    participant DB as Supabase Postgres (transactions table)
    participant TRG as Postgres Triggers (Stock Balance + Low Stock Alerts)
    participant RT as Supabase Realtime Channel
    participant TTS as Regional TTS Voice Synthesis

    Owner->>Mic: Speaks ("Do bora Aashirvaad atta aaya 2100 mein")
    Mic->>STT: Audio Stream / Live Frequency Bins
    STT-->>UI: Real-time Transcript & Audio Waveform
    STT->>NLU: Text Transcript + Shop Language Context
    NLU-->>PGV: Extracted Intent: { product: "Aashirvaad atta", qty: 2, unit: "bora", price: 2100, direction: "in" }
    PGV-->>UI: Semantic Match: Product ID, Base Unit (kg), Converted Qty (100kg), Unit: bora (1 bag = 50kg)
    UI->>Owner: Displays Confirmation Card (Confidence: 96% Green, Item, Qty, Total)
    Owner->>UI: Voice Confirm ("Haan / Sahi hai") or Tap "Pukka Karein"
    UI->>DB: INSERT INTO transactions (product_id, type='in', qty=2, unit='bora', price=2100, source='voice')
    DB->>TRG: BEFORE/AFTER INSERT Trigger
    TRG->>TRG: Recalculates current_stock (+100kg)
    TRG->>TRG: Checks reorder_threshold; Auto-evaluates alerts table
    TRG->>RT: Broadcasts realtime postgres_changes event (products, transactions, alerts)
    RT-->>UI: Instantly updates Stock Badges, Metrics & Alert Bell without reload
    UI->>TTS: Regional Spoken Feedback ("2 bora Aashirvaad atta stock mein darj ho gaya")
```

---

## 🗄️ Database Migrations & Seed Data

The database schema is organized into clean, sequential SQL migrations located in `supabase/migrations/`:

| Migration File | Purpose |
| :--- | :--- |
| `20260919000001_initial_schema.sql` | Enables `pgcrypto`, `vector`, `pg_trgm`. Creates 10 tables (`shops`, `users`, `products`, `product_aliases`, `transactions`, `alerts`, `customers`, `khata_ledger`, `suppliers`, `purchase_orders`) with indices. |
| `20260919000002_triggers_and_functions.sql` | Implements Postgres triggers (`fn_sync_product_stock`, `fn_evaluate_product_alerts`, `fn_sync_khata_customer_balance`) and stored procedures (`match_product_aliases`, `get_predictive_reorder_suggestions`, `get_dead_stock_report`, `get_daily_briefing_stats`). |
| `20260919000003_rls_policies.sql` | Enforces explicit Row Level Security (RLS) on all tables scoped to `shop_id = current_shop_id()`. Adds tables to `supabase_realtime` publication. |
| `20260919000004_seed_kirana.sql` | Seeds demo kirana store *"Sri Balaji Kirana & General Stores"* (Begum Bazar, Hyderabad) with 18 realistic FMCG items, custom trade unit conversions, pre-seeded low-stock alerts, transactions, and customer khata records. |

---

## 🚀 Getting Started & Setup Guide

### 1. Prerequisites
- Node.js (v18+ or v20+)
- Supabase Project (Cloud or Local CLI)

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

*(Note: You can also enter and change your Supabase URL and Anon Key directly inside the app using the database icon in the top header!)*

### 3. Run Database Migrations on Supabase
You can apply the migrations using the Supabase CLI:
```bash
supabase db push
```
Or simply copy and execute the SQL files in order in the **Supabase Dashboard SQL Editor**:
1. `supabase/migrations/20260919000001_initial_schema.sql`
2. `supabase/migrations/20260919000002_triggers_and_functions.sql`
3. `supabase/migrations/20260919000003_rls_policies.sql`
4. `supabase/migrations/20260919000004_seed_kirana.sql`

### 4. Deploy Supabase Edge Functions (Deno)
Deploy the 4 functions located in `supabase/functions/`:
```bash
supabase functions deploy stt-whisper
supabase functions deploy nlu-parser
supabase functions deploy ocr-challan
supabase functions deploy whatsapp-webhook
```
Set secrets for external APIs if using cloud providers:
```bash
supabase secrets set OPENAI_API_KEY="your-key" GEMINI_API_KEY="your-key"
```

### 5. Run the Frontend Locally
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📱 PWA (Progressive Web App) Installation

GenRob includes a web application manifest (`public/manifest.json`) and service worker (`public/sw.js`) with offline caching:
- **Mobile (Chrome on Android)**: Tap the browser menu `⋮` and select **"Add to Home screen"** or **"Install app"**.
- **Desktop (Chrome / Edge)**: Click the **Install** icon in the browser address bar.

---

## 🎙️ Regional Language Support & Voice Transcripts

See [VOICE_TRANSCRIPTS_SPEC.md](file:///c:/GENRob/VOICE_TRANSCRIPTS_SPEC.md) for detailed test transcripts in Hindi, Telugu, and Hinglish with expected parsed JSON structures.
