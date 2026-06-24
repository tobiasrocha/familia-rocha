// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
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
const fs = require('fs');
const path = require('path');
const os = require('os');

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

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origensPermitidas.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Permite tudo em producao (Cloud Run com IAM)
    }
  }
}));
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// Inicializacao dos clientes Google (com fallback para ADC no Cloud Run)
const docAiClient = serviceAccount
  ? new DocumentProcessorServiceClient({ keyFilename: credenciaisPath })
  : new DocumentProcessorServiceClient();

if (getApps().length === 0) {
  initializeApp(serviceAccount ? { credential: cert(serviceAccount) } : {});
}
const firestoreDb = getFirestore();

// Inicialização segura do Google Drive API via service account
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || null;
const GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || null;
const GOOGLE_OAUTH_REFRESH_TOKEN = process.env.GOOGLE_OAUTH_REFRESH_TOKEN || null;

const serviceAccountAuth = serviceAccount
  ? new google.auth.GoogleAuth({ keyFile: credenciaisPath, scopes: ['https://www.googleapis.com/auth/drive'] })
  : new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/drive'] });
const serviceAccountDrive = google.drive({ version: 'v3', auth: serviceAccountAuth });

let oauthDrive = null;
if (GOOGLE_OAUTH_CLIENT_ID && GOOGLE_OAUTH_CLIENT_SECRET && GOOGLE_OAUTH_REFRESH_TOKEN) {
  const oauth2Client = new google.auth.OAuth2(GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: GOOGLE_OAUTH_REFRESH_TOKEN });
  oauthDrive = google.drive({ version: 'v3', auth: oauth2Client });
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

    // 1. Busca financas pendentes
    const snapshot = await firestoreDb.collection('financas')
      .where('tipo', '==', 'Despesa')
      .where('status', '==', 'Pendente')
      .get();

    resultado.contasEscaneadas = snapshot.size;

    if (snapshot.empty) {
      console.log("[ALERTAS] Nenhuma conta pendente no banco.");
      return resultado;
    }

    // 2. Busca telefones dos perfis
    const perfisSnapshot = await firestoreDb.collection('perfis').get();
    const contatos = [];

    perfisSnapshot.forEach(doc => {
      const perfil = doc.data();
      if (perfil.telefone) {
        let numero = perfil.telefone.replace(/[^\d]/g, '');
        if (!numero.startsWith('55') && (numero.length === 10 || numero.length === 11)) {
          numero = '55' + numero;
        }
        if (numero) contatos.push({ nome: perfil.nome, numero });
      }
    });

    console.log(`[ALERTAS] ${contatos.length} contatos WhatsApp carregados`);

    // 3. Configura transporte de email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const emailDestinatarios = (process.env.ALERTA_EMAILS || 'tobiasrocha@gmail.com,renallyraiani@gmail.com')
      .split(',').map(e => e.trim()).filter(Boolean);

    const whatsappHabilitado = !!(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN);
    const prazosAlerta = [5, 0]; // dias antes do vencimento: 5 dias e no dia

    // 4. Processa cada conta
    for (let doc of snapshot.docs) {
      const conta = doc.data();
      if (!conta.dataVencimento) continue;

      const vencimento = new Date(conta.dataVencimento + 'T00:00:00');
      const diffTempo = vencimento.getTime() - hoje.getTime();
      const diffDias = Math.ceil(diffTempo / (1000 * 60 * 60 * 24));

      // Pula contas vencidas ha mais de 1 dia
      if (diffDias < -1) continue;

      // So alerta nos prazos configurados
      if (!prazosAlerta.includes(diffDias)) continue;

      const diasRestantes = diffDias >= 0 ? diffDias : 0;
      const vencFormatado = conta.dataVencimento.split('-').reverse().join('/');
      const valorFormatado = Number(conta.valor).toFixed(2).replace('.', ',');

      const assunto = diasRestantes === 0
        ? `[VENCE HOJE] ${conta.descricao} - R$ ${valorFormatado}`
        : `[Vence em ${diasRestantes} dias] ${conta.descricao} - R$ ${valorFormatado}`;

      const corpo = [
        `📋 *ERP Familia Rocha - Alerta de Vencimento*`,
        ``,
        `*Descricao:* ${conta.descricao}`,
        `*Categoria:* ${conta.categoria || 'Outros'}`,
        `*Valor:* R$ ${valorFormatado}`,
        `*Vencimento:* ${vencFormatado}`,
        diasRestantes === 0 ? `⚠️ *Vence HOJE!*` : `📅 Faltam *${diasRestantes} dias*`,
        conta.codigoBarras ? `*Cod. Barras:* ${conta.codigoBarras}` : '',
        ``,
        `Acesse o sistema para atualizar o pagamento.`
      ].filter(Boolean).join('\n');

      const detalheConta = {
        descricao: conta.descricao,
        valor: Number(conta.valor),
        vencimento: conta.dataVencimento,
        diasRestantes,
        email: { ok: false, erro: null },
        whatsapp: []
      };

      // Envia email
      try {
        await transporter.sendMail({
          from: `"ERP Familia Rocha" <${process.env.SMTP_USER}>`,
          to: emailDestinatarios,
          subject: assunto,
          text: corpo.replace(/\*/g, '')
        });
        detalheConta.email.ok = true;
        resultado.emailsEnviados++;
        console.log(`[EMAIL] Enviado: "${assunto}"`);
      } catch (errEmail) {
        detalheConta.email.erro = errEmail.message;
        resultado.emailsFalhas++;
        console.error(`[EMAIL ERROR] ${errEmail.message}`);
      }

      // Envia WhatsApp
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
              body: JSON.stringify({
                number: contato.numero,
                text: corpo,
                textMessage: { text: corpo }
              })
            });

            if (resWpp.ok) {
              resultado.whatsappsEnviados++;
              detalheConta.whatsapp.push({ nome: contato.nome, ok: true });
            } else {
              resultado.whatsappsFalhas++;
              detalheConta.whatsapp.push({ nome: contato.nome, ok: false, status: resWpp.status });
            }
          } catch (errWpp) {
            resultado.whatsappsFalhas++;
            detalheConta.whatsapp.push({ nome: contato.nome, ok: false, erro: errWpp.message });
          }
        }
      }

      resultado.contasNoPrazo++;
      resultado.detalhes.push(detalheConta);
    }

    console.log(`[ALERTAS] Finalizado: ${resultado.contasNoPrazo} contas, ${resultado.emailsEnviados} emails, ${resultado.whatsappsEnviados} WhatsApps`);
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
app.post('/api/disparar-alertas', async (req, res) => {
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

    // Busca eventos futuros (dataEvento >= hoje)
    const snapshot = await firestoreDb.collection('saude').get();
    resultado.eventosEscaneados = snapshot.size;

    if (snapshot.empty) {
      console.log("[ALERTAS SAUDE] Nenhum evento de saude cadastrado.");
      return resultado;
    }

    // Busca perfis para telefones
    const perfisSnapshot = await firestoreDb.collection('perfis').get();
    const perfisMap = {};
    const contatos = [];

    perfisSnapshot.forEach(doc => {
      const perfil = doc.data();
      perfisMap[doc.id] = perfil;
      if (perfil.telefone) {
        let numero = perfil.telefone.replace(/[^\d]/g, '');
        if (!numero.startsWith('55') && (numero.length === 10 || numero.length === 11)) {
          numero = '55' + numero;
        }
        if (numero) contatos.push({ nome: perfil.nome, numero });
      }
    });

    // Email transport
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

    for (let doc of snapshot.docs) {
      const evento = doc.data();
      if (!evento.dataEvento) continue;
      if (evento.tipo === 'Medicação') continue; // medicacao continua nao tem alerta de data

      const dataEvento = new Date(evento.dataEvento + 'T00:00:00');
      const diffTempo = dataEvento.getTime() - hoje.getTime();
      const diffDias = Math.ceil(diffTempo / (1000 * 60 * 60 * 24));

      if (diffDias < -1) continue;
      if (!prazosAlerta.includes(diffDias)) continue;

      const diasRestantes = diffDias >= 0 ? diffDias : 0;
      const dataFormatada = evento.dataEvento.split('-').reverse().join('/');
      const nomePaciente = perfisMap[evento.perfilId]?.nome || 'Paciente';
      const tipoEvento = evento.tipo || 'Consulta';

      const assunto = diasRestantes === 0
        ? `[HOJE] ${tipoEvento}: ${evento.titulo} - ${nomePaciente}`
        : `[Em ${diasRestantes} dias] ${tipoEvento}: ${evento.titulo} - ${nomePaciente}`;

      const corpo = [
        `🏥 *ERP Familia Rocha - Alerta de Saude*`,
        ``,
        `*Paciente:* ${nomePaciente}`,
        `*Tipo:* ${tipoEvento}`,
        `*Descricao:* ${evento.titulo}`,
        `*Data:* ${dataFormatada}`,
        evento.localProfissional ? `*Local/Profissional:* ${evento.localProfissional}` : '',
        evento.observacoes ? `*Observacoes:* ${evento.observacoes}` : '',
        diasRestantes === 0 ? `⚠️ *Hoje e o dia!*` : `📅 Faltam *${diasRestantes} dias*`,
      ].filter(Boolean).join('\n');

      const detalhe = {
        paciente: nomePaciente,
        tipo: tipoEvento,
        titulo: evento.titulo,
        data: evento.dataEvento,
        diasRestantes,
        email: { ok: false, erro: null },
        whatsapp: []
      };

      // Email
      try {
        await transporter.sendMail({
          from: `"ERP Familia Rocha" <${process.env.SMTP_USER}>`,
          to: emailDestinatarios,
          subject: assunto,
          text: corpo.replace(/\*/g, '')
        });
        detalhe.email.ok = true;
        resultado.emailsEnviados++;
      } catch (errEmail) {
        detalhe.email.erro = errEmail.message;
        resultado.emailsFalhas++;
      }

      // WhatsApp
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
              body: JSON.stringify({ number: contato.numero, text: corpo, textMessage: { text: corpo } })
            });
            if (resWpp.ok) {
              resultado.whatsappsEnviados++;
              detalhe.whatsapp.push({ nome: contato.nome, ok: true });
            } else {
              resultado.whatsappsFalhas++;
              detalhe.whatsapp.push({ nome: contato.nome, ok: false, status: resWpp.status });
            }
          } catch (errWpp) {
            resultado.whatsappsFalhas++;
            detalhe.whatsapp.push({ nome: contato.nome, ok: false, erro: errWpp.message });
          }
        }
      }

      resultado.eventosNoPrazo++;
      resultado.detalhes.push(detalhe);
    }

    console.log(`[ALERTAS SAUDE] Finalizado: ${resultado.eventosNoPrazo} eventos, ${resultado.emailsEnviados} emails, ${resultado.whatsappsEnviados} WhatsApps`);
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
app.post('/api/disparar-alertas-saude', async (req, res) => {
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
app.post('/api/importar-extrato', upload.single('documento'), async (req, res) => {
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
app.post('/api/conciliar-extrato', upload.single('documento'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ erro: 'Arquivo de extrato ausente.' });
    console.log(`[CONCILIACAO] Processando extrato: ${req.file.originalname}`);

    let textoExtrato = '';

    // 1) Extrai texto do extrato
    if (req.file.mimetype === 'application/pdf') {
      try {
        const doc = await pdfToImg(new Uint8Array(req.file.buffer.buffer, req.file.buffer.byteOffset, req.file.buffer.byteLength), { scale: 2 });
        const pageImg = await doc.getPage(1);
        const tmpImg = require('path').join(require('os').tmpdir(), `extrato_${Date.now()}.png`);
        const tmpOut = tmpImg.replace('.png', '');
        require('fs').writeFileSync(tmpImg, pageImg);
        const tesseractPath = process.env.TESSERACT_PATH || 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe';
        await execFileAsync(tesseractPath, [tmpImg, tmpOut, '-l', 'por', '--psm', '6', '--tessdata-dir', require('path').join(__dirname, 'tessdata')], { timeout: 60000 });
        textoExtrato = require('fs').readFileSync(tmpOut + '.txt', 'utf-8');
        try { require('fs').unlinkSync(tmpImg); require('fs').unlinkSync(tmpOut + '.txt'); } catch {}
      } catch (ocrErr) {
        console.error('[CONCILIACAO] Falha ao extrair texto do extrato:', ocrErr.message);
        return res.status(500).json({ erro: 'Nao foi possivel ler o extrato. Certifique-se de que e um PDF com texto ou imagem legivel.' });
      }
    } else {
      textoExtrato = req.file.buffer.toString('utf-8');
    }

    if (!textoExtrato || textoExtrato.trim().length < 20) {
      return res.status(400).json({ erro: 'Extrato vazio ou ilegivel.' });
    }

    console.log(`[CONCILIACAO] Texto extraido: ${textoExtrato.length} caracteres`);

    // 2) Extrai transacoes do texto (regex para formato brasileiro de extrato)
    const transacoesExtrato = [];
    const linhas = textoExtrato.split('\n');
    for (const linha of linhas) {
      const regexTransacao = /(\d{2}\/\d{2})\s+(.+?)\s+(-?R?\$\s*[\d.,]+)/i;
      const match = linha.match(regexTransacao);
      if (match) {
        const dataStr = match[1];
        const descricao = match[2].trim();
        const valorStr = match[3].replace(/[^\d,-]/g, '').replace(',', '.');
        const valor = parseFloat(valorStr);
        if (!isNaN(valor) && descricao.length > 3) {
          const [dia, mes] = dataStr.split('/');
          const ano = new Date().getFullYear();
          transacoesExtrato.push({ data: `${ano}-${mes}-${dia}`, descricao, valor: Math.abs(valor), tipo: valor < 0 ? 'DEBITO' : 'CREDITO' });
        }
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
    res.json({ transacoesExtrato, matches, totalPendentes: pendentes.length });
  } catch (error) {
    console.error('[CONCILIACAO ERROR]', error);
    res.status(500).json({ erro: 'Falha ao processar extrato.', detalhes: error.message });
  }
});

// ---------------------------------------------------------
// ROTA: BAIXA EM LOTE de conciliados
// ---------------------------------------------------------
app.post('/api/baixar-conciliados', async (req, res) => {
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
app.post('/api/extrair-boleto', upload.single('documento'), async (req, res) => {
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
        const [result] = await docAiClient.processDocument(request);
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
app.post('/api/upload-saude', upload.single('documento'), async (req, res) => {
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

// Health check para Cloud Run
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(porta, () => console.log(`🚀 API rodando na porta ${porta}`));