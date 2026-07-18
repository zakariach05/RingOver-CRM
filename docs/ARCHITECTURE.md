# Architecture - RingOver CRM

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite + TypeScript |
| CSS | Tailwind CSS |
| Graphiques | Recharts |
| HTTP client | Axios |
| Backend | Express.js + TypeScript |
| ORM | Prisma |
| Base de données | SQLite (dev/test), PostgreSQL (prod) |
| Auth | JWT (Bearer token) |
| Téléphonie | Twilio (mock en dev) |
| Tests | Jest + Supertest + ts-jest |

## Structure du projet

```
RingOver/
├── backend/
│   ├── .env                 # Variables d'environnement
│   ├── prisma/
│   │   ├── schema.prisma    # Schéma de la base de données
│   │   ├── dev.db           # Base SQLite (dev)
│   │   └── test.db          # Base SQLite (tests)
│   └── src/
│       ├── server.ts        # App Express, montage des routes
│       ├── types/index.ts   # Middleware auth (authenticate, requireRole)
│       ├── routes/
│       │   ├── auth.ts          # Register, login, forgot/reset password
│       │   ├── team.ts          # Gestion d'équipe, invitations
│       │   ├── contacts.ts      # CRUD contacts
│       │   ├── deals.ts         # CRUD deals + stage + owner
│       │   ├── calls.ts         # Initiation + historique appels
│       │   ├── webhooks.ts      # Callbacks Twilio (call-status, sms-incoming)
│       │   ├── sms.ts           # Envoi, draft, conversations, historique
│       │   ├── notifications.ts # CRUD notifications
│       │   └── dashboard.ts     # KPIs + données graphiques
│       ├── services/
│       │   ├── dashboardService.ts  # Requêtes Prisma pour dashboard
│       │   └── dashboardCache.ts    # Cache Map en mémoire (TTL 30s)
│       ├── utils/
│       │   ├── prisma.ts       # Client Prisma singleton
│       │   └── seed.ts         # Seed de la base
│       └── __tests__/
│           ├── helpers.ts          # cleanDb, createTestTeam, createTestUser, generateToken
│           ├── auth.test.ts        # 34 tests
│           ├── deals.test.ts       # ~20 tests
│           ├── calls.test.ts       # ~18 tests
│           ├── contacts.test.ts    # ~8 tests
│           └── dashboard.test.ts   # 12 tests
├── frontend/
│   └── src/
│       ├── App.tsx              # Routeur React (BrowserRouter)
│       ├── main.tsx             # Point d'entrée
│       ├── api/
│       │   ├── calls.api.ts     # Fonctions API appels
│       │   └── deals.api.ts     # Fonctions API deals
│       ├── contexts/
│       │   ├── AuthContext.tsx   # Auth (token, user, login, logout)
│       │   ├── CallContext.tsx   # État d'appel actif
│       │   └── ToastContext.tsx  # Système de notifications toast
│       ├── hooks/
│       │   ├── useAppBootstrap.ts    # Vérification token au démarrage
│       │   ├── useCallSounds.ts      # Sonnerie d'appel
│       │   ├── useDashboardData.ts   # Hook dashboard avec cache
│       │   └── useDeals.ts           # Hook pour les deals
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   ├── RegisterPage.tsx
│       │   ├── ForgotPasswordPage.tsx
│       │   ├── ResetPasswordPage.tsx
│       │   ├── DashboardPlaceholder.tsx
│       │   ├── ContactsListPage.tsx
│       │   ├── ContactDetailPage.tsx
│       │   ├── DealsKanbanPage.tsx
│       │   ├── DealDetailPage.tsx
│       │   ├── DialerPage.tsx
│       │   ├── CallHistoryPage.tsx
│       │   ├── MessagesPage.tsx
│       │   └── TeamMembersPage.tsx
│       ├── components/
│       │   ├── Layout.tsx           # Sidebar + header + CallBanner
│       │   ├── ProtectedRoute.tsx   # Route protégée (redirige si non auth)
│       │   ├── ContactForm.tsx      # Formulaire contact
│       │   ├── calls/
│       │   │   ├── CallBanner.tsx       # Bannière d'appel actif
│       │   │   ├── PostCallModal.tsx    # Modal post-appel (note)
│       │   │   └── SoundPreferenceToggle.tsx
│       │   ├── dashboard/
│       │   │   ├── KpiCard.tsx             # Carte KPI avec delta %
│       │   │   ├── PeriodSelector.tsx      # Sélecteur période (presets + custom)
│       │   │   ├── CallVolumeChart.tsx     # Line chart volume d'appels
│       │   │   ├── CallsByAgentChart.tsx   # Bar chart horizontal par agent
│       │   │   └── PipelineByStageChart.tsx # Bar chart + trend line pipeline
│       │   ├── deals/
│       │   │   ├── DealsKanban.tsx     # Vue Kanban drag & drop
│       │   │   ├── DealColumn.tsx      # Colonne d'étape
│       │   │   ├── DealCard.tsx        # Carte deal dans la colonne
│       │   │   ├── DealForm.tsx        # Formulaire création/édition
│       │   │   └── DealFilters.tsx     # Filtres
│       │   ├── dialer/
│       │   │   └── DialPad.tsx         # Clavier numérique
│       │   ├── notifications/
│       │   │   └── NotificationCenter.tsx  # Cloche + dropdown
│       │   ├── sms/
│       │   │   └── SmsComposer.tsx     # Modal envoi SMS
│       │   ├── splash/
│       │   │   └── SplashScreen.tsx    # Écran de chargement initial
│       │   └── ui/
│       │       ├── Badge.tsx
│       │       ├── EmptyState.tsx
│       │       ├── PageSkeleton.tsx
│       │       ├── Skeleton.tsx
│       │       └── ToastContainer.tsx
│       ├── types/contact.ts
│       └── utils/
│           ├── api.ts             # Instance Axios avec intercepteurs
│           ├── audioManager.ts    # Gestion audio (sonnerie)
│           └── contactUtils.ts    # Utilitaires contacts
```

## Modèle de données (Prisma)

| Modèle | Description |
|--------|-------------|
| **Team** | Équipe/organisation |
| **User** | Utilisateur (ADMIN / MANAGER / AGENT), avec resetToken pour mot de passe oublié |
| **Invitation** | Invitation par token (PENDING → ACCEPTED / EXPIRED) |
| **Contact** | Contact CRM (soft delete RGPD via deletedAt) |
| **Deal** | Opportunité de vente (LEAD → QUALIFIED → PROPOSAL → NEGOTIATION → WON / LOST) |
| **Call** | Appel téléphonique (Twilio SID, durée, statut, enregistrement) |
| **Sms** | Message SMS (Twilio SID, statut, draft) |
| **Notification** | Notification in-app (SMS_SENT, SMS_RECEIVED, DEAL_CREATED, etc.) |

> SQLite ne supporte pas les enums Prisma — les champs `role`, `stage`, `status` etc. sont stockés comme `String` avec validation applicative.

## API (routes montées)

| Route prefix | Méthodes | Description |
|-------------|----------|-------------|
| `/auth` | POST | Register, login, forgot-password, reset-password |
| `/team` | GET/PUT/POST | Infos équipe, invitations, membres |
| `/contacts` | GET/POST/PUT/DELETE | CRUD contacts |
| `/deals` | GET/POST/PUT/PATCH/DELETE | CRUD deals + changement stage/owner |
| `/api/calls` | POST/GET | Initier un appel, historique |
| `/api/webhooks` | POST | Callbacks Twilio (call-status, sms-incoming) |
| `/api/sms` | GET/POST/DELETE | Envoi, draft, conversations, historique |
| `/api/notifications` | GET/PATCH | Liste et marquer lu |
| `/api/dashboard` | GET | Statistiques KPI + graphiques |
| `/health` | GET | Health check |

## Authentification

- JWT signé avec `JWT_SECRET`
- Header `Authorization: Bearer <token>`
- Payload : `{ id, role, teamId }`
- Middleware `authenticate` : vérifie le token, injecte `req.user`
- Middleware `requireRole(...)` : contrôle d'accès RBAC
- Mot de passe oublié : token crypto (32 bytes hex), expiry 1h

## Dashboard (Partie 5)

- **Cache** : Map en mémoire, TTL 30s, invalidation par `teamId` sur création/modification de call ou deal
- **Service** : `dashboardService.ts` — requêtes Prisma groupBy/aggregate/count
- **KPIs** : totalCalls, totalContacts, openDeals, wonRevenue, avgCallDuration, missedCalls (avec delta % vs période précédente)
- **Graphiques** : CallVolumeChart (line), CallsByAgentChart (bar horizontale), PipelineByStageChart (bar + trend line)
- **Période** : 7j / 14j / 30j / 90j presets + sélection custom avec debounce 400ms

## SMS & Conversations

- **Envoi** : POST /api/sms/send avec mock (200-800ms delay, 5% failure rate)
- **Conversations** : GET /api/sms/conversations — groupées par contact, triées par date
- **Thread** : GET /api/sms/conversation/:key — messages paginés d'une conversation
- **Webhook entrant** : POST /api/webhooks/sms-incoming — reçoit les SMS Twilio

## Mode mock Twilio

Quand `TWILIO_ENABLED !== 'true'`, les appels passent via `setTimeout` mock sans envoyer de requête Twilio. Le webhook de statut est simulé côté serveur.

## Tests

- **92 tests** (auth 34, deals ~20, calls ~18, contacts ~8, dashboard 12)
- `jest.config.js` : `--runInBand --forceExit` (SQLite mono-fichier)
- `jest.setup.js` : reset complet via `prisma db push --force-reset`
- `helpers.ts` : `cleanDb()`, `createTestTeam()`, `createTestUser()`, `generateToken()`

## Documentation

| Fichier | Description |
|---------|-------------|
| `docs/GUIDE-COMPLET.md` | Guide de A à Z : installation, config, utilisation, API, dépannage |
| `docs/ARCHITECTURE.md` | Ce fichier — architecture technique |
| `docs/cahier-des-charges-parties-3-4.md` | Cahier des charges parties 3 et 4 |
