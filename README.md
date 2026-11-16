# Barber

Plateforme de réservation de prestations de coiffure à domicile (Abidjan).
Généré avec [kfullstack](https://github.com/Shalom-302/kfullstack) (architecture
SHAAPI), authentification WhatsApp reprise de Foody. Référence générique de la
base (commandes, contrat d'API, structure) : [docs/kfullstack.md](docs/kfullstack.md).

- **Client** : connexion par numéro WhatsApp + code (OTP) + pseudo, choix de la
  prestation, de la date et du créneau, adresse (commune, quartier, adresse,
  repère), suivi du statut, annulation, contact direct du barbier.
- **Barbier (admin)** : demandes, acceptation / refus / annulation / fin,
  clients et adresses, horaires, pauses, dates bloquées, prestations et tarifs,
  numéros personnels, notifications WhatsApp.

## Démarrage (dev)

```bash
kfullstack up                                   # api, web, postgres, redis, minio
kfullstack auth init --phone "07 XX XX XX XX"   # le barbier devient administrateur
```

| | URL |
| --- | --- |
| Application | http://localhost:3000 (dashboard : `/admin`) |
| API / Swagger | http://localhost:8000/admin/api/v1/docs |

En dev, aucun message WhatsApp n'est envoyé : les codes OTP et les
notifications s'affichent dans `kfullstack logs api` (ligne `[dev] GOWA_URL unset`).
Si le port 5432 est déjà pris sur la machine, changez `POSTGRES_HOST_PORT` dans `.env`.

## Les deux numéros WhatsApp (règle absolue)

| | Numéro système GOWA | Numéro personnel du barbier |
| --- | --- | --- |
| Rôle | OTP, confirmations, notifications automatiques | Contact direct, appels, échanges |
| Configuration | Instance GOWA existante (celle de Foody, numéro Moov dédié) via `GOWA_URL` | `/admin/reglages` (`whatsapp_number`, `call_number`) |
| Côté client | Jamais présenté comme le barbier ; chaque message rappelle « ne répondez pas à ce numéro » | Boutons `https://wa.me/…` et `tel:+…` |

Le backend ne connaît que l'URL de GOWA. `GOWA_SYSTEM_NUMBER` (optionnel)
empêche d'enregistrer ce numéro comme contact personnel du barbier.

**Numérotation** : la numérotation ivoirienne à 10 chiffres est acceptée sous
toutes ses formes (`07 01 02 03 04`, `+225 07…`, `00225…`, `225 07…`) et
stockée `2250701020304`. À l'envoi, si WhatsApp ne connaît pas le numéro à
10 chiffres, l'ancien format à 8 chiffres est essayé
(`WHATSAPP_CI_LEGACY_FALLBACK`) sans changer l'identifiant du compte.

## Règles métier

- Statuts : `PENDING` → `CONFIRMED` → `COMPLETED`, ou `REJECTED` / `CANCELLED`.
- **Double réservation impossible** : contrainte PostgreSQL d'exclusion
  `ex_barber_booking_no_overlap` sur `tstzrange(start_at, blocked_until)` pour les
  statuts `PENDING` et `CONFIRMED` (temps de trajet inclus). Deux demandes
  simultanées sur le même créneau : une seule passe, l'autre reçoit une 409.
- Une demande `PENDING` bloque le créneau jusqu'à son expiration
  (`pending_expiry_minutes`, 2 h par défaut), puis passe `CANCELLED`
  (par `system`) et le client est prévenu.
- Le client peut annuler une demande en attente, ou un rendez-vous confirmé
  jusqu'à `cancel_min_hours` (3 h) avant ; au-delà il contacte le barbier.
- Créneaux = horaires du jour − pauses − dates bloquées − rendez-vous actifs
  (+ trajet), par pas de `slot_step_minutes`, au plus tôt `min_lead_minutes`
  (2 h) et jusqu'à `horizon_days` (30 j).
- Tarifs et durées en base (`barber_service`), modifiables depuis le dashboard ;
  chaque réservation garde une copie du prix au moment de la demande.

Valeurs initiales : 2 prestations (machine du client 10 000 FCFA, machine du
barbier 15 000 FCFA, 45 min), lundi–samedi 9 h–19 h, pause 13 h–14 h, dimanche
fermé, communes d'Abidjan, trajet 30 min. Tout est modifiable dans `/admin`.

## Notifications WhatsApp

Écrites dans la table `barber_notification` **dans la même transaction** que le
changement de statut (aucune perte possible), puis envoyées par une tâche de
fond intégrée à l'API (toutes les `WORKER_INTERVAL_SECONDS`) : 1 message par
seconde (anti-bannissement), nouvelles tentatives à délai croissant (30 s,
1 min, 2 min…) jusqu'à `NOTIFY_MAX_ATTEMPTS` (5), puis `failed`. Le barbier
voit les échecs dans `/admin/notifications` et peut relancer.

| Événement | Destinataire |
| --- | --- |
| Demande reçue | client + barbier (sur son WhatsApp personnel) |
| Confirmée / refusée / annulée par le barbier / terminée | client |
| Annulée par le client | barbier |
| Expirée | client |

## API

Routes sous `/admin/api/v1`, réponses `{code, msg, data}` ; `401` = jeton
absent/expiré, `403` = non autorisé, `409` = créneau pris. Documentation
interactive : `/admin/api/v1/docs` (désactivée en prod).

| Route | Accès |
| --- | --- |
| `POST /auth/whatsapp/request-otp`, `POST /auth/whatsapp/verify-otp` | public |
| `GET/PATCH /auth/me` (`pseudo`), `POST /auth/token/new`, `POST /auth/logout` | connecté |
| `GET /barber/services`, `GET /barber/profile`, `GET /barber/availability?service_id=&date=` | public |
| `POST /barber/bookings`, `GET /barber/bookings`, `GET /barber/bookings/{ref}`, `POST /barber/bookings/{ref}/cancel` | client |
| `GET /barber-admin/overview`, `GET /barber-admin/bookings`, `POST /barber-admin/bookings/{id}/{confirm,reject,cancel,complete}` | admin |
| `GET /barber-admin/clients` | admin |
| `GET/POST/PUT/DELETE /barber-admin/services` | admin |
| `GET/PUT /barber-admin/schedule`, `GET/POST/DELETE /barber-admin/blocked` | admin |
| `GET/PUT /barber-admin/settings` | admin |
| `GET /barber-admin/notifications`, `POST /barber-admin/notifications/{id}/retry` | admin |

## Tests

```bash
docker compose -f docker-compose.yml -f docker-compose.test.yml run --rm tests
```

Base jetable `barber_test` (recréée et migrée par Alembic), Redis db 15, envois
WhatsApp capturés. Couvre : OTP et numérotation ivoirienne, pseudo,
disponibilités (horaires, pauses, dimanche, trajet, dates bloquées), création,
**10 demandes simultanées sur un créneau → 1 seule acceptée**, contrainte SQL,
expiration, confirmation / refus / fin, règles d'annulation, notifications et
relances, liens WhatsApp / appel personnels, refus du numéro GOWA, autorisations.

## Déploiement : GitHub → GHCR → Dokploy

1. Chaque push sur `main` construit `ghcr.io/shalom-302/barber` (API) et
   `ghcr.io/shalom-302/barber-web` (web) via `.github/workflows/build.yml`.
2. Dans Dokploy : service **Compose** depuis ce dépôt, fichier
   **`compose.image.yml`** (les images sont tirées, rien n'est construit sur le VPS).
3. Variables (onglet *Environment*) :

   | Variable | Valeur |
   | --- | --- |
   | `BARBER_IMAGE` | `ghcr.io/shalom-302/barber` |
   | `PUBLIC_DOMAIN` | ex. `barber.exemple.ci` |
   | `TOKEN_SECRET_KEY`, `OPERA_LOG_ENCRYPT_SECRET_KEY`, `POSTGRES_PASSWORD`, `MINIO_SECRET_KEY` | secrets forts (`kfullstack ops secrets`) |
   | `GOWA_BASIC_USER`, `GOWA_BASIC_PASS` | identifiants de l'instance GOWA existante (ceux de Foody) |
   | `GOWA_URL` | `http://shalom-gowa:3080` (par défaut) |
   | `GOWA_SYSTEM_NUMBER` | optionnel (garde-fou) |

   Paquets GHCR privés : ajouter le registre `ghcr.io` dans Dokploy (jeton `read:packages`).
4. Domaine → service **`web`**, port **3000**. L'API rejoint le réseau externe
   `whatsapp-shared-network` pour joindre `shalom-gowa` ; **aucune nouvelle
   instance GOWA n'est créée**.
5. Premier administrateur :
   `docker exec -w /app <conteneur-api> python -m backend.cli create-admin --phone "07XXXXXXXX"`,
   puis connexion WhatsApp sur le site et saisie des numéros personnels dans `/admin/reglages`.

## Structure

```
backend/
  models/barber.py                     prestations, réglages, horaires, réservations, notifications
  alembic/versions/*barber_domain.py   migration, contrainte anti double réservation, données initiales
  app/admin/api/v1/barber.py           API client
  app/admin/api/v1/barber_admin.py     API dashboard (DependsAdmin)
  app/admin/service/
    availability_service.py            calcul des créneaux
    booking_service.py                 réservations, transitions, expiration
    notification_service.py            messages + file d'envoi GOWA avec relances
    workers.py                         tâche de fond (expiration + envois)
  common/whatsapp/gowa.py              client GOWA unique
client/                                Next.js (réservation, espace client, dashboard)
tests/                                 pytest
compose.image.yml                      production Dokploy (images GHCR, GOWA partagé)
```
