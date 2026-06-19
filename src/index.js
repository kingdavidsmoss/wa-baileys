require('dotenv').config();
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');

const AUTH_FOLDER = path.join(__dirname, '..', 'auth_info');
const LADA = process.env.LADA || '52';
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '20', 10);

if (!API_KEY) {
    console.error('ERROR: Falta API_KEY en el .env. Genera una con: openssl rand -hex 32');
    process.exit(1);
}

let sockGlobal = null;

/** Convierte 10 dígitos a JID completo usando la lada configurada */
function toJid(numero) {
    const limpio = numero.replace(/\D/g, '');
    const conLada = limpio.length === 10 ? `${LADA}${limpio}` : limpio;
    return `${conLada}@s.whatsapp.net`;
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['WA-Bot', 'Chrome', '120.0.0.0'],
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n Escanea este QR con tu WhatsApp:\n');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            sockGlobal = null;
            const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.log('Conexión cerrada. Código:', statusCode, '| Reconectar:', shouldReconnect);

            if (shouldReconnect) {
                setTimeout(connectToWhatsApp, 5000);
            } else {
                console.log('Sesión cerrada. Borra la carpeta auth_info y vuelve a escanear el QR.');
            }
        }

        if (connection === 'open') {
            console.log('\n Conectado a WhatsApp!\n');
            sockGlobal = sock;
            await ejemploEnvioMensajes(sock);
        }
    });

    sock.ev.on('creds.update', saveCreds);

    return sock;
}

/**
 * Envía un mensaje de texto. Acepta 10 dígitos (agrega lada automáticamente) o número completo.
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 * @param {string} numero - 10 dígitos o número completo con lada
 * @param {string} texto
 */
async function enviarMensaje(sock, numero, texto) {
    const jid = toJid(numero);
    await sock.sendMessage(jid, { text: texto });
    console.log(`Mensaje enviado a ${jid}: "${texto}"`);
}

/**
 * Envía una imagen. Acepta 10 dígitos (agrega lada automáticamente) o número completo.
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 * @param {string} numero
 * @param {string} rutaImagen - Ruta local al archivo de imagen
 * @param {string} [caption]
 */
async function enviarImagen(sock, numero, rutaImagen, caption = '') {
    const fs = require('fs');
    const jid = toJid(numero);
    await sock.sendMessage(jid, {
        image: fs.readFileSync(rutaImagen),
        caption,
    });
    console.log(`Imagen enviada a ${jid}`);
}

/**
 * Lista todos los grupos en los que está el número conectado.
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 * @returns {Promise<{id: string, nombre: string}[]>}
 */
async function listarGrupos(sock) {
    const grupos = await sock.groupFetchAllParticipating();
    const lista = Object.values(grupos).map(g => ({ id: g.id, nombre: g.subject }));
    console.log('\n--- Grupos disponibles ---');
    lista.forEach(g => console.log(`[${g.id}] ${g.nombre}`));
    console.log('--------------------------\n');
    return lista;
}

/**
 * Envía un mensaje de texto a un grupo.
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 * @param {string} groupId - Ej: "120363XXXXXXXXXX@g.us"
 * @param {string} texto
 */
async function enviarMensajeGrupo(sock, groupId, texto) {
    await sock.sendMessage(groupId, { text: texto });
    console.log(`Mensaje enviado al grupo ${groupId}: "${texto}"`);
}

/**
 * Envía una imagen a un grupo.
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 * @param {string} groupId
 * @param {string} rutaImagen
 * @param {string} [caption]
 */
async function enviarImagenGrupo(sock, groupId, rutaImagen, caption = '') {
    const fs = require('fs');
    await sock.sendMessage(groupId, {
        image: fs.readFileSync(rutaImagen),
        caption,
    });
    console.log(`Imagen enviada al grupo ${groupId}`);
}

/**
 * Escucha mensajes entrantes y responde automáticamente.
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 */
function escucharMensajes(sock) {
    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            if (!msg.message || msg.key.fromMe) continue;

            const remitente = msg.key.remoteJid;
            const texto = msg.message?.conversation
                || msg.message?.extendedTextMessage?.text
                || '';

            console.log(`Mensaje de ${remitente}: "${texto}"`);

            if (texto.toLowerCase() === 'hola') {
                await sock.sendMessage(remitente, { text: 'Hola! Soy un bot de WhatsApp.' });
            }
        }
    });
}

// Ejemplo de uso al conectar
async function ejemploEnvioMensajes(sock) {
    // --- Contactos individuales (solo 10 dígitos, la lada se agrega sola) ---
    // await enviarMensaje(sock, '1234567890', 'Hola desde Baileys!');
    // await enviarImagen(sock, '1234567890', './foto.jpg', 'Mi foto');

    // --- Grupos ---
    // Paso 1: lista tus grupos para obtener el GROUP_ID
    await listarGrupos(sock);

    // Paso 2: usa el GROUP_ID para enviar
    // await enviarMensajeGrupo(sock, process.env.GROUP_ID, 'Hola grupo!');
    // await enviarImagenGrupo(sock, process.env.GROUP_ID, './foto.jpg', 'Imagen para el grupo');

    escucharMensajes(sock);
    console.log('Bot escuchando mensajes... (Ctrl+C para salir)');
}

/**
 * Middleware: valida el header x-api-key contra API_KEY.
 * Usa comparación de tiempo constante para evitar timing attacks.
 */
function requireApiKey(req, res, next) {
    const provided = req.get('x-api-key') || '';
    const expected = API_KEY;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    const ok = a.length === b.length && require('crypto').timingSafeEqual(a, b);
    if (!ok) {
        return res.status(401).json({ error: 'No autorizado. Falta o es inválido el header x-api-key.' });
    }
    next();
}

function startApiServer() {
    const app = express();
    app.disable('x-powered-by');
    app.use(express.json({ limit: '1mb' }));

    // Límite de peticiones por IP (protege tu número de baneo por spam)
    const limiter = rateLimit({
        windowMs: 60 * 1000,
        max: RATE_LIMIT_MAX,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Demasiadas peticiones. Espera un momento.' },
    });
    app.use(limiter);

    function checkConnection(res) {
        if (!sockGlobal) {
            res.status(503).json({ error: 'WhatsApp no está conectado aún. Escanea el QR primero.' });
            return false;
        }
        return true;
    }

    // POST /mensaje  { "numero": "1234567890", "texto": "Hola" }
    app.post('/mensaje', requireApiKey, async (req, res) => {
        if (!checkConnection(res)) return;
        const { numero, texto } = req.body;
        if (!numero || !texto) return res.status(400).json({ error: 'Faltan campos: numero, texto' });
        try {
            await enviarMensaje(sockGlobal, numero, texto);
            res.json({ ok: true, destino: toJid(numero) });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // POST /mensaje-grupo  { "groupId": "120363XXX@g.us", "texto": "Hola grupo" }
    app.post('/mensaje-grupo', requireApiKey, async (req, res) => {
        if (!checkConnection(res)) return;
        const { groupId, texto } = req.body;
        if (!groupId || !texto) return res.status(400).json({ error: 'Faltan campos: groupId, texto' });
        try {
            await enviarMensajeGrupo(sockGlobal, groupId, texto);
            res.json({ ok: true, groupId });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // GET /grupos
    app.get('/grupos', requireApiKey, async (req, res) => {
        if (!checkConnection(res)) return;
        try {
            const lista = await listarGrupos(sockGlobal);
            res.json(lista);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // GET /status
    app.get('/status', (req, res) => {
        res.json({ conectado: sockGlobal !== null });
    });

    app.listen(PORT, () => {
        console.log(`API escuchando en http://localhost:${PORT}`);
    });
}

startApiServer();
connectToWhatsApp().catch(console.error);

module.exports = { enviarMensaje, enviarImagen, enviarMensajeGrupo, enviarImagenGrupo, listarGrupos, escucharMensajes };
