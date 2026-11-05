# 🪐 AI-Powered Jathagam Matching and Filtering Telegram Bot

A production-ready Telegram bot that automatically receives Tamil and English Jathagam (Vedic horoscope) images from a source private Telegram channel (**Channel A**), extracts astrological chart and textual details using Google's official Gemini Multimodal AI (`@google/genai` SDK), deterministically evaluates strict matching conditions against a permanently configured reference Groom Jathagam, and forwards only successfully matched bride horoscopes to a destination private Telegram channel (**Channel B**).

---

## 📋 Table of Contents

- [1. Architecture Overview](#1-architecture-overview)
- [2. Exact Matching Rules](#2-exact-matching-rules)
- [3. Technology Stack](#3-technology-stack)
- [4. Project Structure](#4-project-structure)
- [5. Telegram Channel & Bot Setup](#5-telegram-channel--bot-setup)
- [6. Configuration & Environment Variables](#6-configuration--environment-variables)
- [7. Local Development & Execution](#7-local-development--execution)
- [8. Running Tests](#8-running-tests)
- [9. Docker & Docker Compose Setup](#9-docker--docker-compose-setup)
- [10. Google Cloud Run Deployment](#10-google-cloud-run-deployment)
- [11. Admin Telegram Commands](#11-admin-telegram-commands)
- [12. Reliability, Security & Privacy Safeguards](#12-reliability-security--privacy-safeguards)

---

## 1. Architecture Overview

```
                                  [ Channel A: Incoming Brides ]
                                                │
                                                ▼ (channel_post event)
                                      [ Telegram Webhook / Polling ]
                                                │
                                  ┌─────────────┴─────────────┐
                                  │ Fast Webhook Ack (<100ms) │
                                  │ Duplicate Protection      │
                                  └─────────────┬─────────────┘
                                                ▼
                                    [ MongoDB Job Queue ]
                                                │
                                                ▼
                                      [ Background Worker ]
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       ▼                                                 ▼
               [ Image Download ]                              [ Fetch Active Groom ]
               [ Sharp Preprocessing ]                        (From MongoDB Reference)
                       │                                                 │
                       ▼                                                 │
            [ Gemini Multimodal OCR ]                                    │
            - Text labels & signs                                        │
            - South Indian Rasi 12-box grid                              │
            - Zero Hallucination Safeguard                               │
                       │                                                 │
                       ▼                                                 │
            [ Zod Schema Validation ]                                    │
            [ Normalization Service ]                                    │
                       │                                                 │
                       └────────────────────────┬────────────────────────┘
                                                ▼
                                    [ Pure Matching Engine ]
                                    • Rule 1: Mars House (2, 4, 7, 8, 12)
                                    • Rule 2: 8 Allowed Star + Rasi Pairs
                                                │
                       ┌────────────────────────┼────────────────────────┐
                       ▼                        ▼                        ▼
                   [ PASS ]                 [ FAIL ]                [ REVIEW ]
                       │                        │                        │
            • Forward original message   • Save failure reasons   • Alert Admins
              to Channel B               • Do NOT forward         • Do NOT forward
            • Post match report          • Log audit result       • Await manual retry
```

---

## 2. Exact Matching Rules

The matching rules apply strictly to the **INCOMING BRIDE'S HOROSCOPE**:

### Rule 1: Mars House Condition
- **Tamil:** செவ்வாய் 2, 4, 7, 8, 12-ல் வேண்டும்.
- **English:** Mars (*Sevvai*) must be positioned in the **2nd, 4th, 7th, 8th, or 12th** house relative to the bride's Lagna.
- **Allowed Houses:** `[2, 4, 7, 8, 12]`
- Calculated deterministically from the bride's Lagna sign clockwise to the Mars sign in the authoritative Rasi chart.
- Any other house results in **FAIL**.
- If Lagna or Mars placement cannot be verified, results in **REVIEW**.

### Rule 2: Allowed Nakshatra and Rasi Combinations
- **Tamil:** இவை மட்டும் பொருந்தும்.
- **English:** Only the following **8 exact combinations** are accepted:

| # | Tamil Nakshatra | English Normalized | Tamil Rasi | English Normalized |
|---|---|---|---|---|
| 1 | மூலம் | MOOLA | தனுசு | DHANUSU |
| 2 | சுவாதி | SWATHI | துலாம் | THULA |
| 3 | கார்த்திகை | KARTHIGAI | ரிஷபம் | RISHABA |
| 4 | உத்திரம் | UTHIRAM | கன்னி | KANNI |
| 5 | அனுஷம் | ANUSHAM | விருச்சகம் | VIRUCHAGAM |
| 6 | பூரம் | POORAM | சிம்மம் | SIMMAM |
| 7 | பூசம் | POOSAM | கடகம் | KADAGAM |
| 8 | அஸ்தம் | HASTHAM | கன்னி | KANNI |

- Both Nakshatra and Rasi must be extracted from the incoming bride's horoscope.
- If the Nakshatra is in the list but paired with a non-matching Rasi (e.g. `MOOLA + THULA`), the result is **FAIL**.
- If Nakshatra or Rasi is unrecognized or missing, the result is **REVIEW**.

### Decision Precedence:
$$\text{FAIL} > \text{REVIEW} > \text{PASS}$$
- If ANY rule fails, the overall outcome is **FAIL** (even if another rule requires review).
- Only when ALL rules pass and data is validated does the result become **PASS**.

---

## 3. Technology Stack

- **Runtime:** Node.js 22+ (ESM modules)
- **Language:** TypeScript 5+ (Strict mode)
- **Telegram Bot Framework:** `grammY` (v1.35+)
- **Multimodal AI:** Google official `@google/genai` SDK
- **Database & ODM:** MongoDB Atlas / Mongoose 8+
- **Validation:** Zod 3+
- **Image Processing:** Sharp 0.33+
- **HTTP Webhook Server:** Express 4+
- **Logging:** Pino & Pino-Pretty
- **Test Framework:** Vitest 3+
- **Containerization & Hosting:** Docker (Multi-stage) & Google Cloud Run

---

## 4. Project Structure

```
├── Dockerfile                  # Multi-stage production container build
├── docker-compose.yml          # Local development orchestration (App + MongoDB)
├── .env.example                # Template for environment variables
├── package.json                # Project dependencies and npm scripts
├── tsconfig.json               # TypeScript compiler configuration
├── vitest.config.ts            # Vitest unit & integration test configuration
├── src/
│   ├── index.ts                # Application entrypoint & server bootstrap
│   ├── app.ts                  # Express server with /health and /webhook/telegram
│   ├── config/
│   │   ├── env.ts              # Zod-validated environment configuration
│   │   └── matching-rules.ts   # Rule constants, allowed houses & pairs
│   ├── schemas/
│   │   └── jathagam.schema.ts  # Zod schema for structured Gemini extraction
│   ├── matching/
│   │   ├── engine.ts           # Pure matching engine evaluating precedence
│   │   ├── matching-config.ts  # Engine configuration exports
│   │   ├── result.types.ts     # RuleResult & MatchingDecision interfaces
│   │   └── rules/
│   │       ├── rule.interface.ts # MatchingRule contract
│   │       ├── mars-house.rule.ts# Rule 1: Mars house [2, 4, 7, 8, 12]
│   │       └── star-rasi.rule.ts # Rule 2: 8 Allowed Nakshatra + Rasi pairs
│   ├── services/
│   │   ├── gemini.service.ts   # @google/genai multimodal extraction client
│   │   ├── image.service.ts    # Sharp image preprocessing & auto-rotation
│   │   ├── extraction.service.ts # Extraction & normalization pipeline
│   │   ├── normalization.service.ts # Deterministic Tamil/English normalizer
│   │   └── forwarding.service.ts# Telegram forwarding & report messaging
│   ├── database/
│   │   ├── connection.ts       # Mongoose connection management
│   │   └── models/
│   │       ├── groom-profile.model.ts    # Fixed groom horoscope (single active)
│   │       ├── bride-profile.model.ts    # Extracted bride horoscopes
│   │       ├── match-result.model.ts     # Match decisions & forwarding status
│   │       ├── processed-message.model.ts# Duplicate message prevention
│   │       └── job.model.ts              # Persistent background queue jobs
│   ├── queue/
│   │   ├── queue.service.ts    # Persistent MongoDB job queue
│   │   └── worker.ts           # Background worker polling & processing loop
│   ├── bot/
│   │   ├── telegram.ts         # GrammY bot initialization & routing
│   │   └── handlers/
│   │       ├── channel.handler.ts # Source channel message receiver
│   │       └── admin.handler.ts   # /setgroom, /groom, /stats, /review, etc.
│   ├── middleware/
│   │   ├── admin.middleware.ts # Verifies Telegram user ID against ADMIN_IDS
│   │   └── webhook-security.middleware.ts # Verifies X-Telegram-Bot-Api-Secret-Token
│   └── utils/
│       ├── logger.ts           # Pino structured logging
│       ├── errors.ts           # AppError hierarchy
│       └── report.ts           # Markdown match report formatting
├── scripts/
│   └── verify-sample.ts        # Script verifying real sample horoscope images
└── tests/
    ├── fixtures/
    │   ├── sample-bride.jpg    # Sample bride horoscope photograph
    │   └── sample-groom.jpg    # Sample groom horoscope photograph
    ├── unit/
    │   ├── normalization.test.ts # Tamil & English aliases & house math
    │   ├── mars-house.rule.test.ts # Houses 1-12, missing, discrepancy
    │   ├── star-rasi.rule.test.ts # All 8 allowed pairs & fail cases
    │   ├── matching-engine.test.ts# Precedence: FAIL > REVIEW > PASS
    │   └── zod-schema.test.ts   # Zod validation rules
    └── integration/
        ├── telegram-bot.test.ts # Source channel filters & admin guard
        ├── forwarding.test.ts   # Forwarding PASS, skipping FAIL, alerting REVIEW
        ├── gemini-service.test.ts # Mock Gemini, schema error handling & retries
        └── pipeline.test.ts     # End-to-end simulation on real sample data
```

---

## 5. Telegram Channel & Bot Setup

### Step 1: Create the Telegram Bot
1. Open Telegram and search for [@BotFather](https://t.me/BotFather).
2. Send `/newbot` and follow the instructions to choose a name and username.
3. Save the returned **API Token** (`BOT_TOKEN`).
4. In @BotFather, enable channel reading:
   - Send `/setprivacy` -> Select your bot -> Choose **Disable** (allows the bot to receive channel posts).

### Step 2: Configure Channel A (Incoming Brides Source Channel)
1. Create a private Telegram channel (e.g., `Bride Horoscopes`).
2. Add your bot to Channel A as an **Administrator** with at least "Post Messages" or "Edit Messages" permission.
3. Obtain the Channel ID:
   - Forward any message from Channel A to [@userinfobot](https://t.me/userinfobot) or [@JsonDumpBot](https://t.me/JsonDumpBot).
   - The ID looks like `-1001234567890`.
   - Set this as `SOURCE_CHANNEL_ID`.

### Step 3: Configure Channel B (Matching Brides Destination Channel)
1. Create a private Telegram channel (e.g., `Matched Horoscopes`).
2. Add your bot to Channel B as an **Administrator** with permission to **Post Messages**.
3. Obtain the Channel ID (e.g., `-1009876543210`).
4. Set this as `DESTINATION_CHANNEL_ID`.

### Step 4: Obtain Your Admin Telegram User ID
1. Message [@userinfobot](https://t.me/userinfobot) from your personal Telegram account.
2. It will reply with your numeric user ID (e.g. `98765432`).
3. Set this as `ADMIN_TELEGRAM_IDS` (comma-separated if multiple admins).

---

## 6. Configuration & Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | `development`, `production`, or `test` | `production` |
| `PORT` | HTTP Server port | `8080` |
| `BOT_TOKEN` | Telegram Bot token from @BotFather | `7123456789:AA...` |
| `GEMINI_API_KEY` | Google Gemini API key from AI Studio | `AIzaSy...` |
| `GEMINI_MODEL` | Gemini Multimodal model | `gemini-2.5-flash` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/jathagam_matcher` |
| `SOURCE_CHANNEL_ID` | Source Telegram channel ID (Channel A) | `-1001234567890` |
| `DESTINATION_CHANNEL_ID` | Destination Telegram channel ID (Channel B) | `-1009876543210` |
| `ADMIN_TELEGRAM_IDS` | Comma-separated admin Telegram user IDs | `12345678,87654321` |
| `TELEGRAM_WEBHOOK_SECRET` | Secret token for validating Telegram webhook | `custom_random_secret_string` |
| `USE_WEBHOOK` | `true` for Cloud Run webhook, `false` for local polling | `false` |
| `WEBHOOK_DOMAIN` | Public URL of Cloud Run service | `https://bot-xyz.a.run.app` |
| `MAX_IMAGE_SIZE_MB` | Maximum allowed image file size | `15` |
| `LOG_LEVEL` | Pino log level (`trace`, `debug`, `info`, `warn`, `error`) | `info` |

---

## 7. Local Development & Execution

### Prerequisites
- Node.js 22+ (`node -v`)
- MongoDB running locally or on MongoDB Atlas

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server (with Auto-Reload & Long Polling)
In development, set `USE_WEBHOOK=false` in `.env`. The bot uses Telegram Long Polling, so you do **not** need ngrok or a public URL.

```bash
npm run dev
```

### 3. Build & Run Production Build
```bash
npm run build
npm start
```

---

## 8. Running Tests

The test suite covers 100% of the matching conditions, edge cases, normalization, security rules, and Gemini extraction error handling.

### Run all tests with Vitest:
```bash
npm test
```

### Run tests in watch mode:
```bash
npm run test:watch
```

### Verify real sample images offline:
```bash
NODE_ENV=test npx tsx scripts/verify-sample.ts
```

---

## 9. Docker & Docker Compose Setup

### Local Run with Docker Compose (includes MongoDB container):
1. Ensure your `.env` file is populated.
2. Run:
```bash
docker compose up --build
```
This builds the production Docker container, starts a local MongoDB container, and connects them automatically.

### Build Docker Image Manually:
```bash
docker build -t jathagam-matcher-bot .
```

---

## 10. Google Cloud Run Deployment

Google Cloud Run provides a serverless, scalable environment with built-in HTTPS endpoints.

### Step 1: Install & Configure Google Cloud SDK
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### Step 2: Store Secrets in Google Secret Manager (Recommended)
```bash
echo -n "YOUR_BOT_TOKEN" | gcloud secrets create BOT_TOKEN --data-file=-
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create GEMINI_API_KEY --data-file=-
echo -n "YOUR_MONGODB_URI" | gcloud secrets create MONGODB_URI --data-file=-
echo -n "YOUR_WEBHOOK_SECRET" | gcloud secrets create TELEGRAM_WEBHOOK_SECRET --data-file=-
```

### Step 3: Build and Deploy to Cloud Run
```bash
gcloud run deploy jathagam-matcher-bot \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,USE_WEBHOOK=true,PORT=8080 \
  --set-env-vars SOURCE_CHANNEL_ID="-1001234567890",DESTINATION_CHANNEL_ID="-1009876543210" \
  --set-env-vars ADMIN_TELEGRAM_IDS="12345678",GEMINI_MODEL="gemini-2.5-flash" \
  --set-secrets BOT_TOKEN=BOT_TOKEN:latest \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-secrets MONGODB_URI=MONGODB_URI:latest \
  --set-secrets TELEGRAM_WEBHOOK_SECRET=TELEGRAM_WEBHOOK_SECRET:latest
```

### Step 4: Register the Webhook with Telegram
Once Cloud Run outputs your service URL (e.g., `https://jathagam-matcher-bot-xyz.a.run.app`):
```bash
curl -F "url=https://jathagam-matcher-bot-xyz.a.run.app/webhook/telegram" \
     -F "secret_token=YOUR_WEBHOOK_SECRET" \
     -F "allowed_updates=[\"message\",\"channel_post\",\"edited_channel_post\"]" \
     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```

### Step 5: Verify Health Endpoint
```bash
curl https://jathagam-matcher-bot-xyz.a.run.app/health
```
Returns:
```json
{
  "status": "ok",
  "timestamp": "2026-11-05T19:00:00.000Z",
  "uptimeSeconds": 120,
  "database": { "connected": true },
  "groomProfile": { "configured": true, "version": 1 }
}
```

---

## 11. Admin Telegram Commands

Only users whose Telegram ID is listed in `ADMIN_TELEGRAM_IDS` can execute these commands:

| Command | Description |
|---|---|
| `/start` | Shows bot introduction, version, and admin information |
| `/help` | Displays command list and instructions |
| `/setgroom` | Prompts admin to send the Groom's horoscope image. Gemini extracts and activates it |
| `/groom` | Displays full horoscope summary of the currently active Groom profile |
| `/groomstatus` | Shows whether an active groom profile exists and whether required fields are valid |
| `/replacegroom` | Replaces the active groom profile with a newly uploaded horoscope |
| `/groomhistory` | Lists previous versions of the groom profile stored in MongoDB |
| `/stats` | Shows total horoscopes received, PASS, FAIL, REVIEW, and forwarded counts |
| `/review` | Lists pending horoscopes flagged for manual review |
| `/result <id>` | Shows detailed extraction and matching logs for a specific message ID |
| `/retry <id>` | Re-enqueues a failed or reviewable horoscope for background processing |
| `/rules` | Displays currently configured matching rules and the 8 allowed pairs |
| `/health` | Displays system memory, uptime, database connection, and bot status |

---

## 12. Reliability, Security & Privacy Safeguards

- **Zero Compatibility Hallucination:** Gemini is used strictly for OCR and chart element extraction. Compatibility is evaluated 100% deterministically by the TypeScript matching engine.
- **Fail-Safe Precedence:** If any rule definitively fails, the result is `FAIL` regardless of unreadable auxiliary fields. If a mandatory field cannot be verified, the bot marks it for `REVIEW` and alerts the administrator.
- **Provenance Preservation:** Original Telegram messages and photographs are forwarded using Telegram's native `forwardMessage` API, preserving the original upload timestamp, author, and quality.
- **Queue Idempotency:** The worker checks both the `ProcessedMessage` collection and `MatchResult.forwarded` flags before forwarding. Retried jobs never create duplicate forwards in Channel B.
- **Temporary Image Storage:** Image buffers are kept in memory and temporary files on disk are cleaned up immediately after processing.
- **Webhook Authentication:** Express validates the `X-Telegram-Bot-Api-Secret-Token` header on every incoming request from Telegram.
