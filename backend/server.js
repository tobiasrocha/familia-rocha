// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;
const { google } = require('googleapis');
const streamifier = require('streamifier');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { pdf: pdfToImg } = require('pdf-to-img');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createWorker } = require('tesseract.js');

// Carrega credenciais: arquivo local ou Application Default Credentials (Cloud Run)
let serviceAccount = null;
const credenciaisPath = './credenciais-google.json';
if (fs.existsSync(credenciaisPath)) {
  serviceAccount = require(credenciaisPath);
} else {
  console.log('[INIT] credenciais-google.json nao encontrado, usando ADC do Cloud Run');
}

const app = express();
const porta = process.env.PORT || 3000;

const origensPermitidas = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://familia-rocha.web.app',
  'https://familia-rocha.firebaseapp.com',
  'https://familia-rocha-7ea1a.web.app',
  'https://familia-rocha-7ea1a.firebaseapp.com'
];

// ── Security Middleware ──
app.use(helmet({
  contentSecurityPolicy: false,  // CSP gerenciada pelo frontend
  crossOriginEmbedderPolicy: false,
}));

const limiterGlobal = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas requisicoes. Tente novamente mais tarde.' },
});
app.use(limiterGlobal);

const limiterUpload = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Limite de uploads excedido. Aguarde um minuto.' },
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origensPermitidas.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  }
}));
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// ── Auth Middleware ──
async function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token de autenticacao ausente.' });
  }
  const token = authHeader.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ erro: 'Token de autenticacao invalido.' });
  }
  try {
    if (!authAdmin) return res.status(503).json({ erro: 'Servico de autenticacao indisponivel.' });
    const decoded = await authAdmin.verifyIdToken(token);
    req.usuario = { uid: decoded.uid, email: decoded.email };
    next();
  } catch (err) {
    console.warn('[AUTH] Token invalido:', err.code || err.message);
    return res.status(401).json({ erro: 'Token de autenticacao invalido ou expirado.' });
  }
}

// ── Validation Schemas (Zod) ──
const schemaCriarUsuario = z.object({
  nome: z.string().min(1, 'Nome obrigatorio.'),
  email: z.string().email('Email invalido.').optional(),
  senha: z.string().min(6, 'Senha deve ter no minimo 6 caracteres.').optional(),
  tipo: z.enum(['Adulto', 'Crianca', 'Pet']).default('Adulto'),
  dataNascimento: z.string().optional().default(''),
  tipoSanguineo: z.string().optional().default(''),
  alergias: z.string().optional().default(''),
  telefone: z.string().optional().default(''),
});

const schemaAtualizarUsuario = z.object({
  nome: z.string().min(1).optional(),
  email: z.string().email().optional(),
  tipo: z.enum(['Adulto', 'Crianca', 'Pet']).optional(),
  dataNascimento: z.string().optional(),
  tipoSanguineo: z.string().optional(),
  alergias: z.string().optional(),
  telefone: z.string().optional(),
});

const schemaPermissoes = z.object({
  permissoes: z.record(z.string(), z.boolean()),
});

const schemaResetSenha = z.object({
  senha: z.string().min(6, 'Senha deve ter no minimo 6 caracteres.'),
});
function verificarPermissao(modulo) {
  return async (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ erro: 'Autenticacao necessaria.' });
    if (!firestoreDb) return res.status(503).json({ erro: 'Banco de dados indisponivel.' });

    const SUPERADMIN_EMAIL = 'tobiasrocha@gmail.com';
    if (req.usuario.email === SUPERADMIN_EMAIL) return next();

    try {
      const userRecord = await authAdmin.getUserByEmail(req.usuario.email);
      const meta = await firestoreDb.collection('usuarios').doc(userRecord.uid).get();
      const metaData = meta.exists ? meta.data() : {};
      const permissoes = metaData.permissoes || {};

      if (permissoes[modulo]) return next();
      return res.status(403).json({ erro: 'Acesso negado a este modulo.' });
    } catch (err) {
      console.error('[PERMISSAO] Erro:', err.message);
      return res.status(500).json({ erro: 'Falha ao verificar permissoes.' });
    }
  };
}

// Permissão admin — apenas superadmin
async function verificarAdmin(req, res, next) {
  if (!req.usuario) return res.status(401).json({ erro: 'Autenticacao necessaria.' });
  const SUPERADMIN_EMAIL = 'tobiasrocha@gmail.com';
  if (req.usuario.email === SUPERADMIN_EMAIL) return next();
  return res.status(403).json({ erro: 'Acesso restrito ao administrador.' });
}

// Inicializacao dos clientes Google (lazy — criados apenas quando necessario)
let docAiClient = null;

function getDocAiClient() {
  if (docAiClient) return docAiClient;
  try {
    docAiClient = serviceAccount
      ? new DocumentProcessorServiceClient({ keyFilename: credenciaisPath })
      : new DocumentProcessorServiceClient();
    return docAiClient;
  } catch (err) {
    console.warn('[INIT] Document AI indisponivel:', err.message);
    return null;
  }
}

const firebaseProjectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'familia-rocha-7ea1a';

let firestoreDb = null;
let authAdmin = null;

const estaNoCloudRun = Boolean(process.env.K_SERVICE);
const temCredenciaisGoogle = Boolean(serviceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS || estaNoCloudRun);

if (temCredenciaisGoogle && getApps().length === 0) {
  try {
    const adminConfig = { projectId: firebaseProjectId };
    if (serviceAccount) {
      adminConfig.credential = cert(serviceAccount);
    }
    initializeApp(adminConfig);
    firestoreDb = getFirestore();
    authAdmin = getAuth();
    console.log('[INIT] Firebase Admin inicializado');
  } catch (err) {
    console.warn('[INIT] Firebase Admin indisponivel:', err.message);
  }
} else if (!temCredenciaisGoogle) {
  console.warn('[INIT] Firebase Admin nao inicializado — sem credenciais Google');
}

// Inicialização segura do Google Drive API via service account
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || null;
const GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || null;
const GOOGLE_OAUTH_REFRESH_TOKEN = process.env.GOOGLE_OAUTH_REFRESH_TOKEN || null;

let serviceAccountDrive = null;
if (temCredenciaisGoogle) {
  try {
    const saAuth = serviceAccount
      ? new google.auth.GoogleAuth({ keyFile: credenciaisPath, scopes: ['https://www.googleapis.com/auth/drive'] })
      : new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/drive'] });
    serviceAccountDrive = google.drive({ version: 'v3', auth: saAuth });
  } catch (err) {
    console.warn('[INIT] Google Drive (service account) indisponivel:', err.message);
  }
}

let oauthDrive = null;
if (GOOGLE_OAUTH_CLIENT_ID && GOOGLE_OAUTH_CLIENT_SECRET && GOOGLE_OAUTH_REFRESH_TOKEN) {
  try {
    const oauth2Client = new google.auth.OAuth2(GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: GOOGLE_OAUTH_REFRESH_TOKEN });
    oauthDrive = google.drive({ version: 'v3', auth: oauth2Client });
  } catch (err) {
    console.warn('[INIT] Google Drive (OAuth) indisponivel:', err.message);
  }
}

const PASTA_RAIZ_ID = '1MoXgZV8Xvnp1x7vMjzuJZkWBZ9S1Gz5_';
const GOOGLE_DRIVE_SHARED_DRIVE_ID = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || null;
const DRIVE_PARENT_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || null;
const isSharedDrive = Boolean(GOOGLE_DRIVE_SHARED_DRIVE_ID);

function getDriveClient(useOauth = false) {
  if (useOauth && oauthDrive) return oauthDrive;
  return serviceAccountDrive;
}

function obterParentId() {
  if (DRIVE_PARENT_ID) return DRIVE_PARENT_ID;
  if (isSharedDrive) return GOOGLE_DRIVE_SHARED_DRIVE_ID;
  return PASTA_RAIZ_ID;
}

async function obterOuCriarPasta(nomePasta, idPastaPai, client) {
  const normalizedParent = (idPastaPai === GOOGLE_DRIVE_SHARED_DRIVE_ID) ? 'root' : idPastaPai;
  const query = `mimeType='application/vnd.google-apps.folder' and name='${nomePasta}' and '${normalizedParent}' in parents and trashed=false`;

  const listParams = {
    q: query,
    spaces: 'drive',
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    ...(isSharedDrive ? { corpora: 'drive', driveId: GOOGLE_DRIVE_SHARED_DRIVE_ID } : {})
  };

  const createParams = {
    resource: { name: nomePasta, mimeType: 'application/vnd.google-apps.folder', parents: [idPastaPai] },
    fields: 'id',
    supportsAllDrives: true,
    ...(isSharedDrive ? { driveId: GOOGLE_DRIVE_SHARED_DRIVE_ID } : {})
  };

  let response;
  try {
    response = await client.files.list(listParams);
  } catch (err) {
    if (isSharedDrive && err.message?.includes('Shared drive not found')) {
      console.warn(`[DRIVE FALLBACK] Shared drive não encontrado; tentando usar o ID como pasta normal: ${GOOGLE_DRIVE_SHARED_DRIVE_ID}`);
      response = await client.files.list({
        q: query,
        spaces: 'drive',
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });
    } else {
      throw err;
    }
  }

  if (response.data.files.length > 0) {
    return response.data.files[0].id;
  }

  const pastaCriada = await client.files.create(createParams);
  return pastaCriada.data.id;
}

async function criarArquivoNoDrive(fileMetadata, media, client) {
  return client.files.create({
    resource: fileMetadata,
    media,
    fields: 'id, webViewLink',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    ...(isSharedDrive ? { driveId: GOOGLE_DRIVE_SHARED_DRIVE_ID } : {})
  });
}

// ---------------------------------------------------------
// FUNCAO CENTRALIZADA DE VARREDURA DE ALERTAS
// ---------------------------------------------------------
async function verificarEVenciarAlertas() {
  const resultado = {
    contasEscaneadas: 0,
    contasNoPrazo: 0,
    emailsEnviados: 0,
    emailsFalhas: 0,
    whatsappsEnviados: 0,
    whatsappsFalhas: 0,
    detalhes: []
  };

  try {
    console.log(`[ALERTAS] Iniciando varredura: ${new Date().toISOString()}`);
    const hojeStr = new Date().toISOString().slice(0, 10);
    const hoje = new Date(hojeStr + 'T00:00:00');

    const snapshot = await firestoreDb.collection('financas')
      .where('tipo', '==', 'Despesa')
      .where('status', '==', 'Pendente')
      .get();

    resultado.contasEscaneadas = snapshot.size;
    if (snapshot.empty) return resultado;

    const perfisSnapshot = await firestoreDb.collection('perfis').get();
    const contatos = [];
    perfisSnapshot.forEach(doc => {
      const perfil = doc.data();
      if (perfil.telefone) {
        let numero = perfil.telefone.replace(/[^\d]/g, '');
        if (!numero.startsWith('55') && (numero.length === 10 || numero.length === 11)) numero = '55' + numero;
        if (numero) contatos.push({ nome: perfil.nome, numero });
      }
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    const emailDestinatarios = (process.env.ALERTA_EMAILS || 'tobiasrocha@gmail.com,renallyraiani@gmail.com')
      .split(',').map(e => e.trim()).filter(Boolean);
    const whatsappHabilitado = !!(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN);
    const prazosAlerta = [5, 0];

    // Coleta todas as contas no prazo
    const contasAlerta = [];
    for (let doc of snapshot.docs) {
      const conta = doc.data();
      if (!conta.dataVencimento) continue;
      const vencimento = new Date(conta.dataVencimento + 'T00:00:00');
      const diffDias = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDias < -1) continue;
      if (!prazosAlerta.includes(diffDias)) continue;

      const vencFormatado = conta.dataVencimento.split('-').reverse().join('/');
      const extra = [];
      if (conta.multa > 0) extra.push(`Multa: R$ ${Number(conta.multa).toFixed(2).replace('.', ',')}`);
      if (conta.juros > 0) extra.push(`Juros: R$ ${Number(conta.juros).toFixed(2).replace('.', ',')}`);
      if (conta.codigoBarras) extra.push(`Cod. Barras: ${conta.codigoBarras}`);

      contasAlerta.push({
        descricao: conta.descricao,
        valor: Number(conta.valor),
        vencimento: conta.dataVencimento,
        diasRestantes: diffDias >= 0 ? diffDias : 0,
        extra: extra.join(' | '),
        vencFormatado,
      });
      resultado.contasNoPrazo++;
    }

    if (contasAlerta.length === 0) return resultado;

    // Ordena por dias restantes (mais urgentes primeiro)
    contasAlerta.sort((a, b) => a.diasRestantes - b.diasRestantes);

    // Monta corpo consolidado
    const hojeTitle = contasAlerta.filter(c => c.diasRestantes === 0);
    const proxTitle = contasAlerta.filter(c => c.diasRestantes > 0);

    const linhas = ['📋 *ERP Familia Rocha — Contas a Vencer*', ''];
    if (hojeTitle.length > 0) {
      linhas.push(`⚠️ *Vencem HOJE (${hojeTitle.length}):*`);
      for (let c of hojeTitle) {
        linhas.push(`  • ${c.descricao} — R$ ${Number(c.valor).toFixed(2).replace('.', ',')} — Venc: ${c.vencFormatado}`);
        if (c.extra) linhas.push(`    ${c.extra}`);
      }
      linhas.push('');
    }
    if (proxTitle.length > 0) {
      linhas.push(`📅 *Próximos ${proxTitle.length} vencimentos:*`);
      for (let c of proxTitle) {
        linhas.push(`  • ${c.descricao} — R$ ${Number(c.valor).toFixed(2).replace('.', ',')} — ${c.diasRestantes} dia(s) — ${c.vencFormatado}`);
        if (c.extra) linhas.push(`    ${c.extra}`);
      }
      linhas.push('');
    }
    linhas.push('Acesse: https://familia-rocha-7ea1a.web.app/financeiro');

    const corpo = linhas.join('\n');
    const assunto = hojeTitle.length > 0
      ? `⚠️ ${hojeTitle.length} conta(s) vencem HOJE + ${proxTitle.length} proxima(s)`
      : `📅 ${contasAlerta.length} conta(s) a vencer nos proximos dias`;

    // Envia UM email consolidado
    try {
      await transporter.sendMail({
        from: `"ERP Familia Rocha" <${process.env.SMTP_USER}>`,
        to: emailDestinatarios,
        subject: assunto,
        text: corpo.replace(/\*/g, ''),
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Auto-Submitted': 'auto-generated',
        },
      });
      resultado.emailsEnviados = emailDestinatarios.length;
      console.log(`[EMAIL] Consolidado enviado para ${emailDestinatarios.length} destinatario(s)`);
    } catch (errEmail) {
      resultado.emailsFalhas = emailDestinatarios.length;
      console.error(`[EMAIL ERROR] ${errEmail.message}`);
    }

    // Envia UM WhatsApp por contato
    if (whatsappHabilitado && contatos.length > 0) {
      for (let contato of contatos) {
        try {
          const resWpp = await fetch(process.env.WHATSAPP_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.WHATSAPP_API_TOKEN,
              'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`
            },
            body: JSON.stringify({ number: contato.numero, text: corpo }),
          });
          if (resWpp.ok) resultado.whatsappsEnviados++;
          else resultado.whatsappsFalhas++;
        } catch {
          resultado.whatsappsFalhas++;
        }
      }
    }

    console.log(`[ALERTAS] Finalizado: ${contasAlerta.length} contas, ${resultado.emailsEnviados} emails, ${resultado.whatsappsEnviados} WhatsApps`);
    return resultado;
  } catch (error) {
    console.error("[ALERTAS] Erro critico:", error);
    resultado.erro = error.message;
    return resultado;
  }
}

// --- AGENDAMENTO CRON: Executa AUTOMATICAMENTE todos os dias as 08:00 AM ---
// Desabilitado no Cloud Run (CRON_ENABLED=false). Use Cloud Scheduler.
if (process.env.CRON_ENABLED !== 'false') {
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Executando rotina diaria de alertas...');
    await verificarEVenciarAlertas();
  });
}

// ---------------------------------------------------------
// ROTA: DISPARO MANUAL (Acionado pelo Botao do Frontend)
// ---------------------------------------------------------
app.post('/api/disparar-alertas', autenticar, verificarPermissao('financeiro'), async (req, res) => {
  if (!firestoreDb) return res.status(503).json({ erro: 'Banco de dados indisponivel.' });
  try {
    const resultado = await verificarEVenciarAlertas();
    res.json({
      ok: true,
      contasEscaneadas: resultado.contasEscaneadas,
      contasNoPrazo: resultado.contasNoPrazo,
      emailsEnviados: resultado.emailsEnviados,
      emailsFalhas: resultado.emailsFalhas,
      whatsappsEnviados: resultado.whatsappsEnviados,
      whatsappsFalhas: resultado.whatsappsFalhas,
      detalhes: resultado.detalhes?.slice(0, 10),
      resumo: resultado.contasNoPrazo === 0
        ? 'Nenhuma conta pendente no prazo de alerta (5 dias ou hoje).'
        : `${resultado.contasNoPrazo} contas processadas. ${resultado.emailsEnviados} emails e ${resultado.whatsappsEnviados} WhatsApps enviados.`
    });
  } catch (error) {
    res.status(500).json({ ok: false, erro: 'Falha ao processar notificacoes.', detalhes: error.message });
  }
});

// ---------------------------------------------------------
// ALERTAS DE SAUDE: Varredura e notificacao
// ---------------------------------------------------------
async function verificarAlertasSaude() {
  const resultado = {
    eventosEscaneados: 0,
    eventosNoPrazo: 0,
    emailsEnviados: 0,
    emailsFalhas: 0,
    whatsappsEnviados: 0,
    whatsappsFalhas: 0,
    detalhes: []
  };

  try {
    console.log(`[ALERTAS SAUDE] Iniciando varredura: ${new Date().toISOString()}`);
    const hojeStr = new Date().toISOString().slice(0, 10);
    const hoje = new Date(hojeStr + 'T00:00:00');

    const snapshot = await firestoreDb.collection('saude').get();
    resultado.eventosEscaneados = snapshot.size;
    if (snapshot.empty) return resultado;

    const perfisSnapshot = await firestoreDb.collection('perfis').get();
    const perfisMap = {};
    perfisSnapshot.forEach(doc => { perfisMap[doc.id] = doc.data(); });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    const SUPERADMIN_EMAIL = 'tobiasrocha@gmail.com';
    const whatsappHabilitado = !!(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN);
    const prazosAlerta = [5, 0];

    // Coleta eventos no prazo, agrupados por perfilId
    const eventosPorPerfil = {};
    const todosEventos = [];

    for (let doc of snapshot.docs) {
      const evento = doc.data();
      if (!evento.dataEvento) continue;
      if (evento.tipo === 'Medicação') continue;

      const dataEvento = new Date(evento.dataEvento + 'T00:00:00');
      const diffDias = Math.ceil((dataEvento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDias < -1) continue;
      if (!prazosAlerta.includes(diffDias)) continue;

      const perfil = perfisMap[evento.perfilId] || {};
      const nomePaciente = perfil.nome || 'Paciente';
      const hora = evento.horaEvento ? ` ${evento.horaEvento}` : '';
      const ev = {
        paciente: nomePaciente,
        perfilId: evento.perfilId,
        tipo: evento.tipo || 'Consulta',
        titulo: evento.titulo,
        data: evento.dataEvento.split('-').reverse().join('/') + hora,
        diasRestantes: diffDias >= 0 ? diffDias : 0,
        localProfissional: evento.localProfissional || '',
        observacoes: evento.observacoes || '',
      };
      todosEventos.push(ev);
      if (!eventosPorPerfil[evento.perfilId]) eventosPorPerfil[evento.perfilId] = { perfil, eventos: [] };
      eventosPorPerfil[evento.perfilId].eventos.push(ev);
      resultado.eventosNoPrazo++;
    }

    if (todosEventos.length === 0) return resultado;

    todosEventos.sort((a, b) => a.diasRestantes - b.diasRestantes);

    // Função helper para montar corpo do alerta
    const montarCorpo = (eventos, nomeDest) => {
      const hojeEv = eventos.filter(e => e.diasRestantes === 0);
      const proxEv = eventos.filter(e => e.diasRestantes > 0);
      const linhas = [`🏥 *ERP Familia Rocha — Compromissos de Saude*`, nomeDest ? `\n👤 *${nomeDest}*` : '', ''];
      if (hojeEv.length > 0) {
        linhas.push(`⚠️ *Hoje (${hojeEv.length}):*`);
        for (let e of hojeEv) {
          linhas.push(`  • ${e.tipo}: ${e.titulo} — ${e.data}`);
          if (e.localProfissional) linhas.push(`    ${e.localProfissional}`);
        }
        linhas.push('');
      }
      if (proxEv.length > 0) {
        linhas.push(`📅 *Proximos (${proxEv.length}):*`);
        for (let e of proxEv) {
          linhas.push(`  • ${e.tipo}: ${e.titulo} — ${e.data} (${e.diasRestantes} dia(s))`);
          if (e.localProfissional) linhas.push(`    ${e.localProfissional}`);
        }
        linhas.push('');
      }
      linhas.push('Acesse: https://familia-rocha-7ea1a.web.app/saude');
      return linhas.join('\n');
    };

    // Envia alertas POR PERFIL (apenas para a pessoa vinculada)
    for (let grupo of Object.values(eventosPorPerfil)) {
      const { perfil, eventos } = grupo;
      const corpo = montarCorpo(eventos, perfil.nome);
      const assunto = `🏥 ${eventos.length} compromisso(s) de saude`;
      const corpoPlain = corpo.replace(/\*/g, '');

      // WhatsApp para o telefone do perfil vinculado
      if (whatsappHabilitado && perfil.telefone) {
        let numero = perfil.telefone.replace(/[^\d]/g, '');
        if (!numero.startsWith('55') && (numero.length === 10 || numero.length === 11)) numero = '55' + numero;
        if (numero) {
          try {
            const resWpp = await fetch(process.env.WHATSAPP_API_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.WHATSAPP_API_TOKEN,
                'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`
              },
              body: JSON.stringify({ number: numero, text: corpo }),
            });
            if (resWpp.ok) resultado.whatsappsEnviados++;
            else resultado.whatsappsFalhas++;
          } catch { resultado.whatsappsFalhas++; }
        }
      }

      // Email para superadmin + perfil vinculado
      const destEmail = [SUPERADMIN_EMAIL];
      if (perfil.email && perfil.email !== SUPERADMIN_EMAIL && !destEmail.includes(perfil.email)) {
        destEmail.push(perfil.email);
      }
      try {
        await transporter.sendMail({
          from: `"ERP Familia Rocha" <${process.env.SMTP_USER}>`,
          to: destEmail,
          subject: assunto,
          text: corpoPlain,
          headers: { 'X-Priority': '1', 'X-MSMail-Priority': 'High', 'Auto-Submitted': 'auto-generated' },
        });
        resultado.emailsEnviados += destEmail.length;
      } catch (errEmail) {
        resultado.emailsFalhas += destEmail.length;
        console.error(`[EMAIL SAUDE ERROR] ${errEmail.message}`);
      }
    }

    console.log(`[ALERTAS SAUDE] Finalizado: ${todosEventos.length} eventos para ${Object.keys(eventosPorPerfil).length} perfis`);
    return resultado;
  } catch (error) {
    console.error("[ALERTAS SAUDE] Erro critico:", error);
    resultado.erro = error.message;
    return resultado;
  }
}

// CRON de saude (8:00 AM) - Desabilitado no Cloud Run, use Cloud Scheduler
if (process.env.CRON_ENABLED !== 'false') {
  cron.schedule('0 8 * * *', async () => {
    await verificarAlertasSaude();
  });
}

// Rota manual de alertas de saude
app.post('/api/disparar-alertas-saude', autenticar, verificarPermissao('saude'), async (req, res) => {
  if (!firestoreDb) return res.status(503).json({ erro: 'Banco de dados indisponivel.' });
  try {
    const resultado = await verificarAlertasSaude();
    res.json({
      ok: true,
      eventosEscaneados: resultado.eventosEscaneados,
      eventosNoPrazo: resultado.eventosNoPrazo,
      emailsEnviados: resultado.emailsEnviados,
      emailsFalhas: resultado.emailsFalhas,
      whatsappsEnviados: resultado.whatsappsEnviados,
      whatsappsFalhas: resultado.whatsappsFalhas,
      detalhes: resultado.detalhes?.slice(0, 10),
      resumo: resultado.eventosNoPrazo === 0
        ? 'Nenhum evento de saude no prazo de alerta (5 dias ou hoje).'
        : `${resultado.eventosNoPrazo} eventos processados. ${resultado.emailsEnviados} emails e ${resultado.whatsappsEnviados} WhatsApps enviados.`
    });
  } catch (error) {
    res.status(500).json({ ok: false, erro: 'Falha ao processar notificacoes de saude.', detalhes: error.message });
  }
});

// ---------------------------------------------------------
// ROTA: IMPORTAÇÃO DE EXTRATOS BANCÁRIOS
// ---------------------------------------------------------
app.post('/api/importar-extrato', autenticar, verificarPermissao('financeiro'), limiterUpload, upload.single('documento'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ erro: 'Arquivo de extrato ausente.' });
    console.log(`Indexando Extrato Bancário: ${req.file.originalname}`);
    const client = getDriveClient(false);
    const baseFolderId = obterParentId();
    const pastaExtratosId = await obterOuCriarPasta('Extratos_Bancarios', baseFolderId, client);
    const fileMetadata = { name: `Extrato_${Date.now()}_${req.file.originalname}`, parents: [pastaExtratosId] };
    const media = { mimeType: req.file.mimetype, body: streamifier.createReadStream(req.file.buffer) };
    const driveFile = await criarArquivoNoDrive(fileMetadata, media, client);
    res.json({ msg: 'Extrato bancário arquivado com sucesso no Drive!', linkArquivo: driveFile.data.webViewLink });
  } catch (error) {
    res.status(500).json({ erro: 'Falha ao processar arquivo no Drive.', detalhes: error.message });
  }
});

// ---------------------------------------------------------
// ROTA: CONCILIACAO BANCARIA (Upload de extrato + matching)
// ---------------------------------------------------------
app.post('/api/conciliar-extrato', autenticar, verificarPermissao('financeiro'), limiterUpload, upload.single('documento'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ erro: 'Arquivo de extrato ausente.' });
    console.log(`[CONCILIACAO] Processando extrato: ${req.file.originalname} (${req.file.mimetype})`);

    let textoExtrato = '';

    // 1) Extrai texto do extrato
    if (req.file.mimetype === 'application/pdf') {
      try {
        console.log('[CONCILIACAO] Convertendo PDF para imagem...');
        const doc = await pdfToImg(
          new Uint8Array(req.file.buffer.buffer, req.file.buffer.byteOffset, req.file.buffer.byteLength),
          { scale: 2 }
        );
        const pageImg = await doc.getPage(1);
        console.log(`[CONCILIACAO] Pagina convertida: ${pageImg.length} bytes`);

        console.log('[CONCILIACAO] Executando OCR com tesseract.js...');
        const worker = await createWorker('por');
        const { data: { text } } = await worker.recognize(pageImg);
        await worker.terminate();

        textoExtrato = text || '';
        console.log(`[CONCILIACAO] OCR concluido: ${textoExtrato.length} caracteres`);
      } catch (ocrErr) {
        console.error('[CONCILIACAO] Falha ao extrair texto do extrato:', ocrErr.message);
        return res.status(500).json({ erro: 'Nao foi possivel ler o extrato. Certifique-se de que e um PDF com texto ou imagem legivel. Detalhes: ' + ocrErr.message });
      }
    } else if (req.file.mimetype.startsWith('image/')) {
      try {
        console.log('[CONCILIACAO] Executando OCR com tesseract.js na imagem...');
        const worker = await createWorker('por');
        const { data: { text } } = await worker.recognize(req.file.buffer);
        await worker.terminate();

        textoExtrato = text || '';
        console.log(`[CONCILIACAO] OCR concluido: ${textoExtrato.length} caracteres`);
      } catch (ocrErr) {
        console.error('[CONCILIACAO] Falha ao processar imagem:', ocrErr.message);
        return res.status(500).json({ erro: 'Nao foi possivel processar a imagem. Detalhes: ' + ocrErr.message });
      }
    } else {
      textoExtrato = req.file.buffer.toString('utf-8');
    }

    if (!textoExtrato || textoExtrato.trim().length < 20) {
      return res.status(400).json({ erro: 'Extrato vazio ou ilegivel.' });
    }

    console.log(`[CONCILIACAO] Texto extraido: ${textoExtrato.length} caracteres`);

    // 2) Extrai transacoes do texto (multi-regex para varios formatos de extrato)
    const transacoesExtrato = [];
    const linhas = textoExtrato.split('\n');
    const anoAtual = new Date().getFullYear();

    // Padroes de data: dd/mm, dd/mm/aaaa, dd.mm, dd-mm
    const regexData = /(\d{1,2}[\/\.\-]\d{1,2}(?:[\/\.\-]\d{2,4})?)/;

    for (const linha of linhas) {
      const limpa = linha.trim();
      if (limpa.length < 10) continue;

      // Tenta extrair data
      const matchData = limpa.match(regexData);
      if (!matchData) continue;

      const dataStr = matchData[1];
      let [dia, mes] = dataStr.split(/[\/\.\-]/);
      dia = dia.padStart(2, '0'); mes = mes.padStart(2, '0');

      // Busca valor monetario na linha (R$ xxx,xx ou -xxx,xx ou xxx.xx)
      const regexValor = /(-?\s*R?\$\s*[\d]{1,3}(?:\.?\d{3})*(?:,\d{2})?)|(-?\s*[\d]{1,3}(?:\.\d{3})*(?:,\d{2}))/gi;
      const valores = [...limpa.matchAll(regexValor)];
      if (valores.length === 0) continue;

      // Pega o ultimo valor da linha (geralmente o valor da transacao)
      const ultimoValor = valores[valores.length - 1][0];
      let valorStr = ultimoValor.replace(/[R\$\s]/g, '').replace(/\./g, '').replace(',', '.').replace(/-/g, '');
      const isNegativo = ultimoValor.includes('-') || limpa.toLowerCase().includes('débito') || limpa.toLowerCase().includes('debito') || limpa.toLowerCase().includes('saque') || limpa.toLowerCase().includes('compra');
      let valor = parseFloat(valorStr);
      if (isNaN(valor)) continue;
      if (isNegativo) valor = -Math.abs(valor);

      // Descricao: remove data e valor da linha
      let descricao = limpa
        .replace(matchData[0], '')
        .replace(ultimoValor, '')
        .replace(/[\/\.\-]\d{1,2}[\/\.\-]\d{2,4}/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (descricao.length > 2) {
        transacoesExtrato.push({
          data: `${anoAtual}-${mes}-${dia}`,
          descricao: descricao.substring(0, 60),
          valor: Math.abs(valor),
          tipo: valor < 0 ? 'DEBITO' : 'CREDITO',
        });
      }
    }

    console.log(`[CONCILIACAO] ${transacoesExtrato.length} transacoes encontradas no extrato`);

    // 3) Busca financas pendentes
    const snapshot = await firestoreDb.collection('financas')
      .where('status', '==', 'Pendente')
      .where('tipo', '==', 'Despesa')
      .get();

    const pendentes = [];
    snapshot.forEach(doc => pendentes.push({ id: doc.id, ...doc.data() }));

    // 4) Match por valor aproximado (+/- 1 centavo) e data
    const matches = [];
    for (const t of transacoesExtrato) {
      if (t.tipo !== 'DEBITO') continue;
      for (const p of pendentes) {
        if (p._matched) continue;
        const diffValor = Math.abs(Number(p.valor) - t.valor);
        if (diffValor <= 0.02) {
          p._matched = true;
          matches.push({
            idFirestore: p.id,
            descricao: p.descricao,
            categoria: p.categoria || 'Outros',
            valor: Number(p.valor),
            dataVencimento: p.dataVencimento,
            descricaoExtrato: t.descricao,
            dataExtrato: t.data,
            valorExtrato: t.valor,
            confianca: diffValor === 0 ? 'exata' : 'aproximada'
          });
          break;
        }
      }
    }

    console.log(`[CONCILIACAO] ${matches.length} transacoes correspondentes encontradas`);
    res.json({ itensExtrato: transacoesExtrato, matches, totalPendentes: pendentes.length });
  } catch (error) {
    console.error('[CONCILIACAO ERROR]', error);
    res.status(500).json({ erro: 'Falha ao processar extrato.', detalhes: error.message });
  }
});

// ---------------------------------------------------------
// ROTA: BAIXA EM LOTE de conciliados
// ---------------------------------------------------------
app.post('/api/baixar-conciliados', autenticar, verificarPermissao('financeiro'), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ erro: 'Lista de IDs ausente.' });
    }

    let atualizados = 0;
    for (const id of ids) {
      await firestoreDb.collection('financas').doc(id).update({ status: 'Pago', atualizadoEm: new Date().toISOString() });
      atualizados++;
    }

    console.log(`[BAIXA] ${atualizados} transacoes marcadas como Pagas`);
    res.json({ msg: `${atualizados} contas baixadas com sucesso.` });
  } catch (error) {
    res.status(500).json({ erro: 'Falha ao dar baixa.', detalhes: error.message });
  }
});

// ---------------------------------------------------------
// ROTA: OCR FINANCEIRO BOLETOS (Refatorada com tratamento de erro robusto)
// ---------------------------------------------------------
app.post('/api/extrair-boleto', autenticar, verificarPermissao('financeiro'), limiterUpload, upload.single('documento'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ erro: 'Nenhum documento enviado.' });
    
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = process.env.GOOGLE_CLOUD_LOCATION;
    const processorId = process.env.DOCUMENT_AI_PROCESSOR_ID;
    // Preparar objeto de retorno
    let dadosExtraidos = { descricao: '', valor: '', dataVencimento: '', codigoBarras: '', multaJuros: '' };
    let ocrWarning = null;

    // Tenta usar Document AI se as variaveis estiverem definidas
    if (!projectId || !location || !processorId) {
      console.warn('[GCP WARN] Variaveis do Document AI ausentes no .env — pulando OCR.');
      ocrWarning = 'Configuracoes do GCP Document AI ausentes no servidor.';
    }

    let textoCompleto = '';
    if (!ocrWarning) {
      try {
        const encodedImage = req.file.buffer.toString('base64');
        const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
        const request = { name, rawDocument: { content: encodedImage, mimeType: req.file.mimetype } };

        console.log(`[OCR] Enviando arquivo ${req.file.originalname} para o Google Document AI...`);
        const client = getDocAiClient();
        if (!client) throw new Error('Document AI nao disponivel');
        const [result] = await client.processDocument(request);
        const { document } = result;
        textoCompleto = document.text || '';

        console.log(`[OCR DEBUG] Texto extraido (${textoCompleto.length} caracteres):`);
        console.log(textoCompleto.substring(0, 500));

        console.log(`[OCR DEBUG] Entidades encontradas: ${document.entities ? document.entities.length : 0}`);
        if (document.entities && document.entities.length > 0) {
          document.entities.forEach(e => console.log(`  - tipo: ${e.type}, valor: "${e.mentionText}", confianca: ${e.confidence}`));
        }

        if (document.entities) {
          document.entities.forEach(entity => {
            const tipo = entity.type;
            const valorTexto = entity.mentionText || '';
            if (tipo === 'supplier_name') dadosExtraidos.descricao = valorTexto.replace(/\n/g, ' ').trim();
            if (tipo === 'total_amount') dadosExtraidos.valor = valorTexto.replace(/[^\d.,]/g, '').replace(',', '.');
            if (tipo === 'due_date') {
              if (entity.normalizedValue && entity.normalizedValue.dateValue) {
                const date = entity.normalizedValue.dateValue;
                dadosExtraidos.dataVencimento = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
              } else {
                const partes = valorTexto.split(/[\/\-.]/);
                if(partes.length === 3) dadosExtraidos.dataVencimento = `${partes[2]}-${partes[1]}-${partes[0]}`;
              }
            }
          });
        }

        if (document.pages && document.pages.length > 0) {
          const page = document.pages[0];
          console.log(`[OCR DEBUG] FormFields na pagina: ${page.formFields ? page.formFields.length : 0}`);
          if (page.formFields) {
            page.formFields.forEach(ff => {
              const nomeCampo = ff.fieldName?.textAnchor?.content || ff.fieldName?.displayName || '';
              const valorCampo = ff.fieldValue?.textAnchor?.content || ff.fieldValue?.displayName || '';
              console.log(`  - campo: "${nomeCampo}" = "${valorCampo}"`);
              if (/vencimento|data/i.test(nomeCampo) && !dadosExtraidos.dataVencimento) {
                const match = valorCampo.match(/(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})/);
                if (match) dadosExtraidos.dataVencimento = `${match[3]}-${match[2]}-${match[1]}`;
              }
              if (/valor|total/i.test(nomeCampo) && !dadosExtraidos.valor) {
                const match = valorCampo.match(/[\d.,]+/);
                if (match) dadosExtraidos.valor = match[0].replace(/\./g, '').replace(',', '.');
              }
              if (/benefici[aá]rio|cedente|favorecido/i.test(nomeCampo) && !dadosExtraidos.descricao) {
                dadosExtraidos.descricao = valorCampo.trim();
              }
            });
          }
        }
      } catch (ocrErr) {
        console.error('[OCR ERROR] Falha ao processar documento no Document AI:', ocrErr.message || ocrErr);
        ocrWarning = 'Document AI indisponivel.';
      }
    }

    // Se o Document AI falhou E o Tesseract estiver habilitado, tenta OCR local
    const tesseractEnabled = process.env.TESSERACT_ENABLED === 'true';
    const tesseractPath = process.env.TESSERACT_PATH || 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe';

    if (tesseractEnabled && (!textoCompleto || textoCompleto.trim().length < 30) && req.file.mimetype === 'application/pdf') {
      try {
        console.log('[OCR TESSERACT] PDF sem texto selecionavel. Convertendo para imagem...');
        const doc = await pdfToImg(new Uint8Array(req.file.buffer.buffer, req.file.buffer.byteOffset, req.file.buffer.byteLength), { scale: 3 });
        const pageImg = await doc.getPage(1);
        console.log(`[OCR TESSERACT] Pagina convertida: ${pageImg.length} bytes.`);

        const tmpImg = path.join(os.tmpdir(), `ocr_${Date.now()}.png`);
        const tmpOut = tmpImg.replace('.png', '');
        fs.writeFileSync(tmpImg, pageImg);

        console.log('[OCR TESSERACT] Executando tesseract.exe...');
        await execFileAsync(tesseractPath, [
          tmpImg, tmpOut, '-l', 'por', '--psm', '6', '--tessdata-dir', path.join(__dirname, 'tessdata')
        ], { timeout: 60000 });

        textoCompleto = fs.readFileSync(tmpOut + '.txt', 'utf-8');
        try { fs.unlinkSync(tmpImg); fs.unlinkSync(tmpOut + '.txt'); } catch {}
        console.log(`[OCR TESSERACT] Texto extraido via OCR: ${textoCompleto.length} caracteres`);
        if (textoCompleto) ocrWarning = null;
        } catch (tessErr) {
          console.error('[OCR TESSERACT ERROR] Falha no OCR local:', tessErr.message);
        }
      }

    // FALLBACKS VIA REGEX (rodam com texto de qualquer fonte)
    if (textoCompleto) {
      console.log(`[OCR FALLBACK] Primeiros 300 chars do texto:`, textoCompleto.substring(0, 300));

      if (!dadosExtraidos.dataVencimento) {
        const regexData = /\b(0[1-9]|[12][0-9]|3[01])[\/\-.](0[1-9]|1[012])[\/\-.](\d{4})\b/g;
        const datasEncontradas = textoCompleto.match(regexData);
        if (datasEncontradas) {
          const p = datasEncontradas[0].split(/[\/\-.]/);
          dadosExtraidos.dataVencimento = `${p[2]}-${p[1]}-${p[0]}`;
        }
      }

      if (!dadosExtraidos.valor) {
        const regexValor = /R?\$\s*([\d]{1,3}(?:\.?\d{3})*,\d{2})/g;
        const valoresEncontrados = textoCompleto.match(regexValor);
        if (valoresEncontrados) {
          dadosExtraidos.valor = valoresEncontrados[0].replace(/[^\d,]/g, '').replace(',', '.');
        }
      }

      if (!dadosExtraidos.descricao) {
        const linhas = textoCompleto.split('\n').map(l => l.trim()).filter(l => l.length > 10);

        // Estrategia 1: linha comeca com nome de empresa conhecido
        for (const l of linhas.slice(0, 15)) {
          if (/^(COMPANHIA|EMPRESA|CAIXA|BANCO)\s/i.test(l) && !/DANFE|NOTA FISCAL/i.test(l)) {
            dadosExtraidos.descricao = l.trim();
            break;
          }
        }

        // Estrategia 2: linha contem palavra-chave de empresa
        if (!dadosExtraidos.descricao) {
          for (const l of linhas.slice(0, 15)) {
            if (/(?:COMPANHIA|CONCESSIONARIA|SANEAMENTO|TELECOM|SEGURO|PREVIDENCIA|OPERADORA)/i.test(l) && !/DANFE|NOTA FISCAL|CLIENTE/i.test(l)) {
              dadosExtraidos.descricao = l.trim();
              break;
            }
          }
        }

        // Estrategia 3: CNPJ precedido de nome em maiusculas
        if (!dadosExtraidos.descricao) {
          const mCnpj = textoCompleto.match(/([A-Z][A-Z\s]{10,60})\s*(?:CNPJ|CNP)\s*[\d.\/-]+/i);
          if (mCnpj) dadosExtraidos.descricao = mCnpj[1].trim();
        }

        // Estrategia 4: labels tradicionais de boleto
        if (!dadosExtraidos.descricao) {
          const mLabel = textoCompleto.match(/(?:Benefici[ií]rio|Cedente|Favorecido|Sacador)[:\s]+([A-Z][^\n]{2,60})/i);
          if (mLabel) dadosExtraidos.descricao = mLabel[1].trim();
        }
      }

      const regexBoleto = /\d{5}[\s.]?\d{5}[\s.]?\d{5}[\s.]?\d{6}[\s.]?\d{5}[\s.]?\d{6}[\s.]?\d[\s.]?\d{14}/g;
      const barrasEncontrado = textoCompleto.match(regexBoleto);
      if (barrasEncontrado) dadosExtraidos.codigoBarras = barrasEncontrado[0].replace(/[^\d]/g, '');
    }

        console.log(`[OCR DEBUG] Dados extraidos:`, JSON.stringify(dadosExtraidos));

        // Limpa artefatos de OCR da descricao
        if (dadosExtraidos.descricao) {
          dadosExtraidos.descricao = dadosExtraidos.descricao.replace(/^[a-z\s]+/, '').trim();
        }

        // Verifica se extraiu dados uteis
        const temDadosUteis = dadosExtraidos.descricao || dadosExtraidos.valor || dadosExtraidos.dataVencimento;
        if (!temDadosUteis && ocrWarning) {
          dadosExtraidos.aviso = ocrWarning;
        } else if (!temDadosUteis && textoCompleto) {
          dadosExtraidos.aviso = 'Texto extraido do documento, mas nao foi possivel identificar descricao, valor ou data. Verifique os dados manualmente.';
          dadosExtraidos.textoBruto = textoCompleto.substring(0, 1000);
        } else if (!temDadosUteis) {
          dadosExtraidos.aviso = 'Nao foi possivel extrair texto do documento. Verifique se e uma imagem legivel ou PDF com texto.';
        }

    // INTEGRAÇÃO DRIVE
    console.log(`[DRIVE] Armazenando arquivo na nuvem...`);
    const dataAtual = new Date();
    const ano = dataAtual.getFullYear().toString();
    const meses = ['01-Janeiro', '02-Fevereiro', '03-Marco', '04-Abril', '05-Maio', '06-Junho', '07-Julho', '08-Agosto', '09-Setembro', '10-Outubro', '11-Novembro', '12-Dezembro'];
    const mesAtual = meses[dataAtual.getMonth()];

    const baseFolderId = obterParentId();
    const serviceAccountClient = getDriveClient(false);
    const fileMetadataBase = { name: `Boleto_${dadosExtraidos.descricao || 'Desconhecido'}_${Date.now()}.pdf` };
    const criarMedia = () => ({ mimeType: req.file.mimetype, body: streamifier.createReadStream(req.file.buffer) });
    const normalizedParent = (parentId) => (parentId === GOOGLE_DRIVE_SHARED_DRIVE_ID ? 'root' : parentId);

    const uploadParaDrive = async (client, parentId) => {
      const anoFolderId = await obterOuCriarPasta(ano, parentId, client);
      const mesFolderId = await obterOuCriarPasta(mesAtual, anoFolderId, client);
      const fileMetadata = { ...fileMetadataBase, parents: [normalizedParent(mesFolderId)] };
      const media = criarMedia();
      return criarArquivoNoDrive(fileMetadata, media, client);
    };

    try {
      const driveFile = await uploadParaDrive(serviceAccountClient, baseFolderId);
      dadosExtraidos.linkArquivo = driveFile.data.webViewLink;
      console.log(`[SUCCESS] OCR e Upload concluídos com sucesso para o arquivo.`);
      return res.json(dadosExtraidos);
    } catch (driveErr) {
      console.error('[DRIVE ERROR] Falha ao enviar para o Google Drive com service account:', driveErr.message || driveErr);
      let aviso = `Falha ao enviar para Google Drive: ${driveErr.message || 'erro desconhecido'}`;

      if (driveErr.message && driveErr.message.includes('Service Accounts do not have storage quota')) {
        aviso = 'Falha ao enviar para o Google Drive. O Service Account atual não possui quota de armazenamento. Configure um shared drive ou use credenciais OAuth com permissões de armazenamento.';
      }
      if (driveErr.message && driveErr.message.includes('Shared drive not found')) {
        aviso = 'Falha ao enviar para o Google Drive. O shared drive configurado não foi encontrado ou a conta atual não tem acesso. Verifique o ID do shared drive, adicione o service account como membro ou use GOOGLE_DRIVE_FOLDER_ID para um diretório normal.';
      }

      if (oauthDrive) {
        try {
          const oauthClient = getDriveClient(true);
          const driveFileOauth = await uploadParaDrive(oauthClient, baseFolderId);
          dadosExtraidos.linkArquivo = driveFileOauth.data.webViewLink;
          aviso = `Upload bem-sucedido usando OAuth após falha do Service Account.`;
          dadosExtraidos.aviso = aviso;
          console.log('[SUCCESS] Upload concluído com OAuth após falha do Service Account.');
          return res.json(dadosExtraidos);
        } catch (oauthErr) {
          console.error('[OAUTH DRIVE ERROR] Falha ao enviar para o Google Drive com OAuth:', oauthErr.message || oauthErr);
          aviso += ' Tentativa de fallback OAuth também falhou.';
        }
      }

      dadosExtraidos.aviso = aviso;
      try {
        const uploadsDir = './uploads';
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const localPath = `${uploadsDir}/${fileMetadataBase.name}`;
        fs.writeFileSync(localPath, req.file.buffer);
        dadosExtraidos.localPath = localPath;
        console.log('[LOCAL SAVE] Arquivo salvo localmente em', localPath);
      } catch (localErr) {
        console.error('[LOCAL SAVE ERROR] Falha ao salvar arquivo localmente:', localErr.message || localErr);
      }

      return res.status(200).json(dadosExtraidos);
    }
  } catch (error) {
    console.error("[SERVER CRITICAL ERROR]:", error);
    res.status(500).json({ erro: 'Falha na comunicação com o GCP ou Drive.', detalhes: error.message });
  }
});

// ---------------------------------------------------------
// ROTA: UPLOAD HISTÓRICO DE SAÚDE
// ---------------------------------------------------------
app.post('/api/upload-saude', autenticar, verificarPermissao('saude'), limiterUpload, upload.single('documento'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ erro: 'Nenhum documento recebido.' });
    const client = getDriveClient(false);
    const baseFolderId = obterParentId();
    const pastaSaudeId = await obterOuCriarPasta('Saude_Historico', baseFolderId, client);
    const fileMetadata = { name: `Saude_${Date.now()}_${req.file.originalname}`, parents: [pastaSaudeId] };
    const media = { mimeType: req.file.mimetype, body: streamifier.createReadStream(req.file.buffer) };
    const driveFile = await criarArquivoNoDrive(fileMetadata, media, client);
    res.json({ linkArquivo: driveFile.data.webViewLink });
  } catch (error) {
    res.status(500).json({ erro: 'Falha ao salvar o documento no Google Drive.', detalhes: error.message });
  }
});

// ---------------------------------------------------------
// ADMIN: Gerenciamento de Membros da Família (Usuários + Pets)
// ---------------------------------------------------------

const SUPERADMIN_EMAIL = 'tobiasrocha@gmail.com';

const MODULOS = ['financeiro', 'tarefas', 'saude', 'estudos', 'patrimonio', 'viagens', 'espiritual'];

const permissoesPadrao = () => {
  const p = {};
  MODULOS.forEach(m => p[m] = true);
  return p;
};

const isSuperadmin = (email) => email === SUPERADMIN_EMAIL;

const formatarMembro = (doc) => {
  const data = doc.data();
  const email = data.email || '';
  return {
    id: doc.id,
    uid: data.uid || null,
    nome: data.nome || '',
    email,
    tipo: data.tipo || 'Adulto',
    dataNascimento: data.dataNascimento || '',
    tipoSanguineo: data.tipoSanguineo || '',
    alergias: data.alergias || '',
    telefone: data.telefone || '',
    role: data.role || 'usuario',
    criadoEm: data.criadoEm || '',
    isSuperadmin: isSuperadmin(email),
    permissoes: isSuperadmin(email) ? permissoesPadrao() : (data.permissoes || {}),
    temAuth: !!(data.uid || data.email),
  };
};

// Lista todos os membros (auth users + pets + dados antigos de perfis)
app.get('/api/admin/usuarios', autenticar, verificarAdmin, async (req, res) => {
  try {
    // Garante que o superadmin tem doc no Firestore
    try {
      const superDoc = await firestoreDb.collection('usuarios')
        .where('email', '==', SUPERADMIN_EMAIL).limit(1).get();
      if (superDoc.empty) {
        let uid = null;
        try {
          const superUser = await authAdmin.getUserByEmail(SUPERADMIN_EMAIL);
          uid = superUser.uid;
          await firestoreDb.collection('usuarios').doc(uid).set({
            uid, nome: 'Tobias Rocha', email: SUPERADMIN_EMAIL, tipo: 'Adulto',
            role: 'admin', criadoEm: new Date().toISOString(), ativo: true,
            permissoes: permissoesPadrao(),
            dataNascimento: '', tipoSanguineo: '', alergias: '', telefone: '',
          });
        } catch {
          await firestoreDb.collection('usuarios').add({
            nome: 'Tobias Rocha', email: SUPERADMIN_EMAIL, tipo: 'Adulto',
            role: 'admin', criadoEm: new Date().toISOString(), ativo: true,
            permissoes: permissoesPadrao(),
            dataNascimento: '', tipoSanguineo: '', alergias: '', telefone: '',
          });
        }
        console.log('[ADMIN] Documento superadmin criado automaticamente.');
      }
    } catch (e) { console.warn('[ADMIN] Nao foi possivel verificar superadmin:', e.message); }

    const snapshot = await firestoreDb.collection('usuarios').get();
    const membros = snapshot.docs.map(formatarMembro);

    res.json({ usuarios: membros });
  } catch (error) {
    console.error('[ADMIN] Erro ao listar membros:', error);
    res.status(500).json({ erro: 'Falha ao listar membros.', detalhes: error.message });
  }
});

// Cria novo membro (auth user ou pet)
app.post('/api/admin/usuarios', autenticar, verificarAdmin, async (req, res) => {
  try {
    const parsed = schemaCriarUsuario.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ erro: parsed.error.issues.map(i => i.message).join('; ') });
    }
    const { nome, email, senha, tipo, dataNascimento, tipoSanguineo, alergias, telefone } = parsed.data;

    const dadosFirestore = {
      nome,
      tipo: tipo || 'Adulto',
      dataNascimento: dataNascimento || '',
      tipoSanguineo: tipoSanguineo || '',
      alergias: alergias || '',
      telefone: telefone || '',
      criadoEm: new Date().toISOString(),
    };

    // Pet: apenas Firestore, sem auth
    if (tipo === 'Pet') {
      const docRef = await firestoreDb.collection('usuarios').add(dadosFirestore);
      console.log(`[ADMIN] Pet criado: ${nome} (${docRef.id})`);
      return res.json(formatarMembro(await docRef.get()));
    }

    // Auth user: requer email
    if (!email) {
      return res.status(400).json({ erro: 'Email obrigatorio para usuario do sistema.' });
    }

    let uid;
    // Se nao tem senha, tenta encontrar usuario existente (Google sign-in)
    if (!senha) {
      try {
        const existing = await authAdmin.getUserByEmail(email);
        uid = existing.uid;
        dadosFirestore.uid = uid;
        dadosFirestore.role = 'usuario';
        dadosFirestore.ativo = true;
        dadosFirestore.permissoes = {};
        await firestoreDb.collection('usuarios').doc(uid).set(dadosFirestore);
        console.log(`[ADMIN] Usuario Google adicionado: ${email} (${uid})`);
        return res.json(formatarMembro(await firestoreDb.collection('usuarios').doc(uid).get()));
      } catch {
        return res.status(400).json({ erro: 'Usuario Google nao encontrado. Faca login com Google primeiro ou defina uma senha.' });
      }
    }

    if (senha.length < 6) {
      return res.status(400).json({ erro: 'Senha deve ter no minimo 6 caracteres.' });
    }

    const userRecord = await authAdmin.createUser({
      email,
      password: senha,
      displayName: nome,
    });

    dadosFirestore.uid = userRecord.uid;
    dadosFirestore.email = email;
    dadosFirestore.role = 'usuario';
    dadosFirestore.ativo = true;
    dadosFirestore.permissoes = {};

    await firestoreDb.collection('usuarios').doc(userRecord.uid).set(dadosFirestore);

    console.log(`[ADMIN] Usuario criado: ${email} (${userRecord.uid})`);
    const doc = await firestoreDb.collection('usuarios').doc(userRecord.uid).get();
    res.json(formatarMembro(doc));
  } catch (error) {
    console.error('[ADMIN] Erro ao criar membro:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ erro: 'Este email ja esta cadastrado.' });
    }
    res.status(500).json({ erro: 'Falha ao criar membro.', detalhes: error.message });
  }
});

// Atualiza membro (todos os campos)
app.put('/api/admin/usuarios/:id', autenticar, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = schemaAtualizarUsuario.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ erro: parsed.error.issues.map(i => i.message).join('; ') });
    }
    const { nome, email, tipo, dataNascimento, tipoSanguineo, alergias, telefone } = parsed.data;

    const docRef = firestoreDb.collection('usuarios').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ erro: 'Membro nao encontrado.' });

    const data = doc.data();
    const temAuth = !!data.uid;

    const firestoreUpdates = {};
    if (nome !== undefined) firestoreUpdates.nome = nome;
    if (tipo !== undefined) firestoreUpdates.tipo = tipo;
    if (dataNascimento !== undefined) firestoreUpdates.dataNascimento = dataNascimento;
    if (tipoSanguineo !== undefined) firestoreUpdates.tipoSanguineo = tipoSanguineo;
    if (alergias !== undefined) firestoreUpdates.alergias = alergias;
    if (telefone !== undefined) firestoreUpdates.telefone = telefone;

    if (temAuth) {
      const authUpdates = {};
      if (nome) authUpdates.displayName = nome;
      if (email && email !== data.email) {
        authUpdates.email = email;
        firestoreUpdates.email = email;
      }
      if (Object.keys(authUpdates).length > 0) {
        await authAdmin.updateUser(data.uid, authUpdates);
      }
    }

    await docRef.set(firestoreUpdates, { merge: true });

    console.log(`[ADMIN] Membro atualizado: ${id}`);
    const updated = await docRef.get();
    res.json(formatarMembro(updated));
  } catch (error) {
    console.error('[ADMIN] Erro ao atualizar membro:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ erro: 'Este email ja esta em uso.' });
    }
    res.status(500).json({ erro: 'Falha ao atualizar membro.', detalhes: error.message });
  }
});

// Exclui membro
app.delete('/api/admin/usuarios/:id', autenticar, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = firestoreDb.collection('usuarios').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ erro: 'Membro nao encontrado.' });

    const data = doc.data();
    if (data.uid) {
      try { await authAdmin.deleteUser(data.uid); } catch (e) { console.warn('[ADMIN] Auth user ja removido:', e.message); }
    }
    await docRef.delete();
    console.log(`[ADMIN] Membro excluido: ${id}`);
    res.json({ ok: true });
  } catch (error) {
    console.error('[ADMIN] Erro ao excluir membro:', error);
    res.status(500).json({ erro: 'Falha ao excluir membro.', detalhes: error.message });
  }
});

// Redefine senha (apenas auth users)
app.post('/api/admin/usuarios/:id/reset-senha', autenticar, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = schemaResetSenha.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ erro: parsed.error.issues.map(i => i.message).join('; ') });
    }
    const { senha: novaSenha } = parsed.data;

    const doc = await firestoreDb.collection('usuarios').doc(id).get();
    if (!doc.exists || !doc.data().uid) {
      return res.status(400).json({ erro: 'Este membro nao possui conta de acesso.' });
    }

    await authAdmin.updateUser(doc.data().uid, { password: novaSenha });
    console.log(`[ADMIN] Senha redefinida para: ${id}`);
    res.json({ ok: true });
  } catch (error) {
    console.error('[ADMIN] Erro ao redefinir senha:', error);
    res.status(500).json({ erro: 'Falha ao redefinir senha.', detalhes: error.message });
  }
});

// Atualiza permissoes (apenas auth users)
app.put('/api/admin/usuarios/:id/permissoes', autenticar, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = schemaPermissoes.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ erro: parsed.error.issues.map(i => i.message).join('; ') });
    }
    const { permissoes } = parsed.data;
    const docRef = firestoreDb.collection('usuarios').doc(id);
    const doc = await docRef.get();
    if (!doc.exists || !doc.data().uid) {
      return res.status(400).json({ erro: 'Apenas usuarios do sistema possuem permissoes.' });
    }
    await docRef.update({ permissoes });
    console.log(`[ADMIN] Permissoes atualizadas para: ${id}`);
    res.json({ ok: true, permissoes });
  } catch (error) {
    console.error('[ADMIN] Erro ao atualizar permissoes:', error);
    res.status(500).json({ erro: 'Falha ao atualizar permissoes.', detalhes: error.message });
  }
});

// Obtem permissoes do usuario logado
app.get('/api/admin/permissoes', autenticar, async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ erro: 'Email obrigatorio.' });

    if (isSuperadmin(email)) {
      return res.json({ permissoes: permissoesPadrao(), isSuperadmin: true });
    }

    let userRecord;
    try {
      userRecord = await authAdmin.getUserByEmail(email);
    } catch {
      return res.json({ permissoes: {}, isSuperadmin: false });
    }

    const meta = await firestoreDb.collection('usuarios').doc(userRecord.uid).get();
    const metaData = meta.exists ? meta.data() : {};
    res.json({
      permissoes: metaData.permissoes || {},
      isSuperadmin: false,
    });
  } catch (error) {
    console.error('[ADMIN] Erro ao buscar permissoes:', error);
    res.status(500).json({ erro: 'Falha ao buscar permissoes.', detalhes: error.message });
  }
});

// Alerta de prestador
app.post('/api/disparar-alerta-prestador', autenticar, async (req, res) => {
  try {
    const { prestadorId } = req.body;
    if (!prestadorId || !firestoreDb) return res.status(400).json({ erro: 'Dados invalidos.' });

    const doc = await firestoreDb.collection('prestadores').doc(prestadorId).get();
    if (!doc.exists) return res.status(404).json({ erro: 'Prestador nao encontrado.' });
    const p = doc.data();

    const corpo = [
      '🔧 *ERP Familia Rocha — Alerta de Prestador*', '',
      `*Nome:* ${p.nome}`,
      `*Tipo:* ${p.tipoServico || '-'}`,
      `*Telefone:* ${p.telefone || '-'}`,
      p.dataAgendamento ? `*Agendamento:* ${p.dataAgendamento.split('-').reverse().join('/')}${p.horaAgendamento ? ' às ' + p.horaAgendamento : ''}` : '',
      p.valorServico > 0 ? `*Valor:* R$ ${Number(p.valorServico).toFixed(2).replace('.', ',')}` : '',
      p.materiais ? `*Materiais:* ${p.materiais}` : '',
      p.alimentos ? `*Alimentos:* ${p.alimentos}` : '',
      p.providencias ? `*Providencias:* ${p.providencias}` : '',
      p.banco ? `*Banco:* ${p.banco}` : '',
      p.conta ? `*Conta:* ${p.conta}` : '',
      p.pix ? `*PIX:* ${p.pix}` : '',
    ].filter(Boolean).join('\n');

    const assunto = `🔧 Prestador: ${p.nome} — ${p.dataAgendamento?.split('-').reverse().join('/') || 'Sem data'}`;
    const corpoPlain = corpo.replace(/\*/g, '');

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587, secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    await transporter.sendMail({
      from: `"ERP Familia Rocha" <${process.env.SMTP_USER}>`,
      to: 'tobiasrocha@gmail.com',
      subject: assunto,
      text: corpoPlain,
      headers: { 'X-Priority': '1', 'X-MSMail-Priority': 'High', 'Auto-Submitted': 'auto-generated' },
    });

    if (process.env.WHATSAPP_API_URL && p.telefone) {
      let numero = p.telefone.replace(/[^\d]/g, '');
      if (!numero.startsWith('55') && (numero.length === 10 || numero.length === 11)) numero = '55' + numero;
      if (numero) {
        await fetch(process.env.WHATSAPP_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': process.env.WHATSAPP_API_TOKEN, 'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}` },
          body: JSON.stringify({ number: numero, text: corpo }),
        });
      }
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ erro: 'Falha ao enviar alerta.', detalhes: error.message });
  }
});

// Health check para Cloud Run
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(porta, () => console.log(`🚀 API rodando na porta ${porta}`));