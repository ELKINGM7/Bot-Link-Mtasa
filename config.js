'use strict';

/**
 * Central configuration loader.
 * All secrets/settings come from the .env file (see .env.example).
 * Never hard-code tokens, passwords or webhook URLs in the source code.
 */
require('dotenv').config();

const REQUIRED = [
    'DISCORD_TOKEN',
    'CLIENT_ID',
    'GUILD_ID',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'MTA_SERVER_IP',
    'MTA_ADMIN_USER',
    'MTA_ADMIN_PASSWORD',
];

const missing = REQUIRED.filter((key) => !process.env[key] || !process.env[key].trim());
if (missing.length > 0) {
    console.error('\n[config] Missing required environment variables:\n  - ' + missing.join('\n  - '));
    console.error('[config] Copy .env.example to .env and fill in the values.\n');
    process.exit(1);
}

module.exports = {
    botToken: process.env.DISCORD_TOKEN,

    // MySQL (the MTA:SA server database)
    mHOST: process.env.DB_HOST,
    mPORT: parseInt(process.env.DB_PORT || '3306', 10),
    mUSER: process.env.DB_USER,
    mPASSWORD: process.env.DB_PASSWORD,
    mDATABASE: process.env.DB_NAME,

    // MTA:SA game server
    serverIP: process.env.MTA_SERVER_IP,
    gamePort: parseInt(process.env.MTA_GAME_PORT || '22130', 10),
    serverUser: process.env.MTA_ADMIN_USER,
    serverPass: process.env.MTA_ADMIN_PASSWORD,
};
