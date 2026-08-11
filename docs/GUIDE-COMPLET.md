# Guide Complet - RingOver CRM & Téléphonie d'entreprise

> Guide de A à Z : installation, configuration, utilisation, et maintenance.

---

## Table des matières

1. [Présentation du projet](#1-présentation-du-projet)
2. [Prérequis](#2-prérequis)
3. [Installation](#3-installation)
4. [Configuration de la base de données](#4-configuration-de-la-base-de-données)
5. [Lancement du projet](#5-lancement-du-projet)
6. [Authentification](#6-authentification)
7. [Fonctionnalités](#7-fonctionnalités)
8. [API Référence](#8-api-référence)
9. [Tests](#9-tests)
10. [Mode Twilio](#10-mode-twilio)
11. [Déploiement](#11-déploiement)
12. [Dépannage](#12-dépannage)

---

## 1. Présentation du projet

**RingOver CRM** est une plateforme de CRM cloud avec téléphonie d'entreprise intégrée. Elle combine :

- **Gestion de contacts** — CRUD complet avec soft delete (RGPD)
- **Pipeline de ventes (Deals)** — Kanban drag & drop (LEAD → WON/LOST)
- **Téléphonie** — Appels via Twilio (ou mode mock en dev), historique, click-to-call
- **SMS** — Envoi, réception, conversations par contact
- **Dashboard analytique** — KPIs, graphiques (volume d'appels, appels par agent, pipeline)
- **Notifications** — Centre de notification in-app
- **Authentification** — JWT avec rôles (ADMIN / MANAGER / AGENT), mot de passe oublié

**Stack technique :**

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Graphiques | Recharts |
| Backend | Express.js + TypeScript |
| ORM | Prisma |
| Base de données | SQLite (dev/test) |
| Auth | JWT (Bearer token) |
| Téléphonie | Twilio (mock en dev) |
| Tests | Jest + Supertest |

---

## 2. Prérequis

| Outil | Version minimale | Vérification |
|-------|------------------|--------------|
| **Node.js** | v18+ | `node -v` |
| **npm** | v9+ | `npm -v` |

C'est tout. Pas de Docker, pas de Redis, pas de PostgreSQL nécessaire en développement.

---

## 3. Installation

### 3.1 Cloner ou ouvrir le projet

Le projet se trouve dans :
```
C:\Users\HP\Desktop\Plateforme CRM cloud & téléphonie d'entreprise\RingOver\
```

### 3.2 Installer les dépendances Backend

```bash
cd RingOver\backend
npm install
```

### 3.3 Installer les dépendances Frontend

```bash
cd RingOver\frontend
npm install
```

---

## 4. Configuration de la base de données

### 4.1 Créer le fichier `.env`

Créez le fichier `backend/.env` avec ce contenu :

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="ringover-jwt-secret-change-me-in-production"
PORT=3001
FRONTEND_URL="http://localhost:5173"
```

> **Note** : Ce fichier existe déjà dans le projet. Vérifiez-le avant de continuer.

### 4.2 Pousser le schéma Prisma vers la base SQLite

C'est l'étape **la plus importante** — elle crée toutes les tables :

```bash
cd RingOver\backend
npx prisma db push
```

**Ce que cette commande fait :**
1. Lit le fichier `prisma/schema.prisma`
2. Crée ou met à jour la base `prisma/dev.db` (fichier SQLite)
3. Crée toutes les tables : Team, User, Invitation, Contact, Deal, Call, Sms, Notification
4. Génère le client Prisma pour TypeScript

**Résultat attendu :**
```
Datasource "db": SQLite database "dev.db" at "file:./dev.db"
Your database is now in sync with your Prisma schema. Done in XXXms
Running generate...
✔ Generated Prisma Client
```

### 4.3 Vérifier que la base existe

Vérifiez que le fichier `backend/prisma/dev.db` a été créé :

```bash
dir backend\prisma\dev.db
```

### 4.4 (Optionnel) Ouvrir Prisma Studio — Visualiser les données

```bash
cd RingOver\backend
npx prisma studio
```

Ouvre `http://localhost:5555` dans le navigateur. Vous pouvez voir, ajouter, modifier et supprimer des données directement.

### 4.5 Modifier le schéma (si besoin)

Si vous modifiez `prisma/schema.prisma`, relancez :

```bash
npx prisma db push
```

Pour une migration structurée (en prod) :
```bash
npx prisma migrate dev --name nom_de_la_migration
```

### 4.6 Schéma complet de la base

```
Team
├── id (cuid)
├── name
├── createdAt
└── users[], invitations[], contacts[], deals[], calls[], sms[], notifications[]

User
├── id (cuid)
├── email (unique)
├── passwordHash
├── name
├── role (ADMIN | MANAGER | AGENT)
├── status (ACTIVE | INACTIVE)
├── phoneExtension?
├── resetToken?          ← Mot de passe oublié
├── resetTokenExpiry?    ← Mot de passe oublié
├── teamId → Team
├── createdAt, updatedAt
└── sentInvitations[], ownedContacts[], ownedDeals[], calls[], sentSms[], notifications[]

Invitation
├── id, email, role, token (unique), status (PENDING | ACCEPTED | EXPIRED)
├── expiresAt, teamId → Team, invitedById → User
└── createdAt

Contact
├── id, name, company?, phone, email?, tags?, notes?
├── ownerId? → User, teamId → Team
├── deletedAt? (soft delete RGPD)
├── createdAt, updatedAt
└── deals[], calls[], sms[]

Deal
├── id, title, value, stage (LEAD | QUALIFIED | PROPOSAL | NEGOTIATION | WON | LOST)
├── contactId? → Contact, ownerId → User, teamId → Team
├── closedAt?, createdAt, updatedAt

Call
├── id, fromNumber, toNumber, direction (INBOUND | OUTBOUND)
├── status (INITIATED | RINGING | ANSWERED | COMPLETED | FAILED | NO_ANSWER | MISSED)
├── duration?, agentId → User, contactId? → Contact
├── note?, recordingUrl?, twilioCallSid?
├── startedAt, endedAt?, teamId → Team

Sms
├── id, toNumber, fromNumber, body
├── status (SENDING | SENT | FAILED | DRAFT)
├── agentId → User, contactId? → Contact, teamId → Team
├── createdAt, updatedAt

Notification
├── id, userId → User
├── type (SMS_SENT | SMS_RECEIVED | DEAL_CREATED | CONTACT_CREATED | CALL_ENDED | CALL_MISSED | SYSTEM)
├── title, body, link?, read (default false), teamId → Team
└── createdAt
```

---

## 5. Lancement du projet

### 5.1 Lancer le Backend (port 3001)

```bash
cd RingOver\backend
npm run dev
```

**Résultat :**
```
Server running on http://localhost:3001
```

### 5.2 Lancer le Frontend (port 5173)

**Ouvrez un second terminal** :

```bash
cd RingOver\frontend
npm run dev
```

**Résultat :**
```
Local: http://localhost:5173/
```

### 5.3 Ouvrir dans le navigateur

```
http://localhost:5173
```

### 5.4 Premier utilisateur (Admin)

La **première inscription** crée automatiquement un compte **ADMIN** et une équipe "Default Team".

1. Aller sur `http://localhost:5173/register`
2. Remplir :
   - Nom : `Admin RingOver`
   - Email : `admin@ringover.com`
   - Mot de passe : `Admin123` (8 car. min, 1 majuscule, 1 chiffre)
3. Cliquer "S'inscrire"
4. → Redirigé vers le Dashboard

### 5.5 Ajouter d'autres utilisateurs

Les utilisateurs suivants ont besoin d'une **invitation** de la part d'un ADMIN ou MANAGER :

1. L'ADMIN va sur `/team`
2. Clique "Inviter un membre"
3. Entre l'email et le rôle
4. Le lien d'inscription s'affiche (mode dev) ou est envoyé par email (prod)
5. Le nouvel utilisateur s'inscrit avec ce lien

---

## 6. Authentification

### 6.1 Flux d'authentification

```
Login → POST /auth/login { email, password }
  → Réponse : { token: "eyJ...", user: { id, email, name, role } }
  → Token stocké dans localStorage (via React Context)
  → Toutes les requêtes API incluent : Authorization: Bearer <token>
```

### 6.2 Rôles et permissions

| Rôle | Permissions |
|------|------------|
| **ADMIN** | Tout faire : gérer l'équipe, les contacts, les deals, voir tous les appels |
| **MANAGER** | Gérer les contacts, les deals, voir les appels de l'équipe |
| **AGENT** | Gérer ses propres contacts, deals, appels. Pas d'accès à l'équipe. |

### 6.3 Mot de passe oublié

1. Sur la page de login, cliquer "Mot de passe oublié ?"
2. Entrer son email → le lien de réinitialisation s'affiche (mode dev)
3. Cliquer le lien → page de réinitialisation
4. Entrer le nouveau mot de passe
5. Retour à la connexion

> **En mode développement** : le lien de réinitialisation est affiché directement sur la page car il n'y a pas de service d'email configuré.

---

## 7. Fonctionnalités

### 7.1 Dashboard (`/dashboard`)

- **4 KPIs** : Appels (avec delta %), Contacts, Deals en cours, Valeur gagnée
- **Graphique volume d'appels** : Line chart par jour
- **Graphique appels par agent** : Bar chart horizontale (scrollable 10+ agents)
- **Graphique pipeline** : Bar chart par étape + ligne de tendance (moyenne)
- **Sélection de période** : 7j / 14j / 30j / 90j + période personnalisée
- **Cache** : 30 secondes, invalidé sur création/modification de call ou deal
- **État vide** : Message d'accueil avec lien vers les contacts

### 7.2 Contacts (`/contacts`)

- Liste avec recherche
- Fiche contact détaillée (`/contacts/:id`)
- Création / Modification / Suppression (soft delete RGPD)
- Lien avec les deals et les appels du contact

### 7.3 Deals / Pipeline (`/deals`)

- **Vue Kanban** : colonnes par étape (LEAD → QUALIFICATION → PROPOSITION → NÉGOCIATION → GAGNÉ)
- **Drag & drop** pour déplacer les deals entre colonnes
- Création de deal avec contact obligatoire
- Détail du deal (`/deals/:id`)
- Filtres et recherche

### 7.4 Téléphonie

#### Composeur (`/dialer`)
- Pad numérique pour composer un numéro
- Bouton d'appel (mock Twilio en dev)

#### Appels
- **CallBanner** : bannière flottante pendant un appel actif
- **PostCallModal** : formulaire de note après un appel
- **Historique** (`/calls`) : liste de tous les appels avec filtres
- **Click-to-call** : cliquer un numéro dans un contact lance l'appel

### 7.5 SMS (`/messages`)

- **Conversations** : liste groupée par contact
- **Thread** : vue de tous les messages avec un contact
- **Réponse inline** : envoyer un SMS directement depuis la conversation
- **SmsComposer** : modal d'envoi avec brouillon

### 7.6 Notifications

- **NotificationCenter** : cloche dans la sidebar/bottom-left
- Notifications pour : SMS envoyé/reçu, deal créé, contact créé, appel terminé/manqué
- Marquer comme lu

### 7.7 Gestion d'équipe (`/team`)

- Liste des membres de l'équipe
- Invitation de nouveaux membres (ADMIN/MANAGER)
- Modification du rôle

---

## 8. API Référence

### 8.1 Routes montées

| Préfixe | Route | Description |
|---------|-------|-------------|
| `/auth` | `POST /register` | Inscription (1er user = ADMIN) |
| | `POST /login` | Connexion |
| | `GET /me` | Profil utilisateur connecté |
| | `POST /forgot-password` | Demande de réinitialisation |
| | `POST /reset-password` | Réinitialisation du mot de passe |
| `/team` | `GET /` | Infos de l'équipe |
| | `PUT /` | Modifier le nom de l'équipe |
| | `POST /invite` | Inviter un membre |
| | `GET /members` | Liste des membres |
| | `PATCH /members/:id/role` | Modifier le rôle |
| `/contacts` | `GET /` | Liste des contacts |
| | `POST /` | Créer un contact |
| | `GET /:id` | Détail d'un contact |
| | `PUT /:id` | Modifier un contact |
| | `DELETE /:id` | Supprimer (soft delete) |
| `/deals` | `GET /` | Liste des deals (filtres : scope, stage) |
| | `POST /` | Créer un deal |
| | `GET /:id` | Détail d'un deal |
| | `PUT /:id` | Modifier un deal |
| | `PATCH /:id/stage` | Changer le stage (Kanban DnD) |
| | `PATCH /:id/owner` | Réassigner le deal |
| | `DELETE /:id` | Supprimer un deal |
| `/api/calls` | `POST /initiate` | Lancer un appel |
| | `GET /history` | Historique des appels |
| | `GET /:id` | Détail d'un appel |
| `/api/webhooks` | `POST /call-status` | Callback Twilio (statut appel) |
| | `POST /sms-incoming` | Callback SMS entrant |
| `/api/sms` | `POST /send` | Envoyer un SMS |
| | `POST /draft` | Sauvegarder un brouillon |
| | `GET /` | Liste des SMS |
| | `GET /conversations` | Conversations groupées par contact |
| | `GET /conversation/:key` | Messages d'une conversation |
| | `GET /:id` | Détail d'un SMS |
| | `DELETE /:id` | Supprimer un SMS |
| `/api/notifications` | `GET /` | Liste des notifications |
| | `PATCH /read` | Marquer comme lu |
| | `PATCH /read-all` | Marquer toutes comme lues |
| `/api/dashboard` | `GET /stats` | KPIs + données graphiques |
| `/health` | `GET /` | Health check |

### 8.2 Headers requis

```
Content-Type: application/json
Authorization: Bearer <token_jwt>
```

### 8.3 Format des réponses

**Succès :**
```json
{ "data": "..." }
// ou
{ "deals": [...], "total": 42 }
// ou
{ "message": "Succès" }
```

**Erreur :**
```json
{ "error": "NOT_FOUND" }
// ou
{ "error": "VALIDATION_ERROR", "details": [...] }
```

### 8.4 Codes d'erreur

| Code | Signification |
|------|--------------|
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

---

## 9. Tests

### 9.1 Lancer tous les tests

```bash
cd RingOver\backend
npm test
```

**Résultat :**
```
Test Suites: 6 passed, 6 total
Tests:       106 passed, 106 total
```

### 9.2 Lancer un fichier de test spécifique

```bash
npx jest src/__tests__/auth.test.ts --runInBand --forceExit
```

### 9.3 Lancer en mode watch (re-exécution automatique)

```bash
npm run test:watch
```

### 9.4 Fichiers de test

| Fichier | Tests | Couverture |
|---------|-------|------------|
| `auth.test.ts` | 34 | Register, login, tokens, rôles, mot de passe oublié |
| `deals.test.ts` | ~20 | CRUD deals, validation stage, permissions agent |
| `calls.test.ts` | ~18 | Initiation d'appel, historique, RBAC |
| `contacts.test.ts` | ~8 | CRUD contacts, soft delete |
| `dashboard.test.ts` | 12 | Cache invalidation, KPIs, LOST exclusion, dates custom |

### 9.5 Base de données de test

Les tests utilisent `prisma/test.db` (séparé de `dev.db`). La base est reset à chaque test via `jest.setup.js` :
```bash
npx prisma db push --force-reset --accept-data-loss
```

---

## 10. Mode Twilio

### 10.1 Mode mock (par défaut)

Quand `TWILIO_ENABLED` n'est pas défini ou `!= 'true'` :

- Les appels passent via `setTimeout` (simulation de 5-15 secondes)
- Le webhook de statut est simulé côté serveur
- Les SMS passent en statut "SENDING" puis "SENT" après 200-800ms (5% d'échec simulé)

### 10.2 Mode Twilio réel

Ajoutez dans `backend/.env` :

```env
TWILIO_ENABLED=true
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### 10.3 Webhooks Twilio

Pour recevoir les callbacks de statut, configurez dans votre console Twilio :

```
Voice Status Webhook: http://localhost:3001/api/webhooks/call-status
SMS Status Webhook:   http://localhost:3001/api/webhooks/sms-incoming
```

En dev, utilisez **ngrok** pour exposer le port 3001 :
```bash
ngrok http 3001
```

---

## 11. Déploiement

### 11.1 Préparer la production

1. **Changer le provider de base** dans `prisma/schema.prisma` :
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. **Mettre à jour `.env`** :
   ```env
   DATABASE_URL="postgresql://user:password@host:5432/ringover"
   JWT_SECRET="un-secret-beaucoup-plus-long-et-aleatoire"
   NODE_ENV=production
   FRONTEND_URL="https://votre-domaine.com"
   TWILIO_ENABLED=true
   ```

3. **Migrer la base** :
   ```bash
   npx prisma migrate dev --name init_prod
   npx prisma migrate deploy
   ```

### 11.2 Build Backend

```bash
cd RingOver\backend
npm run build
npm start
```

### 11.3 Build Frontend

```bash
cd RingOver\frontend
npm run build
```

Le dossier `dist/` contient les fichiers statiques à servir.

---

## 12. Dépannage

### Erreur : "Cannot find module './prisma'"

Le client Prisma n'est pas généré :
```bash
cd RingOver\backend
npx prisma generate
```

### Erreur : "EPERM: operation not permitted" (Windows)

Un processus Node.js bloque les fichiers :
```bash
taskkill /F /IM node.exe
npx prisma generate
```

### Erreur : "DATABASE_URL not set" ou 500 au démarrage

Le fichier `backend/.env` est manquant. Créer-le :
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="ringover-jwt-secret"
PORT=3001
FRONTEND_URL="http://localhost:5173"
```

Puis relancer :
```bash
npx prisma db push
npm run dev
```

### Erreur : "INVALID_CREDENTIALS" à l'inscription

Le premier compte se crée via `/register` (pas `/login`). Assurez-vous d'être le premier utilisateur.

### Les tests échouent avec "database is locked"

Les tests parallèles accèdent au même fichier SQLite. Utilisez toujours :
```bash
npm test   # (qui inclut --runInBand --forceExit)
```

### Le frontend ne charge pas

1. Vérifiez que le backend tourne sur le port 3001
2. Vérifiez le proxy dans `frontend/vite.config.ts`
3. Vérifiez `VITE_API_URL` ou le proxy dans `frontend/src/utils/api.ts`

### Les données de la base sont corrompues

Reset complet :
```bash
cd RingOver\backend
npx prisma db push --force-reset --accept-data-loss
```

> **Attention** : toutes les données seront supprimées.

---

## Commandes rapides

| Action | Commande |
|--------|----------|
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
