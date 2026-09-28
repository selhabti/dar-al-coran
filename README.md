# Dar al-Coran

Application de suivi des cours du Coran : présences, validation des séances et messagerie aux
parents via Telegram.

## Fonctionnalités

- **Élèves** : nom, prénom, ville de résidence, e-mail, téléphone, groupe.
- **Groupes** avec horaire récurrent (ex. tous les samedis 09:00–10:30, `Europe/Paris`).
- **Séances générées automatiquement** selon l'horaire du groupe ; la page du jour affiche une
  carte calendrier et la séance en cours.
- **Pointage** : présent / retard / absent justifié / absent non justifié, validation du cours et
  commentaire, dans un tableau unique.
- **Fin de séance** : enregistrement du dernier verset étudié (sourate + numéro de verset).
- **Statistiques** par élève (présences, retards, absences justifiées / non justifiées).
- **Messagerie aux parents** via un bot Telegram, avec modèles de messages et rapport d'envoi.
- **PWA** installable (hors-ligne via Serwist).

## Stack technique

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) + `lucide-react`
- PostgreSQL [Neon](https://neon.tech) via `@neondatabase/serverless`
- [Neon Auth](https://neon.tech/docs/auth) (Managed Better Auth) via `@neondatabase/auth`
- Bot [Telegram](https://core.telegram.org/bots/api)
- Déploiement Cloudflare Workers via `@opennextjs/cloudflare`

## Prérequis

- Node.js >= 20.9 (22 recommandé)
- Un projet [Neon](https://console.neon.tech)
- Un bot Telegram créé via [@BotFather](https://t.me/BotFather)

## Configuration

Créez un fichier `.env.local` à la racine (voir `.env.example`) :

```dotenv
DATABASE_URL=
DIRECT_DATABASE_URL=
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=
```

- `DATABASE_URL` : chaîne **poolée** (l'hôte contient `-pooler`).
- `DIRECT_DATABASE_URL` : chaîne **directe**, utilisée par les migrations.
- `NEON_AUTH_COOKIE_SECRET` : secret d'au moins 32 caractères, par exemple :
  `openssl rand -base64 32`.

## Démarrage

```bash
npm install
npm run migrate
npm run dev
```

Ouvrez ensuite http://localhost:3000.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Démarre le build de production |
| `npm run migrate` | Applique les migrations SQL |
| `npm run telegram:webhook` | Enregistre le webhook Telegram |
| `npm run telegram:info` | Affiche les informations du bot |
| `npm run lint` | Analyse ESLint |
| `npm run typecheck` | Vérification TypeScript |
| `npm run deploy` | Build + déploiement Cloudflare |

## Structure

```
src/app/              Routes (App Router), route handlers et server actions
src/components/       Composants d'interface
src/lib/data/         Accès aux données (requêtes SQL)
src/lib/telegram/     Client et envoi Telegram
src/server/actions/   Server actions (sessions, élèves, messages)
migrations/           Migrations SQL
scripts/              Migration, Telegram, génération d'icônes
```

## Base de données

Les migrations vivent dans `migrations/` et sont appliquées avec `npm run migrate`. La progression
est suivie dans la table `schema_migrations`.

## Licence

Distribué sous licence MIT — voir le fichier [LICENSE](./LICENSE).
