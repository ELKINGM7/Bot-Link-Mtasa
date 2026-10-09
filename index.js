require('dotenv').config();

// Make sure the local data folder exists (SQLite tickets.db + ticketNumbers.json live here)
require('fs').mkdirSync(require('path').join(__dirname, 'data'), { recursive: true });

const { Client, Intents, MessageEmbed, MessageActionRow, MessageSelectMenu, MessageButton, Modal, TextInputComponent } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const axios = require('axios');
const emoji = require('node-emoji');
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;


const moneyLog = process.env.WEBHOOK_MONEY_LOG;
const activateLog = process.env.WEBHOOK_ACTIVATE_LOG;
const banLog = process.env.WEBHOOK_BAN_LOG;
const vehiclesLog = process.env.WEBHOOK_VEHICLES_LOG;
const restartLog = process.env.WEBHOOK_RESTART_LOG;
const adminLog = banLog; 


const webhookBlacklist = process.env.WEBHOOK_BLACKLIST;
const webhookTicketsOnly = process.env.WEBHOOK_TICKETS_ONLY;
const webhookBanUnban = process.env.WEBHOOK_BAN_UNBAN;
const webhookChangeId = process.env.WEBHOOK_CHANGE_ID;
const webhookWithdraw = process.env.WEBHOOK_WITHDRAW;
const webhookGrocery = process.env.WEBHOOK_GROCERY;
const webhookBroadcast = process.env.WEBHOOK_BROADCAST;
const webhookSkinChange = process.env.WEBHOOK_SKIN_CHANGE;
const webhookBotChat = process.env.WEBHOOK_BOT_CHAT;


const THUMBNAIL_GIF = 'https://files.catbox.moe/xds8lg.gif';
const EMBED_CHANNEL_ID = '1438670532030501025';
const ADMIN_ROLE_RESETEMBED = '1412844127648874598';
const ADMIN_ROLE_RESETADMIN = '1412844127648874598';
const MEMBER_ROLE_CHECKMYTICKETS = '1410394033066475714';

const karizma = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,        
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.MESSAGE_CONTENT        
    ],
    partials: ['CHANNEL']
});


karizma.setMaxListeners(20);




karizma.on('interactionCreate', (interaction) => {
    try {
        if (!interaction || interaction._safePatched) return;

        const origReply = interaction.reply && interaction.reply.bind(interaction);
        const origEdit = interaction.editReply && interaction.editReply.bind(interaction);
        const origFollow = interaction.followUp && interaction.followUp.bind(interaction);

        interaction.reply = async function(options) {
            try {
                if (this.replied) {
                    
                    if (origFollow) return await origFollow(options);
                    return;
                }
                if (this.deferred) {
                    
                    if (origEdit) return await origEdit(options);
                    if (origFollow) return await origFollow(options);
                    return;
                }
                
                if (origReply) return await origReply(options);
            } catch (err) {
                
                if (err && err.code === 40060 && origFollow) {
                    try { return await origFollow(options); } catch (e) {  }
                }
                throw err;
            }
        };

        interaction._safePatched = true;
    } catch (e) {
        console.error('Failed to patch interaction for safe replies:', e);
    }
});

const { createPool } = require('mysql');
const Gamedig = require('gamedig');
const { mHOST, mUSER, mDATABASE, mPASSWORD, mPORT, botToken, serverIP, serverUser, serverPass, gamePort } = require('./config');



console.log("Server IP:", serverIP);
console.log("Server User:", serverUser);
console.log("Server Pass:", serverPass ? '*****' : '(not set)');


const mysql = require('mysql');


const pool = mysql.createPool({
    connectionLimit: 10,
    host: mHOST,
    port: mPORT,
    user: mUSER,
    password: mPASSWORD,
    database: mDATABASE,
    acquireTimeout: 30000,
    connectTimeout: 30000,
    waitForConnections: true,
    queueLimit: 0
});


pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error getting MySQL connection from pool:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('Database connection was closed.');
        }
        if (err.code === 'ER_CON_COUNT_ERROR') {
            console.error('Database has too many connections.');
        }
        if (err.code === 'ECONNREFUSED') {
            console.error('Database connection was refused.');
        }
        return;
    }
    
    if (connection) {
        console.log('MySQL Pool Connected!');
        connection.release();
    }
});


function safeQuery(sql, params, callback) {
    // Allow both safeQuery(sql, cb) and safeQuery(sql, params, cb)
    if (typeof params === 'function') {
        callback = params;
        params = [];
    }
    params = params || [];

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            if (callback) callback(err, null);
            return;
        }

        connection.query(sql, params, (error, results) => {
            connection.release();

            if (error) {
                console.error('MySQL query error:', error);
                if (callback) callback(error, null);
                return;
            }

            if (callback) callback(null, results);
        });
    });
}


pool.on('error', (err) => {
    console.error('MySQL pool error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.error('Lost connection to MySQL. Will reconnect on next query.');
    }
});


setInterval(() => {
    safeQuery('SELECT 1', [], (err) => {
        if (err) {
            console.error('MySQL ping error:', err);
        }
    });
}, 60000); 

karizma.on('ready', async () => {
    console.log(`Logged in as ${karizma.user.tag}!`);
    try {
        
        safeQuery('SELECT 1', [], (err, results) => {
            if (err) {
                console.error('Database verification error:', err);
            } else {
                console.log('Database connection verified on startup.');
            }
        });
    } catch (err) {
        console.error("Error during bot startup:", err);
    }
});


safeQuery(`CREATE TABLE IF NOT EXISTS discord_interactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(32) NOT NULL,
    accountUsername VARCHAR(128) NOT NULL,
    requesterSerial VARCHAR(255) DEFAULT NULL,
    responderDiscordID VARCHAR(64) DEFAULT NULL,
    processed TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`, [], (err) => {
    if (err) console.error('Failed to ensure discord_interactions table:', err);
    else console.log('discord_interactions table ready');
});


karizma.on('interactionCreate', async interaction => {
    try {
        if (!interaction.isButton()) return;
        const cid = interaction.customId;
        if (!cid) return;

        
        if (cid.startsWith('verify:') || cid.startsWith('cancel:')) {
            const parts = cid.split(':');
            const prefix = parts[0];
            const requesterSerial = parts[1] || '';
            const accountUsername = parts[2] || '';
            const responderDiscordID = interaction.user ? String(interaction.user.id) : '';
            const action = (prefix === 'verify') ? 'approve' : 'deny';

            
            const sql = 'INSERT INTO discord_interactions (action, accountUsername, requesterSerial, responderDiscordID, processed, created_at) VALUES (?,?,?,?,0,NOW())';
            safeQuery(sql, [action, accountUsername, requesterSerial, responderDiscordID], (err) => {
                if (err) console.error('Failed to insert discord_interaction:', err);
            });

            
            try {
                await interaction.reply({ content: 'تم إرسال ردك لصاحب الحساب.', ephemeral: true });
            } catch (e) {  }
        }
    } catch (e) {
        console.error('Error handling serial approve/deny interaction:', e);
    }
});

const ms = require('ms');
const { CommandCooldown, msToMinutes } = require('discord-command-cooldown');
const earnCashCommandCooldown = new CommandCooldown('earnCash', ms('12h'));
const net = require('net');
const Game = require('mtasa').Client;


const defaultPorts = [22130, 22136, 22253];
const portsToTry = process.env.MTA_HTTP_PORTS
    ? process.env.MTA_HTTP_PORTS.split(',').map(p => parseInt(p.trim(), 10)).filter(Number.isFinite)
    : defaultPorts;

let currentGamePort = portsToTry[0];

let server = null; 

async function probePort(host, port, timeout = 2000) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let resolved = false;
        socket.setTimeout(timeout);
        socket.once('connect', () => {
            resolved = true;
            socket.destroy();
            resolve(true);
        });
        socket.once('timeout', () => {
            if (!resolved) {
                resolved = true;
                socket.destroy();
                resolve(false);
            }
        });
        socket.once('error', () => {
            if (!resolved) {
                resolved = true;
                socket.destroy();
                resolve(false);
            }
        });
        socket.connect(port, host);
    });
}

async function initGameClient() {
    console.log('Attempting to connect to game server on ports:', portsToTry.join(', '));
    let chosenPort = null;
    for (const p of portsToTry) {
        try {
            const ok = await probePort(serverIP, p, 2000);
            console.log(`Port ${p} reachable: ${ok}`);
            if (ok) { chosenPort = p; break; }
        } catch (e) {
            console.error(`Error probing port ${p}:`, e);
        }
    }

    if (!chosenPort) {
        console.warn(`No reachable ports from list ${portsToTry.join(', ')}; falling back to first port ${portsToTry[0]}`);
        chosenPort = portsToTry[0];
    }

    try {
    server = new Game(serverIP, chosenPort, serverUser, serverPass);
    currentGamePort = chosenPort;
    console.log(`Game client instantiated for ${serverIP}:${chosenPort}`);
    } catch (err) {
        console.error(`Failed to instantiate Game client for ${serverIP}:${chosenPort}:`, err);
        
        try { server = new Game(serverIP, portsToTry[0], serverUser, serverPass); } catch (e) { server = null; }
    }
}


initGameClient().catch(err => console.error('initGameClient error:', err));





const TICKET_BOT_ID = '1425931251772035224'; 
const ANTI_CONFIG = {
    deleteWindowMs: 10000, 
    deleteThreshold: 5, 
    deleteThresholdTicketBot: 12, 
    spamWindowMs: 5000, 
    spamThreshold: 12 
};

const ADMINS_TO_NOTIFY = ['1222365054700097626','977915305135325224','1090709088746356840'];


ANTI_CONFIG.banWindowMs = 10000;
ANTI_CONFIG.banThreshold = 3;
ANTI_CONFIG.banAutoKickThreshold = 6;
ANTI_CONFIG.deleteAutoKickThreshold = 20; 
ANTI_CONFIG.spamAutoKickThreshold = 30; 



const recentChannelDeletes = new Map();
const recentBotMessages = new Map();
const recentBans = new Map();


function pruneTimestamps(arr, windowMs) {
    const now = Date.now();
    return arr.filter(ts => (now - ts) <= windowMs);
}


async function attemptKickBot(guild, userId, reason) {
    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return { ok: false, reason: 'Member not found' };
        
        if (member.permissions && member.permissions.has && member.permissions.has('ADMINISTRATOR')) {
            return { ok: false, reason: 'Member has ADMINISTRATOR permission' };
        }
        if (guild.ownerId === member.id) return { ok: false, reason: 'Member is guild owner' };
        if (!member.kickable) return { ok: false, reason: 'Member not kickable (role hierarchy or missing perms)' };

        await member.kick(reason).catch(err => { throw err; });
        
        try {
            const desc = `تم طرد <@${member.id}> (${member.user.tag})\nسبب: ${reason}`;
            await embedSuccess(adminLog, 'Anti-Abuse Action - Kicked Bot', desc, `<@${karizma.user.id}>`);
        } catch (e) {  }

        return { ok: true };
    } catch (err) {
        console.error('Error attempting to kick bot:', err);
        return { ok: false, reason: String(err) };
    }
}


async function sendAdminAlert(guild, executor, actionType, count, details) {
    try {
        const actionLabel = (actionType === 'ban') ? 'عمليات باند' : (actionType === 'channel_delete' ? 'حذف رومات' : 'سبام رسائل');
        const embed = new MessageEmbed()
            .setTitle('تحذير سلوك مشبوه')
            .setColor('ORANGE')
            .addFields(
                { name: 'الخادم', value: `${guild.name} (${guild.id})`, inline: true },
                { name: 'الفاعل', value: `${executor.tag || executor.username} (${executor.id})`, inline: true },
                { name: 'النوع', value: actionLabel, inline: true },
                { name: 'التفاصيل', value: details || '', inline: false }
            )
            .setTimestamp();

        const yesId = `anti_action_confirm:${guild.id}:${executor.id}:${actionType}`;
        const noId = `anti_action_cancel:${guild.id}:${executor.id}:${actionType}`;
        const row = new MessageActionRow().addComponents(
            new MessageButton().setCustomId(yesId).setLabel('نعم - اطرد البوت').setStyle('DANGER'),
            new MessageButton().setCustomId(noId).setLabel('لا - تجاهل').setStyle('SECONDARY')
        );

        for (const adminId of ADMINS_TO_NOTIFY) {
            try {
                const user = await karizma.users.fetch(adminId).catch(() => null);
                if (!user) continue;
                await user.send({ embeds: [embed], components: [row] }).catch(() => {});
            } catch (e) {  }
        }
    } catch (err) {
        console.error('Failed to send admin alert DMs:', err);
    }
}


karizma.on('channelDelete', async (channel) => {
    try {
        if (!channel || !channel.guild) return;
        const guild = channel.guild;
        
        let executor = null;
        try {
            const audit = await guild.fetchAuditLogs({ type: 'CHANNEL_DELETE', limit: 6 });
            const entry = audit.entries.find(e => e.target && e.target.id === channel.id);
            if (entry) executor = entry.executor;
        } catch (e) {
            console.warn('Could not fetch audit logs for channelDelete:', e.message || e);
        }

            if (!executor) return; 
            if (!executor.bot) return; 

        const now = Date.now();
        const list = recentChannelDeletes.get(executor.id) || [];
        list.push(now);
        const pruned = pruneTimestamps(list, ANTI_CONFIG.deleteWindowMs);
        recentChannelDeletes.set(executor.id, pruned);

        const threshold = executor.id === TICKET_BOT_ID ? ANTI_CONFIG.deleteThresholdTicketBot : ANTI_CONFIG.deleteThreshold;
        
        if (pruned.length >= ANTI_CONFIG.deleteAutoKickThreshold) {
            recentChannelDeletes.delete(executor.id);
            const reason = `Auto Anti-abuse: ${pruned.length} channel deletions within ${ANTI_CONFIG.deleteWindowMs/1000}s`;
            const result = await attemptKickBot(guild, executor.id, reason);
            if (!result.ok) {
                console.warn('Anti-abuse: failed to auto-kick executor', executor.id, result.reason);
                
                await sendAdminAlert(guild, executor, 'channel_delete', pruned.length, `Detected ${pruned.length} channel deletions within ${ANTI_CONFIG.deleteWindowMs/1000}s — attempted auto-kick but failed: ${result.reason}`);
            } else {
                
                await sendAdminAlert(guild, executor, 'channel_delete', pruned.length, `Detected ${pruned.length} channel deletions within ${ANTI_CONFIG.deleteWindowMs/1000}s — bot was auto-kicked`);
            }
            return;
        }

        if (pruned.length >= threshold) {
            
            recentChannelDeletes.delete(executor.id);
            const reason = `Anti-abuse: ${pruned.length} channel deletions within ${ANTI_CONFIG.deleteWindowMs/1000}s`;
            const result = await attemptKickBot(guild, executor.id, reason);
            if (!result.ok) {
                console.warn('Anti-abuse: failed to kick executor', executor.id, result.reason);
                await sendAdminAlert(guild, executor, 'channel_delete', pruned.length, `Detected ${pruned.length} channel deletions within ${ANTI_CONFIG.deleteWindowMs/1000}s — attempted kick but failed: ${result.reason}`);
            } else {
                console.log(`Anti-abuse: kicked bot ${executor.tag} (${executor.id}) for rapid channel deletions`);
                await sendAdminAlert(guild, executor, 'channel_delete', pruned.length, `Detected ${pruned.length} channel deletions within ${ANTI_CONFIG.deleteWindowMs/1000}s — bot was kicked`);
            }
        }
    } catch (err) {
        console.error('Error in channelDelete anti-abuse handler:', err);
    }
});


karizma.on('roleDelete', async (role) => {
    try {
        if (!role || !role.guild) return;
        const guild = role.guild;
        
        let executor = null;
        try {
            const audit = await guild.fetchAuditLogs({ type: 'ROLE_DELETE', limit: 6 });
            const entry = audit.entries.find(e => e.target && e.target.id === role.id);
            if (entry) executor = entry.executor;
        } catch (e) {
            console.warn('Could not fetch audit logs for roleDelete:', e.message || e);
        }

    if (!executor) return; 
    if (!executor.bot) return; 

        
        const reason = `Anti-abuse: deleted role ${role.name} (${role.id})`;
        const result = await attemptKickBot(guild, executor.id, reason);
        if (!result.ok) console.warn('Anti-abuse: failed to kick role-deleting bot', executor.id, result.reason);
        else {
            
            await sendAdminAlert(guild, executor, 'role_delete', 1, `Deleted role **${role.name}** (${role.id}) — kicked immediately`);
        }
    } catch (err) {
        console.error('Error in roleDelete anti-abuse handler:', err);
    }
});


karizma.on('guildUpdate', async (oldGuild, newGuild) => {
    try {
        if (!oldGuild || !newGuild) return;
        
        const oldIcon = oldGuild.icon;
        const newIcon = newGuild.icon;
        if (oldIcon === newIcon) return; 

        const guild = newGuild;
        
        let executor = null;
        try {
            const audit = await guild.fetchAuditLogs({ type: 'GUILD_UPDATE', limit: 6 });
            
            const entry = audit.entries.find(e => Array.isArray(e.changes) && e.changes.some(c => c.key === 'icon'));
            if (entry) executor = entry.executor;
        } catch (e) {
            console.warn('Could not fetch audit logs for guildUpdate:', e.message || e);
        }

    if (!executor) return;
    if (!executor.bot) return; 

        
        const reason = `Anti-abuse: changed server icon (old: ${oldIcon}, new: ${newIcon})`;
        const result = await attemptKickBot(guild, executor.id, reason);
        if (!result.ok) console.warn('Anti-abuse: failed to kick icon-changing bot', executor.id, result.reason);
        else {
            await sendAdminAlert(guild, executor, 'icon_change', 1, `Changed server icon — kicked immediately`);
        }
    } catch (err) {
        console.error('Error in guildUpdate anti-abuse handler:', err);
    }
});


karizma.on('messageCreate', async (message) => {
    try {
        if (!message || !message.guild) return;
        const author = message.author;
        if (!author || !author.bot) return; 

        const now = Date.now();
        const list = recentBotMessages.get(author.id) || [];
        list.push(now);
        const pruned = pruneTimestamps(list, ANTI_CONFIG.spamWindowMs);
        recentBotMessages.set(author.id, pruned);

        const threshold = ANTI_CONFIG.spamThreshold;
        
        const effectiveThreshold = (author.id === TICKET_BOT_ID) ? Math.max(threshold * 2, threshold + 6) : threshold;
        
        if (pruned.length >= ANTI_CONFIG.spamAutoKickThreshold) {
            recentBotMessages.delete(author.id);
            const reason = `Auto Anti-abuse: ${pruned.length} messages within ${ANTI_CONFIG.spamWindowMs/1000}s`;
            const result = await attemptKickBot(message.guild, author.id, reason);
            if (!result.ok) {
                console.warn('Anti-abuse: failed to auto-kick spammy bot', author.id, result.reason);
                await sendAdminAlert(message.guild, author, 'spam', pruned.length, `Detected ${pruned.length} messages within ${ANTI_CONFIG.spamWindowMs/1000}s — attempted auto-kick but failed: ${result.reason}`);
            } else {
                await sendAdminAlert(message.guild, author, 'spam', pruned.length, `Detected ${pruned.length} messages within ${ANTI_CONFIG.spamWindowMs/1000}s — bot was auto-kicked`);
            }
            return;
        }

        if (pruned.length >= effectiveThreshold) {
            
            recentBotMessages.delete(author.id);
            const reason = `Anti-abuse: ${pruned.length} messages within ${ANTI_CONFIG.spamWindowMs/1000}s`;
            const result = await attemptKickBot(message.guild, author.id, reason);
            if (!result.ok) {
                console.warn('Anti-abuse: failed to kick spammy bot', author.id, result.reason);
                await sendAdminAlert(message.guild, author, 'spam', pruned.length, `Detected ${pruned.length} messages within ${ANTI_CONFIG.spamWindowMs/1000}s — attempted kick but failed: ${result.reason}`);
            } else {
                console.log(`Anti-abuse: kicked bot ${author.tag} (${author.id}) for spamming messages`);
                await sendAdminAlert(message.guild, author, 'spam', pruned.length, `Detected ${pruned.length} messages within ${ANTI_CONFIG.spamWindowMs/1000}s — bot was kicked`);
            }
        }
    } catch (err) {
        console.error('Error in messageCreate anti-abuse handler:', err);
    }
});


karizma.on('guildBanAdd', async (guild, user) => {
    try {
        
        let executor = null;
        try {
            const audit = await guild.fetchAuditLogs({ type: 'MEMBER_BAN_ADD', limit: 6 });
            const entry = audit.entries.find(e => e.target && e.target.id === user.id);
            if (entry) executor = entry.executor;
        } catch (e) {
            console.warn('Could not fetch audit logs for guildBanAdd:', e.message || e);
        }
        if (!executor) return;
        if (!executor.bot) return; 

        const now = Date.now();
        const list = recentBans.get(executor.id) || [];
        list.push(now);
        const pruned = pruneTimestamps(list, ANTI_CONFIG.banWindowMs);
        recentBans.set(executor.id, pruned);

        if (pruned.length >= ANTI_CONFIG.banAutoKickThreshold) {
            recentBans.delete(executor.id);
            const reason = `Auto Anti-abuse: ${pruned.length} bans within ${ANTI_CONFIG.banWindowMs/1000}s`;
            const result = await attemptKickBot(guild, executor.id, reason);
            if (!result.ok) {
                console.warn('Anti-abuse: failed to auto-kick ban-happy bot', executor.id, result.reason);
                await sendAdminAlert(guild, executor, 'ban', pruned.length, `Detected ${pruned.length} bans within ${ANTI_CONFIG.banWindowMs/1000}s — attempted auto-kick but failed: ${result.reason}`);
            } else {
                await sendAdminAlert(guild, executor, 'ban', pruned.length, `Detected ${pruned.length} bans within ${ANTI_CONFIG.banWindowMs/1000}s — bot was auto-kicked`);
            }
            return;
        }

        if (pruned.length >= ANTI_CONFIG.banThreshold) {
            
            recentBans.delete(executor.id);
            const reason = `Anti-abuse: ${pruned.length} bans within ${ANTI_CONFIG.banWindowMs/1000}s`;
            const result = await attemptKickBot(guild, executor.id, reason);
            if (!result.ok) {
                console.warn('Anti-abuse: failed to kick ban-happy bot', executor.id, result.reason);
                await sendAdminAlert(guild, executor, 'ban', pruned.length, `Detected ${pruned.length} bans within ${ANTI_CONFIG.banWindowMs/1000}s — attempted kick but failed: ${result.reason}`);
            } else {
                console.log(`Anti-abuse: kicked bot ${executor.tag} (${executor.id}) for mass banning`);
                await sendAdminAlert(guild, executor, 'ban', pruned.length, `Detected ${pruned.length} bans within ${ANTI_CONFIG.banWindowMs/1000}s — bot was kicked`);
            }
        }
    } catch (err) {
        console.error('Error in guildBanAdd anti-abuse handler:', err);
    }
});

const TICKET_TYPES = {
    REPORT: {
        id: 'report',
        label: 'بلاغ ضد مخرب',
        description: 'فتح تذكرة للإبلاغ عن مخالفة من لاعب',
        emoji: '🚨',
        categoryId: '1410394145234620618',
        staffRoleId: '1410394037579415643',
        inputs: [
            {
                id: 'accountName',
                label: 'اسم حسابك في السيرفر',
                placeholder: 'اسم الحساب، مثال: Youssef ElKiko',
                style: 'SHORT',
                required: true
            },
            {
                id: 'reportedName',
                label: 'اسم المبلغ عنه',
                placeholder: 'اسم المبلغ عنه، مثال: Youssef ElKiko ( Youssef ElKiko )',
                style: 'SHORT',
                required: true
            },
            {
                id: 'reportDate',
                label: 'تاريخ وقوع المخالفة',
                placeholder: 'تاريخ وقوع المخالفة، مثال: 2025/12/21',
                style: 'SHORT',
                required: true
            },
            {
                id: 'description',
                label: 'اشرح المخالفة بالتفصيل',
                placeholder: 'اكتب المخالفة بالتفصيل',
                style: 'PARAGRAPH',
                required: true
            }
        ]
    },
    TECHNICALPROBLEM: {
        id: 'technicalproblem',
        label: 'الإبلاغ عن مشكلة تقنية',
        description: 'فتح تذكرة لتقديم مشكلة تقنية',
        emoji: '🔧',
        categoryId: '1410397233056059413',
        staffRoleId: '1410394042369441955',
        inputs: [
            {
                id: 'accountName',
                label: 'اسم حسابك في السيرفر',
                style: 'SHORT',
                placeholder: 'اسم الحساب، مثال: Youssef ElKiko',
                required: true
            },
            {
                id: 'adminName',
                label: 'اسم الإداري المشكو منه',
                style: 'SHORT',
                placeholder: 'اسم الإداري، مثال: Youssef ElKiko ( Youssef ElKiko )',
                required: true
            },
            {
                id: 'complaintDate',
                label: 'تاريخ وقوع المشكلة',
                style: 'SHORT',
                placeholder: 'تاريخ وقوع المشكلة، مثال: 2025/12/21',
                required: true
            },
            {
                id: 'proofs',
                label: 'روابط الصور/الأدلة إن وجدت',
                style: 'PARAGRAPH',
                placeholder: 'قم بوضع صورة/فيديو دليل للواقعه',
                required: false
            },
            {
                id: 'description',
                label: 'اشرح المشكلة بالتفصيل',
                placeholder: 'اكتب المشكلة بالتفصيل',
                style: 'PARAGRAPH',
                required: true
            }
        ]
    },
    COMPLAINT: {
        id: 'complaint',
        label: 'شكوى ضد إداري',
        description: 'فتح تذكرة لتقديم شكوى ضد أحد الإداريين',
        emoji: '⚠️',
        categoryId: '1427974043797291049',
        staffRoleId: '1410394148095135823',
        inputs: [
            {
                id: 'accountName',
                label: 'اسم حسابك في السيرفر',
                style: 'SHORT',
                placeholder: 'اسم الحساب، مثال: Youssef ElKiko',
                required: true
            },
            {
                id: 'adminName',
                label: 'اسم الإداري المشكو منه',
                style: 'SHORT',
                placeholder: 'اسم الإداري، مثال: Youssef ElKiko',
                required: true
            },
            {
                id: 'complaintDate',
                label: 'تاريخ وقوع المشكلة',
                style: 'SHORT',
                placeholder: 'تاريخ وقوع المشكلة، مثال: 2024/12/21',
                required: true
            },
            {
                id: 'proofs',
                label: 'روابط الصور/الأدلة إن وجدت',
                style: 'PARAGRAPH',
                placeholder: 'قم بوضع صورة/فيديو دليل للواقعه',
                required: false
            },
            {
                id: 'description',
                label: 'اشرح المشكلة بالتفصيل',
                placeholder: 'اكتب المشكلة بالتفصيل',
                style: 'PARAGRAPH',
                required: true
            }
        ]
    },
    REFUND: {
        id: 'refund',
        label: 'طلب تعويض',
        description: 'فتح تذكرة لطلب تعويض',
        emoji: '💸',
        categoryId: '1410394149361946757',
        staffRoleId: '1410394039508795455',
        inputs: [
            {
                id: 'accountName',
                label: 'اسم حسابك في السيرفر',
                style: 'SHORT',
                placeholder: 'اسم الحساب، مثال: Youssef ElKiko',
                required: true
            },
            {
                id: 'complaintDate',
                label: 'تاريخ وقوع المشكلة',
                style: 'SHORT',
                placeholder: 'تاريخ وقوع المشكلة، مثال: 2025/12/21',
                required: true
            },
            {
                id: 'proofs',
                label: 'روابط الصور/الأدلة إن وجدت',
                style: 'PARAGRAPH',
                placeholder: 'قم بوضع صورة/فيديو دليل للواقعه',
                required: false
            },
            {
                id: 'description',
                label: 'اشرح المشكلة بالتفصيل',
                placeholder: 'اكتب المشكلة بالتفصيل',
                style: 'PARAGRAPH',
                required: true
            }
        ]
    },
    WEBSITE: {
        id: 'website',
        label: 'تذكرة موقع',
        description: 'فتح تذكرة موقع',
        emoji: '🌐',
        categoryId: '1410397021554344100',
        staffRoleId: '1412844127648874598',
        inputs: [
            {
                id: 'accountName',
                label: 'اسم حسابك في السيرفر',
                style: 'SHORT',
                placeholder: 'اسم الحساب، مثال: Youssef ElKiko',
                required: true
            },
            {
                id: 'asking',
                label: 'ما سبب فتحك للتذكرة',
                style: 'PARAGRAPH',
                placeholder: 'اكتب هنا السبب بالتفصيل',
                required: true,
            },
        ]
    },
    TAZLOM: {
        id: 'tazlom',
        label: 'إستئناف الحكم',
        description: 'فتح تذكرة لإستئناف الحكم',
        emoji: '🔍',
        categoryId: '1410394146325266442',
        staffRoleId: '1410394038795898970',
        inputs: [
            {
                id: 'accountName',
                label: 'اسم حسابك في السيرفر',
                style: 'SHORT',
                placeholder: 'اسم الحساب، مثال: ElKiko',
                required: true
            },
            {
                id: 'adminName',
                label: 'اسم الإداري المسؤول عن الحكم',
                style: 'SHORT',
                placeholder: 'اسم الإداري، مثال: Youssef ElKiko',
                required: true
            },
            {
                id: 'tazlomDate',
                label: 'تاريخ وقوع الحكم',
                style: 'SHORT',
                placeholder: 'تاريخ وقوع الحكم، مثال: 2025/12/21',
                required: true
            },
            {
                id: 'proofs',
                label: 'روابط الصور/الأدلة إن وجدت',
                style: 'PARAGRAPH',
                placeholder: 'قم بوضع صورة/فيديو دليل للواقعه',
                required: false
            },
            {
                id: 'description',
                label: 'اشرح المشكلة بالتفصيل',
                placeholder: 'اكتب المشكلة بالتفصيل',
                style: 'PARAGRAPH',
                required: true
            }
        ]
    },
    ASKING: {
        id: 'asking',
        label: 'إستفسار عام',
        description: 'فتح تذكرة لطلب استفسار عام',
        emoji: '💬',
        categoryId: '1435434093637537892',
        staffRoleId: '1410394022836699330',
        inputs: [
            {
                id: 'accountName',
                label: 'اسم حسابك في السيرفر',
                style: 'SHORT',
                placeholder: 'اسم الحساب، مثال: ElKiko',
                required: true
            },
            {
                id: 'asking',
                label: 'ما الشئ اللذي تريد الاستفسار عنه',
                style: 'SHORT',
                placeholder: 'اكتب هنا الشئ اللذي تريد الاستفسار عنه',
                required: true,
            },
        ]
    },
    POLICE: {
        id: 'police',
        label: 'وزارة الداخلية',
        description: 'فتح تذكرة وزارة الداخلية',
        emoji: '👮',
        categoryId: '1410394159927525447',
        staffRoleId: '1427971771012747354',
        inputs: [
            {
                id: 'accountName',
                label: 'اسم حسابك في السيرفر',
                style: 'SHORT',
                placeholder: 'اسم الحساب، مثال: Youssef ElKiko',
                required: true
            },
            {
                id: 'characterName',
                label: 'اسم الشخص الذي تريد الشكوي عليه (اذا وُجد)',
                style: 'SHORT',
                placeholder: 'اكتب هنا اسم الشخص الذي تريد الاستفسار عنه',
                required: false,
            },
            {
                id: 'description',
                label: 'سبب فتحك للتذكرة',
                style: 'PARAGRAPH',
                placeholder: 'اكتب السبب بالتفصيل',
                required: true,
            },
        ]
    },
    HOSPITAL: {
        id: 'hospital',
        label: 'وزارة الصحة',
        description: 'فتح تذكرة وزارة الصحة',
        emoji: '🏥',
        categoryId: '1410394150238556203',
        staffRoleId: '1410407257799131156',
        inputs: [
            {
                id: 'accountName',
                label: 'اسم حسابك في السيرفر',
                style: 'SHORT',
                placeholder: 'اسم الحساب، مثال: Youssef ElKiko',
                required: true
            },
            {
                id: 'characterName',
                label: 'اسم الشخص الذي تريد الشكوي عليه (اذا وُجد)',
                style: 'SHORT',
                placeholder: 'اكتب هنا اسم الشخص الذي تريد الاستفسار عنه',
                required: false,
            },
            {
                id: 'description',
                label: 'سبب فتحك للتذكرة',
                style: 'PARAGRAPH',
                placeholder: 'اكتب السبب بالتفصيل',
                required: true,
            },
        ]
    },
    MECHANIC: {
        id: 'mechanic',
        label: 'كراج الميكانيكي',
        description: 'فتح تذكرة كراج الميكانيكي',
        emoji: '🔧',
        categoryId: '1410394161667899453',
        staffRoleId: '1410410884060282933',
        inputs: [
            {
                id: 'accountName',
                label: 'اسم حسابك في السيرفر',
                style: 'SHORT',
                placeholder: 'اسم الحساب، مثال: Youssef ElKiko',
                required: true
            },
            {
                id: 'characterName',
                label: 'اسم الشخص الذي تريد الشكوي عليه (اذا وُجد)',
                style: 'SHORT',
                placeholder: 'اكتب هنا اسم الشخص الذي تريد الاستفسار عنه',
                required: false,
            },
            {
                id: 'description',
                label: 'سبب فتحك للتذكرة',
                style: 'PARAGRAPH',
                placeholder: 'اكتب السبب بالتفصيل',
                required: true,
            },
        ]
    },
    CUSTOMS: {
        id: 'customs',
        label: 'مصلحة الجمارك',
        description: 'فتح تذكرة مصلحة الجمارك',
        emoji: '🛃',
        categoryId: '1410394153711439872',
        staffRoleId: '1427972268377772043',
        inputs: [
            {
                id: 'accountName',
                label: 'اسم حسابك في السيرفر',
                style: 'SHORT',
                placeholder: 'اسم الحساب، مثال: Youssef ElKiko',
                required: true
            },
            {
                id: 'characterName',
                label: 'اسم الشخص الذي تريد الشكوي عليه (اذا وُجد)',
                style: 'SHORT',
                placeholder: 'اكتب هنا اسم الشخص الذي تريد الاستفسار عنه',
                required: false,
            },
            {
                id: 'description',
                label: 'سبب فتحك للتذكرة',
                style: 'PARAGRAPH',
                placeholder: 'اكتب السبب بالتفصيل',
                required: true,
            },
        ]
    },
};

const commands = [
    {
        name: 'delivergrocery',
        description: '🛒 تسليم البقالة لشخص آخر',
        options: [
            {
                name: 'user',
                type: 6, 
                description: 'الشخص المراد تسليم البقالة له',
                required: true,
            },
            {
                name: 'groceryid',
                type: 3, 
                description: 'رقم البقالة',
                required: true,
            }
        ]
    },
    {
        name: 'chat',
        description: 'اجعل البوت يرسل رسالة بدلًا عنك (خاص بالرولات المصرح بها)',
        options: [
            {
                name: 'message',
                type: 3, 
                description: 'النص الذي سيكتبه البوت',
                required: false,
            }
            ,{
                name: 'image',
                type: 11, 
                description: 'ارفاق صورة او ملف ليتم إرساله مع الرسالة (اختياري)',
                required: false,
            }
            ,{
                name: 'reply_to',
                type: 3, 
                description: 'ID الرسالة أو رابط الرسالة للرد عليها (اختياري)',
                required: false,
            }
            ,{
                name: 'react',
                type: 3, 
                description: 'إيموجي لاضافته كرد (مثال: ❤️ أو <:name:id>) (اختياري)',
                required: false,
            }
        ]
    },
    {
        name: 'sendtickets',
        description: '📨 ارسال قائمة التذاكر',
    },
    {
        name: 'changepassword',
        description: 'تغيير كلمة مرور حساب في قاعدة البيانات (خاص بالمدير العام فقط)',
        options: [
            {
                name: 'username',
                type: 3,
                description: 'اسم الحساب',
                required: true,
            },
            {
                name: 'password',
                type: 3,
                description: 'كلمة المرور الجديدة',
                required: true,
            },
        ],
    },
    {
        name: 'account',
        description: 'رؤية المعلومات الخاصة بحساب شخص 📨',
        options: [
            {
                name: 'user',
                type: 3,
                description: 'قم بعمل منشن للشخص او اكتب اسم حسابه 🔺',
                required: true,
            },
        ],
    },
    {
        name: 'givemoney',
        description: 'إعطاء شخص أموال بداخل الخادم (خاص بالمدير العام فقط)',
        options: [
            {
                name: 'id',
                type: 3,
                description: 'قم بكتابة ايدي الاعب بداخل الخادم',
                required: true,
            },
            {
                name: 'money',
                type: 3,
                description: 'قم بكتابة كمية الأموال المراد إعطائها للاعب',
                required: true,
            },
            {
                name: 'reason',
                type: 3,
                description: 'قم بكتابة سبب إعطاء الاموال للاعب',
                required: true,
            },
        ],
    },
    {
        name: 'discordlink',
        description: 'ربط الحساب الشخصي بالخادم',
        options: [
            {
                name: 'accountname',
                description: 'اسم الحساب الشخصي',
                type: 3, 
                required: true
            },
            {
                name: 'email_address',
                description: 'البريد الإلكتروني',
                type: 3, 
                required: true
            },
            {
                name: 'new_discord_id',
                description: 'ايدي حساب الديسكورد الجديد',
                type: 3, 
                required: true
            },
        ],
    },
    {
        name: 'createauction',
        description: 'إنشاء مزاد جديد',
        options: [
            {
                name: 'name',
                description: 'اسم العنصر',
                type: 3, 
                required: true
            },
            {
                name: 'id',
                description: 'ايدي العنصر',
                type: 3, 
                required: true
            },
            {
                name: 'picture',
                description: 'صورة العنصر',
                type: 11, 
                required: true
            },
            {
                name: 'type',
                description: 'نوع العنصر',
                type: 3, 
                choices: [
                    { name: 'بقالة', value: 'متجر' },
                    { name: 'سيارة', value: 'سيارة' },
                ],
                required: true
            },
            {
                name: 'start_price',
                description: 'سعر بداية المزاد',
                type: 3, 
                required: true
            },
            {
                name: 'end_time',
                description: 'وقت انتهاء المزاد بالدقائق',
                type: 3, 
                required: true
            }
        ],
    },
    {
        name: 'givevehicle',
        description: 'إعطاء مركبة لشخص 🚙',
        options: [
            {
                name: 'id',
                type: 3,
                description: 'قم بكتابة ايدي الاعب داخل الخادم لإعطائه المركبة (خاص بالمدير العام فقط)',
                required: true,
            },
            {
                name: 'model',
                type: 3,
                description: 'قم بكتابة موديل السيارة لإعطائها للاعب',
                required: true,
            },
            {
                name: 'reason',
                type: 3,
                description: 'قم بكتابة سبب اعطاء المركبة',
                required: true,
            },
        ],
    },
    {
        name: 'restart',
        description: 'عمل ريستارت للخادم 🔄',
        options: [
            {
                name: 'after',
                type: 3,
                description: 'قم بكتابة وقت بالدقائق للريستارت بعده ⭕ (خاص بالمدير العام فقط)',
                required: true,
            },
            {
                name: 'reason',
                type: 3,
                description: 'قم بكتابة سبب الريستارت',
                required: true,
            },
        ],
    },
    {
        name: 'cancelrestart',
        description: 'إلغاء حالة الريستارت الفعالة ❌ (خاص بالمدير العام فقط)',
    },
    {
        name: 'banserial',
        description: 'حظر سيريال لاعب 🚫',
        options: [
            {
                name: 'serial',
                type: 3,
                description: 'قم بكتابة السيريال المراد حظره',
                required: true,
            },
            {
                name: 'reason',
                type: 3,
                description: 'قم بكتابة سبب الحظر',
                required: true,
            },
        ],
    },
    {
        name: 'unbanserial',
        description: '🔓 فك حظر سيريال',
        options: [
            {
                name: 'serial',
                type: 3,
                description: 'قم بكتابة السيريال المراد فك حظره',
                required: true,
            },
            {
                name: 'reason',
                type: 3,
                description: 'قم بكتابة سبب فك الحظر',
                required: true,
            },
        ],
    },
    {
        name: 'find',
        description: 'سحب معلومات لاعب عن طريق اسم الشخصيه أ الأيدي 🔵',
        options: [
            {
                name: 'input',
                type: 3,
                description: 'قم بكتابة ايدي أو إسم الاعب المراد سحب معلوماته',
                required: true,
            },
        ],
    },
    {
        name: 'banplayer',
        description: 'حظر لاعب 🚫',
        options: [
            {
                name: 'id',
                type: 3,
                description: 'قم بكتابة ايدي الاعب داخل الخادم لحظره',
                required: true,
            },
            {
                name: 'time',
                type: 3,
                description: 'قم بكتابة مدة الحظر بالدقائق و 0 للحظر الابدي',
                required: true,
            },
            {
                name: 'reason',
                type: 3,
                description: 'قم بكتابة سبب الحظر',
                required: true,
            },
        ],
    },
    {
        name: 'changid',
        description: 'تغيير ايدي شخص (خاص بالمدير العام فقط)',
        options: [
            {
                name: 'oldid',
                type: 3,
                description: 'اكتب الإيدي القديم للحساب',
                required: true,
            },
            {
                name: 'newid',
                type: 3,
                description: 'اكتب الإيدي الجديد للحساب',
                required: true,
            },
        ],
    },
    {
        name: 'withdrawcharacter',
        description: 'اسحب مبلغ من شخصية حسب (خاص بالمدير العام فقط)',
        options: [
            { name: 'id', type: 3, description: 'اكتب ايدي الشخصية', required: true },
            { name: 'money', type: 3, description: 'المبلغ الذي سيتم سحبه', required: true }
        ]
    },
    {
        name: 'setskin',
        description: 'تغيير الاسكن لشخصية حسب الايدي (خاص بالمدير العام فقط)',
        options: [
            { name: 'id', type: 3, description: 'ايدي الشخصية', required: true },
            { name: 'skin', type: 3, description: 'ايدي الskin الجديد', required: true }
        ]
    },
    {
        name: 'moneytop',
        description: 'نظام ليدربورد الأموال 💰',
    },
    {
        name: 'hourstop',
        description: 'نظام ليدربورد الساعات 🔍',
    },
    {
        name: 'check',
        description: 'التحقق من معلومات حساب 🔎',
        options: [
            {
                name: 'user',
                type: 3,
                description: 'قم بكتابة ايدي أو اسم حساب المستخدم',
                required: true,
            },
        ],
    },
    {
        name: 'myaccount',
        description: 'عرض معلومات حسابك الشخصي 👤',
    },
    {
        name: 'changeserial',
        description: 'تغيير سيريال حساب مستخدم 🔄',
        options: [
            {
                name: 'email',
                type: 3,
                description: 'البريد الإلكتروني للحساب المراد تغيير السيريال الخاص به',
                required: true,
            },
            {
                name: 'serial',
                type: 3,
                description: 'السيريال الجديد للحساب (يجب أن يكون 32 حرف أو أكثر)',
                required: true,
                minLength: 32
            },
        ],
    },
    {
        name: 'embed',
        description: 'ارسال رسالة ايمبد فقط لإستخدامها في بعض الخصائص 🔺',
    },
    {
        name: 'blacklisttickets',
        description: '🚫 إضافة أو إزالة شخص من قائمة منع فتح التذاكر',
        options: [
            {
                name: 'user',
                type: 6, 
                description: 'الشخص المراد حظره/فك حظره',
                required: true,
            },
            {
                name: 'action',
                type: 3, 
                description: 'الإجراء (حظر أو فك حظر)',
                required: true,
                choices: [
                    { name: '🚫 حظر', value: 'ban' },
                    { name: '✅ فك حظر', value: 'unban' },
                ],
            },
            {
                name: 'duration',
                type: 3, 
                description: 'المدة (مثال: 7d أو 24h أو "permanent" للأبدي)',
                required: false,
            },
            {
                name: 'reason',
                type: 3, 
                description: 'سبب الحظر',
                required: false,
            },
        ],
    },
    {
        name: 'resetembed',
        description: '🔄 Reset the embed message in the embed channel (Admin only)',
    },
    {
        name: 'resetadmin',
        description: '🔄 Reset all ticket stats for a user (Admin only)',
        options: [
            {
                name: 'user',
                type: 6,
                description: 'The user to reset stats for',
                required: true,
            },
        ],
    },
    {
        name: 'checkmytickets',
        description: '📊 Check your ticket statistics - today and total',
    },
];

const rest = new REST({ 
    version: '9',
    timeout: 120000
}).setToken(botToken);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        
        
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
            try {
                await rest.put(
                    Routes.applicationGuildCommands(clientId, guildId),
                    { body: commands },
                );
                console.log('Successfully reloaded application (/) commands.');
                break;
            } catch (err) {
                attempts++;
                console.log(`Attempt ${attempts}/${maxAttempts} failed. Retrying...`);
                if (attempts >= maxAttempts) throw err;
                
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    } catch (error) {
        console.error('Error while refreshing application (/) commands:', error);
    }
})();

karizma.on('ready', () => {
    setInterval(async () => {
        let attempts = 0;
        const maxAttempts = 5;
        let success = false;
        let lastError = null;
        while (attempts < maxAttempts && !success) {
            try {
                const state = await Gamedig.query({
                    type: 'mtasa',
                    host: serverIP,
                    port: gamePort,
                    socketTimeout: 5000,
                    attemptTimeout: 5000
                });
                const playersCount = `${state['raw']['numplayers']}`;
                karizma.user.setActivity(`Players ${playersCount}`, { type: 'WATCHING' });
                success = true;
            } catch (error) {
                lastError = error;
                attempts++;
                if (attempts < maxAttempts) {
                    console.warn(`Gamedig attempt ${attempts}/${maxAttempts} failed, retrying...`);
                    await new Promise(res => setTimeout(res, 1000));
                }
            }
        }
        if (!success) {
            karizma.user.setActivity(`VERG ON TOP`, { type: 'WATCHING' });
            console.error(`خطأ في سحب عدد الأعضاء: فشل جميع المحاولات (${maxAttempts})`, lastError);
        }
    }, 15000);

    setInterval(async () => {
        try {
            const state = await Gamedig.query({
                type: 'mtasa',
                host: serverIP,
                port: gamePort
            });
    
        } catch (error) {
            console.error('خطأ في سحب عدد الأعضاء:', error);
    
            const errorMessage = {
                color: 0xff0000,
                title: 'حالة الخادم / مغلق 🔴',
                footer: {
                    text: `${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()} • VERGRP`,
                },
                fields: [
                    { name: "عدد الاعبين :busts_in_silhouette:", value: "غير معروف", inline: true },
                    { name: "وقت تشغيل الخادم ⌚", value: "غير متصل", inline: true },
                    { name: "عدد المركبات 🚗", value: "غير معروف", inline: true },
                    { name: "عدد الحسابات 🔑", value: "غير معروف", inline: true },
                    { name: "عدد الشخصيات 👨", value: "غير معروف", inline: true },
                    { name: "عدد مرات الدخول 📲", value: "غير معروف", inline: true },
                    { name: "حالة الاتصال 🛡️", value: "غير متاح", inline: true },
                    { name: "روابط الدخول 🌐", value: `**أي السيرفر:** \`\`mtasa://${serverIP}:${gamePort}\`\`` },
                ],
                author: {
                    name: "VERG Roleplay | فيرج رول بلاي حياة واقعية [V.1]",
                    icon_url: "https://files.catbox.moe/458bim.gif"
                },
                thumbnail: {
                    url: "https://files.catbox.moe/458bim.gif"
                },
            };
    
            try {
                const channel = await karizma.channels.fetch("1430293969866199161");
                const message = await channel.messages.fetch("1434352106026041376");
                
                await message.edit({ embeds: [errorMessage] });
            } catch (error) {
                console.error('خطأ في سحب معلومات الخادم:', error);
            }
        }
    }, 25000);

    console.log("Ready." + karizma.user.username);
});

karizma.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    
    if (interaction.customId && interaction.customId.startsWith('ticket_rate_')) {
        try {
            await interaction.deferReply({ ephemeral: true });
            const parts = interaction.customId.split('_');
            
            const channelId = parts[2];
            const rating = parseInt(parts[3], 10) || 0;

            
            const ticket = await new Promise((resolve) => {
                ticketDB.get('SELECT * FROM tickets WHERE channelId = ?', [channelId], (err, row) => {
                    if (err) {
                        console.error('Error querying ticket for rating:', err);
                        resolve(null);
                    } else resolve(row);
                });
            });

            if (!ticket) {
                await interaction.editReply({ content: '⚠️ لم يتم العثور على التذكرة المرتبطة بهذا التقييم.', ephemeral: true });
                return;
            }

            
            if (String(interaction.user.id) !== String(ticket.ownerId)) {
                await interaction.editReply({ content: '❌ فقط صاحب التذكرة يمكنه تقديم تقييم.', ephemeral: true });
                return;
            }

            
            const existing = await new Promise((resolve) => {
                ticketDB.get('SELECT * FROM ticket_ratings WHERE ticketChannelId = ? AND userId = ?', [channelId, interaction.user.id], (err, row) => {
                    if (err) { console.error('Error querying ticket_ratings:', err); resolve(null); } else resolve(row);
                });
            });

            if (existing) {
                await interaction.editReply({ content: '⚠️ لقد قمت بالتقييم من قبل، لا يمكنك التقييم مرة أخرى.', ephemeral: true });
                return;
            }

            
            await new Promise((resolve, reject) => {
                ticketDB.run('INSERT INTO ticket_ratings (ticketChannelId, ticketNumber, userId, rating, createdAt) VALUES (?, ?, ?, ?, ?)',
                    [channelId, ticket.ticketNumber || '', interaction.user.id, rating, Date.now()], (err) => {
                        if (err) { console.error('Error inserting ticket rating:', err); reject(err); } else resolve();
                    });
            });

            
            try {
                const msg = interaction.message;
                if (msg && msg.edit) {
                    const disabledRow = msg.components.map(row => {
                        row.components.forEach(c => c.setDisabled(true));
                        return row;
                    });
                    await msg.edit({ components: disabledRow }).catch(() => {});
                }
            } catch (e) {  }

            
            try {
                const ratingsChannel = await karizma.channels.fetch('1413161238615036024').catch(() => null);
                if (ratingsChannel && ratingsChannel.isText()) {
                    
                    const ratingEmbed = new MessageEmbed()
                        .setColor('#00CCFF')
                        .setTitle('📝 تقرير تقييم تذكرة')
                        .setThumbnail('https://files.catbox.moe/xds8lg.gif')
                        .addFields(
                            { name: 'المستخدم', value: `<@${ticket.ownerId}>`, inline: true },
                            { name: 'رقم التذكرة', value: `${ticket.ticketNumber || channelId}`, inline: true },
                            { name: 'النوع', value: `${TICKET_TYPES[ticket.ticketType]?.label || ticket.ticketType}`, inline: true },
                            { name: 'السبب', value: ticket.closeReason || 'لم يتم توفير سبب.', inline: false },
                            { name: 'المستلم', value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : 'لم يتم الاستلام', inline: true },
                            { name: 'المغلق', value: ticket.closedBy ? `<@${ticket.closedBy}>` : 'N/A', inline: true },
                            { name: 'التقييم', value: `${rating}/5`, inline: true }
                        )
                        .setFooter({ text: `Ticket: ${channelId}` })
                        .setTimestamp();

                    await ratingsChannel.send({ embeds: [ratingEmbed] }).catch(err => console.error('Failed to post rating embed:', err));
                }
            } catch (postErr) {
                console.error('Error posting rating to channel:', postErr);
            }

            await interaction.editReply({ content: `✅ شكرًا على تقييمك (${rating}/5). تم تسجيل التقييم.`, ephemeral: true });
            return;
        } catch (err) {
            console.error('Error handling ticket rating interaction:', err);
            try { await interaction.editReply({ content: '❌ حدث خطأ أثناء معالجة التقييم.', ephemeral: true }); } catch (e) {}
            return;
        }
    }

    if (interaction.customId.startsWith('accept_grocery_')) {
        
        const parts = interaction.customId.split('_');
        const accountIdFromButton = parts[2];
        const grocery_id = parts[3];

        
        const price = 0;
        const category = 'grocery';
        const value = '1';
        const product_name = `grocery_${grocery_id}`;

        try {
            
            await interaction.deferReply({ ephemeral: true });

            
            const discordId = interaction.user.id;
            safeQuery(`SELECT id, username FROM accounts WHERE discord = ?`, [discordId], async (err, results) => {
                if (err) {
                    console.error('DB error when verifying account for grocery accept:', err);
                    return await interaction.editReply({ content: 'حدث خطأ في الاتصال بقاعدة البيانات. حاول مرة أخرى لاحقاً أو راسل المطورين.' });
                }

                if (!results || results.length === 0) {
                    return await interaction.editReply({ content: 'يجب ربط حساب الديسكورد الخاص بك بحساب اللعبة أولاً (`/linkdiscord`) قبل استلام البقالة.' });
                }

                const linkedAccount = results[0];
                
                if (String(linkedAccount.id) !== String(accountIdFromButton)) {
                    return await interaction.editReply({ content: 'ليس لديك صلاحية استلام هذه البقالة.' });
                }

                
                server.resources.handler.acceptOrder(accountIdFromButton, grocery_id, price, category, value, product_name)
                .then(async result => {
                    try {
                        const success = typeof result === 'string' ? result.includes('✅') : result === true;
                        if (success) {
                            
                            const message = interaction.message;
                            const components = message.components || [];
                            for (const row of components) {
                                for (const component of row.components) {
                                    if (component.customId && component.customId.startsWith('accept_grocery_')) {
                                        component.setDisabled(true);
                                        component.setLabel('تم استلام البقالة ✅');
                                    }
                                }
                            }
                            await interaction.message.edit({ components });

                            return await interaction.editReply({ content: '✅ تم استلام البقالة بنجاح.' });
                        } else {
                            const errMsg = typeof result === 'string' ? result : 'حدث خطأ أثناء استلام البقالة.';
                            return await interaction.editReply({ content: `❌ ${errMsg}` });
                        }
                    } catch (handleErr) {
                        console.error('Error handling acceptOrder result for grocery:', handleErr);
                        return await interaction.editReply({ content: 'حدث خطأ أثناء معالجة استجابة خادم اللعبة.' });
                    }
                })
                .catch(async rpcErr => {
                    console.error('RPC error executing acceptOrder for grocery:', rpcErr);
                    return await interaction.editReply({ content: 'حدث خطأ أثناء التواصل مع خادم اللعبة. حاول لاحقاً.' });
                });
            });
        } catch (outerErr) {
            console.error('Unexpected error in accept_grocery handler:', outerErr);
            try { await interaction.reply({ content: 'حدث خطأ غير متوقع. حاول مرة أخرى لاحقاً.', ephemeral: true }); } catch(e){}
        }
    
    
    } else if (interaction.customId.startsWith('accept_')) {

    } else if (interaction.customId.startsWith('accept_')) {
        const [_, user_id, product_id, price, category, value, product_name] = interaction.customId.split('_');
        
        safeQuery(`SELECT credits, username FROM accounts WHERE id = ?`, [user_id], function(error, results) {
            if (error) {
                console.log(error);
                interaction.reply({ content: 'حدث خطأ في الاتصال بقاعدة البيانات، يرجى التواصل مع المطورين. :x:', ephemeral: true });
            } else if (results[0].credits < price) {
                interaction.reply({ content: 'ليس لدي الشخص المطلوب المبلغ المطلوب لشراء هذا المنتج. :x:', ephemeral: true });
            } else {
                server.resources.handler.acceptOrder(user_id, product_id, price, category, value, product_name)
                .then(async result => {
                    if (result.includes("✅")) {
                        const newButton = new MessageActionRow()
                            .addComponents(
                                new MessageButton()
                                    .setCustomId(`accepted`)
                                    .setLabel('تم قبول الطلب')
                                    .setEmoji('✅')
                                    .setStyle('SUCCESS')
                                    .setDisabled(true)
                            );

                        await interaction.message.edit({ components: [newButton] });
                        await interaction.reply({ content: result, ephemeral: true });
                        safeQuery(`SELECT discord FROM accounts WHERE id = ?`, [user_id], async function(error, results) {
                            if (error || !results[0]?.discord) {
                                console.error('Error fetching discord ID:', error);
                                return;
                            }
                            
                            try {
                                const discordId = results[0].discord;
                                const discordUser = await karizma.users.fetch(discordId);
                                const notificationEmbed = new MessageEmbed()
                                    .setColor('#00ff00')
                                    .setTitle('✅ تم قبول طلبك بنجاح - `#'+product_id+'`')
                                    .setDescription('شكراً لتعاملك معنا! نتمنى لك تجربة ممتعة 🌟')
                                    .addFields([
                                        {
                                            name: '💰 المبلغ المخصوم',
                                            value: `\`عملة ${price.toLocaleString()}\``,
                                            inline: true
                                        },
                                        {
                                            name: '👮‍♂️ تمت الموافقة بواسطة',
                                            value: `\`@${interaction.user.username}\``,
                                            inline: true
                                        }
                                    ])
                                    .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                                    .setImage('https://b.top4top.io/p_3296z3joy1.png')
                                    .setTimestamp()
                                    .setFooter({ 
                                        text: 'VERG Roleplay', 
                                        iconURL: interaction.guild.iconURL({ dynamic: true }) 
                                    });
                                await discordUser.send({ embeds: [notificationEmbed] });
                            } catch (error) {
                                console.error('Error sending DM to user:', error);
                            }
                        });
                    } else {
                        await interaction.reply({ content: result, ephemeral: true });
                    }
                })
                .catch(error => {
                    interaction.reply({ content: 'حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true });
                });
            }
        });
    } else if (interaction.customId.startsWith('deny_')) {
        const newButton = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId(`denied`)
                .setLabel('تم رفض الطلب')
                .setEmoji('❌')
                .setStyle('DANGER')
                .setDisabled(true)
        );

        const [_, user_id, product_id, price] = interaction.customId.split('_');

        safeQuery(`SELECT discord FROM accounts WHERE id = ?`, [user_id], async function(error, results) {
            if (error || !results[0]?.discord) {
                console.error('Error fetching discord ID:', error);
                return;
            }

            try {
                const discordId = results[0].discord;
                const discordUser = await karizma.users.fetch(discordId);
                const notificationEmbed = new MessageEmbed()
                    .setColor('#ff0000')
                    .setAuthor({ 
                        name: '❌ تم رفض طلبك - #'+product_id+'',
                        iconURL: interaction.guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp()
                    .setFooter({ 
                        text: 'VERG Roleplay', 
                        iconURL: interaction.guild.iconURL({ dynamic: true }) 
                    });
                await discordUser.send({ embeds: [notificationEmbed] });
            } catch (error) {
                console.error('Error sending DM to user:', error);
            }
        });
        await interaction.message.edit({ components: [newButton] });
    }
});

karizma.on('messageCreate', async message => {
    if (message.channel.type === 'DM' && message.author.id !== karizma.user.id) {
        const senderId = message.author.id;
        const code = message.content.trim();

        if (!code || code.length !== 20) {
            return;
        }

        safeQuery(`SELECT * FROM accounts WHERE discord=?`, [senderId], function(error, results) {
            if (error) {
                message.reply({ content: 'حدث خطأ في الاتصال بقاعدة البيانات، يرجى التواصل مع المطورين.', ephemeral: true });
                console.log(error);
            } else if (results.length > 0) {
                message.reply({ content: ` حسابك مربوط بحساب بالفعل بـ \`\`${results[0].username}\`\``, ephemeral: true });
            } else {
                safeQuery(`SELECT * FROM accounts WHERE LinkCode=?`, [code], function(error, results) {
                    if (error) {
                        message.reply({ content: 'حدث خطأ في الاتصال بقاعدة البيانات، يرجى التواصل مع المطورين.', ephemeral: true });
                        console.log(error);
                    } else if (results.length < 1) {
                        message.reply({ content: 'هذا الكود ليس تص بأي حساب في قاعدة البيانات.', ephemeral: true });
                    } else {
                        if (results[0].discord && results[0].discord !== "0" && results[0].discord.trim() !== "") {
                            message.reply({ content: `هذا الحساب مربوط بمستخدم ديسكورد من قبل\nLinked Discord ID: ${results[0].discord}`, ephemeral: true });
                        } else {
                            
                            safeQuery(`UPDATE accounts SET discord=?, LinkCode=0 WHERE id=?`, [message.author.id, results[0].id], function(error) {
                                if (error) throw error;

                                const embed = new MessageEmbed()
                                    .setColor("GREEN")
                                    .setDescription(`لقد قمت بربط الديسكورد بالحساب ( \`\`${results[0].username}\`\` ) بنجاح.`)
                                    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                                    .setTimestamp();

                                server.resources.discordLink.triggerIt(results[0].username);
                                server.resources.discordLink.getRolesTrigger(results[0].username);
                                message.reply({ embeds: [embed] });
                            });
                        }
                    }
                });
            }
        });
    }
});

karizma.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'claim_ticket') {
        try {
            
            await interaction.deferReply({ ephemeral: true }).catch(() => {});
            
            const channelId = interaction.channel.id;
            const ticketInfo = ticketData.get(channelId);
            
            if (!ticketInfo) {
                return interaction.editReply({
                    content: '❌ لم يتم العثور على معلومات التذكرة!'
                });
            }

            
            if (ticketInfo.status === 'claimed') {
                return interaction.editReply({
                    content: '❌ هذه التذكرة تم استلامها بالفعل!'
                });
            }

            
            const staffRoleId = TICKET_TYPES[ticketInfo.ticketType.toUpperCase()].staffRoleId;
            const adminRoleId = '1410394014053699716';
            
            if (!(interaction.member.roles.cache.has(staffRoleId) || interaction.member.roles.cache.has(adminRoleId) || isTicketModerator(interaction.member) || interaction.member.permissions.has('ADMINISTRATOR'))) {
                return interaction.editReply({
                    content: '❌ ليس لديك صلاحية لاستلام هذا النوع من التذاكر!'
                });
            }

            
            ticketInfo.status = 'claimed';
            ticketInfo.claimedBy = interaction.user.id;
            ticketData.set(channelId, ticketInfo);

            
            await incrementReceived(interaction.user.id);

            
            await new Promise((resolve, reject) => {
                ticketDB.run(
                    'UPDATE tickets SET status = ?, claimedBy = ? WHERE channelId = ?',
                    ['claimed', interaction.user.id, channelId],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });

            
            await interaction.editReply({ 
                content: '✅ تم استلام التذكرة بنجاح!' 
            });

            
            const updatedButtons = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('claim_ticket')
                        .setLabel('تم الاستلام')
                        .setStyle('SUCCESS')
                        .setEmoji('✋')
                        .setDisabled(true),
                    new MessageButton()
                        .setCustomId('close_ticket')
                        .setLabel('إغلاق التذكرة')
                        .setStyle('DANGER')
                        .setEmoji('🔒'),
                    new MessageButton()
                        .setCustomId('rename_ticket')
                        .setLabel('تغيير اسم التذكرة')
                        .setStyle('PRIMARY')
                        .setEmoji('✏️'),
                    new MessageButton()
                        .setCustomId('add_member_ticket')
                        .setLabel('إضافة عضو')
                        .setStyle('SECONDARY')
                        .setEmoji('➕'),
                    new MessageButton()
                        .setCustomId('delete_ticket')
                        .setLabel('حذف التذكرة')
                        .setStyle('DANGER')
                        .setEmoji('⛔')
                        .setDisabled(true)
                );

            
            const messages = await interaction.channel.messages.fetch();
            const firstMessage = messages.last();
            if (firstMessage) {
                await firstMessage.edit({ components: [updatedButtons] }).catch(err => console.warn('Failed to edit first ticket message:', err && err.message ? err.message : err));
            } else {
                console.warn('No message found to edit for ticket buttons in channel', interaction.channel.id);
            }

            
            const ticketOwnerUsername = interaction.channel.name.split('-')[1] || '';
            const ticketOwner = interaction.guild.members.cache.find(
                member => member.user.username.toLowerCase() === (ticketOwnerUsername || '').toLowerCase()
            );

            
            const claimEmbed = new MessageEmbed()
                .setColor('#00FF00')
                .setTitle('✅ تم استلام التذكرة')
                .setDescription(`تم استلام تذكرتك بواسطة ${interaction.user}`)
                .addFields({ name: '⏰ وقت الاستلام', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }) 
                .setFooter({ text: 'Youssef ElKikoاكر - VERG' })
                .setTimestamp();

            
            await interaction.channel.send({
                embeds: [claimEmbed]
            });

            
            const auditChannelId = '1410394429956820992';
            const auditChannel = interaction.guild.channels.cache.get(auditChannelId);
            if (auditChannel) {
                const auditEmbed = new MessageEmbed()
                    .setColor('#00FF00')
                    .setTitle('📋 تم استلام التذكرة')
                    .addFields(
                        { name: '🎫 رقم التذكرة', value: interaction.channel.name, inline: true },
                        { name: '👤 صاحب التذكرة', value: `${ticketOwnerUsername || 'غير معروف'} (${ticketInfo.ownerId || 'N/A'})`, inline: true },
                        { name: '🧑‍💼 المستقبل', value: `${interaction.user} (${interaction.user.id})`, inline: true },
                        { name: '⏰ الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'نظام سجل التذاكر' });
                
                await auditChannel.send({ embeds: [auditEmbed] }).catch(err => console.error('Error sending audit log:', err));
                try { await axios.post(webhookTicketsOnly, { embeds: [auditEmbed] }).catch(() => {}); } catch (e) {}
            }

            
            

            if (ticketOwner) {
                const dmEmbed = new MessageEmbed()
                    .setColor('#00FF00')
                    .setTitle('✅ تم استلام تذكرتك')
                    .setDescription(`تم استلام تذكرتك بواسطة ${interaction.user}`)
                    .addFields(
                        { name: '🎫 رقم التذكرة', value: interaction.channel.name },
                        { name: '📍 رابط التذكرة', value: `[اضغط هنا للذهاب للتذكرة](https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id})` },
                        { name: '⏰ وقت الاستلام', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
                    )
                    .setFooter({ text: 'Youssef ElKikoاكر - VERG' })
                    .setTimestamp();

                try {
                    await ticketOwner.send({ embeds: [dmEmbed] });
                } catch (error) {
                    console.error('Could not send DM to ticket owner:', error);
                    await interaction.channel.send('⚠️ لم يتمكن من إرسال رسالة خاصة لصاحب التذكرة');
                }
            }

        } catch (error) {
            console.error('Error claiming ticket:', error);
            await interaction.channel.send('❌ حدث خطأ أثناء استلام التذكرة.');
        }
    }
    
    else if (interaction.customId === 'rename_ticket') {
        try {
            
            const channelId = interaction.channel.id;
            const ticketInfo = ticketData.get(channelId);
            const staffRoleId = ticketInfo ? TICKET_TYPES[ticketInfo.ticketType].staffRoleId : null;
            const adminRoleId = '1410394014053699716';
            if (!(
                interaction.member.roles.cache.has(staffRoleId) ||
                interaction.member.roles.cache.has(adminRoleId) ||
                isTicketModerator(interaction.member) ||
                interaction.member.permissions.has('ADMINISTRATOR') ||
                (ticketInfo && ticketInfo.ownerId === interaction.user.id) ||
                hasExplicitChannelAccess(interaction.member, interaction.channel)
            )) {
                return interaction.reply({ content: '❌ ليس لديك صلاحية تغيير اسم التذكرة.', ephemeral: true });
            }

            if (!ticketInfo) {
                return interaction.reply({
                    content: '❌ لم يتم العثور على معلومات التذكرة!',
                    ephemeral: true
                });
            }

            const modal = new Modal()
                .setCustomId('rename_ticket_modal')
                .setTitle('تغيير اسم التذكرة');

            const nameInput = new TextInputComponent()
                .setCustomId('new_name')
                .setLabel('اسم التذكرة')
                .setStyle('PARAGRAPH')
                .setMinLength(1)
                .setMaxLength(100)
                .setPlaceholder('اكتب اسم التذكرة هنا...');

            const actionRow = new MessageActionRow().addComponents(nameInput);
            modal.addComponents(actionRow);

            try {
                await interaction.showModal(modal);
            } catch (error) {
                console.error('Error showing modal:', error);
                try {
                    await interaction.reply({
                        content: '❌ حدث خطأ أثناء محاولة إظار نوذج التغيير.',
                        ephemeral: true
                    });
                } catch (e) {}
            }
        } catch (error) {
            console.error('Error in rename ticket handler:', error);
            try {
                await interaction.reply({
                    content: '❌ حدث خطأ أثناء محاولة تغيير اسم التذكرة',
                    ephemeral: true
                });
            } catch (e) {}
        }
    }

    else if (interaction.customId === 'add_member_ticket') {
        try {
            const channelId = interaction.channel.id;
            const ticketInfo = ticketData.get(channelId);
            const staffRoleId = ticketInfo ? TICKET_TYPES[ticketInfo.ticketType].staffRoleId : null;
            const adminRoleId = '1410394014053699716';
            if (!(
                interaction.member.roles.cache.has(staffRoleId) ||
                interaction.member.roles.cache.has(adminRoleId) ||
                isTicketModerator(interaction.member) ||
                interaction.member.permissions.has('ADMINISTRATOR') ||
                (ticketInfo && ticketInfo.ownerId === interaction.user.id) ||
                hasExplicitChannelAccess(interaction.member, interaction.channel)
            )) {
                return interaction.reply({ content: '❌ ليس لديك صلاحية إضافة عضو للتذكرة.', ephemeral: true });
            }

            const modal = new Modal()
                .setCustomId('add_member_modal')
                .setTitle('إضافة عضو للتذكرة');

            const idInput = new TextInputComponent()
                .setCustomId('member_id')
                .setLabel('أدخل Discord ID أو منشن العضو')
                .setStyle('SHORT')
                .setPlaceholder('مثال: 123456789012345678')
                .setRequired(true);

            const actionRow = new MessageActionRow().addComponents(idInput);
            modal.addComponents(actionRow);

            try {
                await interaction.showModal(modal);
            } catch (error) {
                console.error('Error showing add-member modal:', error);
                await interaction.reply({ content: '❌ حدث خطأ أثناء محاولة إظهار نموذج إضافة عضو.', ephemeral: true });
            }
        } catch (error) {
            console.error('Error in add member handler:', error);
            return interaction.reply({ content: '❌ حدث خطأ أثناء محاولة إضافة عضو للتذكرة', ephemeral: true });
        }
    }

    else if (interaction.customId === 'close_ticket') {
        try {
            
            const channelId = interaction.channel.id;
            let ticketInfo = ticketData.get(channelId);

            
            if (!ticketInfo) {
                try {
                    const ticket = await new Promise((resolve, reject) => {
                        ticketDB.get('SELECT * FROM tickets WHERE channelId = ?', [channelId], (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        });
                    });

                    if (ticket) {
                        ticketInfo = {
                            ownerId: ticket.ownerId,
                            ownerUsername: ticket.ownerUsername,
                            ticketType: ticket.ticketType,
                            createdAt: ticket.createdAt,
                            status: ticket.status
                        };
                        
                        ticketData.set(channelId, ticketInfo);
                    } else {
                        
                        
                        const channel = interaction.channel;
                        if (channel.name.startsWith('ticket-')) {
                            const ticketType = channel.parent?.name.toUpperCase().includes('REPORT') ? 'REPORT' : 'COMPLAINT';
                            ticketInfo = {
                                ticketType: ticketType,
                                status: 'open'
                            };
                            ticketData.set(channelId, ticketInfo);
                        } else {
                            return interaction.reply({
                                content: '❌ لم يتم العثور على معلومات التذكرة!',
                                ephemeral: true
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error fetching ticket info:', error);
                    return interaction.reply({
                        content: '❌ حدث خطأ أثناء محاولة استرداد معلومات التذكرة',
                        ephemeral: true
                    });
                }
            }

            
            const staffRoleId = TICKET_TYPES[ticketInfo.ticketType].staffRoleId;
            const adminRoleId = '1410394014053699716';
            
            if (!(
                interaction.member.roles.cache.has(staffRoleId) ||
                interaction.member.roles.cache.has(adminRoleId) ||
                isTicketModerator(interaction.member) ||
                interaction.member.permissions.has('ADMINISTRATOR') ||
                hasExplicitChannelAccess(interaction.member, interaction.channel)
            )) {
                return interaction.reply({
                    content: '❌ عذراً، ليس لديك صلاحية إغلاق التذكرة.',
                    ephemeral: true
                });
            }

            
            const modal = new Modal()
                .setCustomId('close_ticket_modal')
                .setTitle('إغلاق التذكرة');

            const reasonInput = new TextInputComponent()
                .setCustomId('close_reason')
                .setLabel('سبب إغلاق التذكرة')
                .setStyle('PARAGRAPH')
                .setMinLength(1)
                .setMaxLength(1000)
                .setPlaceholder('اكتب سبب إغلاق التذكرة هنا...')
                .setRequired(true);

            const actionRow = new MessageActionRow().addComponents(reasonInput);
            modal.addComponents(actionRow);

            try {
                await interaction.showModal(modal);
            } catch (error) {
                console.error('Error showing modal:', error);
                await interaction.reply({
                    content: '❌ حدث خطأ أثناء محاولة إظار نوذج الإغلاق.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in close ticket handler:', error);
            return interaction.reply({
                content: '❌ حدث خطأ أثناء محاولة إغلاق التذكرة',
                ephemeral: true
            });
        }
    }
    
    else if (interaction.customId === 'delete_ticket') {
        try {
            
            const channelId = interaction.channel.id;
            const ticketInfo = ticketData.get(channelId);
            
            console.log('Attempting to delete ticket:', {
                channelId,
                ticketInfo,
                allTickets: Array.from(ticketData.entries())
            });

            
            const staffRoleId = TICKET_TYPES[ticketInfo.ticketType.toUpperCase()].staffRoleId;
            const adminRoleId = '1410394014053699716';
            if (!(
                interaction.member.roles.cache.has(staffRoleId) ||
                interaction.member.roles.cache.has(adminRoleId) ||
                isTicketModerator(interaction.member) ||
                interaction.member.permissions.has("ADMINISTRATOR") ||
                hasExplicitChannelAccess(interaction.member, interaction.channel)
            )) {
                return interaction.reply({
                    content: '❌ عذراً، ليس لديك صلاحية حذف التذكرة.',
                    ephemeral: true
                });
            }
            
            if (!ticketInfo) {
                
                const ticket = await new Promise((resolve, reject) => {
                    ticketDB.get('SELECT * FROM tickets WHERE channelId = ?', [channelId], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });

                if (!ticket) {
                    return interaction.reply({
                        content: '❌ لم يتم العثور على بيانات التذكرة!',
                        ephemeral: true
                    });
                }

                
                ticketData.set(channelId, {
                    ownerId: ticket.ownerId,
                    ownerUsername: ticket.ownerUsername,
                    ticketType: ticket.ticketType,
                    createdAt: ticket.createdAt,
                    status: ticket.status,
                    claimedBy: ticket.claimedBy,
                    closedBy: ticket.closedBy,
                    closedAt: ticket.closedAt,
                    closeReason: ticket.closeReason
                });
            }

            
            const confirmEmbed = new MessageEmbed()
                .setColor('#ff0000')
                .setTitle('⚠️ تأكيد حذف التذكرة')
                .setDescription('هل أنت متأكد من أنك تريد حذف هذه التذكرة؟ هذا الإجراء لا يمكن التراجع عنه.')
                .setFooter({ text: 'سيتم إلغاء العملية خلال 30 ثانية' });

            const confirmRow = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('confirm_delete')
                        .setLabel('تأكيد الحذف')
                        .setStyle('DANGER')
                        .setEmoji('⚠️'),
                    new MessageButton()
                        .setCustomId('cancel_delete')
                        .setLabel('إلغاء')
                        .setStyle('SECONDARY')
                        .setEmoji('✖️')
                );

            const response = await interaction.reply({
                embeds: [confirmEmbed],
                components: [confirmRow],
                ephemeral: true
            });

            
            const filter = i => i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({
                filter,
                time: 30000,
                max: 1
            });

            collector.on('collect', async i => {
                if (i.customId === 'confirm_delete') {
                    try {
                        
                        await ticketDBManager.deleteTicket(channelId);
                        
                        
                        ticketData.delete(channelId);

                        await i.update({
                            content: '🗑️ جارٍ حذف التذكرة...',
                            embeds: [],
                            components: []
                        });

                            
                            try {
                                const delEmbed = new MessageEmbed()
                                    .setColor('#ff0000')
                                    .setTitle('🗑️ تم حذف التذكرة')
                                    .addFields(
                                        { name: 'القناة', value: `${interaction.channel.name} (${channelId})`, inline: true },
                                        { name: 'المسؤول', value: `${interaction.user} (${interaction.user.id})`, inline: true },
                                        { name: 'صاحب التذكرة', value: `<@${ticketInfo.ownerId}>`, inline: true }
                                    )
                                    .setTimestamp();
                                await axios.post(webhookTicketsOnly, { embeds: [delEmbed] }).catch(() => {});
                            } catch (e) {  }

                        
                        setTimeout(() => {
                            interaction.channel.delete()
                                .catch(error => console.error('Error deleting channel:', error));
                        }, 2000);

                    } catch (error) {
                        console.error('Error during ticket deletion:', error);
                        await i.update({
                            content: '❌ حدث خطأ أثناء محاولة حذف التذكرة',
                            embeds: [],
                            components: []
                        });
                    }
                } else if (i.customId === 'cancel_delete') {
                    await i.update({
                        content: '✖️ تم إلغاء عملية الحذف',
                        embeds: [],
                        components: []
                    });
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({
                        content: '⏰ انتهت مهلة التأكيد',
                        embeds: [],
                        components: []
                    }).catch(console.error);
                }
            });

        } catch (error) {
            console.error('Error in delete ticket handler:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء محاولة حذف التذكرة',
                ephemeral: true
            }).catch(console.error);
        }
    }
});

karizma.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;
    let message;
    try {
        message = await interaction.message.fetch();
    } catch (err) {
        console.warn('Could not fetch interaction message, it may have been deleted:', err && err.message ? err.message : err);
        
        try { await interaction.reply({ content: '⚠️ الرسالة المرتبطة بالزر لم تعد متاحة.', ephemeral: true }); } catch (e) {}
        return;
    }
    const userId = interaction.user.id;

    if (customId.startsWith('verify')) {
        const parts = customId.split(':');
        await interaction.reply({ content: `تم سماح الدخول بنجاح`, ephemeral: true });
        const embed = message.embeds[0];
        const newEmbed = { 
            ...embed, 
            title: 'تم السماح بالدخول ✅',
        };
        await message.edit({ components: [], embeds: [newEmbed] });
        server.resources.handler.playerRequest(parts[1], parts[2], parts[3], "accept");
    } else if (customId.startsWith('cancel')) {
        const parts = customId.split(':');
        await interaction.reply({ content: `تم رفض الدخول بنجاح`, ephemeral: true });
        const embed = message.embeds[0];
        const newEmbed = { 
            ...embed, 
            title: 'تم رفض الدخول ❌',
        };
        server.resources.handler.playerRequest(parts[1], parts[2], parts[3], "cancel");
        await message.edit({ components: [], embeds: [newEmbed] });
    }
});

karizma.on('interactionCreate', async interaction => {
    
    if (interaction.isButton()) {
        try {
            const id = interaction.customId || '';
            if (!id.startsWith('anti_action_')) return;
            
            const parts = id.split(':');
            const action = parts[0];
            const guildId = parts[1];
            const executorId = parts[2];
            const actionType = parts[3];

            
            if (!ADMINS_TO_NOTIFY.includes(interaction.user.id)) {
                await interaction.reply({ content: 'ليس لديك صلاحية اتخاذ هذا الإجراء.', ephemeral: true });
                return;
            }

            const guild = karizma.guilds.cache.get(guildId) || await karizma.guilds.fetch(guildId).catch(() => null);
            if (!guild) {
                await interaction.reply({ content: 'تعذر العثور على السيرفر.', ephemeral: true });
                return;
            }

            if (action.startsWith('anti_action_confirm')) {
                await interaction.deferReply({ ephemeral: true });
                const result = await attemptKickBot(guild, executorId, `Kicked by admin ${interaction.user.tag} after alert (${actionType})`);
                if (result.ok) {
                    await interaction.editReply({ content: `✅ تم طرد البوت (${executorId}).` });
                } else {
                    await interaction.editReply({ content: `❌ فشل طرد البوت: ${result.reason}` });
                }
                return;
            }

            if (action.startsWith('anti_action_cancel')) {
                await interaction.reply({ content: 'تم تجاهل التحذير.', ephemeral: true });
                return;
            }
        } catch (err) {
            console.error('Error handling anti-action button interaction:', err);
            try { await interaction.reply({ content: 'حدث خطأ أثناء معالجة الإجراء.', ephemeral: true }); } catch(e){}
        }
        return;
    }

    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

        
        if (commandName === 'delivergrocery') {
            const targetUser = interaction.options.getUser('user');
            const groceryId = interaction.options.getString('groceryid');

            try {
                
                const deliveryEmbed = new MessageEmbed()
                    .setColor('#00ff00')
                    .setTitle(`✅ تم تسليم عقد بقالة - #${groceryId}`)
                    .setDescription('لقد تم إرسال عقد البقالة إليك. إذا أردت استلامه كأنك فزت به في مزاد، اضغط على زر **استلام البقالة** أدناه.')
                    .addFields([
                        { name: '📝 رقم العقد', value: `\`${groceryId}\``, inline: true },
                        { name: '👮‍♂️ المرسل', value: `\`${interaction.user.tag}\``, inline: true }
                    ])
                    .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                    .setImage('https://b.top4top.io/p_3296z3joy1.png')
                    .setTimestamp()
                    .setFooter({ text: 'VERG Roleplay', iconURL: interaction.guild.iconURL({ dynamic: true }) });

                const actionRow = new MessageActionRow().addComponents(
                    new MessageButton()
                        .setCustomId(`delivergrocery_${targetUser.id}_${groceryId}_${interaction.user.id}`)
                        .setLabel('استلام البقالة')
                        .setEmoji('🛒')
                        .setStyle('SUCCESS')
                );

                await targetUser.send({ embeds: [deliveryEmbed], components: [actionRow] });

                
                try {
                    const logDesc = `تسليم عقد بقالة \`${groceryId}\` -> ${targetUser.tag} (\`${targetUser.id}\`)\nتم إرساله بواسطة: <@${interaction.user.id}>`;
                    embedSuccess(webhookGrocery, 'Grocery Delivery Sent 🛒', logDesc, `<@${interaction.user.id}>`);
                } catch (e) { console.error('Failed to log grocery send:', e); }

                await interaction.reply({ content: `✅ تم إرسال رسالة استلام البقالة إلى ${targetUser}`, ephemeral: true });

            } catch (error) {
                console.error('Error sending grocery delivery DM:', error);
                await interaction.reply({ content: '❌ حدث خطأ أثناء محاولة إرسال رسالة التأكيد', ephemeral: true });
            }
        }

        
        if (commandName === 'chat') {
            const allowedRoles = ['1412844127648874598','1410394014053699716'];
            const member = interaction.member;

            if (!member) return interaction.reply({ content: 'هذا الأمر يعمل داخل السيرفر فقط.', ephemeral: true });

            const hasRole = allowedRoles.some(r => member.roles.cache.has(r));
            if (!hasRole) return interaction.reply({ content: '❌ ليس لديك صلاحية استخدام هذا الأمر.', ephemeral: true });

            const messageText = interaction.options.getString('message');
            const imageAttachment = interaction.options.getAttachment && interaction.options.getAttachment('image');
            const replyToInput = interaction.options.getString('reply_to');

            
            if (!messageText && !imageAttachment) {
                await interaction.reply({ content: '❌ الرجاء إدخال نص أو إرفاق صورة لإرسالها عبر البوت.', ephemeral: true });
                return;
            }

            
            function extractMessageId(input) {
                if (!input) return null;
                
                const urlMatch = input.match(/channels\/(\d+)\/(\d+)\/(\d+)/);
                if (urlMatch) return { guildId: urlMatch[1], channelId: urlMatch[2], messageId: urlMatch[3] };
                
                const idMatch = input.match(/(\d{17,19})$/);
                if (idMatch) return { messageId: idMatch[1] };
                return null;
            }

            let replyTargetMessage = null;
            const parsed = extractMessageId(replyToInput);
            if (parsed) {
                try {
                    if (parsed.channelId && parsed.messageId) {
                        
                        const targetChannel = await karizma.channels.fetch(parsed.channelId);
                        if (targetChannel && targetChannel.isText()) {
                            replyTargetMessage = await targetChannel.messages.fetch(parsed.messageId).catch(() => null);
                        }
                    } else if (parsed.messageId) {
                        
                        replyTargetMessage = await interaction.channel.messages.fetch(parsed.messageId).catch(() => null);
                        
                    }
                } catch (e) {
                    replyTargetMessage = null;
                }
            }

            try {
                await interaction.deferReply({ ephemeral: true });
                const sendOptions = { allowedMentions: { parse: ['users','roles','everyone'] } };
                if (messageText) sendOptions.content = messageText;
                if (imageAttachment) sendOptions.files = [imageAttachment.url];

                
                const reactInput = interaction.options.getString('react');
                let postedMessage = null;
                if (replyTargetMessage) {
                    
                    postedMessage = await replyTargetMessage.reply(sendOptions);
                } else {
                    postedMessage = await interaction.channel.send(sendOptions);
                }

                
                if (reactInput && postedMessage) {
                    try {
                        
                        
                        
                        
                        const customMatch = reactInput.match(/<a?:([a-zA-Z0-9_]+):(\d+)>/);
                        if (customMatch) {
                            
                            const emojiResolvable = `${customMatch[1]}:${customMatch[2]}`;
                            await postedMessage.react(emojiResolvable);
                        } else {
                            
                            let candidate = reactInput;
                            
                            if (/^:.*:$/.test(candidate)) candidate = candidate.replace(/^:(.*):$/, '$1');
                            
                            if (/^[A-Za-z0-9_+-]+$/.test(candidate)) {
                                const resolved = emoji.get(candidate);
                                
                                
                                if (resolved && !/^:.*:$/.test(resolved)) {
                                    await postedMessage.react(resolved);
                                } else {
                                    
                                    await interaction.editReply({ content: '✅ تم نشر الرسالة بواسطة البوت. (لكن اسم الإيموجي غير صالح)'});
                                    return;
                                }
                            } else {
                                
                                await postedMessage.react(candidate);
                            }
                        }
                    } catch (reactErr) {
                        console.error('Failed to add reaction in /chat command:', reactErr);
                        
                        await interaction.editReply({ content: '✅ تم نشر الرسالة بواسطة البوت. (لكن فشل إضافة الريأكت)' });
                        return;
                    }
                }

                await interaction.editReply({ content: '✅ تم نشر الرسالة بواسطة البوت.' });

                
                try {
                    const chatEmbed = new MessageEmbed()
                        .setColor('#cccccc')
                        .setTitle('🗨️ Bot Chat Message')
                        .addFields(
                            { name: 'By', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                            { name: 'Channel', value: `${interaction.channel.id}`, inline: true },
                            { name: 'Content', value: messageText ? messageText.substring(0, 1024) : '(no text)', inline: false }
                        )
                        .setTimestamp();
                    await axios.post(webhookBotChat, { embeds: [chatEmbed] }).catch(() => {});
                } catch (e) { console.error('Failed to send bot chat log:', e); }
            } catch (err) {
                console.error('Error in /chat command:', err);
                try { await interaction.reply({ content: '❌ حدث خطأ أثناء إرسال الرسالة.', ephemeral: true }); } catch (e) {}
            }
            return;
        }

        
        if (commandName === 'changepassword') {
            const allowedRole = '1412844127648874598';
            if (!interaction.member.roles.cache.has(allowedRole)) {
                await interaction.reply({ content: 'ليس لديك صلاحية استخدام هذا الأمر.', ephemeral: true });
                return;
            }
            const username = interaction.options.getString('username');
            const password = interaction.options.getString('password');
            
            const crypto = require('crypto');
            const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
            
            safeQuery('UPDATE accounts SET password = ? WHERE username = ?', [hashedPassword, username], (err, results) => {
                if (err) {
                    interaction.reply({ content: 'حدث خطأ أثناء تحديث كلمة المرور.', ephemeral: true });
                } else if (results.affectedRows === 0) {
                    interaction.reply({ content: 'لم يتم العثور على الحساب المطلوب.', ephemeral: true });
                } else {
                    interaction.reply({ content: `تم تغيير كلمة المرور بنجاح للحساب \`${username}\`.` });
                    
                    const logWebhook = process.env.WEBHOOK_PASSWORD_LOG;
                    const logEmbed = {
                        username: 'Password Change Log',
                        embeds: [
                            {
                                color: 0x3498db,
                                title: 'تغيير كلمة مرور حساب',
                                fields: [
                                    { name: 'الحساب', value: username, inline: true },
                                    { name: 'منفذ الأمر', value: `<@${interaction.user.id}>`, inline: true },
                                    { name: 'الباسورد الجديد (MD5)', value: `\n${hashedPassword}` },
                                ],
                                timestamp: new Date().toISOString(),
                                footer: { text: 'VERG System' }
                            }
                        ]
                    };
                    require('axios').post(logWebhook, logEmbed).catch(() => {});
                }
            });
            return;
        }

    if (commandName === 'account') {
        const input = interaction.options.getString('user');
        let userId;
        let searchColumn;
    
        const mentionMatch = input.match(/^<@!?(\d+)>$/);
        if (mentionMatch) {
            userId = mentionMatch[1];
            searchColumn = 'discord';
        } else {
            const mentionedUser = interaction.guild.members.cache.find(member => member.user.username.toLowerCase() === input.toLowerCase() || member.user.id === input);
            if (mentionedUser) {
                userId = mentionedUser.user.id;
                searchColumn = 'discord';
            } else {
                userId = input;
                searchColumn = 'username'; 
            }
        }
    
        const sqlQuery = searchColumn === 'discord'
            ? 'SELECT * FROM accounts WHERE discord = ?'
            : 'SELECT * FROM accounts WHERE username = ?';
    
        safeQuery(sqlQuery, [userId], (error, results) => {
            if (error) {
                console.error(error);
                return interaction.reply({ content: 'حدث طأ ثناء البحث في قاعدة البيانات.', ephemeral: true });
            }
    
            if (results.length > 0) {
                const result = results[0];
    
                const username = typeof result.username === 'string' && result.username.trim() !== '' ? result.username : 'غير متوفر';
                const discordId = typeof result.discord === 'string' && result.discord.trim() !== '' && result.discord.length > 8 
                ? `<@${result.discord}>` 
                : 'Not Linked';
                const adminRank = typeof result.admin === 'number' ? result.admin.toString() : (typeof result.admin === 'string' && result.admin.trim() !== '' ? result.admin.trim() : 'غير متوفر');
                
                const formatDate = (dateString) => {
                    const date = new Date(dateString);
                    date.setUTCHours(date.getUTCHours() + 3);
                    const year = date.getUTCFullYear();
                    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                    const day = String(date.getUTCDate()).padStart(2, '0');
                    const hours = String(date.getUTCHours()).padStart(2, '0');
                    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
                    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    
                    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                };
    
                const lastLogin = result.lastlogin instanceof Date 
                    ? formatDate(result.lastlogin) 
                    : (typeof result.lastlogin === 'string' && result.lastlogin.trim() !== '' ? result.lastlogin : 'غير متوفر');
    
                const registerDate = result.registerdate instanceof Date 
                    ? formatDate(result.registerdate) 
                    : (typeof result.registerdate === 'string' && result.registerdate.trim() !== '' ? result.registerdate : 'غير متوفر');
    
                let rankDescription;
                switch (adminRank) {
                    case '0': rankDescription = 'Player'; break;
                    case '1': rankDescription = 'Trial Admin'; break;
                    case '2': rankDescription = 'Admin'; break;
                    case '3': rankDescription = 'Senior Admin'; break;
                    case '4': rankDescription = 'Lead Admin'; break;
                    case '5': rankDescription = 'Supervisor'; break;
                    case '6': rankDescription = 'Head Admin'; break;
                    case '7': rankDescription = 'Vice Founder'; break;
                    case '8': rankDescription = 'Founder'; break;
                    case '9': rankDescription = 'Server Control'; break;
                    case '10': rankDescription = 'Community Developer'; break;
                    case '11': rankDescription = 'Community Manger'; break;
                    case '12': rankDescription = 'Server Owner'; break;
                    case '13': rankDescription = 'Founder'; break;
                    case '14': rankDescription = 'Developer'; break;
                    case '15': rankDescription = 'Server Owner'; break;
                    default: rankDescription = 'غير متوفر';
                }
    
                const accountId = result.id;
                safeQuery('SELECT id, charactername FROM characters WHERE account = ?', [accountId], (charError, charResults) => {
                    if (charError) {
                        console.error(charError);
                        return interaction.reply({ content: 'حدث خطأ أثناء البحث في جدول الشخصيات.', ephemeral: true });
                    }
    
                    const characterInfo = charResults.map(char => {
                        return `\`\`# ${char.id}\`\` - \`\`${char.charactername}\`\``;
                    }).join('\n');
    
                    const embed = new MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle('معلومات عن المستخدم')
                        .addFields(
                            { name: 'Username', value: username, inline: true },
                            { name: 'Rank', value: rankDescription, inline: true },
                            { name: 'Discord User', value: discordId, inline: true },
                            { name: 'Last Login', value: lastLogin, inline: true },
                            { name: 'Register Date', value: registerDate, inline: true },
                            { name: 'Characters', value: characterInfo || 'لا توجد شخصيات مرتبطة.', inline: false }
                        )
                        .setTimestamp()
                        .setFooter({ text: `طلب من: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });
    
                    interaction.reply({ embeds: [embed] });
                });
            } else {
                interaction.reply({ content: 'لم يتم العثور عل أي معلومات لهذا المستخدم.', ephemeral: true });
            }
        });
    } else if (commandName === 'moneytop') {
            const sqlQuery = `
            SELECT charactername, 
                (COALESCE(money, 0) + COALESCE(bankmoney, 0)) AS totalMoney 
            FROM characters 
            ORDER BY totalMoney DESC 
            LIMIT 10`;
        
        safeQuery(sqlQuery, (error, results) => {
            if (error) {
                console.error(error);
                return interaction.reply({ content: 'حدث خطأ أثناء البحث في قاعد البيانات.', ephemeral: true });
            }
        
            if (results.length > 0) {
                const embed = new MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle('أغني 10 لاعبين 💰')
                    .setTimestamp()
                    .setFooter({ text: `طلب من: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });
        
                let characterFields = results.map((result, index) => {
                    const characterName = result.charactername || 'غير متوفر';
                    const totalMoney = (result.totalMoney || 0).toLocaleString();
                    return `**#${index + 1} - ${characterName} | Total Money: \`\`$${totalMoney}\`\`**`;
                }).join('\n');
        
                embed.setDescription(characterFields);
        
                interaction.reply({ embeds: [embed] });
            } else {
                interaction.reply({ content: 'لم يتم العثور على أي معلومات.', ephemeral: true });
            }
        });   
    } else if (commandName === 'hourstop') {
        const sqlQuery = `
            SELECT charactername, hoursplayed 
            FROM characters 
            ORDER BY hoursplayed DESC 
            LIMIT 10`;
    
        safeQuery(sqlQuery, (error, results) => {
            if (error) {
                console.error(error);
                return interaction.reply({ content: 'حدث خطأ أثناء البحث في قاعدة البيانات.', ephemeral: true });
            }
    
            if (results.length > 0) {
                const embed = new MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle('أعلى 10 لاعبين تفاعلاً 🔷')
                    .setTimestamp()
                    .setFooter({ text: `طلب من: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });
    
                let playerFields = results.map((result, index) => {
                    const characterName = result.charactername || 'غير متوفر';
                    const hoursPlayed = (result.hoursplayed || 0).toLocaleString();
                    return `**#${index + 1} - ${characterName} | Hours Played: \`\`${hoursPlayed}\`\`**`;
                }).join('\n');
    
                embed.setDescription(playerFields);
    
                interaction.reply({ embeds: [embed] });
            } else {
                interaction.reply({ content: 'لم يتم العثور على أي معلومات.', ephemeral: true });
            }
        });  
    } else if (commandName === 'givemoney'){
        const roleId = '1412844127648874598';
        const member = interaction.member;
        
        if (member.roles.cache.has(roleId)) {
            const playerId = interaction.options.getString('id');
            const moneyAmount = interaction.options.getString('money');
            const moneyReason = interaction.options.getString('reason');

            if (!isNaN(playerId) && !isNaN(moneyAmount)) {
                const displayName = member.nickname || member.user.username;
                const responsibleId = member.id
                server.resources.handler.giveThings(moneyAmount, playerId, displayName)
                .then(result => {
                    interaction.reply({ content: result, ephemeral: true });
                    embedSuccess(moneyLog, "Money Log 💰", result + " \n\n**Money Amount: **``$" + Number(moneyAmount).toLocaleString() + "``\n**Reason: **``" + moneyReason + "``", `<@${responsibleId}>`)
                })
                .catch(error => {
                    interaction.reply({ content: 'حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true });
                    console.error(error);
                });
            } else {
                return interaction.reply({ content: 'يرجى التأكد من أن ID والكمية عبارة عن أرقام صحيحة.', ephemeral: true });
            }
        } else {
            return interaction.reply({ content: 'عذراً، ليس لديك الصلاحيات اللازمة لتنفيذ هذا الأمر', ephemeral: true });
        }
    } else if (commandName === 'discordlink'){
        const roleId = '1415900772754915358';
        const member = interaction.member;
        
        if (member.roles.cache.has(roleId) || member.permissions.has('ADMINISTRATOR')) {
            const accountName = interaction.options.getString('accountname');
            const newDiscordId = interaction.options.getString('new_discord_id');
            const emailAddress = interaction.options.getString('email_address');

            if (accountName && newDiscordId && emailAddress) {
                safeQuery('UPDATE accounts SET discord = ? WHERE username = ? AND email = ?', [newDiscordId, accountName, emailAddress], function(error, result) {
                    if (error) {
                        return interaction.reply({ content: 'حدث خطأ أثناء التحديث. يرجى المحاولة لاحقاً.', ephemeral: true });
                    }
                    
                    return interaction.reply({ content: `تم ربط هذا الحساب ${accountName} بالديسكورد <@${newDiscordId}> بنجاح ✅`, ephemeral: false });
                });
            } else {
                return interaction.reply({ content: 'يرجى التأكد من أن اسم الحساب وايدي الديسكورد والبريد الإلكتروني عبارة عن قيم صحيحة.', ephemeral: true });
            }
        } else {
            return interaction.reply({ content: 'عذراً، ليس لديك الصلاحيات اللازمة لتنفيذ هذا الأمر', ephemeral: true });
        }
    } else if (commandName === 'changid') {
        const roleId = '1412844127648874598'; 
        const member = interaction.member;

        if (member.roles.cache.has(roleId)) {
            const oldId = interaction.options.getString('oldid');
            const newId = interaction.options.getString('newid');

            if (isNaN(oldId) || isNaN(newId)) {
                return interaction.reply({ content: '❌ يرجى التأكد أن كلا الإيديين عبارة عن أرقام.', ephemeral: true });
            }

            
            safeQuery('SELECT id FROM accounts WHERE id = ?', [newId], (checkErr, checkRows) => {
                if (checkErr) {
                    console.error('DB error checking newId existence:', checkErr);
                    return interaction.reply({ content: '❌ حدث خطأ أثناء التحقق من الـ ID الجديد.', ephemeral: true });
                }
                if (checkRows && checkRows.length > 0) {
                    return interaction.reply({ content: '⚠️ الـ ID الجديد مستخدم بالفعل في قاعدة البيانات. اختر ID آخر.', ephemeral: true });
                }

                
                safeQuery(`UPDATE accounts SET id = ? WHERE id = ?`, [newId, oldId], (err, result) => {
                    if (err) {
                        console.error(err);
                        return interaction.reply({ content: '❌ حدث خطأ أثناء تحديث جدول الحسابات.', ephemeral: true });
                    }

                    if (result.affectedRows === 0) {
                        return interaction.reply({ content: '⚠️ لم يتم العثور على حساب بهذا الإيدي القديم.', ephemeral: true });
                    }

                    
                    safeQuery(`UPDATE characters SET account = ? WHERE account = ?`, [newId, oldId], (err2, result2) => {
                        if (err2) {
                            console.error(err2);
                            return interaction.reply({ content: '❌ تم تحديث الحساب ولكن حدث خطأ أثناء تحديث الشخصيات.', ephemeral: true });
                        }

                        interaction.reply({
                            content: `✅ تم تغيير ID الحساب من \`${oldId}\` إلى \`${newId}\` بنجاح.\n(تم تحديث ${result2.affectedRows} شخصية)`,
                            ephemeral: false,
                        });
                        
                        try {
                            const desc = `**Command:** changid\n**Old ID:** \`${oldId}\`\n**New ID:** \`${newId}\`\n**Characters updated:** ${result2.affectedRows}`;
                            embedSuccess(webhookChangeId, 'Change ID Log 🔄', desc, `<@${member.id}> (${member.user.username})`);
                        } catch (e) { console.error('Failed to send changid webhook:', e); }
                    });
                });
            });
        } else {
            return interaction.reply({ content: '❌ ليس لديك صلاحية استخدام هذا الأمر.', ephemeral: true });
        }

    } else if (commandName === 'withdrawcharacter') {
        const roleId = '1412844127648874598';
        const member = interaction.member;
        if (!member.roles.cache.has(roleId)) return interaction.reply({ content: '❌ ليس لديك صلاحية استخدام هذا الأمر.', ephemeral: true });

        const charId = interaction.options.getString('id');
        const amountStr = interaction.options.getString('money');
        if (isNaN(charId) || isNaN(amountStr)) return interaction.reply({ content: '❌ يرجى التأكد من أن ID والمبلغ أرقام صحيحة.', ephemeral: true });

        const amount = Number(amountStr);
        if (amount <= 0) return interaction.reply({ content: '❌ يجب أن يكون المبلغ أكبر من 0.', ephemeral: true });

        
        safeQuery('SELECT money FROM characters WHERE account = ?', [charId], (err, rows) => {
            if (err) {
                console.error('DB error selecting character money:', err);
                return interaction.reply({ content: '❌ حدث خطأ أثناء الوصول لقاعدة البيانات.', ephemeral: true });
            }
            if (!rows || rows.length === 0) return interaction.reply({ content: '⚠️ لم يتم العثور على شخصية بهذا الـ ID.', ephemeral: true });

            const current = Number(rows[0].money || 0);
            if (current < amount) return interaction.reply({ content: `⚠️ رصيد الشخصية غير كافٍ. الرصيد الحالي: ${current}`, ephemeral: true });

            safeQuery('UPDATE characters SET money = money - ? WHERE account = ?', [amount, charId], (uErr, uRes) => {
                if (uErr) {
                    console.error('DB error updating character money:', uErr);
                    return interaction.reply({ content: '❌ حدث خطأ أثناء تحديث رصيد الشخصية.', ephemeral: true });
                }

                
                try {
                    const desc = `**Command:** withdrawcharacter\n**Character ID:** \`${charId}\`\n**Amount:** \`${amount}\`\n`;
                    embedSuccess(webhookWithdraw, 'Withdraw Character Log 💸', desc, `<@${member.id}> (${member.user.username})`);
                } catch (e) { console.error('Failed to send withdrawcharacter webhook:', e); }

                return interaction.reply({ content: `✅ تم سحب ${amount} من شخصية بالـ ID ${charId} بنجاح.`, ephemeral: false });
            });
        });

    } else if (commandName === 'setskin') {
        const roleId = '1412844127648874598';
        const member = interaction.member;
        if (!member.roles.cache.has(roleId)) return interaction.reply({ content: '❌ ليس لديك صلاحية استخدام هذا الأمر.', ephemeral: true });

        const charId = interaction.options.getString('id');
        const skin = interaction.options.getString('skin');
        if (isNaN(charId) || isNaN(skin)) return interaction.reply({ content: '❌ يرجى التأكد من أن ID والـ skin عبارة عن أرقام صحيحة.', ephemeral: true });

        safeQuery('SELECT id FROM characters WHERE account = ?', [charId], (err, rows) => {
            if (err) {
                console.error('DB error selecting character for setskin:', err);
                return interaction.reply({ content: '❌ حدث خطأ أثناء الوصول لقاعدة البيانات.', ephemeral: true });
            }
            if (!rows || rows.length === 0) return interaction.reply({ content: '⚠️ لم يتم العثور على شخصية بهذا الـ ID.', ephemeral: true });

            safeQuery('UPDATE characters SET skin = ? WHERE account = ?', [skin, charId], (uErr, uRes) => {
                if (uErr) {
                    console.error('DB error updating character skin:', uErr);
                    return interaction.reply({ content: '❌ حدث خطأ أثناء تحديث الskin.', ephemeral: true });
                }

                
                try {
                    const desc = `**Command:** setskin\n**Character ID:** \`${charId}\`\n**New Skin ID:** \`${skin}\``;
                    embedSuccess(webhookSkinChange, 'Set Skin Log 🖼️', desc, `<@${member.id}> (${member.user.username})`);
                } catch (e) { console.error('Failed to send setskin webhook:', e); }

                return interaction.reply({ content: `✅ تم تغيير الskin للشخصية ${charId} إلى ${skin} بنجاح.`, ephemeral: false });
            });
        });
    } else if (commandName === 'changeserial') {
        const roleId = '1412844127648874598';
        const member = interaction.member;
        if (member.roles.cache.has(roleId)) {
            const email = interaction.options.getString('email');
            const serial = interaction.options.getString('serial');

            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return interaction.reply({ content: '❌ البريد الإلكتروني غير صحيح. يرجى إدخال بريد إلكتروني صحيح.', ephemeral: true });
            }

            
            safeQuery("SELECT * FROM accounts WHERE email = ?", [email], async (error, results) => {
                if (error) {
                    console.error('Error searching for account:', error);
                    return interaction.reply({ content: 'حدث خطأ أثناء البحث عن الحساب.', ephemeral: true });
                }

                if (!results || results.length === 0) {
                    return interaction.reply({ content: '❌ لم يتم العثور على حساب بهذا البريد الإلكتروني.', ephemeral: true });
                }

                const accountData = results[0];
                const oldSerial = accountData.mtaserial || 'غير معروف';
                const username = accountData.username || 'غير معروف';

                
                safeQuery("UPDATE accounts SET mtaserial = ? WHERE email = ?", [serial, email], async function(updateError, updateResult) {
                    if (updateError) {
                        console.error('Error updating serial:', updateError);
                        return interaction.reply({ content: 'حدث خطأ أثناء تحديث السيريال.', ephemeral: true });
                    }

                    if (updateResult.affectedRows === 0) {
                        return interaction.reply({ content: '❌ لم يتم تغيير السيريال. حدث خطأ غير متوقع.', ephemeral: true });
                    }

                    
                    await interaction.reply({ 
                        content: `✅ تم تغيير السيريال بنجاح للحساب **${username}**`,
                        ephemeral: true 
                    });

                    
                    const logChannel = karizma.channels.cache.get('1412510460162478090');
                    if (logChannel) {
                        const displayName = member.nickname || member.user.username;
                        const logEmbed = new MessageEmbed()
                            .setColor('#00ff00')
                            .setTitle('تغيير سيريال 🔄')
                            .addFields(
                                { name: 'اسم المستخدم', value: username, inline: true },
                                { name: 'البريد الإلكتروني', value: email.substring(0,3) + '*'.repeat(email.length-3), inline: true },
                                { name: 'السيريال القديم', value: `\`\`\`${oldSerial}\`\`\``, inline: false },
                                { name: 'السيريال الجديد', value: `\`\`\`${serial}\`\`\``, inline: false },
                                { name: 'تم بواسطة', value: `<@${member.id}> (${displayName})`, inline: true },
                                { name: 'التاريخ', value: new Date().toLocaleString('ar-SA'), inline: true }
                            )
                            .setTimestamp();
                            
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                });
            });
        } else {
            return interaction.reply({ content: 'عذراً، ليس لديك الصلاحيات اللازمة لتنفيذ هذا الأمر', ephemeral: true });
        }
    } else if (commandName === 'embed'){
        const roleId = '1412844127648874598'; 
        const member = interaction.member;
        if (member.roles.cache.has(roleId)) {
            const embed = new MessageEmbed()
            .setColor('#0099ff')
            .addFields({ name: 'This is an empty embed.', value: "ELKIKO TEST EMBED.", inline: true })
            .setTimestamp();
            const channel = interaction.channel;
            channel.send({ embeds: [embed] });
            interaction.reply({ content: 'تم إرسال الرسالة بنجاح ✅', ephemeral: true });
        } else {
            return interaction.reply({ content: 'عذراً، ليس لديك الصلاحيات اللازمة لتنفيذ هذا الأمر', ephemeral: true });
        }
    } else if (commandName === 'blacklisttickets'){
        const staffRoleId = '1410430798925926451'; 
        const member = interaction.member;
        
        if (!member.roles.cache.has(staffRoleId)) {
            return interaction.reply({ content: '❌ عذراً، ليس لديك صلاحية لاستخدام هذا الأمر. يجب أن تكون موظفاً.', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('user');
        const action = interaction.options.getString('action');
        const durationInput = interaction.options.getString('duration') || 'permanent';
        const reason = interaction.options.getString('reason') || 'لم يتم تحديد السبب';

        try {
            await interaction.deferReply({ ephemeral: true });

            if (action === 'ban') {
                
                let expiresAt = null;
                let duration = durationInput;
                
                if (durationInput.toLowerCase() !== 'permanent') {
                    const now = Date.now();
                    const timeMatch = durationInput.match(/^(\d+)([smhdw])$/i);
                    
                    if (!timeMatch) {
                        return await interaction.editReply({
                            content: '❌ صيغة المدة غير صحيحة. استخدم الصيغة: `7d` أو `24h` أو `permanent`'
                        });
                    }

                    const [, value, unit] = timeMatch;
                    const unitMs = {
                        's': 1000,
                        'm': 60 * 1000,
                        'h': 60 * 60 * 1000,
                        'd': 24 * 60 * 60 * 1000,
                        'w': 7 * 24 * 60 * 60 * 1000
                    }[unit.toLowerCase()];

                    expiresAt = now + (parseInt(value) * unitMs);
                }

                
                await new Promise((resolve, reject) => {
                    ticketDB.run(
                        `INSERT OR REPLACE INTO ticket_blacklist 
                        (userId, reasonType, duration, reason, addedBy, addedAt, expiresAt, isActive)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
                        [targetUser.id, 'violation', duration, reason, interaction.user.id, Date.now(), expiresAt],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });

                
                const auditChannel = interaction.guild.channels.cache.get('1410394429956820992');
                if (auditChannel) {
                    const auditEmbed = new MessageEmbed()
                        .setColor('#ff0000')
                        .setTitle('🚫 تم إضافة شخص إلى قائمة منع التذاكر')
                        .addFields(
                            { name: '👤 الشخص', value: `${targetUser} (${targetUser.id})`, inline: true },
                            { name: '⏱️ المدة', value: duration, inline: true },
                            { name: '📝 السبب', value: reason, inline: false },
                            { name: '👨‍💼 المسؤول', value: `${interaction.user} (${interaction.user.id})`, inline: true },
                            { name: '🕐 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                        )
                        .setTimestamp()
                        .setFooter({ text: `User ID: ${targetUser.id}` });
                    
                    await auditChannel.send({ embeds: [auditEmbed] });
                try { await axios.post(webhookBlacklist, { embeds: [auditEmbed] }).catch(() => {}); } catch (e) {}
                try { await axios.post(webhookBanUnban, { embeds: [auditEmbed] }).catch(() => {}); } catch (e) {}
                }

                
                const dmChannel = await interaction.client.users.fetch(targetUser.id).then(u => u.createDM());
                if (dmChannel) {
                    const dmEmbed = new MessageEmbed()
                        .setColor('#ff0000')
                        .setTitle('⛔ تم حظرك من فتح التذاكر')
                        .setDescription('لقد تم إضافتك إلى قائمة منع فتح التذاكر')
                        .addFields(
                            { name: '⏱️ المدة', value: duration === 'permanent' ? '🔴 أبدي' : duration, inline: true },
                            { name: '📝 السبب', value: reason, inline: false }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'نظام إدارة التذاكر' });
                    
                    await dmChannel.send({ embeds: [dmEmbed] }).catch(() => {});
                }

                return await interaction.editReply({
                    content: `✅ تم حظر ${targetUser} من فتح التذاكر لمدة **${duration}**`
                });

            } else if (action === 'unban') {
                
                await new Promise((resolve, reject) => {
                    ticketDB.run(
                        `UPDATE ticket_blacklist SET isActive = 0 WHERE userId = ?`,
                        [targetUser.id],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });

                
                const auditChannel = interaction.guild.channels.cache.get('1410394429956820992');
                if (auditChannel) {
                    const auditEmbed = new MessageEmbed()
                        .setColor('#00ff00')
                        .setTitle('✅ تم فك حظر شخص من قائمة منع التذاكر')
                        .addFields(
                            { name: '👤 الشخص', value: `${targetUser} (${targetUser.id})`, inline: true },
                            { name: '👨‍💼 المسؤول', value: `${interaction.user} (${interaction.user.id})`, inline: true },
                            { name: '🕐 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                        )
                        .setTimestamp()
                        .setFooter({ text: `User ID: ${targetUser.id}` });
                    
                    await auditChannel.send({ embeds: [auditEmbed] });
                try { await axios.post(webhookBlacklist, { embeds: [auditEmbed] }).catch(() => {}); } catch (e) {}
                try { await axios.post(webhookBanUnban, { embeds: [auditEmbed] }).catch(() => {}); } catch (e) {}
                }

                
                const dmChannel = await interaction.client.users.fetch(targetUser.id).then(u => u.createDM());
                if (dmChannel) {
                    const dmEmbed = new MessageEmbed()
                        .setColor('#00ff00')
                        .setTitle('✅ تم فك حظرك من فتح التذاكر')
                        .setDescription('أصبح بإمكانك فتح التذاكر مرة أخرى')
                        .setTimestamp()
                        .setFooter({ text: 'نظام إدارة التذاكر' });
                    
                    await dmChannel.send({ embeds: [dmEmbed] }).catch(() => {});
                }

                return await interaction.editReply({
                    content: `✅ تم فك حظر ${targetUser} من التذاكر`
                });
            }

        } catch (error) {
            console.error('Error in blacklisttickets command:', error);
            return await interaction.editReply({
                content: '❌ حدث خطأ أثناء معالجة الطلب'
            });
        }
    } else if (commandName === 'resetembed'){
        const resetRole = RESET_ROLE_ID; 
        if (!interaction.member.roles.cache.has(resetRole)) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });
        try {
            await resetAllStats();
            await buildAndUpdateStatsEmbed();
            await interaction.editReply({ content: '✅ تم إعادة تعيين الإحصائيات والرسالة بنجاح.' });
        } catch (err) {
            console.error('Error in resetembed command:', err);
            await interaction.editReply({ content: '❌ حدث خطأ أثناء إعادة التعيين.' });
        }

    } else if (commandName === 'resetadmin'){
        const resetRole = RESET_ROLE_ID; 
        if (!interaction.member.roles.cache.has(resetRole)) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('user');
        await interaction.deferReply({ ephemeral: true });
        try {
            await resetUserStats(targetUser.id);
            await interaction.editReply({ content: `✅ تم إعادة تعيين إحصائيات ${targetUser} بنجاح.` });
        } catch (err) {
            console.error('Error in resetadmin command:', err);
            await interaction.editReply({ content: '❌ حدث خطأ أثناء إعادة التعيين.' });
        }

    } else if (commandName === 'checkmytickets'){
        const statsRole = STATS_ROLE_ID; 
        if (!interaction.member.roles.cache.has(statsRole)) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });
        try {
            const stats = await getUserStats(interaction.user.id);
            const embed = new MessageEmbed()
                .setColor('#00CCFF')
                .setTitle('📊 إحصائيات التيكتات الخاصة بك')
                .setThumbnail(THUMBNAIL_GIF)
                .addFields(
                    { name: '📋 التذاكر المستلمة (اليوم)', value: `${stats.today_received}`, inline: true },
                    { name: '📋 التذاكر المستلمة (الإجمالي)', value: `${stats.total_received}`, inline: true },
                    { name: '💬 التفاعلات (اليوم)', value: `${stats.today_interactions}`, inline: true },
                    { name: '💬 التفاعلات (الإجمالي)', value: `${stats.total_interactions}`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'نظام إدارة التيكتات' });

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error('Error in checkmytickets command:', err);
            await interaction.editReply({ content: '❌ حدث خطأ أثناء جلب الإحصائيات.' });
        }

    } else if (commandName === 'banserial'){
        const roleId = '1410394014053699716';
        const member = interaction.member;
        if (member.roles.cache.has(roleId)) {
            const playerSerial = interaction.options.getString('serial');
            const banReason = interaction.options.getString('reason');
            const displayName = member.nickname || member.user.username;

            server.resources.handler.banSerial(playerSerial, displayName, banReason)
            .then(result => {
                interaction.reply({ content: result, ephemeral: false });
                const responsibleId = member.id
                embedSuccess(banLog, "Ban Log 🚫", result + "\n\n**Banned Serial: **``" + playerSerial + "``\n**Reason: **``" + banReason + "``", `<@${responsibleId}>`)
            })
            .catch(error => {
                interaction.reply({ content: 'حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true });
            });
        } else {
            return interaction.reply({ content: 'عذراً، ليس لديك الصلاحيات اللازمة لتنفيذ هذا الأمر', ephemeral: true });
        }
    } else if (commandName === 'banplayer'){
        const roleId = '1410394014053699716';
        const member = interaction.member;
        if (member.roles.cache.has(roleId)) {
            const playerID = interaction.options.getString('id');
            const banTime = interaction.options.getString('time');
            const banReason = interaction.options.getString('reason');
            const displayName = member.nickname || member.user.username;
            
            if (!isNaN(playerID) && !isNaN(banTime)) {
                server.resources.handler.banThePlayer(playerID, displayName, banReason, banTime)
                .then(result => {
                    interaction.reply({ content: result, ephemeral: false });
                    const responsibleId = member.id
                    embedSuccess(banLog, "Ban Log 🚫", result + "\n\n**Player ID: **``" + playerID + "``\n**Reason: **``" + banReason + "``\n**Ban Long:**``" + banTime + "``", `<@${responsibleId}>`)
                })
                .catch(error => {
                    interaction.reply({ content: 'حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true });
                    console.error(error);
                });
            } else {
                return interaction.reply({ content: 'يرجي التأكد من الأيدي ومدة البان انها أرقام وليست حروف', ephemeral: true });
            }
        } else {
            return interaction.reply({ content: 'عذراً، ليس لديك الصلاحيات اللازمة لتنفيذ هذا الأمر', ephemeral: true });
        }
    } else if (commandName === 'unbanserial'){
        const roleId = '1410394014053699716';
        const member = interaction.member;
        if (member.roles.cache.has(roleId)) {
            const playerSerial = interaction.options.getString('serial');
            const Reason = interaction.options.getString('reason');
            const displayName = member.nickname || member.user.username;
            
            server.resources.handler.unbanPlayer(playerSerial)
            .then(result => {
                interaction.reply({ content: result, ephemeral: false });
                const responsibleId = member.id
                embedSuccess(banLog, "Unban Log 🔓", result + "\n\n**Serial: **``" + playerSerial + "``\n**Reason: **``" + Reason + "``", `<@${responsibleId}>`)

                safeQuery('DELETE FROM bans WHERE serial = ?', [playerSerial], function(error, result) {
                    if (error) {
                        return interaction.reply({ content: 'حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true });
                    }
                    if (result.affectedRows > 0) {
                        const responseMessage = `تم إزالة الحظر عن السيريال من قاعدة البيانات ${playerSerial} بنجاح ✅`;
                        const responsibleId = member.id;
                        embedSuccess(banLog, "Unban Log 🔓", responseMessage + "\n\n**Serial: **``" + playerSerial + "``\n**Reason: **``" + Reason + "``", `<@${responsibleId}>`);
                    } else {
                        interaction.reply({ content: 'هذا السيريال غير موجود في قئمة الحظر الخاص بقاعدة بيانات السيرفر ❌', ephemeral: true });
                    }
                });
            })
            .catch(error => {
                interaction.reply({ content: 'حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true });
                console.error(error);
            });
        } else {
            return interaction.reply({ content: 'عذراً، ليس لديك الصلاحيات اللازمة لتنفيذ هذا الأمر', ephemeral: true });
        }
    } else if (commandName === 'find'){
        const roleId = '1410394033066475714';
        const member = interaction.member;
        if (member.roles.cache.has(roleId) || member.permissions.has('ADMINISTRATOR')) {
            const playerID = interaction.options.getString('input');
            server.resources.handler.getPlayerInfo(playerID)
            .then(result => {
                interaction.reply({ content: result, ephemeral: true });
            })
            .catch(error => {
                interaction.reply({ content: 'حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true });
                console.error(error);
            });
        } else {
            return interaction.reply({ content: 'عذراً، ليس لديك الصلاحيات اللازمة لتنفيذ هذا الأمر', ephemeral: true });
        }
    } else if (commandName === 'givevehicle'){
        const roleId = '1412844127648874598';
        const member = interaction.member;
        if (member.roles.cache.has(roleId)) {
            const playerId = interaction.options.getString('id');
            const vehicleModel = interaction.options.getString('model');
            const vehicleReason = interaction.options.getString('reason');
            const displayName = member.nickname || member.user.username;

            
            const playerIdInt = parseInt(playerId, 10);
            if (Number.isNaN(playerIdInt) || playerIdInt <= 0 || playerId !== String(playerIdInt)) {
                return interaction.reply({ content: 'يرجى إدخال معرف لاعب صحيح موجب.', ephemeral: true });
            }

            
            const vehicleModelInt = parseInt(vehicleModel, 10);
            if (Number.isNaN(vehicleModelInt) || vehicleModel !== String(vehicleModelInt)) {
                return interaction.reply({ content: 'يرجى إدخال نموذج مركبة صحيح موجب.', ephemeral: true });
            }

            server.resources.handler.makeVehicleForPlayer(playerId, vehicleModel, displayName)
            .then(result => {
                interaction.reply({ content: result, ephemeral: true });
                const responsibleId = member.id
                embedSuccess(vehiclesLog, "Vehicles Log 🚗", result + "\n\n**Vehicle Model: **``" + vehicleModel + "``\n**Player ID: **``" + playerId + "``\n**Reason: **``" + vehicleReason + "``", `<@${responsibleId}>`)
            })
            .catch(error => {
                interaction.reply({ content: 'حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true });
                console.error(error);
            });
        } else {
            return interaction.reply({ content: 'عذراً، ليس لديك الصلاحيات اللازمة لتنفيذ هذا الأمر', ephemeral: true });
        }
    } else if (commandName === 'restart'){
        const roleId = '1412844127648874598';
        const member = interaction.member;
        const responsibleId = member.id
        if (member.roles.cache.has(roleId)) {
            const timeInMinutes = interaction.options.getString('after');
            const restartReason = interaction.options.getString('reason');

            
            const timeInMinutesInt = parseInt(timeInMinutes, 10);
            
            if (Number.isNaN(timeInMinutesInt) || timeInMinutesInt <= 0 || timeInMinutes !== String(timeInMinutesInt)) {
                return interaction.reply({ content: 'يجى إدخال رقم صحيح للدقائق.', ephemeral: true });
            }

            server.resources.handler.restartServer(timeInMinutes)
            .then(result => {
                interaction.reply({ content: result, ephemeral: true });
                embedSuccess(restartLog, "Restart Log 🔄", result + "\n\n**Reason: **``" + restartReason + "``", `<@${responsibleId}>`)
            })
            .catch(error => {
                interaction.reply({ content: 'حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true });
                console.error(error);
            });
        } else {
            return interaction.reply({ content: 'عذراً، ليس لديك الصلاحيات اللازمة لتنفيذ هذا الأمر', ephemeral: true });
        }
    } else if (commandName === 'cancelrestart'){
        const roleId = '1412844127648874598';
        const member = interaction.member;
        if (member.roles.cache.has(roleId)) {
            server.resources.handler.cancelRestart()
            .then(result => {
                interaction.reply({ content: result, ephemeral: true });
                const responsibleId = member.id
                embedSuccess(restartLog, "Restart Log 🔄", result, `<@${responsibleId}>`)
            })
            .catch(error => {
                interaction.reply({ content: 'حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true });
                console.error(error);
            });
        } else {
            return interaction.reply({ content: 'عذراً، ليس لديك الصلاحيات اللازمة لتنفيذ هذا الأمر', ephemeral: true });
        }
    } else if (commandName === 'check') {
        const roleId = '1410394033066475714';
        const member = interaction.member;
        
        if (member.roles.cache.has(roleId) || member.permissions.has('ADMINISTRATOR')) {
            const input = interaction.options.getString('user');
            let searchQuery, searchParams;
            
            
            const mentionMatch = input.match(/^<@!?(\d+)>$/);
            const idMatch = input.match(/^\d+$/);
            
            if (mentionMatch) {
                
                searchQuery = "SELECT * FROM accounts WHERE discord = ?";
                searchParams = [mentionMatch[1]];
            } else if (idMatch && idMatch[0].length < 10) {
                
                searchQuery = "SELECT * FROM accounts WHERE id = ?";
                searchParams = [idMatch[0]];
            } else if (idMatch) {
                
                searchQuery = "SELECT * FROM accounts WHERE discord = ?";
                searchParams = [idMatch[0]];
            } else {
                
                searchQuery = "SELECT * FROM accounts WHERE username = ?";
                searchParams = [input];
            }
            
            
            safeQuery(searchQuery, searchParams, async (error, results) => {
                if (error) {
                    console.error('Error fetching account data:', error);
                    return interaction.reply({ 
                        content: 'حدث خطأ أثناء البحث في قاعدة البيانات.', 
                        ephemeral: true 
                    });
                }
                
                if (results.length === 0) {
                    return interaction.reply({ 
                        content: 'لم يتم العثور على أي معلومات للمستخدم المطلوب.', 
                        ephemeral: true 
                    });
                }
                
                const accountData = results[0];
                
                
                const discordMention = accountData.discord && accountData.discord !== "0" 
                    ? `<@${accountData.discord}>` 
                    : 'غير مرتبط';
                
                const usernameValue = accountData.username || 'غير متوفر';
                const idValue = accountData.id || 'غير متوفر';
                const emailValue = accountData.email || 'غير متوفر';
                const ipValue = accountData.ip || 'غير متوفر';
                const mtaserialValue = accountData.mtaserial || 'غير متوفر';
                const creditsValue = typeof accountData.credits === 'number' 
                    ? accountData.credits.toLocaleString() 
                    : 'غير متوفر';
                
                
                const embed = new MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle('Account Information')
                    .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                    .addFields(
                        { name: '👤 Username', value: `${usernameValue}`, inline: true },
                        { name: '🆔 ID', value: `${idValue}`, inline: true },
                        { name: '💰 VERG Points', value: `${creditsValue}`, inline: true },
                        { name: '💌 Email', value: `${emailValue}`, inline: true },
                        { name: '🔑 MTA Serial', value: `\`\`\`${mtaserialValue}\`\`\``, inline: false },
                        { name: '🌐 Last IP', value: `\`\`\`${ipValue}\`\`\``, inline: true },
                        { name: '🔗 Discord', value: discordMention, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ 
                        text: `Requested by: ${interaction.user.username}`, 
                        iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                    });
                
                
                safeQuery("SELECT id, charactername FROM characters WHERE account = ?", [accountData.id], async (charErr, characters) => {
                    if (charErr) {
                        console.error('Error fetching character data:', charErr);
                        
                        return await interaction.reply({ 
                            embeds: [embed], 
                            ephemeral: true 
                        });
                    }

                    if (characters && characters.length > 0) {
                        
                        const charactersInfo = characters.map(char => 
                            `• \`${char.id}\` | ${char.charactername}`
                        ).join('\n');
                        
                        embed.addFields({ name: '👥 Characters', value: charactersInfo, inline: false });
                        
                        
                        if (characters.length > 0) {
                            const options = characters.map(char => ({
                                label: char.charactername,
                                description: `Character ID: ${char.id}`,
                                value: char.id.toString()
                            }));
                            
                            const selectMenu = new MessageActionRow()
                                .addComponents(
                                    new MessageSelectMenu()
                                        .setCustomId(`character_details_${accountData.id}`)
                                        .setPlaceholder('Select a character to view details')
                                        .addOptions(options)
                                );
                            
                            
                            await interaction.reply({
                                embeds: [embed],
                                components: [selectMenu],
                                ephemeral: true
                            });
                        } else {
                            
                            await interaction.reply({
                                embeds: [embed],
                                ephemeral: true
                            });
                        }
                    } else {
                        
                        embed.addFields({ name: '👥 Characters', value: 'No characters found.', inline: false });
                        await interaction.reply({
                            embeds: [embed],
                            ephemeral: true
                        });
                    }
                });
            });
        } else {
            return interaction.reply({ 
                content: 'عذراً، ليس لديك الصلاحيات اللازمة لتنفيذ هذا الأمر', 
                ephemeral: true 
            });
        }
    } else if (commandName === 'sendtickets'){
        const user_id = '977915305135325224';
        const member = interaction.member;
        if (member.id === user_id) {
            interaction.reply({ content: 'تم إرسال القائمة بنجاح ✅', ephemeral: true });
            sendTickets(interaction.channel.id, interaction.guild);
        }
    } else if (commandName === 'createauction') {
        const roleId = '1415897810494160896';
        const member = interaction.member;
        if (member.roles.cache.has(roleId)) {
            const itemName = interaction.options.getString('name');
            const itemId = interaction.options.getString('id');
            const itemPicture = interaction.options.getAttachment('picture');
            const itemType = interaction.options.getString('type');
            const itemStartPrice = interaction.options.getString('start_price');
            const itemEndTime = interaction.options.getString('end_time');

            if (!itemName || !itemPicture || !itemType || !itemStartPrice || !itemEndTime || !itemId) {
                return interaction.reply({
                    content: '❌ يرجى ملء جميع الحقول المطلوبة',
                    ephemeral: true
                });
            }

            if (isNaN(itemStartPrice) || isNaN(itemEndTime)) {
                return interaction.reply({
                    content: '❌ يجب أن تكون الأسعار والوقت أرقاماً صحيحة',
                    ephemeral: true
                });
            }

            try {
                
                const auctionId = Date.now().toString();
                
                
                const auctionEmbed = new MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle(`🏷️ مزاد علي العنصر: ${itemName}`)
                    .addFields(
                        { name: '**السعر المبدأي للمزايدة :**', value: new Intl.NumberFormat('en-US', {
                            style: 'decimal',
                            maximumFractionDigits: 0,
                            minimumFractionDigits: 0
                        }).format(parseInt(itemStartPrice)) + ' $', inline: true },
                        { name: '**المزاد ينتهي بعد :**', value: `<t:${Math.floor(Date.now()/1000) + (parseInt(itemEndTime) * 60)}:R>`, inline: true }
                    )
                    .setImage(itemPicture.url)
                    .setTimestamp()
                    .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                    .setFooter({ 
                        text: `Auction`, 
                        iconURL: interaction.guild.iconURL({ dynamic: true }) 
                    });

                const auctionButtons = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId(`bid_${auctionId}`)
                            .setLabel('المزايدة علي الغرض')
                            .setStyle('PRIMARY')
                            .setEmoji('<:verg4:1435358368779866182>'),
                        new MessageButton()
                            .setCustomId(`top_${auctionId}`)
                            .setLabel('المتصدرين في المزاد')
                            .setStyle('SECONDARY')
                            .setEmoji('<:verg6:1435358463776526397>'),
                        new MessageButton()
                            .setCustomId(`deposit_${auctionId}`)
                            .setLabel('إيداع رصيد من اللعبه الي بنك النظام')
                            .setStyle('SUCCESS')
                            .setEmoji('<:verg:1435358249833463858>'),
                        new MessageButton()
                            .setCustomId(`withdraw_${auctionId}`)
                            .setLabel('سحب الرصيد من بنك النظام الي اللعبه')
                            .setStyle('DANGER')
                            .setEmoji('<:verg5:1435358403571617974>')
                    );

                
                const auctionData = {
                    id: itemId,
                    itemName: itemName,
                    itemType: itemType,
                    startPrice: parseInt(itemStartPrice),
                    currentBid: 0,
                    highestBidder: null,
                    channelId: interaction.channel.id,
                    endTime: Date.now() + (parseInt(itemEndTime) * 60 * 1000),
                    bids: [],
                    status: 'active'
                };

                
                const auctionMessage = await interaction.channel.send({
                    embeds: [auctionEmbed],
                    components: [auctionButtons]
                });

                
                auctionData.messageId = auctionMessage.id;
                
                
                activeAuctions.set(auctionId, auctionData);
                await saveAuctionToDatabase(auctionData);

                
                setTimeout(() => endAuction(auctionId), parseInt(itemEndTime) * 60 * 1000);

                await interaction.reply({
                    content: `<:verg3:1435358337289162834> تم إنشاء المزاد بنجاح! ID: ${auctionId}`,
                    ephemeral: true
                });

            } catch (error) {
                console.error('Error creating auction:', error);
                await interaction.reply({
                    content: '❌ حدث خطأ أثناء إنشاء المزاد',
                    ephemeral: true
                });
            }
        } else {
            return interaction.reply({ 
                content: 'عذراً، ليس لديك الصلاحيات اللازمة لتنفيذ هذا الأمر', 
                ephemeral: true 
            });
        }
    }
});


function sendTickets(channelId, guild) {
    const embed = new MessageEmbed()
        .setColor('#FFD700')
        .setAuthor({ 
            name: 'نظام التذاكر - VERG Roleplay', 
            iconURL: guild.iconURL({ dynamic: true })
        })
        .setDescription(`
            مرحباً بك في نظام التذاكر الخاص بـ **VERG Roleplay** 👋
            
            > يمكنك من خلال هذا النظام التواصل مع فريق الإدارة لحل مشكلتك
            > يرجى اختيار نوع التذكرة المناسب من القائمة أدناه
            
            **ملاحظات هامة:**
            \`•\` يرجى اختيار النوع المناسب للتذكرة
            \`•\` كن واضحاً في شرح مشكلتك
            \`•\` احترم قوانين السيرفر
            \`•\` لا تقوم بإزعاج الادارة بالمنشن، سوف يتم التواصل معك وحل مشكلتك في اسرع وقت
        `)
        .setImage('https://files.catbox.moe/xds8lg.gif')
        .setThumbnail('https://files.catbox.moe/xds8lg.gif')
        .setTimestamp()
        .setFooter({ 
            text: 'VERG Roleplay • Ticket System', 
            iconURL: guild.iconURL({ dynamic: true })
        });

    const row = new MessageActionRow()
        .addComponents(
            new MessageSelectMenu()
                .setCustomId('ticket_type')
                .setPlaceholder('📩 اختر نوع التذكرة من هنا')
                .addOptions([
                    {
                        label: TICKET_TYPES.REPORT.label,
                        description: TICKET_TYPES.REPORT.description,
                        value: TICKET_TYPES.REPORT.id,
                        emoji: TICKET_TYPES.REPORT.emoji
                    },
                    {
                        label: TICKET_TYPES.TECHNICALPROBLEM.label,
                        description: TICKET_TYPES.TECHNICALPROBLEM.description,
                        value: TICKET_TYPES.TECHNICALPROBLEM.id,
                        emoji: TICKET_TYPES.TECHNICALPROBLEM.emoji
                    },
                    {
                        label: TICKET_TYPES.COMPLAINT.label,
                        description: TICKET_TYPES.COMPLAINT.description,
                        value: TICKET_TYPES.COMPLAINT.id,
                        emoji: TICKET_TYPES.COMPLAINT.emoji
                    },
                    {
                        label: TICKET_TYPES.TAZLOM.label,
                        description: TICKET_TYPES.TAZLOM.description,
                        value: TICKET_TYPES.TAZLOM.id,
                        emoji: TICKET_TYPES.TAZLOM.emoji
                    },
                    {
                        label: TICKET_TYPES.REFUND.label,
                        description: TICKET_TYPES.REFUND.description,
                        value: TICKET_TYPES.REFUND.id,
                        emoji: TICKET_TYPES.REFUND.emoji
                    },
                    {
                        label: TICKET_TYPES.WEBSITE.label,
                        description: TICKET_TYPES.WEBSITE.description,
                        value: TICKET_TYPES.WEBSITE.id,
                        emoji: TICKET_TYPES.WEBSITE.emoji
                    },
                    {
                        label: TICKET_TYPES.ASKING.label,
                        description: TICKET_TYPES.ASKING.description,
                        value: TICKET_TYPES.ASKING.id,
                        emoji: TICKET_TYPES.ASKING.emoji
                    },
                    {
                        label: TICKET_TYPES.POLICE.label,
                        description: TICKET_TYPES.POLICE.description,
                        value: TICKET_TYPES.POLICE.id,
                        emoji: TICKET_TYPES.POLICE.emoji
                    },
                    {
                        label: TICKET_TYPES.HOSPITAL.label,
                        description: TICKET_TYPES.HOSPITAL.description,
                        value: TICKET_TYPES.HOSPITAL.id,
                        emoji: TICKET_TYPES.HOSPITAL.emoji
                    },
                    {
                        label: TICKET_TYPES.MECHANIC.label,
                        description: TICKET_TYPES.MECHANIC.description,
                        value: TICKET_TYPES.MECHANIC.id,
                        emoji: TICKET_TYPES.MECHANIC.emoji
                    },
                    {
                        label: TICKET_TYPES.CUSTOMS.label,
                        description: TICKET_TYPES.CUSTOMS.description,
                        value: TICKET_TYPES.CUSTOMS.id,
                        emoji: TICKET_TYPES.CUSTOMS.emoji
                    }
                ])
                .setMinValues(1)
                .setMaxValues(1)
        );

    karizma.channels.cache.get(channelId).send({ 
        embeds: [embed], 
        components: [row] 
    });
}


const TICKET_MODERATOR_ROLE_IDS = ['1412844127648874598', '1410430798925926451'];

function isTicketModerator(member) {
    try {
        return TICKET_MODERATOR_ROLE_IDS.some(rid => member.roles.cache.has(rid));
    } catch (e) {
        return false;
    }
}


function hasExplicitChannelAccess(member, channel) {
    try {
        if (!channel || !channel.permissionOverwrites) return false;

        
        const memberOverwrite = channel.permissionOverwrites.cache.get(member.id);
        if (memberOverwrite) {
            const allow = memberOverwrite.allow;
            if (allow && (allow.has('VIEW_CHANNEL') || allow.has('SEND_MESSAGES'))) return true;
        }

        
        for (const [roleId, role] of member.roles.cache) {
            const ow = channel.permissionOverwrites.cache.get(roleId);
            if (ow) {
                const allow = ow.allow;
                if (allow && (allow.has('VIEW_CHANNEL') || allow.has('SEND_MESSAGES'))) return true;
            }
        }

        return false;
    } catch (e) {
        return false;
    }
}


async function createTicketChannel(interaction, ticketType) {
    try {
        const type = ticketType.toUpperCase();
        const staffRoleId = TICKET_TYPES[type].staffRoleId;
        
        
        const ticketNumber = await getNextTicketNumber(type);
        
        
        const ticketLabel = TICKET_TYPES[type].label;
        const formattedNumber = ticketNumber.toString().padStart(4, '0'); 
        const channelName = `${ticketLabel}-${formattedNumber}`;
        
        
        const safeChannelName = channelName
            .replace(/[^a-zA-Z0-9\u0600-\u06FF-]/g, '-') 
            .toLowerCase();
        
        const channel = await interaction.guild.channels.create(safeChannelName, {
            type: 'GUILD_TEXT',
            parent: TICKET_TYPES[type].categoryId,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: interaction.user.id,
                    allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'ATTACH_FILES'],
                },
                {
                    id: staffRoleId,
                    allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'ATTACH_FILES'],
                },
                {
                    id: '1412844127648874598',
                    allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'ATTACH_FILES'],
                },
                {
                    id: '1410430798925926451',
                    allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'ATTACH_FILES'],
                }
            ]
        });

        
        await channel.setTopic(`${ticketLabel} - تذكرة رقم ${formattedNumber}`);

        
        const ticketInfo = {
            ownerId: interaction.user.id,
            ownerUsername: interaction.user.username,
            ticketType: type,
            createdAt: Date.now(),
            status: 'open',
            claimedBy: null,
            ticketNumber: ticketNumber 
        };

        
        ticketData.set(channel.id, ticketInfo);

        return { channel, ticketInfo };
    } catch (error) {
        console.error('Error creating ticket channel:', error);
        throw error;
    }
}


karizma.on('interactionCreate', async interaction => {
    if (!interaction.isSelectMenu()) return;

    if (interaction.customId === 'ticket_type') {
        try {
            const hasTicket = await ticketDBManager.hasOpenTicket(interaction.user.id);
            if (hasTicket) {
                return await interaction.reply({
                    content: '❌ لديك تذكرة مفتوحة بالفعل. يرجى إغلاق التذكرة الحالية قبل فتح تذكرة جديدة.',
                    ephemeral: true
                });
            }

            
            try {
                const blockRoleId = '1410402264765693983';
                if (interaction.member && interaction.member.roles && interaction.member.roles.cache.has(blockRoleId)) {
                    
                    const auditChannel = interaction.guild.channels.cache.get('1410394429956820992');
                    if (auditChannel) {
                        const attemptEmbed = new MessageEmbed()
                            .setColor('#ff9900')
                            .setTitle('⛔ محاولة فتح تذكرة - ممنوع بالدور')
                            .addFields(
                                { name: '👤 المستخدم', value: `${interaction.user} (${interaction.user.id})`, inline: true },
                                { name: '🛑 الدور', value: `<@&${blockRoleId}> (${blockRoleId})`, inline: true },
                                { name: '⏰ الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                            )
                            .setTimestamp();
                        auditChannel.send({ embeds: [attemptEmbed] }).catch(() => {});
                    }

                    return await interaction.reply({
                        content: '❌ لا يمكنك فتح التذاكر لأن لديك دورًا ممنوعًا من فتح التذاكر.',
                        ephemeral: true
                    });
                }
            } catch (roleCheckError) {
                console.error('Error checking block role for ticket open:', roleCheckError);
                
            }

            
            const isBlacklisted = await new Promise((resolve, reject) => {
                ticketDB.get(
                    `SELECT * FROM ticket_blacklist WHERE userId = ? AND isActive = 1`,
                    [interaction.user.id],
                    (err, row) => {
                        if (err) {
                            console.error('Error checking ticket blacklist:', err);
                            resolve(false);
                        } else {
                            if (row) {
                                
                                if (row.expiresAt && Date.now() > row.expiresAt) {
                                    
                                    ticketDB.run(
                                        `UPDATE ticket_blacklist SET isActive = 0 WHERE userId = ?`,
                                        [interaction.user.id],
                                        (err) => {
                                            if (err) console.error('Error updating blacklist:', err);
                                        }
                                    );
                                    resolve(false);
                                } else {
                                    resolve(true);
                                }
                            } else {
                                resolve(false);
                            }
                        }
                    }
                );
            });

            if (isBlacklisted) {
                
                const blacklistInfo = await new Promise((resolve, reject) => {
                    ticketDB.get(
                        `SELECT * FROM ticket_blacklist WHERE userId = ? AND isActive = 1`,
                        [interaction.user.id],
                        (err, row) => {
                            if (err) {
                                console.error('Error fetching blacklist info:', err);
                                resolve(null);
                            } else {
                                resolve(row);
                            }
                        }
                    );
                });

                const durationText = blacklistInfo.duration === 'permanent' 
                    ? '⏱️ مدة الحظر: **أبدي 🔴**' 
                    : `⏱️ مدة الحظر: **${blacklistInfo.duration}**`;

                const blockEmbed = new MessageEmbed()
                    .setColor('#ff0000')
                    .setTitle('⛔ تم حظرك من فتح التذاكر')
                    .setDescription('أنت مضاف في قائمة منع فتح التذاكر ولا يمكنك فتح تذاكر جديدة حالياً')
                    .addFields(
                        { name: '📝 السبب', value: blacklistInfo.reason || 'لم يتم تحديد السبب', inline: false },
                        { name: durationText.split(':')[0], value: durationText.split(':')[1], inline: false }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'نظام إدارة التذاكر' });

                return await interaction.reply({
                    embeds: [blockEmbed],
                    ephemeral: true
                });
            }

            const selectedType = interaction.values[0].toUpperCase();
            if (!TICKET_TYPES[selectedType]) {
                return await interaction.reply({
                    content: '❌ نوع التذكرة غير صالح',
                    ephemeral: true
                });
            }

            const ticketType = TICKET_TYPES[selectedType];
            const modal = new Modal()
                .setCustomId(`ticket_modal_${selectedType}`)
                .setTitle('فتح تذكرة جديدة');

            const rows = ticketType.inputs.map(input => {
                const textInput = new TextInputComponent()
                    .setCustomId(input.id)
                    .setLabel(input.label)
                    .setStyle(input.style)
                    .setRequired(input.required);

                return new MessageActionRow().addComponents(textInput);
            });

            modal.addComponents(...rows);
            await interaction.showModal(modal);

        } catch (error) {
            console.error('Error handling ticket creation:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ حدث خطأ أثناء محاولة إنشاء التذكرة',
                    ephemeral: true
                }).catch(console.error);
            }
        }
    }
});


karizma.on('interactionCreate', async interaction => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId.startsWith('ticket_modal_')) {
        
        const userId = interaction.user.id;
        if (pendingTicketCreations.has(userId)) {
            return interaction.reply({ content: '⏳ جاري إنشاء تذكرتك. يرجى الانتظار قليلاً قبل المحاولة مرة أخرى.', ephemeral: true });
        }

        
        await interaction.deferReply({ ephemeral: true }).catch(() => {});

        pendingTicketCreations.set(userId, true);
        try {
            const ticketType = interaction.customId.split('_')[2];
            const staffRoleId = TICKET_TYPES[ticketType].staffRoleId;

            
            const { channel, ticketInfo } = await createTicketChannel(interaction, ticketType);

            
            ticketInfo.status = 'open';
            ticketInfo.claimedBy = null;
            ticketInfo.createdAt = Date.now();
            ticketData.set(channel.id, ticketInfo);
            
            ticketDBManager.saveTicket(channel.id, ticketInfo).catch(err => console.error('DB save error:', err));

            
            const buttons = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('claim_ticket')
                        .setLabel('استلام التذكرة')
                        .setStyle('SUCCESS')
                        .setEmoji('✋'),
                    new MessageButton()
                        .setCustomId('close_ticket')
                        .setLabel('إغلاق التذكرة')
                        .setStyle('DANGER')
                        .setEmoji('🔒')
                    ,
                    new MessageButton()
                        .setCustomId('rename_ticket')
                        .setLabel('تغيير اسم التذكرة')
                        .setStyle('PRIMARY')
                        .setEmoji('✏️'),
                    new MessageButton()
                        .setCustomId('add_member_ticket')
                        .setLabel('إضافة عضو')
                        .setStyle('SECONDARY')
                        .setEmoji('➕')
                );

            
            const embed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('🎫 تذكرة جديدة')
                .addFields([
                    { 
                        name: '📝 نوع التذكرة',
                        value: TICKET_TYPES[ticketType].label,
                        inline: true
                    },
                    {
                        name: '⏰ وقت الإنشاء',
                        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                        inline: true
                    },
                    { name: '\u200B', value: '\u200B', inline: true }, 
                    
                    ...TICKET_TYPES[ticketType].inputs.map(input => ({
                        name: `${getInputEmoji(input.id)} ${input.label}`,
                        value: `\`\`\`${interaction.fields.getTextInputValue(input.id) || 'لم يتم التحديد'}\`\`\``,
                        inline: input.style === 'SHORT'
                    }))
                ])
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ 
                    text: 'نظام التذاكر - VERG',
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTimestamp();

            await channel.send({ 
                content: [
                    `تم إنشاء تذكرة جديدة 🎫`,
                    `صاحب التذكرة: ${interaction.user} 👤`,
                    `برجاء التحلي بالصبر وعدم منشن أي إداري وسيتم التعامل مع مشكلتك في اسرع وقت ⌛\n`,
                    `||<@&${staffRoleId}>||`,
                ].join('\n'),
                embeds: [embed], 
                components: [buttons] 
            });

            
            const auditChannelId = '1410394429956820992';
            const auditChannel = interaction.guild.channels.cache.get(auditChannelId);
            if (auditChannel) {
                const auditEmbed = new MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle('📩 تم استقبال تذكرة جديدة')
                    .addFields(
                        { name: '🎫 رقم التذكرة', value: channel.name, inline: true },
                        { name: '📝 نوع التذكرة', value: TICKET_TYPES[ticketType].label, inline: true },
                        { name: '👤 من', value: `${interaction.user} (${interaction.user.id})`, inline: true },
                        { name: '🔗 الرابط', value: `[اذهب للتذكرة](https://discord.com/channels/${interaction.guild.id}/${channel.id})`, inline: true },
                        { name: '⏰ الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'نظام سجل التذاكر' });
                
                await auditChannel.send({ embeds: [auditEmbed] }).catch(err => console.error('Error sending audit log:', err));
                
                try { await axios.post(webhookTicketsOnly, { embeds: [auditEmbed] }).catch(() => {}); } catch (e) {}
            }

            
            await interaction.editReply({
                content: `✅ تم إنشاء تذكرتك بنجاح! ${channel}`
            });

        } catch (error) {
            console.error('Error creating ticket:', error);
            try {
                await interaction.editReply({
                    content: '❌ حدث خطأ أثناء إنشاء التذكرة'
                }).catch(console.error);
            } catch (replyErr) {
                console.error('Error sending error reply:', replyErr);
            }
        } finally {
            
            try { pendingTicketCreations.delete(userId); } catch (e) {  }
        }
    }
});




async function saveTicketToDatabase(channelId, ticketInfo) {
    return new Promise((resolve, reject) => {
        
        ticketDB.all("PRAGMA table_info(tickets)", [], (err, rows) => {
            if (err) {
                console.error('Error checking table schema:', err);
                reject(err);
                return;
            }
            
            
            let hasTicketNumberColumn = false;
            if (rows && Array.isArray(rows)) {
                hasTicketNumberColumn = rows.some(row => row.name === 'ticketNumber');
            }
            
            
            if (!hasTicketNumberColumn) {
                ticketDB.run("ALTER TABLE tickets ADD COLUMN ticketNumber INTEGER", [], (alterErr) => {
                    if (alterErr) {
                        console.error('Error adding ticketNumber column:', alterErr);
                        
                    }
                    
                    
                    insertTicketData();
                });
            } else {
                
                insertTicketData();
            }
        });
        
        
        function insertTicketData() {
        const query = `
            INSERT OR REPLACE INTO tickets 
                (channelId, ownerId, ownerUsername, ticketType, createdAt, status, claimedBy, closedBy, closedAt, closeReason, ticketNumber)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        ticketDB.run(query, [
            channelId,
            ticketInfo.ownerId,
            ticketInfo.ownerUsername,
            ticketInfo.ticketType,
            ticketInfo.createdAt,
            ticketInfo.status,
            ticketInfo.claimedBy || null,
            ticketInfo.closedBy || null,
            ticketInfo.closedAt || null,
                ticketInfo.closeReason || null,
                ticketInfo.ticketNumber || null
        ], (err) => {
            if (err) {
                console.error('Error saving ticket to database:', err);
                reject(err);
                return;
            }
            resolve();
        });
        }
    });
}


async function restoreTicketMessages() {
    try {
        const tickets = Array.from(ticketData.entries());
        for (const [channelId, ticketInfo] of tickets) {
            const channel = await karizma.channels.fetch(channelId).catch(() => null);
            if (!channel) {
                
                console.log(`Removing non-existent ticket channel: ${channelId}`);
                await deleteTicketFromDatabase(channelId);
                ticketData.delete(channelId);
                continue;
            }

            
            const buttons = new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId('claim_ticket')
                    .setLabel('استلام التذكرة')
                    .setStyle('SUCCESS')
                    .setEmoji('✋')
                    .setDisabled(ticketInfo.status !== 'open'),
                new MessageButton()
                    .setCustomId('close_ticket')
                    .setLabel('إغلاق التذكرة')
                    .setStyle('DANGER')
                    .setEmoji('🔒')
                    .setDisabled(ticketInfo.status === 'closed'),
                new MessageButton()
                    .setCustomId('delete_ticket')
                    .setLabel('حذف التذكرة')
                    .setStyle('DANGER')
                    .setEmoji('⛔')
                    .setDisabled(ticketInfo.status !== 'closed')
            );

            
            const messages = await channel.messages.fetch({ limit: 100 });
            const firstMessage = messages.last();
            if (firstMessage) {
                await firstMessage.edit({ components: [buttons] }).catch(console.error);
            }
        }
        console.log('Ticket messages and buttons restored successfully');
    } catch (error) {
        console.error('Error restoring ticket messages:', error);
    }
}


async function hasOpenTicket(userId) {
        return new Promise((resolve, reject) => {
        
        ticketDB.get(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='tickets'",
            [],
            (err, table) => {
                if (err) {
                    console.error('Error checking table existence:', err);
                    resolve(false);
                    return;
                }

                
                if (!table) {
                    resolve(false);
                    return;
                }

                
                ticketDB.all(
                    'SELECT * FROM tickets WHERE ownerId = ? AND status IN ("open", "claimed", "")',
                [userId],
                    async (err, rows) => {
                    if (err) {
                            console.error('Error checking open tickets:', err);
                            resolve(false);
                        return;
                    }
                        
                        if (!rows || rows.length === 0) {
                            
                            console.log(`لا توجد تذاكر مفتوحة للمستخدم: ${userId}`);
                            resolve(false);
                            return;
                        }
                        
                        
                        let hasReallyOpenTickets = false;
                        let invalidTickets = [];
                        
                        for (const ticket of rows) {
                            
                            try {
                                const channel = await karizma.channels.fetch(ticket.channelId).catch(() => null);
                                if (channel) {
                                    
                                    hasReallyOpenTickets = true;
                                    console.log(`المستخدم ${userId} لديه تذكرة مفتوحة في القناة: ${channel.name} (${channel.id})`);
                                } else {
                                    
                                    invalidTickets.push(ticket.channelId);
                                    console.log(`قناة التذكرة غير موجودة للمستخدم ${userId}: ${ticket.channelId} - سيتم حذفها من قاعدة البيانات`);
                                }
    } catch (error) {
                                console.error(`Error fetching channel for ticket: ${ticket.channelId}`, error);
                                
                                invalidTickets.push(ticket.channelId);
                            }
                        }
                        
                        
                        if (invalidTickets.length > 0) {
                            console.log(`حذف ${invalidTickets.length} تذاكر غير صالحة للمستخدم ${userId}`);
                            for (const channelId of invalidTickets) {
                                
                                ticketData.delete(channelId);
                                
                                
                                await new Promise((resolveDelete) => {
                                    ticketDB.run('DELETE FROM tickets WHERE channelId = ?', [channelId], function(err) {
                                        if (err) {
                                            console.error(`خطأ في حذف التذكرة غير الصالحة: ${channelId}`, err);
                                        } else {
                                            console.log(`تم حذف التذكرة غير الصالحة: ${channelId} (${this.changes} صفوف متأثرة)`);
                                        }
                                        resolveDelete();
                                    });
                                });
                            }
                        }
                        
                        
                        resolve(hasReallyOpenTickets);
                    }
                );
            }
        );
    });
}

function abbreviateNumber(value) {
    var newValue = value;
    if (value >= 1000) {
        var suffixes = ["", "K", "M", "B", "T"];
        var suffixNum = Math.floor( (""+value).length/3 );
        var shortValue = '';
        for (var precision = 2; precision >= 1; precision--) {
            shortValue = parseFloat( (suffixNum != 0 ? (value / Math.pow(1000,suffixNum) ) : value).toPrecision(precision));
            var dotLessShortValue = (shortValue + '').replace(/[^a-zA-Z 0-9]+/g,'');
            if (dotLessShortValue.length <= 2) { break; }
        }
        if (shortValue % 1 != 0)  shortValue = shortValue.toFixed(1);
        newValue = shortValue+suffixes[suffixNum];
    }
    return newValue;
}

function getGender(gender) {
    if (gender == 0) {
        return 'Male';
    } else if (gender == 1) {
        return 'Female';
    } else {
        return 'Are you gay ?';
    }
}

function embedError(error) {
    if (!error) return 'Embed missing!';
    const embed = new MessageEmbed()
        .setColor("RED")
        .setTitle(error);
    return embed;
}

async function embedSuccess(webhookUrl, name, text, responsible) {
    if (!text) return 'Embed missing!';
    const embed = new MessageEmbed()
        .setColor("GREEN")
        .setTitle(name)
        .setDescription(text)
        .addFields({ name: 'Admin: ', value: responsible || "Unkown#000", inline: true })
        .setTimestamp();

    const payload = {
        embeds: [embed],
    };

    try {
        await axios.post(webhookUrl, payload);
        return 'Message sent successfully!';
    } catch (error) {
        return 'Failed to send message!';
    }
}
function randomIntFromInterval(min, max) { 
    return Math.floor(Math.random() * (max - min + 1) + min);
}

process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error);

    const errorChannel = karizma.channels.cache.get("1412510460162478090");
    if (errorChannel) {
        await errorChannel.send(` **Uncaught Exception** 🚨\n\`\`\`${error.message}\`\`\``);
    }
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);

    const errorChannel = karizma.channels.cache.get("1412510460162478090");
    if (errorChannel) {
        await errorChannel.send(`🚨 **Unhandled Rejection** 🚨\n\`\`\`${reason}\`\`\``);
    }
});


karizma.on('messageCreate', async message => {
    try {
        if (!message || message.author.bot) return;

        
        if (!message.reference) return;
        if (!message.mentions || !message.mentions.users.has(karizma.user.id)) return;

        
        const REQUIRED_ROLE = '1423691965869985923';
        if (!message.member || !message.member.roles || !message.member.roles.cache.has(REQUIRED_ROLE)) {
            return message.reply({ content: '❌ ليس لديك صلاحية استخدام هذا الأمر.', ephemeral: false });
        }

        const argsLower = (message.content || '').toLowerCase();

        
        const ref = message.reference;
        const refChannel = await karizma.channels.fetch(ref.channelId).catch(() => null);
        if (!refChannel) return message.reply('⚠️ لم أتمكن من العثور على قناة الرسالة المرجعية.');
        const replied = await refChannel.messages.fetch(ref.messageId).catch(() => null);
        if (!replied) return message.reply('⚠️ لم أتمكن من جلب الرسالة المرجعية.');

        
        const embed = new MessageEmbed()
            .setAuthor({ name: 'VERG RolePlay', iconURL: 'https://files.catbox.moe/xds8lg.gif' })
            .setThumbnail('https://files.catbox.moe/xds8lg.gif')
            .setDescription(replied.content || '‎')
            .setTimestamp()
            .setFooter({ text: 'VERG RolePlay' });

        
        if (replied.attachments && replied.attachments.size > 0) {
            embed.setImage(replied.attachments.first().url);
        } else if (replied.embeds && replied.embeds.length > 0 && replied.embeds[0].image) {
            embed.setImage(replied.embeds[0].image.url);
        }

        
        
        
        const isToAll = argsLower.includes('للكل') || argsLower.includes('للجميع') || argsLower.includes('الكل');
        const isSend = argsLower.includes('ابعتها') || argsLower.includes('ابعت') || argsLower.includes('ابعته');

        const targetMentions = message.mentions.users.filter(u => u.id !== karizma.user.id);

        if (isToAll) {
            
            const statusMsg = await message.reply('⏳ جاري تنفيذ العملية... سيتم إرسال الرسائل بأمان، ستتلقى إشعارًا عند الانتهاء.');

            
            const fetched = await message.guild.members.fetch().catch(e => { console.error('fetch members failed', e); return null; });
            if (!fetched) return message.reply('⚠️ لم أتمكن من جلب أعضاء السيرفر لإرسال الرسائل الخاصة. تأكد من أن البوت يمتلك صلاحية مشاهدة الأعضاء أو أن Intents صحيحة.');

            
            const members = Array.from(fetched.values()).filter(m => m.user && !m.user.bot);
            const batchSize = 20; 
            const delayMs = 1000; 
            let sent = 0;
            for (let i = 0; i < members.length; i += batchSize) {
                const batch = members.slice(i, i + batchSize);
                await Promise.allSettled(batch.map(async member => {
                    try {
                        await member.send({ embeds: [embed] }).catch(() => {});
                        sent++;
                    } catch (e) {  }
                }));
                await new Promise(r => setTimeout(r, delayMs));
            }

            try { await statusMsg.edit(`✅ تم إرسال الرسالة الخاصّة إلى ${sent} عضوًا.`); } catch (e) {  }

            
            try {
                const logEmbed = new MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle('📣 Broadcast Sent')
                    .addFields(
                        { name: 'By', value: `${message.author.tag} (${message.author.id})`, inline: true },
                        { name: 'Target', value: `Server-wide (${message.guild.id})`, inline: true },
                        { name: 'Recipients', value: `${sent}`, inline: true }
                    )
                    .setTimestamp();
                await axios.post(webhookBroadcast, { embeds: [logEmbed] }).catch(() => {});
            } catch (e) {  }
            return;
        }

        if (isSend) {
            
            const mentionedRoles = message.mentions.roles;
            if (mentionedRoles && mentionedRoles.size > 0) {
                const statusMsg = await message.reply('⏳ جاري تنفيذ العملية... سيتم إرسال الرسائل لأعضاء الرول المذكور.');
                const fetched = await message.guild.members.fetch().catch(e => { console.error('fetch members failed', e); return null; });
                if (!fetched) return message.reply('⚠️ لا يمكن جلب أعضاء السيرفر الآن.');

                let totalSent = 0;
                for (const [roleId, role] of mentionedRoles) {
                    
                    const members = Array.from(fetched.values()).filter(m => m.roles.cache.has(roleId) && !m.user.bot);
                    const batchSize = 20;
                    for (let i = 0; i < members.length; i += batchSize) {
                        const batch = members.slice(i, i + batchSize);
                        await Promise.allSettled(batch.map(async member => {
                            try { await member.send({ embeds: [embed] }).catch(() => {}); totalSent++; } catch (e) {}
                        }));
                        await new Promise(r => setTimeout(r, 800));
                    }
                }
                try { await statusMsg.edit(`✅ تم إرسال الرسائل إلى ${totalSent} مستخدمًا من الرول المذكور.`); } catch(e){}
                
                try {
                    const logEmbed = new MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle('📣 Broadcast Sent to Role')
                        .addFields(
                            { name: 'By', value: `${message.author.tag} (${message.author.id})`, inline: true },
                            { name: 'Guild', value: `${message.guild.id}`, inline: true },
                            { name: 'Recipients', value: `${totalSent}`, inline: true }
                        )
                        .setTimestamp();
                    await axios.post(webhookBroadcast, { embeds: [logEmbed] }).catch(() => {});
                } catch (e) {}
                return;
            }

            
            if (targetMentions.size > 0) {
                const statusMsg = await message.reply('⏳ جاري تنفيذ العملية... يتم إرسال الرسائل للمستخدمين المذكورين.');
                const results = [];
                for (const [id, user] of targetMentions) {
                    try {
                        await user.send({ embeds: [embed] }).catch(() => {});
                        results.push({ id, ok: true });
                    } catch (e) {
                        results.push({ id, ok: false });
                    }
                }
                const okCount = results.filter(r => r.ok).length;
                try { await statusMsg.edit(`✅ تم إرسال الرسالة إلى ${okCount} مستخدمًا.`); } catch (e) {}
                
                try {
                    const logEmbed = new MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle('📣 Broadcast Sent to Mentions')
                        .addFields(
                            { name: 'By', value: `${message.author.tag} (${message.author.id})`, inline: true },
                            { name: 'Guild', value: `${message.guild.id}`, inline: true },
                            { name: 'Recipients', value: `${okCount}`, inline: true }
                        )
                        .setTimestamp();
                    await axios.post(webhookBroadcast, { embeds: [logEmbed] }).catch(() => {});
                } catch (e) {}
                return;
            }
        }

        
        await message.channel.send({ embeds: [embed] });
        await message.reply({ content: '✅ تم إرسال الإيمبيد بالنسخة العامة في القناة.' });
        try { await axios.post(adminLog, { content: `${message.author.tag} نشر إيمبيد في القناة ${message.channel.id}` }); } catch(e){}

    } catch (err) {
        console.error('Reply+mention handler error:', err);
        try { await message.reply('❌ حدث خطأ أثناء محاولة الإرسال.'); } catch(e){}
    }
});

karizma.login(botToken); 


karizma.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('delivergrocery_')) return;

    try {
        
        const parts = interaction.customId.split('_');
        const targetDiscordId = parts[1];
        const groceryId = parts[2];
        const senderDiscordId = parts[3];

        
        if (interaction.user.id !== targetDiscordId) {
            return interaction.reply({ content: '⚠️ هذه الرسالة ليست مخصصة لك. الرجاء استخدام الحساب المستهدف فقط.', ephemeral: true });
        }

        try { await interaction.deferReply({ ephemeral: true }); } catch (e) {}

        
        safeQuery('SELECT username FROM accounts WHERE discord = ?', [targetDiscordId], async (dbErr, rows) => {
            if (dbErr) {
                console.error('DB error fetching linked account for delivergrocery:', dbErr);
                return interaction.editReply({ content: '❌ حدث خطأ أثناء التحقق من حساب اللعبة الخاص بك.' });
            }

            if (!rows || rows.length === 0 || !rows[0].username) {
                return interaction.editReply({ content: '⚠️ لم يتم العثور على حساب مرتبط بهذا المستخدم داخل النظام.' });
            }

            const username = rows[0].username;

            
            server.resources.handler.giveAuctionItem(username, 'متجر', groceryId)
            .then(async (result) => {
                if (result === true) {
                    
                    const components = interaction.message.components || [];
                    for (const row of components) {
                        for (const comp of row.components) {
                            if (comp.customId && comp.customId.startsWith(`delivergrocery_${targetDiscordId}_${groceryId}`)) {
                                comp.setDisabled(true);
                                comp.setLabel('تم استلام البقالة ✅');
                            }
                        }
                    }
                    try { await interaction.message.edit({ components: components }); } catch (e) {  }

                    
                    const acceptedEmbed = new MessageEmbed()
                        .setColor('#00ff00')
                        .setTitle(`✅ تم استلام عقد بقالة - #${groceryId}`)
                        .setDescription('تم استلام عقد البقالة بنجاح داخل اللعبة. شكراً لتعاملك مع سيرفر VERG.')
                        .addFields([
                            { name: '📝 رقم العقد', value: `\`${groceryId}\``, inline: true },
                            { name: '👮‍♂️ تم التسليم بواسطة', value: `<@${senderDiscordId}>`, inline: true }
                        ])
                        .setThumbnail(interaction.guild ? interaction.guild.iconURL({ dynamic: true }) : null)
                        .setImage('https://b.top4top.io/p_3296z3joy1.png')
                        .setTimestamp()
                        .setFooter({ text: 'VERG Roleplay', iconURL: interaction.guild ? interaction.guild.iconURL({ dynamic: true }) : null });

                    try { await interaction.user.send({ embeds: [acceptedEmbed] }); } catch (e) {  }
                    try { await interaction.editReply({ content: '✅ تم استلام العقد داخل اللعبة.' }); } catch (e) {}

                    
                    const senderUserObj = await karizma.users.fetch(senderDiscordId).catch(() => null);
                    if (senderUserObj) {
                        const notifySender = new MessageEmbed()
                            .setColor('#00c191')
                            .setTitle('🛒 تم استلام عقد البقالة من قبل المستخدم')
                            .setDescription(`المستخدم <@${targetDiscordId}> استلم عقد البقالة رقم \`${groceryId}\` داخل اللعبة.`)
                            .addFields({ name: 'الوقت', value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true })
                            .setTimestamp()
                            .setFooter({ text: 'VERG Roleplay' });

                        await senderUserObj.send({ embeds: [notifySender] }).catch(() => {});
                    }

                    
                    const logDesc = `تم استلام عقد بقالة \`${groceryId}\` بواسطة <@${targetDiscordId}> داخل اللعبة\nالمسلم: <@${senderDiscordId}>`;
                    embedSuccess(adminLog, 'Grocery Delivered in-game ✅', logDesc, `<@${senderDiscordId}>`);

                } else {
                    const errorMsg = typeof result === 'string' ? result : 'حدث خطأ أثناء تسليم العنصر داخل اللعبة.';
                    try { await interaction.editReply({ content: `❌ ${errorMsg}` }); } catch (e) {}
                }
            })
            .catch(async (err) => {
                console.error('Error calling giveAuctionItem for delivergrocery:', err);
                try { await interaction.editReply({ content: '❌ حدث خطأ أثناء التواصل مع خادم اللعبة.' }); } catch (e) {}
            });
        });

    } catch (err) {
        console.error('Error handling delivergrocery button:', err);
        try { await interaction.reply({ content: '❌ حدث خطأ أثناء تأكيد الاستلام.', ephemeral: true }); } catch (e) {}
    }
});

const discordTranscripts = require('discord-html-transcripts');

karizma.on('interactionCreate', async interaction => {
    if (!interaction.isModalSubmit()) return;
    
    if (interaction.customId === 'rename_ticket_modal') {
        try {
            const newName = interaction.fields.getTextInputValue('new_name');
            const channel = interaction.channel;
            const channelId = channel.id;

            
            await interaction.deferReply({ ephemeral: true });

            
            let ticketInfo = ticketData.get(channelId);
            if (!ticketInfo) {
                try {
                    const ticket = await new Promise((resolve, reject) => {
                        ticketDB.get('SELECT * FROM tickets WHERE channelId = ?', [channelId], (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        });
                    });

                    if (ticket) {
                        ticketInfo = {
                            ownerId: ticket.ownerId,
                            ownerUsername: ticket.ownerUsername,
                            ticketType: ticket.ticketType,
                            createdAt: ticket.createdAt,
                            status: ticket.status,
                            claimedBy: ticket.claimedBy
                        };
                        ticketData.set(channelId, ticketInfo);
                    }
                } catch (dbError) {
                    console.error('Error fetching ticket data:', dbError);
                }
            }

            
            const randomSuffix = `-${randomIntFromInterval(1000, 9999)}`;
            await channel.setName(newName + randomSuffix);
            
            
            setTimeout(async () => {
                try {
                    await channel.setName(newName);
                    console.log(`Channel name updated to: ${newName}`);
                } catch (renameError) {
                    console.error('Error in second rename operation:', renameError);
                }
            }, 2000);
            
            
            await interaction.editReply({
                content: `✅ تم تغيير اسم التذكرة إلى **${newName}**`,
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Error renaming ticket channel:', error);
            try {
                if (interaction.deferred) {
                    await interaction.editReply({
                        content: '❌ حدث خطأ أثناء محاولة تغيير اسم التذكرة',
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: '❌ حدث خطأ أثناء محاولة تغيير اسم التذكرة',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error('Error replying to interaction:', replyError);
            }
        }
    }

    if (interaction.customId === 'add_member_modal') {
        await interaction.deferReply({ ephemeral: true });
        try {
            const memberIdRaw = interaction.fields.getTextInputValue('member_id');
            const memberId = (memberIdRaw || '').replace(/[^0-9]/g, '');
            const channel = interaction.channel;
            const guild = interaction.guild;

            if (!memberId) {
                return interaction.editReply({ content: '❌ رقم العضو غير صالح.', ephemeral: true });
            }

            let member = null;
            try {
                member = await guild.members.fetch(memberId);
            } catch (fetchErr) {
                
            }

            if (!member) {
                return interaction.editReply({ content: '❌ لم يتم العثور على العضو في الخادم. تأكد من أن الـ ID صحيح.', ephemeral: true });
            }

            
            await channel.permissionOverwrites.edit(member.id, {
                VIEW_CHANNEL: true,
                SEND_MESSAGES: true,
                ATTACH_FILES: true
            });

            
            await interaction.editReply({ content: `✅ تم إضافة العضو ${member.user.tag} إلى التذكرة بنجاح.`, ephemeral: true });

            
            try {
                const auditChannel = guild.channels.cache.get('1410394429956820992');
                if (auditChannel) {
                    const auditEmbed = new MessageEmbed()
                        .setColor('#00CCFF')
                        .setTitle('➕ تمت إضافة عضو للتذكرة')
                        .addFields(
                            { name: '🎫 التذكرة', value: channel.name, inline: true },
                            { name: '👤 المضاف', value: `${member.user} (${member.id})`, inline: true },
                            { name: '🧑‍💼 بواسطة', value: `${interaction.user} (${interaction.user.id})`, inline: true },
                            { name: '⏰ الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                        )
                        .setTimestamp();
                    await auditChannel.send({ embeds: [auditEmbed] }).catch(() => {});
                }
            } catch (logErr) {
                console.error('Error sending audit for add member:', logErr);
            }

        } catch (error) {
            console.error('Error in add_member_modal handler:', error);
            try { await interaction.editReply({ content: '❌ حدث خطأ أثناء محاولة إضافة العضو.', ephemeral: true }); } catch (e) {}
        }
    }

    if (interaction.customId === 'close_ticket_modal') {
        
        await interaction.deferReply({ ephemeral: true });
        try {
            const channel = interaction.channel;
            const channelId = channel.id;
            
            let ticketInfo = ticketData.get(channelId);
            if (!ticketInfo) {
                 const ticket = await new Promise((resolve, reject) => {
                    ticketDB.get('SELECT * FROM tickets WHERE channelId = ?', [channelId], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                 });
                 if (ticket) {
                    ticketInfo = {
                        ownerId: ticket.ownerId,
                        ownerUsername: ticket.ownerUsername,
                        ticketType: ticket.ticketType,
                        createdAt: ticket.createdAt,
                        status: ticket.status,
                        claimedBy: ticket.claimedBy
                    };
                    ticketData.set(channelId, ticketInfo);
                 }
            }

            if (!ticketInfo) {
                return interaction.editReply({ 
                    content: '❌ لم يتم العثور على معلومات التذكرة!',
                    
                });
            }

            
            if (ticketInfo.status === 'closed') {
                return interaction.editReply({ 
                    content: '❌ هذه التذكرة مغلقة بالفعل!',
                    
                });
            }

            const closeReason = interaction.fields.getTextInputValue('close_reason');

            
            ticketInfo.status = 'closed';
            ticketInfo.closedBy = interaction.user.id;
            ticketInfo.closedAt = Date.now();
            ticketInfo.closeReason = closeReason;
            ticketData.set(channelId, ticketInfo); 
            
            
            await ticketDBManager.updateTicket(channel.id, ticketInfo);

            
            const auditChannelId = '1410394429956820992';
            const auditChannel = interaction.guild.channels.cache.get(auditChannelId);
            if (auditChannel) {
                const auditEmbed = new MessageEmbed()
                    .setColor('#ff0000')
                    .setTitle('🔒 تم إغلاق التذكرة')
                    .addFields(
                        { name: '🎫 رقم التذكرة', value: channel.name, inline: true },
                        { name: '👤 صاحب التذكرة', value: `<@${ticketInfo.ownerId}>`, inline: true },
                        { name: '🧑‍💼 أغلقها', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '📝 السبب', value: `\`\`\`${closeReason}\`\`\``, inline: false },
                        { name: '⏰ الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'نظام سجل التذاكر' });
                
                await auditChannel.send({ embeds: [auditEmbed] }).catch(err => console.error('Error sending audit log:', err));
            }

            
            const transcript = await discordTranscripts.createTranscript(channel, {
                limit: -1,
                fileName: `ticket-${channel.name}.html`,
                saveImages: true,
                poweredBy: false
            });

            const closeEmbed = new MessageEmbed()
                .setColor('#ff0000')
                .setTitle('📋 سجل التذكرة')
                .addFields(
                    { name: '👤 صاحب التذكرة', value: `<@${ticketInfo.ownerId}>`, inline: true },
                    { name: '📝 نوع التذكرة', value: TICKET_TYPES[ticketInfo.ticketType]?.label || ticketInfo.ticketType, inline: true }, 
                    { name: '📅 تاريخ الإنشاء', value: `<t:${Math.floor(ticketInfo.createdAt / 1000)}:F>`, inline: true },
                    { name: '👮 تم الاستلام بواسطة', value: ticketInfo.claimedBy ? `<@${ticketInfo.claimedBy}>` : 'لم يتم الاستلام', inline: true },
                    { name: '🔒 تم الإغلاق بواسطة', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '⏰ تاريخ الإغلاق', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '📄 سبب الإغلاق', value: `\`\`\`${closeReason}\`\`\``, inline: false }
                )
                .setFooter({ 
                    text: `Ticket ID: ${channel.name} • VERG Tickets System`, 
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTimestamp();

            
            await interaction.editReply({ 
                content: '✅ تم إغلاق التذكرة بنجاح' 
            });

            
            (async () => {
                try {
                    
                    const transcript = await discordTranscripts.createTranscript(channel, {
                        limit: -1,
                        fileName: `ticket-${channel.name}.html`,
                        saveImages: true,
                        poweredBy: false
                    }).catch(() => null);

                    const closeEmbed = new MessageEmbed()
                        .setColor('#ff0000')
                        .setTitle('📋 سجل التذكرة')
                        .addFields(
                            { name: '👤 صاحب التذكرة', value: `<@${ticketInfo.ownerId}>`, inline: true },
                            { name: '📝 نوع التذكرة', value: TICKET_TYPES[ticketInfo.ticketType]?.label || ticketInfo.ticketType, inline: true },
                            { name: '📅 تاريخ الإنشاء', value: `<t:${Math.floor(ticketInfo.createdAt / 1000)}:F>`, inline: true },
                            { name: '👮 تم الاستلام بواسطة', value: ticketInfo.claimedBy ? `<@${ticketInfo.claimedBy}>` : 'لم يتم الاستلام', inline: true },
                            { name: '🔒 تم الإغلاق بواسطة', value: `<@${interaction.user.id}>`, inline: true },
                            { name: '⏰ تاريخ الإغلاق', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                            { name: '📄 سبب الإغلاق', value: `\`\`\`${closeReason}\`\`\``, inline: false }
                        )
                        .setFooter({ 
                            text: `Ticket ID: ${channel.name} • VERG Tickets System`, 
                            iconURL: interaction.guild.iconURL({ dynamic: true })
                        })
                        .setTimestamp();

                    
                    const logsChannel = await interaction.guild.channels.fetch('1410394429956820992').catch(() => null);
                    if (logsChannel && transcript) {
                        await logsChannel.send({
                            embeds: [closeEmbed],
                            files: [transcript]
                        }).catch(() => {});
                    }

                    
                    try {
                        const ticketOwner = await interaction.guild.members.fetch(ticketInfo.ownerId).catch(() => null);
                        if (ticketOwner) {
                            const userEmbed = new MessageEmbed()
                                .setColor('#ff0000')
                                .setTitle('🎫 معلومات إغلاق تذكرتك')
                                .setDescription(`تم إغلاق تذكرتك في سيرفر **${interaction.guild.name}**`)
                                .addFields(
                                    { name: '📝 نوع التذكرة', value: TICKET_TYPES[ticketInfo.ticketType]?.label || ticketInfo.ticketType, inline: true },
                                    { name: '👮 تم الاستلام بواسطة', value: ticketInfo.claimedBy ? `<@${ticketInfo.claimedBy}>` : 'لم يتم الاستلام', inline: true },
                                    { name: '🔒 تم الإغلاق بواسطة', value: `<@${interaction.user.id}>`, inline: true },
                                    { name: '⏰ تاريخ الإغلاق', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                                    { name: '📄 سبب الإغلاق', value: `\`\`\`${closeReason}\`\`\``, inline: false }
                                )
                                .setFooter({ 
                                    text: 'VERG Tickets System', 
                                    iconURL: interaction.guild.iconURL({ dynamic: true })
                                })
                                .setTimestamp();

                            const dmData = transcript ? { embeds: [userEmbed], files: [transcript] } : { embeds: [userEmbed] };
                            await ticketOwner.send(dmData).catch(() => {});

                            
                            try {
                                const ratingEmbed = new MessageEmbed()
                                    .setColor('#00AAFF')
                                    .setTitle('⭐ تقييم التذكرة')
                                    .setDescription('شكرًا لتواصلك معنا! يرجى تقييم التذكرة')
                                    .setThumbnail('https://files.catbox.moe/xds8lg.gif')
                                    .setFooter({ text: 'VERG Tickets System' })
                                    .setTimestamp();

                                const ratingRow = new MessageActionRow().addComponents(
                                    new MessageButton().setCustomId(`ticket_rate_${channel.id}_1`).setLabel('⭐').setStyle('SECONDARY'),
                                    new MessageButton().setCustomId(`ticket_rate_${channel.id}_2`).setLabel('⭐⭐').setStyle('SECONDARY'),
                                    new MessageButton().setCustomId(`ticket_rate_${channel.id}_3`).setLabel('⭐⭐⭐').setStyle('PRIMARY'),
                                    new MessageButton().setCustomId(`ticket_rate_${channel.id}_4`).setLabel('⭐⭐⭐⭐').setStyle('PRIMARY'),
                                    new MessageButton().setCustomId(`ticket_rate_${channel.id}_5`).setLabel('⭐⭐⭐⭐⭐').setStyle('SUCCESS')
                                );

                                await ticketOwner.send({ embeds: [ratingEmbed], components: [ratingRow] }).catch(() => {});
                            } catch (e) {}
                        }
                    } catch (e) {
                        console.error('Error sending DM:', e);
                    }

                    
                    try {
                        await channel.permissionOverwrites.edit(ticketInfo.ownerId, { VIEW_CHANNEL: false }).catch(() => {});
                    } catch (e) {}

                    
                    try {
                        const updatedButtons = new MessageActionRow()
                            .addComponents(
                                new MessageButton().setCustomId('claim_ticket').setLabel('تم الاستلام').setStyle('SUCCESS').setEmoji('✋').setDisabled(true),
                                new MessageButton().setCustomId('close_ticket').setLabel('تم الإغلاق').setStyle('DANGER').setEmoji('🔒').setDisabled(true),
                                new MessageButton().setCustomId('delete_ticket').setLabel('حذف التذكرة').setStyle('DANGER').setEmoji('⛔').setDisabled(false)
                            );

                        const allMessages = await channel.messages.fetch({ limit: 20 }).catch(() => []);
                        const buttonMessage = allMessages.find(m => m.components && m.components.length > 0 && m.author.id === karizma.user.id);
                        if (buttonMessage) {
                            await buttonMessage.edit({ components: [updatedButtons] }).catch(() => {});
                        }
                    } catch (e) {}

                    
                    await channel.setName("تذكرة-مُغلقة").catch(() => {});

                    
                    await channel.send({ embeds: [closeEmbed] }).catch(() => {});
                } catch (bgError) {
                    console.error('Background ticket close error:', bgError);
                }
            })();

        } catch (error) {
            console.error('Error closing ticket:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                 
            await interaction.reply({
                content: '❌ حدث خطأ أثناء محاولة إغلاق التذكرة',
                ephemeral: true
            });
            } else {
                await interaction.editReply({
                    content: '❌ حدث خطأ أثناء محاولة إغلاق التذكرة',
                    
                });
            }
        }
    }
});


const ticketData = new Map();


const pendingTicketCreations = new Map();

const ticketUtils = {
    
    getOpenTickets() {
        return Array.from(ticketData.entries())
            .filter(([_, data]) => data.status === 'open');
    },

    
    getUserTickets(userId) {
        return Array.from(ticketData.entries())
            .filter(([_, data]) => data.ownerId === userId);
    },

    
    getTicketStats() {
        const stats = {
            total: ticketData.size,
            open: 0,
            closed: 0,
            claimed: 0
        };

        ticketData.forEach(data => {
            stats[data.status]++;
        });

        return stats;
    }
};

const sqlite3 = require('sqlite3').verbose();
const path = require('path');


const fs = require('fs');
if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
}


const ticketDB = new sqlite3.Database(path.join(__dirname, 'data', 'tickets.db'), (err) => {
    if (err) {
        console.error('Error connecting to tickets database:', err);
    } else {
        console.log('Connected to tickets SQLite database');
    }
});


const createTicketTableQuery = `
CREATE TABLE IF NOT EXISTS tickets (
    channelId TEXT PRIMARY KEY,
    ownerId TEXT,
    ownerUsername TEXT,
    ticketType TEXT,
    createdAt INTEGER,
    status TEXT,
    claimedBy TEXT,
    closedBy TEXT,
    closedAt INTEGER,
    closeReason TEXT,
    ticketNumber INTEGER
)`;


const createAuctionTableQuery = `
CREATE TABLE IF NOT EXISTS auctions (
    id TEXT PRIMARY KEY,
    itemName TEXT,
    itemType TEXT,
    startPrice INTEGER,
    currentBid INTEGER,
    highestBidder TEXT,
    endTime INTEGER,
    messageId TEXT,
    channelId TEXT,
    status TEXT,
    bids TEXT
)`;


const createBalanceTableQuery = `
CREATE TABLE IF NOT EXISTS auction_balances (
    account_name TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 0
)`;


const createTicketBlacklistTableQuery = `
CREATE TABLE IF NOT EXISTS ticket_blacklist (
    userId TEXT PRIMARY KEY,
    reasonType TEXT,
    duration TEXT,
    reason TEXT,
    addedBy TEXT,
    addedAt INTEGER,
    expiresAt INTEGER,
    isActive INTEGER DEFAULT 1
)`;


const createTicketRatingsTableQuery = `
CREATE TABLE IF NOT EXISTS ticket_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticketChannelId TEXT,
    ticketNumber TEXT,
    userId TEXT,
    rating INTEGER,
    createdAt INTEGER
)`;


const createTicketStatsTableQuery = `
CREATE TABLE IF NOT EXISTS ticket_stats (
    userId TEXT PRIMARY KEY,
    total_received INTEGER DEFAULT 0,
    total_interactions INTEGER DEFAULT 0
)`;


const createTicketStatsDailyTableQuery = `
CREATE TABLE IF NOT EXISTS ticket_stats_daily (
    userId TEXT,
    date TEXT,
    received INTEGER DEFAULT 0,
    interactions INTEGER DEFAULT 0,
    PRIMARY KEY (userId, date)
)`;


const createTicketEmbedTableQuery = `
CREATE TABLE IF NOT EXISTS ticket_embed (
    id INTEGER PRIMARY KEY,
    channelId TEXT,
    messageId TEXT
)`;

ticketDB.run(createBalanceTableQuery, [], (err) => {
    if (err) {
        console.error('Error creating auction_balances table:', err);
    } else {
        console.log('Auction balances table ready');
    }
});

ticketDB.run(createTicketBlacklistTableQuery, [], (err) => {
    if (err) {
        console.error('Error creating ticket_blacklist table:', err);
    } else {
        console.log('Ticket blacklist table ready');
    }
});

ticketDB.run(createTicketRatingsTableQuery, [], (err) => {
    if (err) {
        console.error('Error creating ticket_ratings table:', err);
    } else {
        console.log('Ticket ratings table ready');
    }
});

ticketDB.run(createTicketStatsTableQuery, [], (err) => {
    if (err) {
        console.error('Error creating ticket_stats table:', err);
    } else {
        console.log('Ticket stats table ready');
    }
});

ticketDB.run(createTicketStatsDailyTableQuery, [], (err) => {
    if (err) {
        console.error('Error creating ticket_stats_daily table:', err);
    } else {
        console.log('Ticket daily stats table ready');
    }
});

ticketDB.run(createTicketEmbedTableQuery, [], (err) => {
    if (err) {
        console.error('Error creating ticket_embed table:', err);
    } else {
        console.log('Ticket embed state table ready');
    }
});


const STATS_CHANNEL_ID = '1438670532030501025';
const STATS_ROLE_ID = '1410394033066475714';
const RESET_ROLE_ID = '1412844127648874598';


function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        ticketDB.run(sql, params, function(err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        ticketDB.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        ticketDB.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}


async function incrementReceived(userId) {
    try {
        const today = new Date().toISOString().slice(0,10);
        await dbRun('INSERT OR IGNORE INTO ticket_stats (userId, total_received, total_interactions) VALUES (?, 0, 0)', [userId]);
        await dbRun('UPDATE ticket_stats SET total_received = total_received + 1 WHERE userId = ?', [userId]);
        await dbRun('INSERT OR IGNORE INTO ticket_stats_daily (userId, date, received, interactions) VALUES (?, ?, 0, 0)', [userId, today]);
        await dbRun('UPDATE ticket_stats_daily SET received = received + 1 WHERE userId = ? AND date = ?', [userId, today]);
    } catch (err) {
        console.error('incrementReceived error:', err);
    }
}

async function incrementInteraction(userId) {
    try {
        const today = new Date().toISOString().slice(0,10);
        await dbRun('INSERT OR IGNORE INTO ticket_stats (userId, total_received, total_interactions) VALUES (?, 0, 0)', [userId]);
        await dbRun('UPDATE ticket_stats SET total_interactions = total_interactions + 1 WHERE userId = ?', [userId]);
        await dbRun('INSERT OR IGNORE INTO ticket_stats_daily (userId, date, received, interactions) VALUES (?, ?, 0, 0)', [userId, today]);
        await dbRun('UPDATE ticket_stats_daily SET interactions = interactions + 1 WHERE userId = ? AND date = ?', [userId, today]);
    } catch (err) {
        console.error('incrementInteraction error:', err);
    }
}

async function resetAllStats() {
    try {
        await dbRun('DELETE FROM ticket_stats');
        await dbRun('DELETE FROM ticket_stats_daily');
        await dbRun('DELETE FROM ticket_embed WHERE id = 1');
    } catch (err) {
        console.error('resetAllStats error:', err);
    }
}

async function resetUserStats(userId) {
    try {
        await dbRun('DELETE FROM ticket_stats WHERE userId = ?', [userId]);
        await dbRun('DELETE FROM ticket_stats_daily WHERE userId = ?', [userId]);
    } catch (err) {
        console.error('resetUserStats error:', err);
    }
}

async function getUserStats(userId) {
    try {
        const today = new Date().toISOString().slice(0,10);
        const total = await dbGet('SELECT total_received, total_interactions FROM ticket_stats WHERE userId = ?', [userId]) || { total_received: 0, total_interactions: 0 };
        const daily = await dbGet('SELECT received, interactions FROM ticket_stats_daily WHERE userId = ? AND date = ?', [userId, today]) || { received: 0, interactions: 0 };
        return { total_received: total.total_received || 0, total_interactions: total.total_interactions || 0, today_received: daily.received || 0, today_interactions: daily.interactions || 0 };
    } catch (err) {
        console.error('getUserStats error:', err);
        return { total_received: 0, total_interactions: 0, today_received: 0, today_interactions: 0 };
    }
}

async function saveEmbedState(channelId, messageId) {
    try {
        await dbRun('INSERT OR REPLACE INTO ticket_embed (id, channelId, messageId) VALUES (1, ?, ?)', [channelId, messageId]);
    } catch (err) {
        console.error('saveEmbedState error:', err);
    }
}

async function loadEmbedState() {
    try {
        return await dbGet('SELECT * FROM ticket_embed WHERE id = 1');
    } catch (err) {
        console.error('loadEmbedState error:', err);
        return null;
    }
}

async function buildAndUpdateStatsEmbed() {
    try {
        const channel = await karizma.channels.fetch(STATS_CHANNEL_ID).catch(() => null);
        if (!channel) return;
        const guild = channel.guild;
        const today = new Date().toISOString().slice(0,10);

        
        const dailyReceived = await dbAll('SELECT userId, received FROM ticket_stats_daily WHERE date = ? ORDER BY received DESC LIMIT 50', [today]);
        const dailyInteracts = await dbAll('SELECT userId, interactions FROM ticket_stats_daily WHERE date = ? ORDER BY interactions DESC LIMIT 50', [today]);

        const topReceivers = [];
        for (const row of dailyReceived) {
            if (topReceivers.length >= 3) break;
            try {
                let member = guild.members.cache.get(row.userId) || await guild.members.fetch(row.userId).catch(() => null);
                if (member && member.roles.cache.has(STATS_ROLE_ID)) {
                    topReceivers.push({ id: row.userId, count: row.received, tag: member.user.tag });
                }
            } catch (e) {
                continue;
            }
        }

        const topInteractors = [];
        for (const row of dailyInteracts) {
            if (topInteractors.length >= 3) break;
            try {
                let member = guild.members.cache.get(row.userId) || await guild.members.fetch(row.userId).catch(() => null);
                if (member && member.roles.cache.has(STATS_ROLE_ID)) {
                    topInteractors.push({ id: row.userId, count: row.interactions, tag: member.user.tag });
                }
            } catch (e) {
                continue;
            }
        }

        const embed = new MessageEmbed()
            .setColor('#FFD700')
            .setTitle('إحصائيات التيكتات - أعلى المستلمين والمتفاعلين')
            .setThumbnail(THUMBNAIL_GIF)
            .setTimestamp();

        const receiversText = topReceivers.length ? topReceivers.map((r, i) => `
${i+1}. <@${r.id}> — **${r.count}**`).join('\n') : 'لا توجد بيانات حالياً.';
        const interactsText = topInteractors.length ? topInteractors.map((r, i) => `\n${i+1}. <@${r.id}> — **${r.count}**`).join('\n') : 'لا توجد بيانات حالياً.';

        embed.addFields(
            { name: 'أكثر 3 أشخاص استلاماً للتذاكر (اليوم)', value: receiversText, inline: false },
            { name: 'أكثر 3 أشخاص تفاعلاً في التذاكر (اليوم)', value: interactsText, inline: false }
        );

        const state = await loadEmbedState();
        if (state && state.messageId) {
            
            try {
                const msg = await channel.messages.fetch(state.messageId).catch(() => null);
                if (msg) {
                    await msg.edit({ embeds: [embed] });
                    return;
                }
            } catch (e) {
                console.warn('Failed to edit existing stats embed:', e);
            }
        }

        
        const sent = await channel.send({ embeds: [embed] });
        await saveEmbedState(channel.id, sent.id);
    } catch (err) {
        console.error('buildAndUpdateStatsEmbed error:', err);
    }
}


setInterval(() => {
    buildAndUpdateStatsEmbed().catch(console.error);
}, 10 * 60 * 1000);


setTimeout(() => buildAndUpdateStatsEmbed().catch(console.error), 15 * 1000);


karizma.on('messageCreate', async message => {
    try {
        
        if (message.author.bot) return;
        
        
        if (ticketData.has(message.channel.id)) {
            const ticketInfo = ticketData.get(message.channel.id);
            if (ticketInfo.claimedBy) {
                
                await incrementInteraction(ticketInfo.claimedBy);
            }
        }
    } catch (err) {
        console.error('Error tracking ticket interaction:', err);
    }
});


const ticketDBManager = {
    async loadTickets() {
        return new Promise((resolve, reject) => {
            ticketDB.all('SELECT * FROM tickets', [], (err, rows) => {
                if (err) {
                    console.error('Error loading tickets from database:', err);
                    reject(err);
                    return;
                }

                rows.forEach(row => {
                    ticketData.set(row.channelId, {
                        ownerId: row.ownerId,
                        ownerUsername: row.ownerUsername,
                        ticketType: row.ticketType,
                        createdAt: row.createdAt,
                        status: row.status,
                        claimedBy: row.claimedBy,
                        closedBy: row.closedBy,
                        closedAt: row.closedAt,
                        closeReason: row.closeReason
                    });
                });

                console.log(`Loaded ${rows.length} tickets from database`);
                resolve();
            });
        });
    },

    async saveTicket(channelId, ticketInfo) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT OR REPLACE INTO tickets 
                (channelId, ownerId, ownerUsername, ticketType, createdAt, status, claimedBy, closedBy, closedAt, closeReason)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            ticketDB.run(query, [
                channelId,
                ticketInfo.ownerId,
                ticketInfo.ownerUsername,
                ticketInfo.ticketType,
                ticketInfo.createdAt,
                ticketInfo.status,
                ticketInfo.claimedBy || null,
                ticketInfo.closedBy || null,
                ticketInfo.closedAt || null,
                ticketInfo.closeReason || null
            ], (err) => {
                if (err) {
                    console.error('Error saving ticket to database:', err);
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    },

    async deleteTicket(channelId) {
        return new Promise((resolve, reject) => {
            ticketDB.run('DELETE FROM tickets WHERE channelId = ?', [channelId], (err) => {
                if (err) {
                    console.error('Error deleting ticket from database:', err);
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    },

    async hasOpenTicket(userId) {
        return new Promise((resolve, reject) => {
            
            ticketDB.get(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='tickets'",
                [],
                (err, table) => {
                    if (err) {
                        console.error('Error checking table existence:', err);
                        resolve(false);
                        return;
                    }

                    
                    if (!table) {
                        resolve(false);
                        return;
                    }

                    
                    ticketDB.all(
                        'SELECT * FROM tickets WHERE ownerId = ? AND status IN ("open", "claimed", "")',
                        [userId],
                        async (err, rows) => {
                            if (err) {
                                console.error('Error checking open tickets:', err);
                                resolve(false);
                                return;
                            }
                            
                            if (!rows || rows.length === 0) {
                                
                                console.log(`لا توجد تذاكر مفتوحة للمستخدم: ${userId}`);
                                resolve(false);
                                return;
                            }
                            
                            
                            let hasReallyOpenTickets = false;
                            let invalidTickets = [];
                            
                            for (const ticket of rows) {
                                
                                try {
                                    const channel = await karizma.channels.fetch(ticket.channelId).catch(() => null);
                                    if (channel) {
                                        
                                        hasReallyOpenTickets = true;
                                        console.log(`المستخدم ${userId} لديه تذكرة مفتوحة في القناة: ${channel.name} (${channel.id})`);
                                    } else {
                                        
                                        invalidTickets.push(ticket.channelId);
                                        console.log(`قناة التذكرة غير موجودة للمستخدم ${userId}: ${ticket.channelId} - سيتم حذفها من قاعدة البيانات`);
                                    }
                                } catch (error) {
                                    console.error(`Error fetching channel for ticket: ${ticket.channelId}`, error);
                                    
                                    invalidTickets.push(ticket.channelId);
                                }
                            }
                            
                            
                            if (invalidTickets.length > 0) {
                                console.log(`حذف ${invalidTickets.length} تذاكر غير صالحة للمستخدم ${userId}`);
                                for (const channelId of invalidTickets) {
                                    
                                    ticketData.delete(channelId);
                                    
                                    
                                    await new Promise((resolveDelete) => {
                                        ticketDB.run('DELETE FROM tickets WHERE channelId = ?', [channelId], function(err) {
                                            if (err) {
                                                console.error(`خطأ في حذف التذكرة غير الصالحة: ${channelId}`, err);
                                            } else {
                                                console.log(`تم حذف التذكرة غير الصالحة: ${channelId} (${this.changes} صفوف متأثرة)`);
                                            }
                                            resolveDelete();
                                        });
                                    });
                                }
                            }
                            
                            
                            resolve(hasReallyOpenTickets);
                        }
                    );
                }
            );
        });
    },

    async updateTicket(channelId, ticketInfo) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE tickets SET
                ownerId = ?,
                ownerUsername = ?,
                ticketType = ?,
                status = ?,
                claimedBy = ?,
                closedBy = ?,
                closedAt = ?,
                closeReason = ?
                WHERE channelId = ?
            `;

            ticketDB.run(query, [
                ticketInfo.ownerId,
                ticketInfo.ownerUsername,
                ticketInfo.ticketType,
                ticketInfo.status,
                ticketInfo.claimedBy || null,
                ticketInfo.closedBy || null,
                ticketInfo.closedAt || null,
                ticketInfo.closeReason || null,
                channelId
            ], (err) => {
                if (err) {
                    console.error('Error updating ticket:', err);
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    },

    updateTicketChannelName: async (channelId, channelName) => {
        return new Promise((resolve, reject) => {
            ticketDB.run(
                'UPDATE tickets SET channelName = ? WHERE channelId = ?',
                [channelName, channelId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
};


ticketDB.run(createTicketTableQuery, (err) => {
    if (err) {
        console.error('Error creating tickets table:', err);
    } else {
        console.log('Tickets table created or already exists');
    }
});


ticketDB.run(createAuctionTableQuery, [], (err) => {
    if (err) {
        console.error('Error creating auctions table:', err);
    } else {
        console.log('Auctions table ready');
        
        restoreActiveAuctions();
    }
});


function getInputEmoji(inputId) {
    const emojiMap = {
        'accountName': '👤',
        'adminName': '👮',
        'reportDate': '📅',
        'complaintDate': '📅',
        'proofs': '🔍',
        'description': '📝',
        'playerName': '🎮',
        'reportType': '📋',
        'tazlomDate': '📅',
        'tazlomReason': '📝'
        
    };
    return emojiMap[inputId] || '📌';
}


async function getNextTicketNumber(ticketType) {
    try {
        
        const fs = require('fs');
        const path = require('path');
        const ticketNumbersPath = path.join(__dirname, 'data', 'ticketNumbers.json');
        
        
        if (!fs.existsSync(ticketNumbersPath)) {
            const initialData = {
                "REPORT": 0,
                "TECHNICALPROBLEM": 0,
                "COMPLAINT": 0,
                "TAZLOM": 0,
                "ASKING": 0,
                "POLICE": 0,
                "HOSPITAL": 0,
                "MECHANIC": 0,
                "CUSTOMS": 0,
                "WEBSITE": 0,
                "REFUND": 0,
            };
            fs.writeFileSync(ticketNumbersPath, JSON.stringify(initialData, null, 2), 'utf8');
        }
        
        
        const ticketNumbersData = JSON.parse(fs.readFileSync(ticketNumbersPath, 'utf8'));
        
        
        const currentNumber = ticketNumbersData[ticketType] || 0;
        
        
        const nextNumber = currentNumber + 1;
        
        
        ticketNumbersData[ticketType] = nextNumber;
        fs.writeFileSync(ticketNumbersPath, JSON.stringify(ticketNumbersData, null, 2), 'utf8');
        
        console.log(`Ticket number for ${ticketType}: ${nextNumber}`);
        return nextNumber;
    } catch (error) {
        console.error('Error getting next ticket number from file:', error);
        
        
    return new Promise((resolve, reject) => {
        
        ticketDB.get(
            'SELECT COUNT(*) as totalTickets FROM tickets WHERE ticketType = ?',
            [ticketType],
            (err, row) => {
                if (err) {
                        console.error('Error getting next ticket number from DB:', err);
                    
                    resolve(1);
                    return;
                }
                    
                const nextNum = (row?.totalTickets || 0) + 1;
                resolve(nextNum);
            }
        );
    });
    }
}



karizma.on('channelDelete', async channel => {
    try {
            console.log(`Channel deleted: ${channel.name} (${channel.id})`);
            
        
        let isTicket = false;
        let ticketOwnerId = null;
        
        
        const ticketInfo = ticketData.get(channel.id);
        if (ticketInfo) {
            isTicket = true;
            ticketOwnerId = ticketInfo.ownerId;
            console.log(`القناة المحذوفة هي تذكرة موجودة في الذاكرة. المالك: ${ticketInfo.ownerUsername || 'غير معروف'} (${ticketInfo.ownerId || 'غير معروف'})`);
        }
        
        
        if (!isTicket) {
            if (channel.name.startsWith('شكوى-') || 
                channel.name.startsWith('بلاغ-') || 
                channel.name.startsWith('تظلم-') || 
                channel.name.startsWith('ticket-') || 
                channel.name.startsWith('تذكرة-') ||
                channel.name.includes('-') && !channel.isThread()) { 
                
                isTicket = true;
                console.log(`القناة المحذوفة قد تكون تذكرة بناءً على أسلوب تسميتها: ${channel.name}`);
            }
            
            
            if (!isTicket && channel.parentId) {
                for (const [type, info] of Object.entries(TICKET_TYPES)) {
                    if (info.categoryId === channel.parentId) {
                        isTicket = true;
                        console.log(`القناة المحذوفة تنتمي إلى فئة التذاكر: ${channel.name} (فئة: ${type})`);
                        break;
                    }
                }
            }
        }
        
        
        if (isTicket) {
            
            if (!ticketOwnerId) {
                try {
                    const ticket = await new Promise((resolve, reject) => {
                        ticketDB.get('SELECT * FROM tickets WHERE channelId = ?', [channel.id], (err, row) => {
                            if (err) {
                                console.error('خطأ عند البحث عن التذكرة في قاعدة البيانات:', err);
                                reject(err);
                            } else {
                                resolve(row);
                            }
                        });
                    });
                    
                    if (ticket) {
                        ticketOwnerId = ticket.ownerId;
                        console.log(`تم العثور على التذكرة في قاعدة البيانات. المالك: ${ticket.ownerUsername || 'غير معروف'} (${ticket.ownerId || 'غير معروف'})`);
                    }
                } catch (error) {
                    console.error('خطأ في البحث عن التذكرة في قاعدة البيانات:', error);
                }
            }
            
            
            ticketData.delete(channel.id);
            
            
            try {
                await new Promise((resolve, reject) => {
                    ticketDB.run('DELETE FROM tickets WHERE channelId = ?', [channel.id], function(err) {
                        if (err) {
                            console.error('خطأ عند حذف التذكرة من قاعدة البيانات:', err);
                            reject(err);
                        } else {
                            console.log(`تم حذف التذكرة من قاعدة البيانات. عدد الصفوف المتأثرة: ${this.changes}`);
                            resolve(this.changes);
                        }
                    });
                });
                
                
                if (ticketOwnerId) {
                    try {
                        const remainingTickets = await new Promise((resolve, reject) => {
                            ticketDB.all('SELECT * FROM tickets WHERE ownerId = ? AND status = "open"', [ticketOwnerId], (err, rows) => {
                                if (err) {
                                    console.error('خطأ عند البحث عن تذاكر أخرى للمستخدم:', err);
                                    reject(err);
                                } else {
                                    resolve(rows);
                                }
                            });
                        });
                        
                        console.log(`المستخدم ${ticketOwnerId} لديه ${remainingTickets.length} تذاكر مفتوحة متبقية بعد الحذف.`);
                    } catch (error) {
                        console.error('خطأ في البحث عن تذاكر أخرى للمستخدم:', error);
                    }
                }
                
                console.log(`تم حذف التذكرة بنجاح: ${channel.name} (${channel.id})`);
            } catch (dbError) {
                console.error('خطأ أثناء حذف التذكرة من قاعدة البيانات:', dbError);
            }
        } else {
            console.log(`القناة المحذوفة ليست تذكرة: ${channel.name} (${channel.id})`);
        }
    } catch (error) {
        console.error('Error handling channel delete:', error);
    }
});


const activeAuctions = new Map();


async function saveAuctionToDatabase(auctionData) {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT OR REPLACE INTO auctions 
            (id, itemName, itemType, startPrice, currentBid, highestBidder, endTime, messageId, channelId, status, bids)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        ticketDB.run(query, [
            auctionData.id,
            auctionData.itemName,
            auctionData.itemType,
            auctionData.startPrice,
            auctionData.currentBid,
            auctionData.highestBidder,
            auctionData.endTime,
            auctionData.messageId,
            auctionData.channelId,
            auctionData.status,
            JSON.stringify(auctionData.bids)
        ], (err) => {
            if (err) {
                console.error('Error saving auction to database:', err);
                reject(err);
            } else {
                resolve();
            }
        });
    });
}


async function restoreActiveAuctions() {
    try {
        const auctions = await new Promise((resolve, reject) => {
            ticketDB.all(
                'SELECT * FROM auctions WHERE status = "active"',
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        for (const auction of auctions) {
            const now = Date.now();
            const timeLeft = auction.endTime - now;

            if (timeLeft > 0) {
                try {
                    
                    const channel = await karizma.channels.fetch(auction.channelId)
                        .catch(async (error) => {
                            console.log(`Channel not found for auction ${auction.id}, removing from database...`);
                            
                            await new Promise((resolve, reject) => {
                                ticketDB.run('DELETE FROM auctions WHERE id = ?', [auction.id], (err) => {
                                    if (err) reject(err);
                                    else resolve();
                                });
                            });
                            return null;
                        });

                    if (!channel) continue; 

                    
                    const message = await channel.messages.fetch(auction.messageId)
                        .catch(async (error) => {
                            console.log(`Message not found for auction ${auction.id}, removing from database...`);
                            
                            await new Promise((resolve, reject) => {
                                ticketDB.run('DELETE FROM auctions WHERE id = ?', [auction.id], (err) => {
                                    if (err) reject(err);
                                    else resolve();
                                });
                            });
                            return null;
                        });

                    if (!message) continue; 

                    
                    const auctionData = {
                        ...auction,
                        bids: JSON.parse(auction.bids || '[]')
                    };
                    activeAuctions.set(auction.id, auctionData);

                    
                    setTimeout(() => endAuction(auction.id), timeLeft);

                    
                    await updateAuctionMessage(message, auctionData);
                    console.log(`Successfully restored auction ${auction.id}`);

                } catch (error) {
                    console.error(`Error processing auction ${auction.id}:`, error);
                    
                    await new Promise((resolve, reject) => {
                        ticketDB.run('DELETE FROM auctions WHERE id = ?', [auction.id], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                }
            } else {
                
                console.log(`Auction ${auction.id} has expired, removing from database...`);
                await new Promise((resolve, reject) => {
                    ticketDB.run('DELETE FROM auctions WHERE id = ?', [auction.id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
        }
    } catch (error) {
        console.error('Error in restoreActiveAuctions:', error);
    }
}


async function endAuction(auctionId) {
    
    try {
        
        const auctionData = activeAuctions.get(auctionId);

        
        
        if (!auctionData || auctionData.status !== 'active') {
            console.log(`endAuction: auction ${auctionId} not active or not found, skipping.`);
            
            activeAuctions.delete(auctionId);
            return;
        }

        
        auctionData.status = 'ended';
        activeAuctions.delete(auctionId); 
        
        
        await new Promise((resolve, reject) => {
            ticketDB.run(
                'UPDATE auctions SET status = "ended" WHERE id = ? AND status = "active"', 
                [auctionId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        }).catch(dbError => {
             console.error(`Failed to update auction ${auctionId} status to ended in DB:`, dbError);
             
        });


        let channel;
        let message;

        
        try {
            if (!auctionData.channelId) throw new Error(`No channel ID for auction ${auctionId}`);
            channel = await karizma.channels.fetch(auctionData.channelId);
            if (!channel) throw new Error(`Channel ${auctionData.channelId} not found`);

            if (!auctionData.messageId) throw new Error(`No message ID for auction ${auctionId}`);
            message = await channel.messages.fetch(auctionData.messageId);
            if (!message) throw new Error(`Message ${auctionData.messageId} not found`);

        } catch (fetchError) {
            console.error(`Error fetching channel/message for ended auction ${auctionId}: ${fetchError.message}. Removing from DB if present.`);
            
                    await new Promise((resolve, reject) => {
                        ticketDB.run('DELETE FROM auctions WHERE id = ?', [auctionId], (err) => {
                    if (err) console.error(`Failed to delete auction ${auctionId} after fetch error:`, err);
                    resolve(); 
                        });
                    });
            return; 
        }

        
                const endedEmbed = new MessageEmbed()
                .setColor('#ff0000')
                .setTitle(`🏷️ مزاد منتهي علي العنصر: ${auctionData.itemName}`)
            .setDescription('انتهى وقت المزاد!') 
            .addFields( 
                 { name: '**السعر المبدأي للمزايدة :**', value: `$${Number(auctionData.startPrice).toLocaleString()}` , inline: true },
                 { name: '**أعلى مزايدة :**', value: auctionData.highestBidder ? `$${Number(auctionData.currentBid).toLocaleString()} من <@${auctionData.highestBidder}>` : 'لا يوجد' , inline: true },
                 { name: '**المزاد ينتهي بعد :**', value: 'لقد انتهى المزاد' } 
            )
            .setImage(message.embeds[0]?.image?.url) 
                .setTimestamp()
            .setThumbnail(message.guild?.iconURL({ dynamic: true })) 
                .setFooter({ 
                text: `Auction ID: ${auctionData.id} • Ended`, 
                iconURL: message.guild?.iconURL({ dynamic: true }) 
            });

        
            const disabledButtons = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                    .setCustomId(`bid_${auctionId}_ended`) 
                        .setLabel('المزايدة علي الغرض')
                        .setStyle('PRIMARY')
                        .setEmoji('<:verg4:1435358368779866182>')
                        .setDisabled(true),
                    new MessageButton()
                    .setCustomId(`top_${auctionId}_ended`)
                        .setLabel('المتصدرين في المزاد')
                        .setStyle('SECONDARY')
                        .setEmoji('<:verg6:1435358463776526397>')
                        .setDisabled(true),
                    new MessageButton()
                    .setCustomId(`deposit_${auctionId}_ended`)
                    .setLabel('إيداع رصيد') 
                        .setStyle('SUCCESS')
                        .setEmoji('<:verg:1435358249833463858>')
                        .setDisabled(false),
                 
                    new MessageButton()
                    .setCustomId(`withdraw_${auctionId}`)
                    .setLabel('سحب الرصيد') 
                        .setStyle('DANGER')
                        .setEmoji('<:verg5:1435358403571617974>')
                    .setDisabled(false) 
                );

        
            await message.edit({
                embeds: [endedEmbed],
            components: [disabledButtons] 
        }).catch(editError => {
             console.error(`Failed to edit ended auction message ${auctionData.messageId}:`, editError);
             
        });


        
        if (auctionData.highestBidder) {
                safeQuery('SELECT username FROM accounts WHERE discord = ?', [auctionData.highestBidder], async (error, results) => {
                try { 
                    if (error || !results.length) {
                        console.error(`Error fetching winner account ${auctionData.highestBidder} or not found:`, error);
                        await message.reply({ 
                            content: `⚠️ حدث خطأ أثناء العثور على حساب الفائز <@${auctionData.highestBidder}>.`,
                        }).catch(replyError => console.error("Failed to send winner error message:", replyError));
                        return;
                    }
                    const winnerUsername = results[0].username;
                    
                    
                    ticketDB.get(
                        'SELECT balance FROM auction_balances WHERE account_name = ?',
                        [winnerUsername],
                        async (err, row) => {
                            try { 
                            if (err) {
                                    console.error(`Error checking winner balance for ${winnerUsername}:`, err);
                                    await message.reply({ content: `⚠️ حدث خطأ أثناء التحقق من رصيد الفائز <@${auctionData.highestBidder}>.` }).catch(replyError => console.error("Failed to send winner error message:", replyError));
                                return;
                            }
            
                            if (!row || row.balance < auctionData.currentBid) {
                                    await message.reply({ content: `⚠️ لا يوجد رصيد كافي ($${Number(auctionData.currentBid).toLocaleString()}) في حساب بنك النظام الخاص بالفائز <@${auctionData.highestBidder}> لإتمام عملية الاستلام.` }).catch(replyError => console.error("Failed to send winner error message:", replyError));
                                    
                                    
                                return;
                            }
            
                                
                            ticketDB.run(
                                'UPDATE auction_balances SET balance = balance - ? WHERE account_name = ?',
                                [auctionData.currentBid, winnerUsername],
                                async function(updateErr) {
                                    if (updateErr) {
                                            console.error(`Error updating winner balance for ${winnerUsername}:`, updateErr);
                                            await message.reply({ content: `⚠️ حدث خطأ أثناء تحديث رصيد الفائز <@${auctionData.highestBidder}>.` }).catch(replyError => console.error("Failed to send winner error message:", replyError));
                                            
                                        return;
                                    }
                                        console.log(`Successfully deducted $${auctionData.currentBid} from ${winnerUsername} for auction ${auctionId}`);

                                        
                                        const claimButton = new MessageActionRow()
                                            .addComponents(
                                                new MessageButton()
                                                    
                                                    .setCustomId(`claim:${auctionData.itemType}:${winnerUsername}:${auctionData.id}`)
                                                    .setLabel('سحب الجائزة')
                                                    .setStyle('SUCCESS')
                                                    .setEmoji('🎁')
                                                    
                                            );

                                        const winnerEmbed = new MessageEmbed()
                                            .setColor('#00ff00')
                                            .setTitle('🎉 مبروك! لقد فزت بالمزاد')
                                            .setDescription(`لقد فزت بالعنصر **${auctionData.itemName}** بسعر **$${Number(auctionData.currentBid).toLocaleString()}**. تم خصم المبلغ من رصيدك في بنك النظام.`)
                                            .addFields(
                                               
                                               
                                                { name: 'الفائز', value: `<@${auctionData.highestBidder}> (${winnerUsername})` }
                                            )
                                            .setTimestamp();

                                        
                                        await message.reply({
                                            content: `<@${auctionData.highestBidder}>`,
                                            embeds: [winnerEmbed],
                                            components: [claimButton]
                                        }).catch(replyError => console.error("Failed to send winner message:", replyError));
                                    }
                                ); 
                            } catch (balanceCheckError) {
                                 console.error(`Error during balance check/deduction for ${winnerUsername}:`, balanceCheckError);
                                 await message.reply({ content: `⚠️ حدث خطأ فني أثناء معالجة دفعة الفائز <@${auctionData.highestBidder}>.` }).catch(replyError => console.error("Failed to send winner error message:", replyError));
                            }
                        } 
                    ); 

                } catch (winnerDbError) {
                     console.error(`Unhandled error in winner processing for auction ${auctionId}:`, winnerDbError);
                     await message.reply({ content: `⚠️ حدث خطأ فني أثناء معالجة الفائز.` }).catch(replyError => console.error("Failed to send winner error message:", replyError));
                }

            }); 
        } else {
            
            const noWinnerEmbed = new MessageEmbed()
                .setColor('#ffcc00') 
                .setTitle('**انتهى المزاد بدون أي مزايدات صالحة!**')
                 .setDescription(`لم يتم تقديم أي مزايدات أو لم يفِ الفائز المحتمل بالشروط.`)
                .setTimestamp()
                .setFooter({ 
                    text: `Auction ID: ${auctionData.id} • Ended`, 
                    iconURL: message.guild?.iconURL({ dynamic: true }) 
                });

            await message.reply({ 
                embeds: [noWinnerEmbed]
            }).catch(replyError => console.error("Failed to send no-winner message:", replyError));
        }

    } catch (error) { 
        console.error(`Critical error in endAuction for auction ${auctionId}:`, error);
        
            activeAuctions.delete(auctionId);
        
            await new Promise((resolve, reject) => {
            ticketDB.run('UPDATE auctions SET status = "error" WHERE id = ?', [auctionId], (err) => {
                if (err) console.error(`Failed to mark auction ${auctionId} as error in DB:`, err);
                resolve();
                });
            });
    }
}


karizma.on('messageDelete', async message => {
    try {
        
        const query = 'SELECT * FROM auctions WHERE messageId = ?';
        
        const auction = await new Promise((resolve, reject) => {
            ticketDB.get(query, [message.id], (err, row) => {
                if (err) {
                    console.error('Error checking auction:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });

        
        if (auction) {
            console.log(`Auction message deleted: ${auction.id}`);
            
            
            await new Promise((resolve, reject) => {
                ticketDB.run('DELETE FROM auctions WHERE messageId = ?', [message.id], (err) => {
                    if (err) {
                        console.error('Error deleting auction:', err);
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });

            
            activeAuctions.delete(auction.id);
            
            console.log(`Auction data deleted for message: ${message.id}`);
        }
    } catch (error) {
        console.error('Error handling auction message deletion:', error);
    }
});

karizma.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    
    const parts = interaction.customId.split('_'); 
    const action = parts[0];
    const auctionId = parts[1]; 

    
    
    if (!['bid', 'top', 'deposit', 'withdraw'].includes(action)) return;

    
const auction = activeAuctions.get(auctionId);
if ((!auction || auction.status !== 'active') && action !== 'withdraw') {
    try {
        await interaction.reply({
            content: '❌ هذا المزاد لم يعد نشطاً أو لم يتم العثور عليه.',
            ephemeral: true
        });
    } catch (e) { }
    return;
}


    try {
        
        if (action === 'top') {
            await interaction.deferReply({ ephemeral: true }); 
            try {
                
                

                
                const sortedBids = [...auction.bids] 
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 10);

                const topBidsEmbed = new MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle('📊 المتصدرون في المزاد')
                    .setDescription(
                        sortedBids.length > 0 
                            ? sortedBids.map((bid, index) => 
                                `${getPositionEmoji(index + 1)} <@${bid.userId}> - $${bid.amount.toLocaleString()}`
                            ).join('\n')
                            : 'لا توجد مزايدات حتى الآن'
                    )
                    .setTimestamp()
                    .setFooter({ 
                        text: `Auction ID: ${auctionId}`, 
                        iconURL: interaction.guild?.iconURL({ dynamic: true })
                    });

                await interaction.editReply({ 
                    embeds: [topBidsEmbed],
                    
                });
            } catch (error) {
                console.error('Error showing top bidders:', error);
                
                if (!interaction.replied) {
                     await interaction.reply({ content: 'حدث خطأ أثناء محاولة عرض المتصدرين', ephemeral: true });
        } else {
                     await interaction.editReply({ content: 'حدث خطأ أثناء محاولة عرض المتصدرين', embeds: [], components: [] });
                }
            }
            return; 
        }

        
        
        
        
        
        
        

        const userId = interaction.user.id;
        safeQuery(`SELECT * FROM accounts WHERE discord=?`, [userId], async function(error, results) { 
            try { 
                if (error) {
                    console.error('Database error checking linked account:', error);
                    await interaction.reply({ 
                        content: 'حدث خطأ أثناء التحقق من حسابك. يرجى المحاولة مرة أخرى لاحقاً.',
                        ephemeral: true
                    });
                    return;
                }

                const accountInfo = results[0];
                if (!accountInfo || !accountInfo.discord || accountInfo.discord === "" || accountInfo.discord === "0" || !accountInfo.username) {
                    await interaction.reply({ 
                        content: 'يجب عليك ربط حساب الديسكورد الخاص بك بحساب اللعبة (\`/linkdiscord\`) أولاً!',
                        ephemeral: true
                    });
                    return;
                }

                
                const username = accountInfo.username; 

                switch (action) {
                    case 'bid':
                        try {
                            const bidModal = new Modal()
                                .setCustomId(`bid_modal_${auctionId}`) 
                                .setTitle('المزايدة على العنصر');
                            
                            const amountInput = new TextInputComponent()
                                .setCustomId('bid_amount')
                                .setLabel('أدخل مبلغ المزايدة')
                                .setStyle('SHORT')
                                .setPlaceholder('مثال: 1,000,000')
                                .setRequired(true);

                            const firstActionRow = new MessageActionRow().addComponents(amountInput);
                            bidModal.addComponents(firstActionRow);

                            await interaction.showModal(bidModal);
                            

                        } catch (error) {
                            console.error('Error showing bid modal:', error);
                            
                            if (!interaction.replied && !interaction.deferred) {
                                await interaction.reply({ content: 'حدث خطأ أثناء محاولة فتح نموذج المزايدة', ephemeral: true });
                            }
                        }
                        break;

                    case 'deposit':
                        try {
                            const depositModal = new Modal()
                                .setCustomId(`deposit_modal_${auctionId}`) 
                                .setTitle('إيداع رصيد في بنك النظام');
                             
                            const amountInput = new TextInputComponent()
                                .setCustomId('deposit_amount')
                                .setLabel('أدخل المبلغ المراد إيداعه')
                                .setStyle('SHORT')
                                .setPlaceholder('مثال: 1,000,000')
                                .setRequired(true);
                            const firstActionRow = new MessageActionRow().addComponents(amountInput);
                            depositModal.addComponents(firstActionRow);

                            await interaction.showModal(depositModal);
                            

                        } catch (error) {
                            console.error('Error showing deposit modal:', error);
                            if (!interaction.replied && !interaction.deferred) {
                                await interaction.reply({ content: 'حدث خطأ أثناء محاولة فتح نموذج الإيداع', ephemeral: true });
                            }
                        }
                        break;

                    case 'withdraw':
                        try {
                            const withdrawModal = new Modal()
                                .setCustomId(`withdraw_modal_${auctionId}`) 
                                .setTitle('سحب رصيد من بنك النظام');
                            
                            const amountInput = new TextInputComponent()
                                .setCustomId('withdraw_amount')
                                .setLabel('أدخل المبلغ المراد سحبه')
                                .setStyle('SHORT')
                                .setPlaceholder('مثال: 1,000,000')
                                .setRequired(true);
                            const firstActionRow = new MessageActionRow().addComponents(amountInput);
                            withdrawModal.addComponents(firstActionRow);

                            await interaction.showModal(withdrawModal);
                            

                        } catch (error) {
                            console.error('Error showing withdraw modal:', error);
                            if (!interaction.replied && !interaction.deferred) {
                                await interaction.reply({ content: 'حدث خطأ أثناء محاولة فتح نموذج السحب', ephemeral: true });
                            }
                        }
                        break;
                } 
            } catch (mysqlCallbackError) {
                 console.error("Error inside mysql callback for auction button:", mysqlCallbackError);
                 if (!interaction.replied && !interaction.deferred) {
                     try {
                         await interaction.reply({ content: 'حدث خطأ داخلي بمعالجة طلبك.', ephemeral: true });
                     } catch (e) {  }
                 }
            }
        }); 
    } catch (error) { 
        console.error('Error handling auction button:', error);
        if (!interaction.replied && !interaction.deferred) {
             try {
        await interaction.reply({
            content: 'حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى لاحقاً.',
            ephemeral: true
        });
             } catch (e) {  }
        }
    }
});






karizma.on('interactionCreate', async interaction => {
    if (!interaction.isModalSubmit()) return;

    
    if (interaction.customId.startsWith('deposit_modal_')) {
        await interaction.deferReply({ ephemeral: true }); 
        try {
            const auctionId = interaction.customId.split('_')[2]; 
            const amountStr = interaction.fields.getTextInputValue('deposit_amount').replace(/,/g, ''); 
            const amount = parseInt(amountStr); 
            const userId = interaction.user.id;

            
            if (isNaN(amount) || amount <= 0) {
                await interaction.editReply({ content: '❌ يرجى إدخال مبلغ صحيح وموجب' });
                return;
            }
            if (amount < 10000) { 
                await interaction.editReply({ content: '❌ لا يمكنك إيداع مبلغ أقل من 10,000 دولار' });
                return;
            }

            
            safeQuery(`SELECT username FROM accounts WHERE discord=?`, [userId], async function(error, results) { 
                 try { 
                if (error) {
                        console.error('Database error fetching username for deposit:', error);
                        await interaction.editReply({ content: 'حدث خطأ أثناء التحقق من حسابك' });
                    return;
                }
                    if (!results.length || !results[0].username) {
                        await interaction.editReply({ content: 'لم يتم العثور على حسابك المرتبط' });
                    return;
                }
                const username = results[0].username;

                    
                server.resources.handler.takePlayerMoney(username, amount)
                    .then(async success => {
                            if (success === true) { 
                                
                            new Promise((resolve, reject) => {
                                ticketDB.run(
                                        `INSERT INTO auction_balances (account_name, balance) VALUES (?, ?)
                                         ON CONFLICT(account_name) DO UPDATE SET balance = balance + ?`,
                                    [username, amount, amount],
                                    function(err) {
                                            if (err) reject(err); else resolve();
                                    }
                                );
                            })
                            .then(async () => {
                                    
                                    ticketDB.get('SELECT balance FROM auction_balances WHERE account_name = ?', [username], async (balErr, balRow) => {
                                         const currentBalance = (balErr || !balRow) ? 'غير معروف' : `$${balRow.balance.toLocaleString()}`;
                                const successEmbed = new MessageEmbed()
                                    .setColor('#00ff00')
                                    .setTitle('✅ تم الإيداع بنجاح')
                                             .setDescription(`تم إيداع **$${amount.toLocaleString()}** في رصيد بنك النظام.\n**رصيدك الحالي:** ${currentBalance}`)
                                             .addFields({ name: 'اسم الحساب', value: username })
                                    .setTimestamp()
                                             .setFooter({ text: 'نظام المزادات', iconURL: interaction.guild?.iconURL({ dynamic: true }) });
                                         await interaction.editReply({ embeds: [successEmbed] });
                                });
                            })
                                .catch(async dbError => { 
                                    console.error('Error updating balance in SQLite:', dbError);
                                    
                                    await interaction.editReply({ content: 'حدث خطأ أثناء تحديث رصيدك في النظام. تم سحب المبلغ من اللعبة ولكن لم يتم إضافته هنا. يرجى التواصل مع الإدارة.' });
                            });                
                        } else {
                                
                                const failureReason = typeof success === 'string' ? success : 'تأكد من امتلاكك للمبلغ المطلوب وأنك متصل بالسيرفر.';
                                await interaction.editReply({ content: `❌ فشلت عملية السحب من حسابك داخل اللعبة. السبب: ${failureReason}` });
                            }
                        })
                        .catch(async resourceError => { 
                            console.error('Error calling takePlayerMoney resource:', resourceError);
                            await interaction.editReply({ content: 'حدث خطأ أثناء الاتصال بالسيرفر لسحب المال.' });
                        });
                 } catch (callbackError) {
                      console.error("Error inside deposit mysql callback:", callbackError);
                      await interaction.editReply({ content: 'حدث خطأ داخلي.' });
                 }
            }); 

        } catch (error) {
            console.error('Error processing deposit modal:', error);
            if (!interaction.replied) { 
                 await interaction.reply({ content: 'حدث خطأ أثناء معالجة عملية الإيداع', ephemeral: true });
            } else {
                 await interaction.editReply({ content: 'حدث خطأ أثناء معالجة عملية الإيداع', embeds: [], components: [] });
            }
        }
    } 

    
    else if (interaction.customId.startsWith('withdraw_modal_')) {
         await interaction.deferReply({ ephemeral: true }); 
         try {
            const auctionId = interaction.customId.split('_')[2]; 
            const amountStr = interaction.fields.getTextInputValue('withdraw_amount').replace(/,/g, ''); 
            const amount = parseInt(amountStr);
            const userId = interaction.user.id;

            
            if (isNaN(amount) || amount <= 0) {
                await interaction.editReply({ content: '❌ يرجى إدخال مبلغ صحيح وموجب' });
                return;
            }
             if (amount < 10000) { 
                await interaction.editReply({ content: '❌ لا يمكنك سحب مبلغ أقل من 10,000 دولار' });
                return;
            }

            
             safeQuery(`SELECT username FROM accounts WHERE discord=?`, [userId], async function(error, results) { 
                try { 
                if (error) {
                        console.error('Database error fetching username for withdraw:', error);
                        await interaction.editReply({ content: 'حدث خطأ أثناء التحقق من حسابك' });
                    return;
                }
                    if (!results.length || !results[0].username) {
                        await interaction.editReply({ content: 'لم يتم العثور على حسابك المرتبط' });
                    return;
                }
                const username = results[0].username;

                    
                    let isParticipatingInActiveAuction = false;
                    for (const [aid, auction] of activeAuctions) { 
                        if (auction.status === 'active' && auction.highestBidder === userId) { 
                            isParticipatingInActiveAuction = true;
                        break;
                    }
                }
                    if (isParticipatingInActiveAuction) {
                        await interaction.editReply({ content: '❌ لا يمكنك سحب الأموال وأنت متصدر في مزاد نشط حالياً. يجب عليك الانتظار حتى انتهاء المزاد أو حتى يتفوق عليك شخص آخر.' });
                    return;
                }

                    
                ticketDB.get(
                    'SELECT balance FROM auction_balances WHERE account_name = ?',
                    [username],
                    async (err, row) => {
                            try { 
                            if (err) {
                                    console.error('Database error checking balance for withdraw:', err);
                                    await interaction.editReply({ content: '❌ حدث خطأ في قاعدة البيانات عند التحقق من الرصيد.' });
                                return;
                            }
                                if (!row || row.balance < amount) {
                                    const currentBalance = row ? `$${row.balance.toLocaleString()}` : '$0';
                                    await interaction.editReply({ content: `❌ رصيدك في بنك النظام غير كافٍ. رصيدك الحالي: ${currentBalance}` });
                                return;
                            }
                                const currentSystemBalance = row.balance; 

                                
                            const success = await server.resources.handler.givePlayerMoney(username, amount);
                            
                                if (success === true) { 
                                    
                                ticketDB.run(
                                    'UPDATE auction_balances SET balance = balance - ? WHERE account_name = ?',
                                    [amount, username],
                                    async function(updateErr) {
                                        if (updateErr) {
                                                console.error('Error updating SQLite balance after withdraw:', updateErr);
                                                
                                                await interaction.editReply({ content: '❌ حدث خطأ أثناء تحديث رصيدك في النظام. تم إرسال المبلغ للعبة ولكن لم يتم خصمه هنا. يرجى التواصل مع الإدارة.' });
                                            return;
                                        }
                                            const remainingBalance = currentSystemBalance - amount;
                                        const successEmbed = new MessageEmbed()
                                            .setColor('#00ff00')
                                            .setTitle('✅ تم السحب بنجاح')
                                                .setDescription(`تم سحب **$${amount.toLocaleString()}** من بنك النظام وإضافته لحسابك في اللعبة.\n**رصيدك المتبقي:** $${remainingBalance.toLocaleString()}`)
                                                .addFields({ name: 'اسم الحساب', value: username })
                                            .setTimestamp()
                                                .setFooter({ text: 'نظام المزادات', iconURL: interaction.guild?.iconURL({ dynamic: true }) });
                                            await interaction.editReply({ embeds: [successEmbed] });
                                        }
                                    ); 
                            } else {
                                     const failureReason = typeof success === 'string' ? success : 'تأكد من تواجدك داخل السيرفر.';
                                    await interaction.editReply({ content: `❌ فشلت عملية الإضافة إلى حسابك داخل اللعبة. السبب: ${failureReason}` });
                                }
                            } catch (balanceCallbackError) {
                                 console.error("Error inside withdraw balance check callback:", balanceCallbackError);
                                 await interaction.editReply({ content: 'حدث خطأ داخلي أثناء التحقق من الرصيد.' });
                            }
                        } 
                    ); 

                } catch (mysqlCallbackError) {
                     console.error("Error inside withdraw mysql callback:", mysqlCallbackError);
                     await interaction.editReply({ content: 'حدث خطأ داخلي.' });
                }

            }); 

        } catch (error) {
            console.error('Error processing withdraw modal:', error);
            if (!interaction.replied) {
                 await interaction.reply({ content: 'حدث خطأ أثناء معالجة عملية السحب', ephemeral: true });
            } else {
                 await interaction.editReply({ content: 'حدث خطأ أثناء معالجة عملية السحب', embeds: [], components: [] });
            }
         }
    } 

     
    else if (interaction.customId.startsWith('bid_modal_')) {
        await interaction.deferReply({ ephemeral: true }); 
        try {
            const auctionId = interaction.customId.split('_')[2];
            const bidAmountStr = interaction.fields.getTextInputValue('bid_amount').replace(/,/g, ''); 
            const bidAmount = parseInt(bidAmountStr);
            const userId = interaction.user.id;

            
            if (isNaN(bidAmount) || bidAmount <= 0) {
                await interaction.editReply({ content: '❌ يرجى إدخال مبلغ صحيح وموجب' });
                return;
            }

            
            const auction = activeAuctions.get(auctionId);
            if (!auction || auction.status !== 'active') { 
                await interaction.editReply({ content: '❌ المزاد غير موجود أو انتهى' });
                return;
            }

             
            if (auction.highestBidder === userId) {
                await interaction.editReply({ content: '❌ أنت بالفعل صاحب أعلى مزايدة حالياً!' });
                return;
            }


            
            const minBid = auction.currentBid > 0 ? auction.currentBid : auction.startPrice;
            if (bidAmount <= minBid) {
                await interaction.editReply({ content: `❌ يجب أن يكون مبلغ المزايدة أكبر من المزايدة الحالية ($${minBid.toLocaleString()})` });
                return;
            }

            
            safeQuery(`SELECT username FROM accounts WHERE discord=?`, [userId], async function(error, results) { 
                try { 
                    if (error || !results.length || !results[0].username) {
                        await interaction.editReply({ content: '❌ حدث خطأ أثناء التحقق من حسابك أو لم يتم العثور عليه' });
                    return;
                }
                const username = results[0].username;

                    
                ticketDB.get(
                    'SELECT balance FROM auction_balances WHERE account_name = ?',
                    [username],
                    async (err, row) => {
                            try { 
                                if (err) {
                                    console.error(`Error checking balance for bid by ${username}:`, err);
                                    await interaction.editReply({ content: '❌ خطأ في التحقق من رصيدك.' });
                            return;
                        }
                                if (!row || row.balance < bidAmount) {
                                    const currentBalance = row ? `$${row.balance.toLocaleString()}` : '$0';
                                    await interaction.editReply({ content: `❌ رصيدك في بنك النظام غير كافٍ ($${currentBalance}). تحتاج إلى $${bidAmount.toLocaleString()}` });
                            return;
                        }

                                
                                const previousHighestBidder = auction.highestBidder; 
                                const previousBidAmount = auction.currentBid; 

                                
                        auction.currentBid = bidAmount;
                        auction.highestBidder = userId;
                                
                        const existingBidIndex = auction.bids.findIndex(bid => bid.userId === userId);
                        if (existingBidIndex !== -1) {
                                    auction.bids[existingBidIndex].amount = bidAmount;
                                    auction.bids[existingBidIndex].timestamp = Date.now();
                        } else {
                                    auction.bids.push({ userId: userId, amount: bidAmount, timestamp: Date.now() });
                                }

                                
                                await saveAuctionToDatabase(auction); 

                                
                                try {
                        const channel = await interaction.guild.channels.fetch(auction.channelId);
                        const message = await channel.messages.fetch(auction.messageId);
                        
                                    const updatedEmbed = new MessageEmbed(message.embeds[0]) 
                                        .spliceFields(2, 1, { 
                                              name: '**أعلى مزايدة حالية :**',
                                              value: `$${bidAmount.toLocaleString()} من <@${userId}>`
                                        })
                                        .setTimestamp(); 


                        await message.edit({ embeds: [updatedEmbed] });
                                } catch (msgUpdateError) {
                                     console.error(`Failed to update auction message ${auction.messageId} after bid:`, msgUpdateError);
                                     
                                }


                                
                        const successEmbed = new MessageEmbed()
                            .setColor('#00ff00')
                            .setTitle('✅ تمت المزايدة بنجاح')
                                    .setDescription(`تم وضع مزايدتك بمبلغ **$${bidAmount.toLocaleString()}** على **${auction.itemName}**!`)
                                    .setTimestamp();
                                await interaction.editReply({ embeds: [successEmbed] });

                                
                                if (previousHighestBidder && previousHighestBidder !== userId) {
                                    try {
                                        const previousBidderUser = await karizma.users.fetch(previousHighestBidder);
                                        const notifyEmbed = new MessageEmbed()
                                             .setColor('#ffcc00')
                                             .setTitle('🔔 تم التفوق على مزايدتك!')
                                             .setDescription(`🎯 يا <@${previousHighestBidder}>، الحق يابرنس!  
مزايدتك القديمة كانت **$${previousBidAmount.toLocaleString()}** على **${auction.itemName}**  
بس <@${userId}> طلع تقيل وحط **$${bidAmount.toLocaleString()}** 💸  
[اضغط هنا وشوف المزاد قبل ما يتاخد منك!](https://discord.com/channels/${interaction.guildId}/${auction.channelId}/${auction.messageId})`)
                            .setTimestamp();
                                        await previousBidderUser.send({ embeds: [notifyEmbed] });
                                    } catch (dmError) {
                                         console.warn(`Failed to send outbid notification DM to ${previousHighestBidder}: ${dmError.message}`);
                                    }
                                }
                                

                            } catch (balanceCallbackError) {
                                 console.error(`Error inside bid balance check callback for ${username}:`, balanceCallbackError);
                                 await interaction.editReply({ content: '❌ خطأ داخلي أثناء التحقق من الرصيد.' });
                            }
                        } 
                    ); 

                } catch (mysqlCallbackError) {
                     console.error(`Error inside bid mysql callback for ${userId}:`, mysqlCallbackError);
                     await interaction.editReply({ content: '❌ خطأ داخلي.' });
                }

            }); 

        } catch (error) {
            console.error('Error processing bid modal:', error);
            if (!interaction.replied) {
                 await interaction.reply({ content: '❌ حدث خطأ أثناء معالجة المزايدة', ephemeral: true });
            } else {
                 await interaction.editReply({ content: '❌ حدث خطأ أثناء معالجة المزايدة', embeds: [], components: [] });
            }
        }
    } 

}); 



karizma.on('interactionCreate', async interaction => {
    if (!interaction.isButton() || interaction.customId !== 'delete_ticket') return;

    try {
        
        
        const channelId = interaction.channel.id;
        let ticketInfo = ticketData.get(channelId);
        
        const staffRoleId = TICKET_TYPES[ticketInfo.ticketType.toUpperCase()].staffRoleId;
        if (!interaction.member.roles.cache.has(staffRoleId)) {
            return interaction.reply({
                content: '❌ عذراً، ليس لديك صلاحية حذف التذكرة.',
                            ephemeral: true
                        });
        }

        console.log('Attempting to delete ticket:', {
            channelId,
            ticketInfo,
            allTickets: Array.from(ticketData.entries())
        });

        
        if (!ticketInfo) {
            const ticket = await new Promise((resolve, reject) => {
                ticketDB.get('SELECT * FROM tickets WHERE channelId = ?', [channelId], (err, row) => {
                    if (err) reject(err); else resolve(row);
                });
            });
            if (ticket) {
                ticketInfo = {
                    ownerId: ticket.ownerId,
                    ownerUsername: ticket.ownerUsername,
                    ticketType: ticket.ticketType,
                    createdAt: ticket.createdAt,
                    status: ticket.status,
                    claimedBy: ticket.claimedBy,
                    closedBy: ticket.closedBy,
                    closedAt: ticket.closedAt,
                    closeReason: ticket.closeReason
                };
                ticketData.set(channelId, ticketInfo); 
            }
        }

        if (!ticketInfo) {
            return interaction.reply({
                content: '❌ لم يتم العثور على بيانات التذكرة!',
                ephemeral: true
            });
        }

        
        if (ticketInfo.status !== 'closed') {
            return interaction.reply({
                content: '❌ لا يمكن حذف التذكرة إلا بعد إغلاقها أولاً.',
                ephemeral: true
            });
        }

        
        const confirmEmbed = new MessageEmbed()
            .setColor('#ff0000')
            .setTitle('⚠️ تأكيد حذف التذكرة')
            .setDescription('هل أنت متأكد من أنك تريد حذف هذه التذكرة؟ **هذا الإجراء لا يمكن التراجع عنه وسيتم حذف القناة نهائياً.**')
            .setFooter({ text: 'سيتم إلغاء العملية تلقائياً بعد 30 ثانية' });

        const confirmRow = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('confirm_delete_final')
                    .setLabel('تأكيد الحذف النهائي')
                    .setStyle('DANGER')
                    .setEmoji('🗑️'),
                new MessageButton()
                    .setCustomId('cancel_delete')
                    .setLabel('إلغاء')
                    .setStyle('SECONDARY')
                    .setEmoji('✖️')
            );

        
        const confirmMessage = await interaction.reply({
            embeds: [confirmEmbed],
            components: [confirmRow],
            ephemeral: true,
            fetchReply: true
        });

        
        const filter = i => (i.customId === 'confirm_delete_final' || i.customId === 'cancel_delete') && i.user.id === interaction.user.id;
        
        try {
            const confirmationInteraction = await interaction.channel.awaitMessageComponent({ 
                filter, 
                time: 30000,
                componentType: 'BUTTON'
            });

            if (confirmationInteraction.customId === 'confirm_delete_final') {
                await confirmationInteraction.update({
                    content: '🗑️ جارٍ حذف التذكرة...',
                    embeds: [],
                    components: []
                });

                
                try {
                    
                    await ticketDBManager.deleteTicket(channelId);
                    
                    ticketData.delete(channelId);
                    console.log(`Deleted ticket data for ${channelId}`);

                    
                    const auditChannelId = '1410394429956820992';
                    const auditChannel = interaction.guild.channels.cache.get(auditChannelId);
                    if (auditChannel && ticketInfo) {
                        const auditEmbed = new MessageEmbed()
                            .setColor('#000000')
                            .setTitle('🗑️ تم حذف التذكرة')
                            .addFields(
                                { name: '🎫 رقم التذكرة', value: interaction.channel.name, inline: true },
                                { name: '👤 صاحب التذكرة', value: `${ticketInfo.ownerUsername} (${ticketInfo.ownerId})`, inline: true },
                                { name: '🗑️ حذفها', value: `${interaction.user} (${interaction.user.id})`, inline: true },
                                { name: '⏰ الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                            )
                            .setTimestamp()
                            .setFooter({ text: 'نظام سجل التذاكر' });
                        
                        await auditChannel.send({ embeds: [auditEmbed] }).catch(err => console.error('Error sending audit log:', err));
                    }

                    
                    setTimeout(() => {
                        interaction.channel.delete(`Ticket deleted by ${interaction.user.tag}`)
                            .then(() => console.log(`Deleted channel ${channelId}`))
                            .catch(deleteError => console.error(`Error deleting channel ${channelId}:`, deleteError));
                    }, 2000); 

                } catch (deletionError) {
                    console.error('Error during final ticket deletion steps:', deletionError);
                    await confirmationInteraction.editReply({
                        content: '❌ حدث خطأ أثناء حذف بيانات التذكرة. قد تحتاج القناة للحذف يدوياً.',
                        embeds: [], 
                        components: []
                    });
                }
            } else if (confirmationInteraction.customId === 'cancel_delete') {
                await confirmationInteraction.update({
                    content: '✖️ تم إلغاء عملية الحذف.',
                    embeds: [],
                    components: []
                });
            }
        } catch (err) {
            console.log(`Delete confirmation timed out for channel ${channelId}`);
            
            try {
                await interaction.editReply({
                    content: '⏰ انتهت مهلة التأكيد. تم إلغاء الحذف.',
                    embeds: [],
                    components: []
                });
            } catch (editError) {
                console.error("Failed to edit delete confirmation on timeout:", editError);
            }
        }
        } catch (error) {
        console.error('Error in delete ticket handler:', error);
        
        
        try {
            if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                    content: '❌ حدث خطأ أثناء محاولة بدء عملية حذف التذكرة',
                ephemeral: true
            });
            }
        } catch (e) {
            console.error('Failed to send error message:', e);
        }
    }
});


function getPositionEmoji(position) {
    const emojis = ['🥇', '🥈', '🥉'];
    return position <= 3 ? emojis[position - 1] : `${position}.`;
}


karizma.on('interactionCreate', async interaction => {
    
    if (!interaction.isButton() || !interaction.customId.startsWith('claim:')) return;
    
    try {
        
        await interaction.deferReply({ ephemeral: true });
        
        
        const [, itemType, winnerUsername, auctionId] = interaction.customId.split(':');
        
        console.log(`Claim button clicked for auction ${auctionId} by ${interaction.user.tag}`);
        
        const userId = interaction.user.id;

        
        safeQuery(`SELECT username FROM accounts WHERE discord=?`, [userId], async function(error, results) { 
            try { 
                if (error) {
                        console.error('Database error fetching username for deposit:', error);
                        await interaction.editReply({ content: 'حدث خطأ أثناء التحقق من حسابك' });
                    return;
                }
                    if (!results.length || !results[0].username) {
                        await interaction.editReply({ content: 'لم يتم العثور على حسابك المرتبط' });
                    return;
                }
                const username = results[0].username;
                if (username == winnerUsername) {
                    
                    
                    
                    const isGrocery = String(itemType).toLowerCase().includes('grocery') || String(itemType).toLowerCase().startsWith('grocery');

                    if (isGrocery && server && server.resources && typeof server.resources.handler.acceptOrder === 'function') {
                        
                        
                        const groceryId = auctionId || itemType;
                        const price = 0;
                        const category = 'grocery';
                        const value = '1';
                        const product_name = `grocery_${groceryId}`;

                        server.resources.handler.acceptOrder(username, groceryId, price, category, value, product_name)
                        .then(async result => {
                            try {
                                
                                const success = typeof result === 'string' ? result.includes('✅') : result === true;
                                if (success) {
                                    await interaction.editReply({ content: 'تم إستلام البقالة بنجاح ✅' });
                                    
                                    const message = interaction.message;
                                    const components = message.components;
                                    for (const row of components) {
                                        for (const component of row.components) {
                                            if (component.customId === interaction.customId) {
                                                component.setDisabled(true);
                                                component.setLabel('تم إستلام الجائزة ✅');
                                            }
                                        }
                                    }
                                    await interaction.message.edit({ components });
                                } else {
                                    const errorMessage = typeof result === 'string' ? result : 'حدث خطأ أثناء إستلام البقالة.';
                                    await interaction.editReply({ content: `❌ ${errorMessage}` });
                                }
                            } catch (err) {
                                console.error('Error handling acceptOrder result for claim:', err);
                                await interaction.editReply({ content: 'حدث خطأ أثناء معالجة استجابة خادم اللعبة.' });
                            }
                        })
                        .catch(err => {
                            console.error('Error calling acceptOrder for grocery claim:', err);
                            interaction.editReply({ content: 'حدث خطأ أثناء التواصل مع خادم اللعبة ❌' });
                        });
                    } else {
                        
                        server.resources.handler.giveAuctionItem(username, itemType, auctionId)
                        .then(result => {
                            if (result === true) { 
                                interaction.editReply({ content: 'تم إستلام العنصر بنجاح ✅' });
                                
                                const message = interaction.message;
                                const components = message.components;
                                
                                
                                for (const row of components) {
                                    for (const component of row.components) {
                                        if (component.customId === interaction.customId) {
                                            component.setDisabled(true);
                                            component.setLabel('تم إستلام الجائزة ✅');
                                        }
                                    }
                                }
                                
                                
                                interaction.message.edit({ components: components });
                            } else {
                                
                                const errorMessage = typeof result === 'string' ? result : 'حدث خطأ أثناء إستلام العنصر.';
                                interaction.editReply({ content: `❌ ${errorMessage}` });
                            }
                        })
                        .catch(err => {
                            console.error('Error calling giveAuctionItem:', err);
                            interaction.editReply({ content: 'حدث خطأ أثناء التواصل مع خادم اللعبة ❌' });
                        });
                    }
                } else {
                    interaction.editReply({ content: 'ليس لديك صلاحية المطالبة بهذا العنصر.' });
                }
            } catch (error) {
                console.error('Error in claim button handler:', error);
                try {
                    if (interaction.deferred) {
                        await interaction.editReply({
                            content: '❌ حدث خطأ في معالجة الطلب.',
                            ephemeral: true
                        });
                    } else {
                        await interaction.reply({
                            content: '❌ حدث خطأ في معالجة الطلب.',
                            ephemeral: true
                        });
                    }
                } catch (replyError) {
                    console.error('Failed to reply after error:', replyError);
                }
            }
        });
    } catch (error) {
        console.error('Error in claim button handler:', error);
        try {
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ حدث خطأ في معالجة الطلب.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: '❌ حدث خطأ في معالجة الطلب.',
                    ephemeral: true
                });
            }
        } catch (replyError) {
            console.error('Failed to reply after error:', replyError);
        }
    }
});

karizma.on('interactionCreate', async interaction => {
    
    if (interaction.isSelectMenu() && interaction.customId.startsWith('character_details_')) {
        await interaction.deferUpdate();
        
        const characterId = interaction.values[0];
        const accountId = interaction.customId.split('_')[2];
        
        
        safeQuery(`
            SELECT c.*, a.username as account_name 
            FROM characters c 
            JOIN accounts a ON c.account = a.id 
            WHERE c.id = ? AND c.account = ?
        `, [characterId, accountId], async (error, results) => {
            if (error || results.length === 0) {
                console.error('Error fetching character details:', error);
                return await interaction.followUp({ 
                    content: 'حدث خطأ أثناء جلب معلومات الشخصية.', 
                    ephemeral: true 
                });
            }
            
            const characterData = results[0];
            
            
            const moneyValue = characterData.money !== null ? parseInt(characterData.money).toLocaleString() : 'N/A';
            const bankMoneyValue = characterData.bankmoney !== null ? parseInt(characterData.bankmoney).toLocaleString() : 'N/A';
            const totalMoneyValue = (parseInt(characterData.money || 0) + parseInt(characterData.bankmoney || 0)).toLocaleString();
            const lastLoginFormatted = characterData.lastlogin ? new Date(characterData.lastlogin).toLocaleString() : 'Never';
            const hoursPlayedValue = characterData.hoursplayed || '0';
            const ageValue = characterData.age || 'N/A';
            const fingerprintValue = characterData.fingerprint || 'N/A';
            const lastAreaValue = characterData.lastarea || 'Unknown';
            
            
            const charEmbed = new MessageEmbed()
                .setColor('#4CAF50')
                .setTitle(`Character: ${characterData.charactername}`)
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .addFields(
                    { name: '👤 Owner', value: `${characterData.account_name} (ID: ${accountId})`, inline: false },
                    { name: '👛 Cash', value: `$${moneyValue}`, inline: true },
                    { name: '🏦 Bank', value: `$${bankMoneyValue}`, inline: true },
                    { name: '💰 Total', value: `$${totalMoneyValue}`, inline: true },
                    { name: '⏱️ Hours Played', value: `${hoursPlayedValue}`, inline: true },
                    { name: '🎂 Age', value: `${ageValue}`, inline: true },
                    { name: '📍 Last Location', value: `${lastAreaValue}`, inline: false },
                    { name: '⏰ Last Login', value: `${lastLoginFormatted}`, inline: false }
                )
                .setTimestamp()
                .setFooter({ 
                    text: `Character ID: ${characterId}`, 
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                });
            
            
            const backButton = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId(`back_to_account_${accountId}`)
                        .setLabel('Back to Account Info')
                        .setStyle('SECONDARY')
                        .setEmoji('⬅️')
                );
            
            
            await interaction.followUp({ 
                embeds: [charEmbed], 
                components: [backButton],
                ephemeral: true 
            });
        });
    }
    
    
    if (interaction.isButton() && interaction.customId.startsWith('back_to_account_')) {
        
        await interaction.update({ 
            content: "استخدم الأمر `/check` مجددًا لعرض معلومات الحساب", 
            embeds: [], 
            components: [],
            ephemeral: true 
        });
    }
    
    if (!interaction.isButton()) return;
});


karizma.on('interactionCreate', async interaction => {
    if (!interaction.isSelectMenu()) return;

    if (interaction.customId.startsWith('character_details_')) {
        await interaction.deferUpdate();
        const accountId = interaction.customId.split('_')[2];
        const characterId = interaction.values[0];

        
        safeQuery(
            `SELECT c.*, a.username 
             FROM characters c 
             JOIN accounts a ON c.account = a.id 
             WHERE c.id = ? AND c.account = ?`, 
            [characterId, accountId], 
            async (error, results) => {
                if (error) {
                    console.error('Error fetching character details:', error);
                    return await interaction.followUp({ 
                        content: 'حدث خطأ أثناء جلب بيانات الشخصية',
                        ephemeral: true 
                    });
                }

                if (!results || results.length === 0) {
                    return await interaction.followUp({ 
                        content: 'لم يتم العثور على بيانات الشخصية',
                        ephemeral: true 
                    });
                }

                const character = results[0];
                
                
                const formatMoney = (amount) => `$${parseInt(amount).toLocaleString()}`;
                const formatDate = (timestamp) => {
                    if (!timestamp) return 'Never';
                    return new Date(timestamp * 1000).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                };

                
                const charEmbed = new MessageEmbed()
                    .setColor('#ff9900')
                    .setTitle(`Character Information: ${character.charactername}`)
                    .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                    .addFields(
                        { name: '👤 Character Name', value: character.charactername, inline: true },
                        { name: '🆔 Character ID', value: `${character.id}`, inline: true },
                        { name: '👨 Age', value: `${character.age || 'Unknown'}`, inline: true },
                        { name: '💰 Money', value: formatMoney(character.money || 0), inline: true },
                        { name: '🏦 Bank Money', value: formatMoney(character.bankmoney || 0), inline: true },
                        { name: '📍 Last Area', value: character.lastarea || 'Unknown', inline: false },
                        { name: '⏱️ Hours Played', value: `${character.hoursplayed || 0} hours`, inline: true },
                        { name: '🕒 Last Login', value: formatDate(character.lastlogin), inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ 
                        text: `Account: ${character.username}`, 
                        iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                    });

                
                const backButton = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId(`back_to_account_${accountId}`)
                            .setLabel('Back to Account Info')
                            .setStyle('SECONDARY')
                            .setEmoji('⬅️')
                    );

                
                await interaction.followUp({
                    embeds: [charEmbed],
                    components: [backButton],
                    ephemeral: true
                });
            }
        );
    }
});


karizma.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('back_to_account_')) {
        await interaction.reply({
            content: 'استخدم أمر /check مرة أخرى لعرض معلومات الحساب',
            ephemeral: true
        });
    }
});


karizma.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'account') {
        const input = interaction.options.getString('user');
        let userId;
        let searchColumn;
    
        const mentionMatch = input.match(/^<@!?(\d+)>$/);
        if (mentionMatch) {
            userId = mentionMatch[1];
            searchColumn = 'discord';
        } else {
            const mentionedUser = interaction.guild.members.cache.find(member => member.user.username.toLowerCase() === input.toLowerCase() || member.user.id === input);
            if (mentionedUser) {
                userId = mentionedUser.user.id;
                searchColumn = 'discord';
            } else {
                userId = input;
                searchColumn = 'username'; 
            }
        }
    
        const sqlQuery = searchColumn === 'discord'
            ? 'SELECT * FROM accounts WHERE discord = ?'
            : 'SELECT * FROM accounts WHERE username = ?';
    
        safeQuery(sqlQuery, [userId], (error, results) => {
            if (error) {
                console.error(error);
                return interaction.reply({ content: 'حدث طأ ثناء البحث في قاعدة البيانات.', ephemeral: true });
            }
    
            if (results.length > 0) {
                const result = results[0];
    
                const username = typeof result.username === 'string' && result.username.trim() !== '' ? result.username : 'غير متوفر';
                const discordId = typeof result.discord === 'string' && result.discord.trim() !== '' && result.discord.length > 8 
                ? `<@${result.discord}>` 
                : 'Not Linked';
                const adminRank = typeof result.admin === 'number' ? result.admin.toString() : (typeof result.admin === 'string' && result.admin.trim() !== '' ? result.admin.trim() : 'غير متوفر');
                
                const formatDate = (dateString) => {
                    const date = new Date(dateString);
                    date.setUTCHours(date.getUTCHours() + 3);
                    const year = date.getUTCFullYear();
                    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                    const day = String(date.getUTCDate()).padStart(2, '0');
                    const hours = String(date.getUTCHours()).padStart(2, '0');
                    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
                    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    
                    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                };
    
                const lastLogin = result.lastlogin instanceof Date 
                    ? formatDate(result.lastlogin) 
                    : (typeof result.lastlogin === 'string' && result.lastlogin.trim() !== '' ? result.lastlogin : 'غير متوفر');
    
                const registerDate = result.registerdate instanceof Date 
                    ? formatDate(result.registerdate) 
                    : (typeof result.registerdate === 'string' && result.registerdate.trim() !== '' ? result.registerdate : 'غير متوفر');
    
                let rankDescription;
                switch (adminRank) {
                    case '0': rankDescription = 'Player'; break;
                    case '1': rankDescription = 'Trial Admin'; break;
                    case '2': rankDescription = 'Admin'; break;
                    case '3': rankDescription = 'Senior Admin'; break;
                    case '4': rankDescription = 'Lead Admin'; break;
                    case '5': rankDescription = 'Supervisor'; break;
                    case '6': rankDescription = 'Head Admin'; break;
                    case '7': rankDescription = 'Vice Founder'; break;
                    case '8': rankDescription = 'Founder'; break;
                    case '9': rankDescription = 'Server Control'; break;
                    case '10': rankDescription = 'Community Developer'; break;
                    case '11': rankDescription = 'Community Manger'; break;
                    case '12': rankDescription = 'Server Owner'; break;
                    default: rankDescription = 'غير متوفر';
                }
    
                const accountId = result.id;
                safeQuery('SELECT id, charactername FROM characters WHERE account = ?', [accountId], (charError, charResults) => {
                    if (charError) {
                        console.error(charError);
                        return interaction.reply({ content: 'حدث خطأ أثناء البحث في جدول الشخصيات.', ephemeral: true });
                    }
    
                    const characterInfo = charResults.map(char => {
                        return `\`\`# ${char.id}\`\` - \`\`${char.charactername}\`\``;
                    }).join('\n');
    
                    const embed = new MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle('معلومات عن المستخدم')
                        .addFields(
                            { name: 'Username', value: username, inline: true },
                            { name: 'Rank', value: rankDescription, inline: true },
                            { name: 'Discord User', value: discordId, inline: true },
                            { name: 'Last Login', value: lastLogin, inline: true },
                            { name: 'Register Date', value: registerDate, inline: true },
                            { name: 'Characters', value: characterInfo || 'لا توجد شخصيات مرتبطة.', inline: false }
                        )
                        .setTimestamp()
                        .setFooter({ text: `طلب من: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

                    interaction.reply({ embeds: [embed] });
                });
            } else {
                interaction.reply({ content: 'لم يتم العثور عل أي معلومات لهذا المستخدم.', ephemeral: true });
            }
        });
    } else if (commandName === 'givemoney'){
        const roleId = '1412844127648874598';
        const member = interaction.member;
        
        if (member.roles.cache.has(roleId)) {
            const playerId = interaction.options.getString('id');
            const moneyAmount = interaction.options.getString('money');
            const moneyReason = interaction.options.getString('reason');

            if (!isNaN(playerId) && !isNaN(moneyAmount)) {
                const displayName = member.nickname || member.user.username;
                const responsibleId = member.id
                server.resources.handler.giveThings(moneyAmount, playerId, displayName)
                .then(result => {
                    interaction.reply({ content: result, ephemeral: true });
                    embedSuccess(moneyLog, "Money Log 💰", result + " \n\n**Money Amount: **``$" + Number(moneyAmount).toLocaleString() + "``\n**Reason: **``" + moneyReason + "``", `<@${responsibleId}>`)
                })
                .catch(error => {
                    interaction.reply({ content: 'حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true });
                    console.error(error);
                });
            } else {
                return interaction.reply({ content: 'يرجى التأكد من أن ID والكمية عبارة عن أرقام صحيحة.', ephemeral: true });
            }
        } else {
            return interaction.reply({ content: 'عذراً، ليس لديك الصلاحيات اللازمة لتنفيذ هذا الأمر', ephemeral: true });
        }
    } else if (commandName === 'find'){
        const roleId = '1410394033066475714';
        const member = interaction.member;
        if (member.roles.cache.has(roleId)) {
            const playerID = interaction.options.getString('input');
            server.resources.handler.getPlayerInfo(playerID)
            .then(result => {
                interaction.reply({ content: result, ephemeral: true });
            })
            .catch(error => {
                interaction.reply({ content: 'حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true });
                console.error(error);
            });
        } else {
            return interaction.reply({ content: 'عذراً، ليس لديك الصلاحيات اللازمة لتنفيذ هذا الأمر', ephemeral: true });
        }
    } else if (commandName === 'myaccount') {
        
        safeQuery("SELECT * FROM accounts WHERE discord = ?", [interaction.user.id], async (error, results) => {
            if (error) {
                console.error('Error querying database:', error);
                return await interaction.reply({ 
                    content: 'حدث خطأ أثناء البحث في قاعدة البيانات، يرجى المحاولة مرة أخرى', 
                    ephemeral: true 
                });
            }

            if (!results || results.length === 0) {
                return await interaction.reply({ 
                    content: 'لم يتم العثور على حساب مرتبط بحساب الديسكورد الخاص بك', 
                    ephemeral: true 
                });
            }

            const accountData = results[0];
            
            
            const usernameValue = accountData.username || 'غير متوفر';
            const idValue = accountData.id.toString() || 'غير متوفر';
            const creditsValue = (accountData.credits || 0).toLocaleString() || 'غير متوفر';
            const emailValue = accountData.email || 'غير متوفر';
            const ipValue = accountData.ip || 'غير متوفر';
            const mtaserialValue = accountData.mtaserial || 'غير متوفر';
            const discordMention = accountData.discord 
                ? `<@${accountData.discord}>` 
                : 'غير متوفر';
            
            
            const embed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('My Account Information')
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .addFields(
                    { name: '👤 Username', value: `${usernameValue}`, inline: true },
                    { name: '🆔 ID', value: `${idValue}`, inline: true },
                    { name: '💰 VERG Points', value: `${creditsValue}`, inline: true },
                    { name: '💌 Email', value: `${emailValue}`, inline: true },
                    { name: '🔑 MTA Serial', value: `\`\`\`${mtaserialValue}\`\`\``, inline: false },
                    { name: '🌐 Last IP', value: `\`\`\`${ipValue}\`\`\``, inline: true },
                    { name: '🔗 Discord', value: discordMention, inline: true }
                )
                .setTimestamp()
                .setFooter({ 
                    text: `${interaction.user.username}`, 
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                });
            
            
            safeQuery("SELECT id, charactername FROM characters WHERE account = ?", [accountData.id], async (charErr, characters) => {
                if (charErr) {
                    console.error('Error fetching character data:', charErr);
                    
                    return await interaction.reply({ 
                        embeds: [embed], 
                        ephemeral: true 
                    });
                }

                if (characters && characters.length > 0) {
                    
                    const charactersInfo = characters.map(char => 
                        `• \`${char.id}\` | ${char.charactername}`
                    ).join('\n');
                    
                    embed.addFields({ name: '👥 Characters', value: charactersInfo, inline: false });
                    
                    
                    if (characters.length > 0) {
                        const options = characters.map(char => ({
                            label: char.charactername,
                            description: `Character ID: ${char.id}`,
                            value: char.id.toString()
                        }));
                        
                        const selectMenu = new MessageActionRow()
                            .addComponents(
                                new MessageSelectMenu()
                                    .setCustomId(`character_details_${accountData.id}`)
                                    .setPlaceholder('Select a character to view details')
                                    .addOptions(options)
                            );
                        
                        
                        await interaction.reply({
                            embeds: [embed],
                            components: [selectMenu],
                            ephemeral: true
                        });
                    } else {
                        
                        await interaction.reply({
                            embeds: [embed],
                            ephemeral: true
                        });
                    }
                } else {
                    
                    embed.addFields({ name: '👥 Characters', value: 'No characters found.', inline: false });
                    await interaction.reply({
                        embeds: [embed],
                        ephemeral: true
                    });
                }
            });
        });
    }
});