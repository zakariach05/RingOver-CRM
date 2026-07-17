# Cahier des charges — Parties 3 & 4

> Pipeline commercial (Deals) et Téléphonie (Dialer, click-to-call, historique 
> Références : F-20 à F-24 (Deals), F-30 à F-36, F-40 à F-42 (Téléphonie)

---

## État d'avancement

| Partie | Statut | Notes |
|--------|--------|-------|
| 3.1 Schéma Deal | ✅ Schema + migration + seed | |
| 3.2 API CRUD Deal | ⬜ À faire | |
| 3.3 Kanban drag & drop | ⬜ À faire | Installer `@dnd-kit/*` |
| 3.4 DealForm | ⬜ À faire | |
| 3.5 DealDetailPage | ⬜ À faire | |
| 3.6 Tests deals | ⬜ À faire | |
| 4.1 Schéma Call | ✅ Schema + migration + seed | |
| 4.2 DialPad | ⬜ À faire | |
| 4.3 API initiate | ⬜ À faire | Mock Twilio si `TWILIO_ENABLED=false` |
| 4.4 CallBanner + CallContext | ⬜ À faire | |
| 4.5 Webhook Twilio | ⬜ À faire | |
| 4.6 PostCallModal | ⬜ À faire | |
| 4.7 Historique appels | ⬜ À faire | |
| 4.8 Click-to-call contact | ⬜ Stub UI existant | |
| 4.9 Contrôle accès par rôle | ⬜ À faire | |
| 4.10 Tests téléphonie | ⬜ À faire | |
| 4.11 Effets sonores | ⬜ À faire | |
| 4.12 Tests sons | ⬜ À faire | |
| 4.13 Notifications desktop + vibration | ⬜ À faire | Section ajoutée (voir ci-dessous) |

---

## PARTIE 3 — Pipeline commercial (Deals)

*Réf. cahier des charges : F-20 à F-24*

### 3.1 Schéma Prisma Deal

**Modèle :**

```
Deal {
  id        (cuid)
  title     String
  value     Float          // > 0, validé côté API (SQLite sans CHECK constraint)
  stage     DealStage      // LEAD | QUALIFIED | PROPOSAL | NEGOTIATION | WON | LOST
  contactId String         // relation obligatoire → Contact
  ownerId   String         // relation → User
  teamId    String
  closedAt  DateTime?      // auto quand stage → WON ou LOST
  createdAt DateTime
  updatedAt DateTime
}
```

**Contraintes applicatives :**
- `value` strictement positive → validation API, erreur `400 INVALID_VALUE`
- Index `(teamId, stage)` pour agrégations dashboard

**Fichiers :**
```
prisma/schema.prisma
prisma/migrations/xxxx_add_deals_and_calls/
src/utils/seed.ts          → deals de test sur les 6 étapes
```

---

### 3.2 API CRUD Deal + règles métier

Routes Express (`authenticate` requis) :

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/deals` | Création |
| `PATCH` | `/deals/:id/stage` | Changement d'étape |
| `PUT` | `/deals/:id` | Édition complète (title, value) |
| `DELETE` | `/deals/:id` | Suppression |
| `GET` | `/deals` | Liste + filtres + pagination |
| `PATCH` | `/deals/:id/owner` | Réassignation (MANAGER/ADMIN) |

**POST /deals**
- Body : `{ title, value, stage?, contactId }`
- Validations : `title` requis, `value > 0` → `400 INVALID_VALUE`, `contactId` requis et dans la même team → `400 CONTACT_REQUIRED`
- Defaults : `stage = LEAD`, `ownerId = req.user.id`

**PATCH /deals/:id/stage**
- Body : `{ stage }`
- Deal déjà `WON`/`LOST` → `403 DEAL_LOCKED` sauf MANAGER/ADMIN réouvrant (nouveau stage ≠ WON/LOST)
- Nouveau stage WON/LOST → `closedAt = now()`
- Réouverture → `closedAt = null`

**PUT /deals/:id**
- Édition title/value bloquée si WON/LOST (sauf réouverture Manager/Admin)

**GET /deals**
- Filtres : `ownerId`, `stage`, `valueMin`, `valueMax`, pagination
- Agent → uniquement ses deals (`ownerId = req.user.id`) ; param `scope=all|mine`
- Manager/Admin → tous les deals de la team

**Fichiers backend :**
```
src/routes/deals.routes.ts
src/controllers/deals.controller.ts
src/services/deals.service.ts
src/validators/deal.validator.ts
src/server.ts               → mount /deals
```

---

### 3.3 Composant Kanban (drag & drop)

Composant `DealsKanban` — React + TypeScript + **dnd-kit** :

- 6 colonnes : Lead → Qualifié → Proposition → Négociation → Gagné → Perdu
- En-tête colonne : nom, count, somme € (calcul client)
- Carte : titre, valeur, avatar owner, cadenas si WON/LOST
- Cartes Gagné/Perdu **non draggables**
- Drop → update optimiste + `PATCH /deals/:id/stage` ; rollback + toast si `403 DEAL_LOCKED`
- Bouton « + Nouvelle affaire »
- Filtres : owner (dropdown), plage valeur (min/max)

**Fichiers frontend :**
```
src/pages/DealsKanbanPage.tsx
src/components/deals/DealsKanban.tsx
src/components/deals/DealColumn.tsx
src/components/deals/DealCard.tsx
src/components/deals/DealFilters.tsx
src/api/deals.api.ts
src/hooks/useDeals.ts
src/__tests__/DealsKanban.test.tsx
```

**Dépendances à installer :**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

### 3.4 Formulaire création/édition d'affaire

Modale `DealForm` :
- Contact (autocomplete `GET /contacts?q=`, debounce, requis)
- Title* (requis)
- Value* (numérique, > 0)
- Stage (dropdown 6 étapes, défaut Lead)
- Submit : `POST /deals` ou `PUT /deals/:id`
- Deal WON/LOST : champs stage/value en lecture seule + message + bouton « Réouvrir » (Manager/Admin) → `PATCH /deals/:id/stage`

**Fichier :** `src/components/deals/DealForm.tsx`

---

### 3.5 Vue détail d'affaire + intégration Contact

Route `/deals/:id` — `DealDetailPage` :
- Titre, valeur, stage (badge), owner, dates (créée, clôturée)
- Bloc contact lié → lien `/contacts/:contactId`
- Actions : Modifier, Supprimer (confirmation), Réassigner (Manager/Admin)
- Deal verrouillé : statut clair + champs grisés

**Intégration 2.9 :** suppression contact avec deal ouvert → backend bloque `409` + liste des deals concernés.

**Fichier :** `src/pages/DealDetailPage.tsx`

---

### 3.6 Tests et cas limites Partie 3

Tests Jest + Supertest (`tests/deals.test.ts`) :

1. Création sans `contactId` → 400
2. `value` négative ou nulle → 400
3. Agent déplace deal WON → 403
4. Manager réouvre deal WON → 200, `closedAt` reset
5. Agent GET /deals → uniquement ses deals (`scope=mine`)
6. Suppression contact avec deal ouvert → 409 (logique 2.9)

Test frontend : rollback drag-and-drop sur mock fetch 403.

---

## PARTIE 4 — Téléphonie

*Réf. cahier des charges : F-30 à F-36, F-40 à F-42*

### 4.1 Schéma Prisma Call

**Modèle :**

```
Call {
  id            (cuid)
  fromNumber    String
  toNumber      String
  direction     CallDirection   // INBOUND | OUTBOUND
  status        CallStatus      // INITIATED | RINGING | ANSWERED | COMPLETED | FAILED | NO_ANSWER | MISSED
  duration      Int?            // secondes, nullable tant que non terminé
  agentId       String          // relation User
  contactId     String?         // relation Contact (nullable)
  note          String?
  recordingUrl  String?
  twilioCallSid String?         // mapping webhook Twilio
  startedAt     DateTime
  endedAt       DateTime?
  teamId        String
}
```

**Index :** `(teamId, agentId, startedAt)`, `(teamId, status)`

**Fichiers :**
```
prisma/schema.prisma
prisma/migrations/xxxx_add_deals_and_calls/
src/utils/seed.ts             → appels test multi-statuts/agents
```

---

### 4.2 Dial pad (composant React)

`DialPad` — Tailwind, style Ringover :
- Numéro composé en grand (lecture seule + clavier physique via onKeyDown)
- Grille 3×4 (0-9, *, #) avec lettres
- Validation regex progressive
- Effacer / Effacer tout (double-clic ou appui long)
- Bouton Appeler (vert), désactivé si invalide
- Route `/dialer` + icône sidebar
- Clic Appeler → `POST /api/calls/initiate` + bandeau persistant

**Fichiers :**
```
src/components/dialer/DialPad.tsx
src/pages/DialerPage.tsx
src/components/Layout.tsx       → lien /dialer
```

---

### 4.3 API d'initiation d'appel

`POST /api/calls/initiate` (`authenticate`) :
- Body : `{ toNumber, contactId? }`
- Vérifie aucun appel actif agent (INITIATED/RINGING/ANSWERED) → `409 CALL_ALREADY_IN_PROGRESS`
- Crée Call OUTBOUND INITIATED, `fromNumber = agent.phoneExtension`
- Auto-match contact par numéro si pas de contactId
- Twilio réel ou mock (`TWILIO_ENABLED=false` → setTimeout ringing 1s, answered 3s)
- Retourne `201 { call }`

**Fichiers :**
```
src/routes/calls.routes.ts
src/controllers/calls.controller.ts
src/services/calls.service.ts
src/services/twilioClient.ts
src/server.ts                   → mount /api/calls
```

**Point d'intégration Twilio Voice (F-34) :**
- Variables : `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Webhook URL : `POST /api/webhooks/call-status`

---

### 4.4 Bandeau d'appel persistant

`CallBanner` monté dans le layout racine (hors `<Outlet />`) :
- Visible si appel actif (INITIATED/RINGING/ANSWERED)
- Affiche contact/numéro, statut, chrono (increment client 1s)
- Boutons Mute + Raccrocher (rouge)
- Mise à jour : polling 2s sur `GET /api/calls/:id` (ou Socket.io)
- Raccrocher → `PATCH /api/calls/:id/hangup` → ferme bandeau → ouvre PostCallModal

**Fichiers :**
```
src/context/CallContext.tsx
src/components/calls/CallBanner.tsx
src/hooks/useCallSocket.ts
src/layout/RootLayout.tsx       → <CallBanner /> hors Outlet
```

---

### 4.5 Webhook Twilio + mise à jour de statut

`POST /api/webhooks/call-status` (pas de JWT — signature Twilio ou header secret mock) :
- Body Twilio : CallSid, CallStatus, CallDuration
- Map status Twilio → enum interne
- Met à jour duration, endedAt si final
- Notifie clients (WebSocket/SSE room teamId ou agentId)
- Retourne 200 rapidement

**Fichiers :**
```
src/routes/webhooks.routes.ts
src/sockets/callSocket.ts
```

---

### 4.6 Fiche appel + note post-appel

`PostCallModal` — ouverture auto fin d'appel (COMPLETED) :
- Numéro/contact, durée, sens, statut
- Textarea note → `PATCH /api/calls/:id { note }`
- Sans contactId → bouton « Créer contact rapide » → `POST /contacts` + associe au Call
- Note optionnelle (F-35 Should)

**Fichier :** `src/components/calls/PostCallModal.tsx`

---

### 4.7 Historique des appels

Route `/calls` — `CallHistoryPage` :

**Backend** `GET /api/calls` :
- Filtres : direction, status (multi), dateFrom, dateTo, contactId, scope, page, pageSize
- Agent + scope=team → force silencieusement scope=mine
- Manager/Admin → scope=team autorisé

**Frontend :**
- Tabs : Tous / Manqués / Terminés / Messagerie vocale
- Date range + recherche contact
- Toggle « Toute l'équipe » (Manager/Admin)
- Tableau : contact/numéro, sens, agent, durée, date, statut
- Ligne cliquable → PostCallModal lecture seule (+ édition note)

**Fichiers :**
```
src/pages/CallHistoryPage.tsx
src/components/calls/CallHistoryTable.tsx
src/components/calls/CallFilters.tsx
src/api/calls.api.ts
```

---

### 4.8 Click-to-call depuis la fiche contact

Brancher bouton « Appeler » (`ContactDetailPage`) :
- `POST /api/calls/initiate { toNumber, contactId }`
- Mise à jour CallContext immédiate (optimistic UI < 300ms)
- Bandeau « Appel en cours... » avant réponse API

**Fichier à modifier :** `src/pages/ContactDetailPage.tsx`

---

### 4.9 Contrôle d'accès par rôle

Sur **toutes** les routes téléphonie :
- Agent : lecture/modification uniquement ses Call (`agentId = req.user.id`)
- Manager/Admin : lecture team entière ; modification uniquement ses appels actifs
- Vérification au niveau contrôleur (pas seulement filtre liste)

**Fichier :** `src/middlewares/requireOwnCall.ts`

---

### 4.10 Tests et cas limites

Tests (`tests/calls.test.ts`) :

1. Numéro inconnu → Call sans contactId
2. Perte connexion polling → bandeau « Reconnexion... » (test frontend)
3. Deux appels simultanés → 409
4. Historique sans contact → affiche numéro formaté
5. Agent GET /api/calls/:id collègue → 403

---

### 4.11 Effets sonores (Dialer / Bandeau d'appel)

**Sons requis** (`public/sounds/`) :

| Fichier | Usage |
|---------|-------|
| `dial-tone.mp3` | Boucle, status INITIATED (sortant) |
| `ringing.mp3` | Boucle, RINGING sortant |
| `incoming-ring.mp3` | Boucle, RINGING entrant (plus marqué) |
| `call-connect.mp3` | One-shot, passage ANSWERED |
| `hangup.mp3` | One-shot, COMPLETED/FAILED/NO_ANSWER |
| `dtmf-tone.mp3` | Bip touche DialPad (optionnel, désactivable) |

**Hook `useCallSounds()` :**
- `play(soundName)` / `stop(soundName)` / `stopAll()` / `setVolume(0.5)`
- Pool `<audio>` réutilisables (pas de fuite mémoire)
- Un seul son loop à la fois
- Branché sur CallContext (transitions status)
- Toggle utilisateur « Sons d'appel » (localStorage MVP, ou `User.soundsEnabled` en DB)
- **Autoplay navigateur :** sons uniquement après interaction utilisateur (clic Appeler) — commentaire dans le code

**Fichiers :**
```
public/sounds/*.mp3
src/hooks/useCallSounds.ts
src/utils/audioManager.ts
src/components/settings/SoundPreferenceToggle.tsx
src/context/CallContext.tsx         → branchement transitions
src/components/calls/CallBanner.tsx → stopAll() unmount + hangup
src/components/dialer/DialPad.tsx   → DTMF
src/pages/SettingsPage.tsx          → toggle sons
```

> **Assets MVP :** fichiers `.mp3` générés/programmatiques dans le repo (pas de dépendance Freesound/Zapsplat). Remplaçables par assets Ringover-like en prod.

---

### 4.12 Tests — effets sonores

Tests Jest + Testing Library (mock `HTMLMediaElement.play/pause`) :

1. RINGING → ANSWERED : stop ringing, play call-connect
2. Hangup : stopAll(), aucun son actif
3. Sons désactivés : aucun play()
4. Démontage CallBanner : boucles coupées

**Fichiers :**
```
src/hooks/useCallSounds.test.ts
```

---

### 4.13 Notifications desktop + vibration (ajout)

Section complémentaire à 4.11 — **canal séparé des sons** :

| Canal | Déclencheur | API |
|-------|-------------|-----|
| Notification desktop | Appel entrant, onglet en arrière-plan | `Notification API` |
| Vibration | Appel entrant, mobile | `navigator.vibrate()` |

**Règles UX :**
- Permission demandée au **premier appel entrant** (pas au login)
- Toggle séparé « Notifications desktop » (localStorage MVP)
- Pas de notification si onglet focus + bandeau visible
- Vibration : `if ('vibrate' in navigator)` — no-op desktop

**Fichiers :**
```
src/hooks/useCallNotifications.ts
src/components/settings/NotificationPreferenceToggle.tsx
src/context/CallContext.tsx
```

---

## Fichiers — vue d'ensemble

### Backend (nouveaux / modifiés)

```
prisma/
  schema.prisma
  migrations/
  seed.ts                    ← contacts + deals + calls

src/
  routes/deals.routes.ts
  routes/calls.routes.ts
  routes/webhooks.routes.ts
  controllers/deals.controller.ts
  controllers/calls.controller.ts
  services/deals.service.ts
  services/calls.service.ts
  services/twilioClient.ts
  services/contacts.service.ts   ← guard suppression deal ouvert (2.9)
  validators/deal.validator.ts
  middlewares/requireOwnCall.ts
  sockets/callSocket.ts
  server.ts

tests/
  deals.test.ts
  calls.test.ts
```

### Frontend (nouveaux / modifiés)

```
public/sounds/

src/
  pages/DealsKanbanPage.tsx
  pages/DealDetailPage.tsx
  pages/DialerPage.tsx
  pages/CallHistoryPage.tsx
  pages/SettingsPage.tsx
  components/deals/
  components/dialer/
  components/calls/
  components/settings/
  context/CallContext.tsx
  api/deals.api.ts
  api/calls.api.ts
  hooks/useDeals.ts
  hooks/useCallSounds.ts
  hooks/useCallNotifications.ts
  hooks/useCallSocket.ts
  utils/audioManager.ts
  layout/RootLayout.tsx
  pages/ContactDetailPage.tsx    ← click-to-call (4.8)
  App.tsx                        ← routes /deals, /dialer, /calls
  components/Layout.tsx          ← navigation
```

---

## Ordre d'implémentation recommandé

```
✅ 3.1 + 4.1  Schema Prisma Deal + Call, migration, seed
→  3.2         API deals + tests 3.6
→  3.3–3.5     Frontend deals (Kanban, form, détail)
→  2.9         Guard suppression contact (deal ouvert)
→  4.3         API initiate (mock Twilio)
→  4.4         CallContext + CallBanner
→  4.2 + 4.8   DialPad + click-to-call
→  4.5 + 4.7   Webhook + historique
→  4.9 + 4.10  Accès + tests téléphonie
→  4.11 + 4.12 Sons + tests
→  4.13        Notifications desktop + vibration
```

---

## Comptes seed (dev)

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| admin@ringover.com | Admin123 | ADMIN |
| manager@ringover.com | Agent123 | MANAGER |
| agent@ringover.com | Agent123 | AGENT |
