<div align="center">

# 📞 RingOver CRM

### CRM cloud & téléphonie d'entreprise

[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tests](https://img.shields.io/badge/tests-92%20passed-4ADE80?logo=jest&logoColor=white)]()
[![License](https://img.shields.io/badge/license-private-lightgrey)]()

Gestion de contacts · Pipeline de ventes · Appels · SMS · Dashboard analytique

</div>

---

## Sommaire

- [Présentation](#-présentation)
- [Stack technique](#-stack-technique)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration de la base de données](#-configuration-de-la-base-de-données)
- [Lancement](#-lancement)
- [Authentification](#-authentification)
- [Fonctionnalités](#-fonctionnalités)
- [Référence API](#-référence-api)
- [Tests](#-tests)
- [Mode Twilio](#-mode-twilio)
- [Déploiement](#-déploiement)
- [Dépannage](#-dépannage)
- [Commandes rapides](#-commandes-rapides)

---

## 📖 Présentation

**RingOver CRM** est une plateforme de CRM cloud avec téléphonie d'entreprise intégrée :

- 👥 **Gestion de contacts** — CRUD complet avec soft delete (RGPD)
- 💼 **Pipeline de ventes (Deals)** — Kanban drag & drop (`LEAD` → `WON` / `LOST`)
- ☎️ **Téléphonie** — Appels via Twilio (ou mode mock en dev), historique, click-to-call
- 💬 **SMS** — Envoi, réception, conversations par contact
- 📊 **Dashboard analytique** — KPIs, graphiques (volume d'appels, appels par agent, pipeline)
- 🔔 **Notifications** — Centre de notification in-app
- 🔐 **Authentification** — JWT avec rôles (`ADMIN` / `MANAGER` / `AGENT`), mot de passe oublié

## 🧱 Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Graphiques | Recharts |
| Backend | Express.js + TypeScript |
| ORM | Prisma |
| Base de données | SQLite (dev/test) |
| Auth | JWT (Bearer token) |
| Téléphonie | Twilio (mock en dev) |
| Tests | Jest + Supertest |

## ✅ Prérequis

| Outil | Version minimale | Vérification |
|---|---|---|
| Node.js | v18+ | `node -v` |
| npm | v9+ | `npm -v` |

C'est tout — pas de Docker, pas de Redis, pas de PostgreSQL nécessaire en développement.

## 🚀 Installation

```bash
# Backend
cd RingOver\backend
npm install

# Frontend
cd RingOver\frontend
npm install
```

## 🗄 Configuration de la base de données

### 1. Créer `backend/.env`

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="ringover-jwt-secret-change-me-in-production"
PORT=3001
FRONTEND_URL="http://localhost:5173"
```

> **Note** : ce fichier existe déjà dans le projet — vérifiez-le avant de continuer.

### 2. Pousser le schéma Prisma (crée toutes les tables)

```bash
cd RingOver\backend
npx prisma db push
```

Cette commande lit `prisma/schema.prisma`, crée/synchronise `prisma/dev.db`, et génère le client Prisma.

```
Datasource "db": SQLite database "dev.db" at "file:./dev.db"
Your database is now in sync with your Prisma schema. Done in XXXms
Running generate...
✔ Generated Prisma Client
```

### 3. Vérifier

```bash
dir backend\prisma\dev.db
```

### 4. (Optionnel) Visualiser les données avec Prisma Studio

```bash
cd RingOver\backend
npx prisma studio
# → http://localhost:5555
```

### 5. Modifier le schéma

```bash
npx prisma db push                              # dev
npx prisma migrate dev --name nom_de_la_migration  # migration structurée (prod)
```

<details>
<summary><strong>📐 Schéma complet de la base</strong> (cliquer pour développer)</summary>

```
Team
├── id (cuid), name, createdAt
└── users[], invitations[], contacts[], deals[], calls[], sms[], notifications[]

User
├── id, email (unique), passwordHash, name
├── role (ADMIN | MANAGER | AGENT), status (ACTIVE | INACTIVE)
├── phoneExtension?, resetToken?, resetTokenExpiry?
├── teamId → Team
└── sentInvitations[], ownedContacts[], ownedDeals[], calls[], sentSms[], notifications[]

Invitation
├── id, email, role, token (unique), status (PENDING | ACCEPTED | EXPIRED)
└── expiresAt, teamId → Team, invitedById → User, createdAt

Contact
├── id, name, company?, phone, email?, tags?, notes?
├── ownerId? → User, teamId → Team, deletedAt? (soft delete RGPD)
└── deals[], calls[], sms[]

Deal
├── id, title, value, stage (LEAD | QUALIFIED | PROPOSAL | NEGOTIATION | WON | LOST)
└── contactId? → Contact, ownerId → User, teamId → Team, closedAt?

Call
├── id, fromNumber, toNumber, direction (INBOUND | OUTBOUND)
├── status (INITIATED | RINGING | ANSWERED | COMPLETED | FAILED | NO_ANSWER | MISSED)
└── duration?, agentId → User, contactId? → Contact, note?, recordingUrl?, twilioCallSid?

Sms
├── id, toNumber, fromNumber, body, status (SENDING | SENT | FAILED | DRAFT)
└── agentId → User, contactId? → Contact, teamId → Team

Notification
├── id, userId → User
├── type (SMS_SENT | SMS_RECEIVED | DEAL_CREATED | CONTACT_CREATED | CALL_ENDED | CALL_MISSED | SYSTEM)
└── title, body, link?, read (default false), teamId → Team
```

</details>

## ▶️ Lancement

**Terminal 1 — Backend (port 3001)**

```bash
cd RingOver\backend
npm run dev
# → Server running on http://localhost:3001
```

**Terminal 2 — Frontend (port 5173)**

```bash
cd RingOver\frontend
npm run dev
# → Local: http://localhost:5173/
```

Ouvrez ensuite [http://localhost:5173](http://localhost:5173).

### Premier utilisateur (Admin)

La **première inscription** crée automatiquement un compte **ADMIN** et une équipe « Default Team ».

1. Aller sur `/register`
2. Nom : `Admin RingOver` · Email : `admin@ringover.com` · Mot de passe : `Admin123` (8 car. min, 1 majuscule, 1 chiffre)
3. Cliquer « S'inscrire » → redirigé vers le Dashboard

### Ajouter d'autres utilisateurs

Les utilisateurs suivants ont besoin d'une **invitation** d'un ADMIN ou MANAGER : `/team` → « Inviter un membre » → email + rôle → lien d'inscription affiché (dev) ou envoyé par email (prod).

## 🔐 Authentification

**Flux :**

```
POST /auth/login { email, password }
  → { token: "eyJ...", user: { id, email, name, role } }
  → Token stocké en localStorage (React Context)
  → Chaque requête : Authorization: Bearer <token>
```

**Rôles et permissions :**

| Rôle | Permissions |
|---|---|
| `ADMIN` | Tout faire : équipe, contacts, deals, tous les appels |
| `MANAGER` | Contacts, deals, appels de l'équipe |
| `AGENT` | Ses propres contacts, deals, appels. Pas d'accès à l'équipe |

**Mot de passe oublié :** page de login → « Mot de passe oublié ? » → email → lien de réinitialisation (affiché en dev, faute de service email configuré) → nouveau mot de passe.

## ✨ Fonctionnalités

<details>
<summary><strong>Dashboard</strong> — <code>/dashboard</code></summary>

- 4 KPIs : Appels (avec delta %), Contacts, Deals en cours, Valeur gagnée
- Graphique volume d'appels (line chart par jour)
- Graphique appels par agent (bar chart horizontale, scrollable 10+ agents)
- Graphique pipeline par étape + ligne de tendance
- Sélection de période : 7j / 14j / 30j / 90j + personnalisée
- Cache 30s, invalidé sur création/modification de call ou deal

</details>

<details>
<summary><strong>Contacts</strong> — <code>/contacts</code></summary>

- Liste avec recherche · Fiche détaillée `/contacts/:id`
- Création / Modification / Suppression (soft delete RGPD)
- Lien avec les deals et appels du contact

</details>

<details>
<summary><strong>Deals / Pipeline</strong> — <code>/deals</code></summary>

- Vue Kanban : `LEAD → QUALIFICATION → PROPOSITION → NÉGOCIATION → GAGNÉ`
- Drag & drop entre colonnes
- Création (contact obligatoire), détail `/deals/:id`, filtres et recherche

</details>

<details>
<summary><strong>Téléphonie</strong> — <code>/dialer</code>, <code>/calls</code></summary>

- Composeur avec pad numérique et bouton d'appel (mock Twilio en dev)
- `CallBanner` flottant pendant un appel actif
- `PostCallModal` pour la note après appel
- Historique des appels avec filtres · Click-to-call depuis une fiche contact

</details>

<details>
<summary><strong>SMS</strong> — <code>/messages</code></summary>

- Conversations groupées par contact · Thread complet
- Réponse inline · `SmsComposer` avec brouillon

</details>

<details>
<summary><strong>Notifications & Équipe</strong></summary>

- `NotificationCenter` : SMS envoyé/reçu, deal créé, contact créé, appel terminé/manqué, marquer comme lu
- `/team` : liste des membres, invitations (ADMIN/MANAGER), modification du rôle

</details>

## 🔌 Référence API

Headers requis sur toutes les routes authentifiées :

```
Content-Type: application/json
Authorization: Bearer <token_jwt>
```

<details>
<summary><strong><code>/auth</code></strong></summary>

| Méthode | Route | Description |
|---|---|---|
| POST | `/register` | Inscription (1er user = ADMIN) |
| POST | `/login` | Connexion |
| GET | `/me` | Profil utilisateur connecté |
| POST | `/forgot-password` | Demande de réinitialisation |
| POST | `/reset-password` | Réinitialisation du mot de passe |

</details>

<details>
<summary><strong><code>/team</code></strong></summary>

| Méthode | Route | Description |
|---|---|---|
| GET | `/` | Infos de l'équipe |
| PUT | `/` | Modifier le nom de l'équipe |
| POST | `/invite` | Inviter un membre |
| GET | `/members` | Liste des membres |
| PATCH | `/members/:id/role` | Modifier le rôle |

</details>

<details>
<summary><strong><code>/contacts</code></strong></summary>

| Méthode | Route | Description |
|---|---|---|
| GET | `/` | Liste des contacts |
| POST | `/` | Créer un contact |
| GET | `/:id` | Détail d'un contact |
| PUT | `/:id` | Modifier un contact |
| DELETE | `/:id` | Supprimer (soft delete) |

</details>

<details>
<summary><strong><code>/deals</code></strong></summary>

| Méthode | Route | Description |
|---|---|---|
| GET | `/` | Liste des deals (filtres : scope, stage) |
| POST | `/` | Créer un deal |
| GET | `/:id` | Détail d'un deal |
| PUT | `/:id` | Modifier un deal |
| PATCH | `/:id/stage` | Changer le stage (Kanban DnD) |
| PATCH | `/:id/owner` | Réassigner le deal |
| DELETE | `/:id` | Supprimer un deal |

</details>

<details>
<summary><strong><code>/api/calls</code> & <code>/api/webhooks</code></strong></summary>

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/calls/initiate` | Lancer un appel |
| GET | `/api/calls/history` | Historique des appels |
| GET | `/api/calls/:id` | Détail d'un appel |
| POST | `/api/webhooks/call-status` | Callback Twilio (statut appel) |
| POST | `/api/webhooks/sms-incoming` | Callback SMS entrant |

</details>

<details>
<summary><strong><code>/api/sms</code></strong></summary>

| Méthode | Route | Description |
|---|---|---|
| POST | `/send` | Envoyer un SMS |
| POST | `/draft` | Sauvegarder un brouillon |
| GET | `/` | Liste des SMS |
| GET | `/conversations` | Conversations groupées par contact |
| GET | `/conversation/:key` | Messages d'une conversation |
| GET | `/:id` | Détail d'un SMS |
| DELETE | `/:id` | Supprimer un SMS |

</details>

<details>
<summary><strong><code>/api/notifications</code>, <code>/api/dashboard</code>, <code>/health</code></strong></summary>

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/notifications` | Liste des notifications |
| PATCH | `/api/notifications/read` | Marquer comme lu |
| PATCH | `/api/notifications/read-all` | Marquer toutes comme lues |
| GET | `/api/dashboard/stats` | KPIs + données graphiques |
| GET | `/health` | Health check |

</details>

**Format des réponses :**

```json
// Succès
{ "data": "..." }
{ "deals": [...], "total": 42 }
{ "message": "Succès" }

// Erreur
{ "error": "NOT_FOUND" }
{ "error": "VALIDATION_ERROR", "details": [...] }
```

**Codes d'erreur :**

| Code | Signification |
|---|---|
| `INVALID_CREDENTIALS` | Email ou mot de passe incorrect |
| `EMAIL_ALREADY_USED` | Email déjà utilisé |
| `INVITATION_REQUIRED` | Invitation requise pour s'inscrire |
| `INVALID_INVITATION` | Invitation invalide ou expirée |
| `INVITATION_EMAIL_MISMATCH` | L'email ne correspond pas à l'invitation |
| `ACCOUNT_DISABLED` | Compte désactivé |
| `NOT_FOUND` | Ressource non trouvée |
| `FORBIDDEN` | Pas les permissions |
| `INVALID_STAGE` | Stage de deal invalide |
| `INVALID_CONTACT` | Contact non trouvé ou pas dans l'équipe |
| `CANNOT_MODIFY_CLOSED_DEAL` | Deal déjà fermé |
| `INTERNAL_ERROR` | Erreur serveur |

## 🧪 Tests

```bash
cd RingOver\backend
npm test
```

```
Test Suites: 5 passed, 5 total
Tests:       92 passed, 92 total
```

```bash
# Un fichier spécifique
npx jest src/__tests__/auth.test.ts --runInBand --forceExit

# Mode watch
npm run test:watch
```

| Fichier | Tests | Couverture |
|---|---|---|
| `auth.test.ts` | 34 | Register, login, tokens, rôles, mot de passe oublié |
| `deals.test.ts` | ~20 | CRUD deals, validation stage, permissions agent |
| `calls.test.ts` | ~18 | Initiation d'appel, historique, RBAC |
| `contacts.test.ts` | ~8 | CRUD contacts, soft delete |
| `dashboard.test.ts` | 12 | Cache invalidation, KPIs, LOST exclusion, dates custom |

> Les tests utilisent `prisma/test.db` (séparé de `dev.db`), reset avant chaque run via `jest.setup.js` (`npx prisma db push --force-reset --accept-data-loss`).

## ☎️ Mode Twilio

**Mode mock (par défaut)** — quand `TWILIO_ENABLED` n'est pas défini ou `!= 'true'` :

- Les appels passent via `setTimeout` (simulation de 5–15 secondes)
- Le webhook de statut est simulé côté serveur
- Les SMS passent en `SENDING` puis `SENT` après 200–800ms (5% d'échec simulé)

**Mode Twilio réel** — ajouter dans `backend/.env` :

```env
TWILIO_ENABLED=true
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

**Webhooks** (dans la console Twilio) :

```
Voice Status Webhook: http://localhost:3001/api/webhooks/call-status
SMS Status Webhook:   http://localhost:3001/api/webhooks/sms-incoming
```

En dev, exposez le port 3001 avec [ngrok](https://ngrok.com) :

```bash
ngrok http 3001
```

## 📦 Déploiement

**1. Basculer sur PostgreSQL** dans `prisma/schema.prisma` :

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**2. Mettre à jour `.env` :**

```env
DATABASE_URL="postgresql://user:password@host:5432/ringover"
JWT_SECRET="un-secret-beaucoup-plus-long-et-aleatoire"
NODE_ENV=production
FRONTEND_URL="https://votre-domaine.com"
TWILIO_ENABLED=true
```

**3. Migrer la base :**

```bash
npx prisma migrate dev --name init_prod
npx prisma migrate deploy
```

**4. Build :**

```bash
# Backend
cd RingOver\backend
npm run build
npm start

# Frontend
cd RingOver\frontend
npm run build   # → dossier dist/ à servir
```

## 🛠 Dépannage

<details>
<summary><strong>Cannot find module './prisma'</strong></summary>

Le client Prisma n'est pas généré :

```bash
cd RingOver\backend
npx prisma generate
```

</details>

<details>
<summary><strong>EPERM: operation not permitted (Windows)</strong></summary>

Un processus Node.js bloque les fichiers :

```bash
taskkill /F /IM node.exe
npx prisma generate
```

</details>

<details>
<summary><strong>DATABASE_URL not set / 500 au démarrage</strong></summary>

Le fichier `backend/.env` est manquant. Créez-le :

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="ringover-jwt-secret"
PORT=3001
FRONTEND_URL="http://localhost:5173"
```

Puis :

```bash
npx prisma db push
npm run dev
```

</details>

<details>
<summary><strong>INVALID_CREDENTIALS à l'inscription</strong></summary>

Le premier compte se crée via `/register` (pas `/login`). Assurez-vous d'être le premier utilisateur.

</details>

<details>
<summary><strong>Les tests échouent avec « database is locked »</strong></summary>

Les tests parallèles accèdent au même fichier SQLite. Utilisez toujours :

```bash
npm test   # inclut --runInBand --forceExit
```

</details>

<details>
<summary><strong>Le frontend ne charge pas</strong></summary>

1. Vérifiez que le backend tourne sur le port 3001
2. Vérifiez le proxy dans `frontend/vite.config.ts`
3. Vérifiez `VITE_API_URL` ou le proxy dans `frontend/src/utils/api.ts`

</details>

<details>
<summary><strong>Les données de la base sont corrompues</strong></summary>

Reset complet (⚠️ supprime toutes les données) :

```bash
cd RingOver\backend
npx prisma db push --force-reset --accept-data-loss
```

</details>

## ⚡ Commandes rapides

| Action | Commande |
|---|---|
| Installer backend | `cd backend && npm install` |
| Installer frontend | `cd frontend && npm install` |
| Créer la base | `cd backend && npx prisma db push` |
| Lancer backend | `cd backend && npm run dev` |
| Lancer frontend | `cd frontend && npm run dev` |
| Lancer tests | `cd backend && npm test` |
| Voir les données | `cd backend && npx prisma studio` |
| Reset base | `cd backend && npx prisma db push --force-reset --accept-data-loss` |
| Build prod backend | `cd backend && npm run build && npm start` |
| Build prod frontend | `cd frontend && npm run build` |

---

<div align="center">

Fait avec ☕ pour l'équipe RingOver

</div>
