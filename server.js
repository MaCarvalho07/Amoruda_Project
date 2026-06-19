'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'amoruda';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'amoruda123';

let mongoClient;

app.use(cors());
app.use(express.json({ limit: '200kb' }));
app.use(express.static(__dirname));

function requireMongoUri() {
  if (!MONGODB_URI) {
    const err = new Error('MONGODB_URI nao configurado.');
    err.statusCode = 500;
    throw err;
  }
}

async function getDb() {
  requireMongoUri();
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
  }
  return mongoClient.db(MONGODB_DB);
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function cleanText(value, max = 500) {
  return String(value || '').trim().slice(0, max);
}

function makeOrderCode() {
  const now = new Date();
  const stamp = now.toISOString().replace(/\D/g, '').slice(0, 12);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AMR-${stamp}-${rand}`;
}

function moneyValue(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : 0;
}

function validateOrder(body) {
  const cliente = body && body.cliente ? body.cliente : {};
  const entrega = body && body.entrega ? body.entrega : {};
  const itens = Array.isArray(body && body.itens) ? body.itens : [];

  const nome = cleanText(cliente.nome, 120);
  const telefone = onlyDigits(cliente.telefone);
  const endereco = cleanText(entrega.endereco, 180);
  const bairro = cleanText(entrega.bairro, 100);
  const cidade = cleanText(entrega.cidade, 100);

  if (!nome) return 'Informe o nome do cliente.';
  if (telefone.length < 10 || telefone.length > 13) return 'Informe um WhatsApp valido com DDD.';
  if (!endereco) return 'Informe o endereco de entrega.';
  if (!bairro) return 'Informe o bairro.';
  if (!cidade) return 'Informe a cidade.';
  if (!itens.length) return 'O pedido precisa ter pelo menos um item.';
  if (itens.length > 40) return 'Pedido com muitos itens.';

  for (const item of itens) {
    if (!cleanText(item.nome, 120)) return 'Um item do pedido esta sem nome.';
    if (!Number.isInteger(Number(item.quantidade)) || Number(item.quantidade) < 1) {
      return 'Um item do pedido tem quantidade invalida.';
    }
  }

  return null;
}

function normalizeOrder(body) {
  const itens = body.itens.map(item => {
    const quantidade = Math.max(1, parseInt(item.quantidade, 10));
    const precoUnitario = moneyValue(item.precoUnitario);
    return {
      produtoId: cleanText(item.produtoId, 60),
      nome: cleanText(item.nome, 120),
      quantidade,
      precoUnitario,
      subtotal: moneyValue(precoUnitario * quantidade),
    };
  });

  const totalCalculado = moneyValue(itens.reduce((sum, item) => sum + item.subtotal, 0));
  const agora = new Date();

  return {
    codigo: makeOrderCode(),
    status: 'novo',
    cliente: {
      nome: cleanText(body.cliente.nome, 120),
      telefone: onlyDigits(body.cliente.telefone),
    },
    entrega: {
      endereco: cleanText(body.entrega.endereco, 180),
      bairro: cleanText(body.entrega.bairro, 100),
      cidade: cleanText(body.entrega.cidade, 100),
      observacoes: cleanText(body.entrega.observacoes, 800),
    },
    itens,
    total: totalCalculado,
    origem: 'site',
    criadoEm: agora,
    atualizadoEm: agora,
  };
}

function isAdminRequest(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return false;

  const encoded = header.slice(6);
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const splitAt = decoded.indexOf(':');
  const user = decoded.slice(0, splitAt);
  const pass = decoded.slice(splitAt + 1);

  return user === ADMIN_USER && pass === ADMIN_PASS;
}

function requireAdmin(req, res, next) {
  if (!isAdminRequest(req)) {
    res.set('WWW-Authenticate', 'Basic realm="Amoruda Admin"');
    return res.status(401).json({ erro: 'Nao autorizado.' });
  }
  next();
}

app.get('/api/health', async (req, res, next) => {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.post('/api/pedidos', async (req, res, next) => {
  try {
    const erro = validateOrder(req.body);
    if (erro) return res.status(400).json({ erro });

    const pedido = normalizeOrder(req.body);
    const db = await getDb();
    await db.collection('pedidos').insertOne(pedido);

    res.status(201).json({
      ok: true,
      codigo: pedido.codigo,
      total: pedido.total,
      status: pedido.status,
      criadoEm: pedido.criadoEm,
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/admin/pedidos', requireAdmin, async (req, res, next) => {
  try {
    const db = await getDb();
    const pedidos = await db
      .collection('pedidos')
      .find({})
      .sort({ criadoEm: -1 })
      .limit(100)
      .toArray();

    res.json({ pedidos });
  } catch (err) {
    next(err);
  }
});

app.patch('/api/admin/pedidos/:codigo/status', requireAdmin, async (req, res, next) => {
  try {
    const status = cleanText(req.body.status, 40);
    const permitidos = ['novo', 'em_preparo', 'saiu_entrega', 'concluido', 'cancelado'];
    if (!permitidos.includes(status)) {
      return res.status(400).json({ erro: 'Status invalido.' });
    }

    const db = await getDb();
    const result = await db.collection('pedidos').findOneAndUpdate(
      { codigo: req.params.codigo },
      { $set: { status, atualizadoEm: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result.value) return res.status(404).json({ erro: 'Pedido nao encontrado.' });
    res.json({ pedido: result.value });
  } catch (err) {
    next(err);
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    erro: err.statusCode === 500 ? 'Erro interno no servidor.' : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`Amoruda rodando em http://localhost:${PORT}`);
});
