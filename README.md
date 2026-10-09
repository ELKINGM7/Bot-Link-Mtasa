# Bot-Link-Mtasa

A Discord bot that links a **Discord server** with an **MTA:SA (Multi Theft Auto: San Andreas)** roleplay server.
It reads and writes the same MySQL database as your game server and talks to the game server over MTA's HTTP
remote-call interface, so staff can manage the server straight from Discord.

> **Version:** 6.0 &nbsp;|&nbsp; **Runtime:** Node.js 16.9+ &nbsp;|&nbsp; **Library:** discord.js v13

---

## Features

- **Account linking** – players link their in-game account to their Discord account by sending the link code generated in-game to the bot in a **direct message** (`/discordlink` explains the process).
- **Account tools** – `/account`, `/myaccount`, `/check`, `/changeserial`, `/changepassword`, `/changid`.
- **Admin tools** – `/givemoney`, `/givevehicle`, `/banplayer`, `/banserial`, `/unbanserial`, `/find`,
  `/withdrawcharacter`, `/setskin`, `/restart`, `/cancelrestart`.
- **Leaderboards** – `/moneytop`, `/hourstop`.
- **Ticket system** – ticket panel, claim/close buttons, HTML transcripts, ratings, blacklist (`/blacklisttickets`),
  per-staff statistics (`/checkmytickets`, `/resetadmin`, `/resetembed`, `/sendtickets`).
- **Auctions & grocery orders** – `/createauction`, `/delivergrocery`, bids and automatic payout.
- **Live server status** – player count shown as the bot's activity, status embed with uptime / players.
- **Webhook logs** – money, bans, restarts, vehicles, password changes, skin changes, withdrawals, etc.

---

## Project structure

```
Bot-Link-Mtasa/
├── index.js          # The bot (commands, tickets, auctions, DB access)
├── config.js         # Loads and validates settings from .env
├── .env.example      # Template for your secrets  (copy to .env)
├── package.json
├── .gitignore
├── README.md
└── data/             # Created/filled automatically at runtime (not committed)
    ├── tickets.db            # SQLite: tickets, auctions, ratings, stats, blacklist
    └── ticketNumbers.json    # Per-category ticket counters
```

---

## Requirements

| Requirement | Notes |
|---|---|
| Node.js **16.9+** (18 or 20 LTS recommended) | `node -v` |
| MySQL / MariaDB | The **same database** your MTA:SA server uses |
| MTA:SA server | With HTTP remote calls enabled (see below) |
| A Discord application + bot | Created in the Discord Developer Portal |

---

## Installation

```bash
git clone https://github.com/ELKINGM7/Bot-Link-Mtasa.git
cd Bot-Link-Mtasa
npm install
cp .env.example .env      # Windows: copy .env.example .env
```

Edit `.env` and fill in your values (see the next sections), then start the bot:

```bash
npm start          # production
npm run dev        # auto-restart on file changes (nodemon)
```

For 24/7 hosting use a process manager such as PM2:

```bash
npm install -g pm2
pm2 start index.js --name bot-link-mtasa
pm2 save
```

---

## 1) Create the Discord bot

1. Go to <https://discord.com/developers/applications> → **New Application**.
2. **Bot** tab → **Reset Token** → copy it into `DISCORD_TOKEN`.
3. In the same tab enable these **Privileged Gateway Intents**:
   - **Server Members Intent**
   - **Message Content Intent**
4. **General Information** → copy **Application ID** into `CLIENT_ID`.
5. Enable *Developer Mode* in Discord (Settings → Advanced), right-click your server → **Copy Server ID** → `GUILD_ID`.
6. Invite the bot with the scopes **`bot`** and **`applications.commands`** and the **Administrator** permission
   (or at least: Manage Channels, Manage Roles, Send Messages, Embed Links, Attach Files, Read Message History).

---

## 2) Connect the database (MySQL)

The bot does **not** create its own copy of your game data – it connects to the **same MySQL database used by the
MTA:SA server**. Everything is configured in `.env`:

```env
DB_HOST=127.0.0.1        # IP / hostname of the MySQL server
DB_PORT=3306             # default MySQL port
DB_USER=mta_user         # MySQL user
DB_PASSWORD=your_password
DB_NAME=mta              # the database name used by your MTA server
```

### Steps

1. **Find your MTA database credentials.** They are in your MTA gamemode's connection settings
   (usually a `dbConnect("mysql", "dbname=...;host=...", user, password)` call in the database resource).
2. **Create a user for the bot** (recommended instead of reusing root). Run on your MySQL server:

   ```sql
   CREATE USER 'discord_bot'@'%' IDENTIFIED BY 'a_strong_password';
   GRANT SELECT, INSERT, UPDATE, DELETE, CREATE ON your_mta_database.* TO 'discord_bot'@'%';
   FLUSH PRIVILEGES;
   ```
   Replace `'%'` with the bot host's IP if you want to restrict access.
3. **Allow remote access** if the bot runs on a different machine than MySQL:
   open port `3306` for the bot's IP in your firewall / hosting panel, and make sure MySQL is not bound only
   to `127.0.0.1` (`bind-address` in `my.cnf`).
4. **Put the values in `.env`** and start the bot. A successful connection prints:

   ```
   MySQL Pool Connected!
   Database connection verified on startup.
   discord_interactions table ready
   ```

   If you see `ECONNREFUSED`, `ER_ACCESS_DENIED_ERROR` or `ETIMEDOUT`, re-check host, port, user, password and firewall.

### Tables the bot expects (from your MTA server)

| Table | Columns used by the bot |
|---|---|
| `accounts` | `id`, `username`, `password` (MD5 hash), `email`, `discord`, `LinkCode`, `credits`, `admin`, `mtaserial`, `lastlogin`, `registerdate` |
| `characters` | `id`, `account`, `charactername`, `money`, `bankmoney`, `hoursplayed`, `skin` |
| `bans` | `serial` (+ `reason`) |

If your `accounts` table does not have the linking columns yet, add them:

```sql
ALTER TABLE accounts
  ADD COLUMN discord  VARCHAR(32) NULL,
  ADD COLUMN LinkCode INT NOT NULL DEFAULT 0,
  ADD COLUMN mtaserial VARCHAR(64) NULL;
```

> Column names must match your gamemode. If yours differ, adjust the SQL in `index.js`
> (search for `safeQuery(`).

The table `discord_interactions` is created automatically by the bot on first start.
The ticket/auction data is stored in a local **SQLite** file (`data/tickets.db`), also created automatically –
you do not need to set anything up for it.

---

## 3) Connect the MTA:SA game server

The bot calls functions inside your MTA server through MTA's **HTTP remote call** interface
(the `mtasa` npm package → `http://IP:PORT/<resource>/call/<function>`).

```env
MTA_SERVER_IP=1.2.3.4
MTA_GAME_PORT=22003        # port players connect to (used for the status query & join link)
MTA_ADMIN_USER=admin_user  # MTA account used for the remote calls
MTA_ADMIN_PASSWORD=admin_password
MTA_HTTP_PORTS=22005       # HTTP port(s) of the MTA server, comma separated
```

**On the MTA server:**

1. Make sure the HTTP server is on in `mtaserver.conf` (`<httpport>` and `<httpserver>` settings) and that the
   port in `MTA_HTTP_PORTS` is open to the bot.
2. Create/choose an MTA account for the bot and give it HTTP access in `acl.xml` (adapt the names to your setup):

   ```xml
   <group name="DiscordBot">
       <acl name="DiscordBot"/>
       <object name="user.discord_bot"/>
   </group>
   <acl name="DiscordBot">
       <right name="general.http" access="true"/>
   </acl>
   ```
3. The bot expects **two resources** on the game server that export the functions it calls:
   - `handler` – e.g. `giveThings`, `banThePlayer`, `banSerial`, `unbanPlayer`, `getPlayerInfo`,
     `makeVehicleForPlayer`, `restartServer`, `cancelRestart`, `acceptOrder`, `playerRequest`,
     `giveAuctionItem`, `givePlayerMoney`, `takePlayerMoney`
   - `discordLink` – `triggerIt`, `getRolesTrigger`

   Add each function to the resource's `meta.xml` as `<export function="..." http="true"/>` so it can be called over HTTP.
   **These two resources belong to your game server and are not part of this repository.**

---

## 4) Discord webhooks (optional log channels)

Every `WEBHOOK_*` variable in `.env` is a Discord webhook URL for a log channel
(*Channel settings → Integrations → Webhooks → New Webhook → Copy Webhook URL*):

| Variable | Used for |
|---|---|
| `WEBHOOK_MONEY_LOG` | Money give / withdraw logs |
| `WEBHOOK_ACTIVATE_LOG`, `WEBHOOK_BAN_LOG`, `WEBHOOK_BAN_UNBAN` | Account activation, bans / unbans |
| `WEBHOOK_VEHICLES_LOG` | Vehicle give logs |
| `WEBHOOK_RESTART_LOG` | Server restart logs |
| `WEBHOOK_PASSWORD_LOG` | Password change logs |
| `WEBHOOK_BLACKLIST`, `WEBHOOK_TICKETS_ONLY` | Ticket blacklist / ticket logs |
| `WEBHOOK_CHANGE_ID`, `WEBHOOK_WITHDRAW`, `WEBHOOK_SKIN_CHANGE` | Admin actions on characters |
| `WEBHOOK_GROCERY`, `WEBHOOK_BROADCAST`, `WEBHOOK_BOT_CHAT` | Grocery orders, broadcasts, `/chat` messages |

Leave a variable empty to disable that particular log.

---

## 5) Roles and channels (important)

Permission checks (admin / staff roles), ticket categories, log channels and the ticket embed channel use
**Discord IDs of your server** that are written directly in `index.js`
(roles such as `1412844127648874598`, categories, channels…).
Before going live:

1. Enable Developer Mode, right-click each role / channel / category → **Copy ID**.
2. Open `index.js` and replace the old IDs with yours. The main ones are at the top of the file
   (`EMBED_CHANNEL_ID`, `ADMIN_ROLE_RESETEMBED`, `ADMIN_ROLE_RESETADMIN`, `MEMBER_ROLE_CHECKMYTICKETS`, `TICKET_BOT_ID`)
   and inside each command / ticket-type block.
3. Tip: use your editor's *Find & Replace* to replace one old ID with your new ID everywhere at once.

---

## Usage notes

- Slash commands are registered automatically for the server in `GUILD_ID` when the bot starts
  (guild commands appear instantly).
- Run `/embed` (or `/resetembed`) in the configured channel to publish the ticket panel.
- Account linking: the player gets a link code in-game (stored in `accounts.LinkCode`) and sends it to the bot in a
  **DM**. The bot matches the code and saves the player's Discord ID in `accounts.discord`.
- `/changepassword` stores an **MD5** hash because that is what typical MTA gamemodes use. If your gamemode uses a
  different hash (bcrypt, sha256, salted…), change it in `index.js` (search for `createHash('md5')`).
- Ticket numbers are kept in `data/ticketNumbers.json`; to reset a counter, edit that file while the bot is stopped.
- Back up `data/tickets.db` regularly – it holds all tickets, auctions and statistics.

---

## Security

- **Never commit `.env`** – it is already listed in `.gitignore`.
- If a token, password or webhook was ever public (for example in an old commit or zip), **regenerate it**:
  Discord token → Developer Portal *Reset Token*; webhooks → delete and recreate; DB / MTA passwords → change them.
- Use a dedicated MySQL user for the bot with only the privileges it needs.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `[config] Missing required environment variables` | Create `.env` from `.env.example` and fill all required values |
| `Error: Used disallowed intents` | Enable *Server Members* and *Message Content* intents in the Developer Portal |
| Slash commands do not show up | Invite the bot with the `applications.commands` scope and check `CLIENT_ID` / `GUILD_ID` |
| `ECONNREFUSED` / `ETIMEDOUT` to MySQL | Wrong host/port, firewall closed, or MySQL bound to localhost only |
| `ER_ACCESS_DENIED_ERROR` | Wrong DB user / password, or the user lacks privileges / remote host access |
| In-game actions do nothing | Check `MTA_HTTP_PORTS`, the admin account's ACL rights, and that `handler` / `discordLink` resources export the functions over HTTP |
| Player count shows 0 / offline | Check `MTA_SERVER_IP` and `MTA_GAME_PORT` (the query port is the game port) |

---

## Credits

Created by **ELKINGM7** – <https://github.com/ELKINGM7>
