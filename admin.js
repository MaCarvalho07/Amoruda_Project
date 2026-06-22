/* =============================================
   AMORUDA COOKIES – admin.js
   Painel administrativo com LocalStorage
   ============================================= */

'use strict';

/* ==========================================
   CREDENCIAIS (simulação frontend)
   ==========================================
   Em produção, usar autenticação no backend!
   ========================================== */
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'amoruda123';
const SESSION_KEY = 'amoruda_admin_logado';

/* Chaves LocalStorage */
const LS_PRODUTOS   = 'amoruda_produtos';
const LS_AVALIACOES = 'amoruda_avaliacoes';

/* ==========================================
   ESTADO
   ========================================== */
const Admin = {
  logado:     false,
  produtos:   [],
  avaliacoes: [],
  abaAtual:   'produtos',
  confirmCb:  null,     /* callback da confirmação de exclusão */
  editandoProdId: null, /* null = novo, number = editar */
};

/* ==========================================
   LOGIN
   ========================================== */
function initLogin() {
  /* Toggle senha */
  document.getElementById('toggle-pass')?.addEventListener('click', () => {
    const inp = document.getElementById('login-pass');
    if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('form-login')?.addEventListener('submit', e => {
    e.preventDefault();
    const user = document.getElementById('login-user')?.value.trim();
    const pass = document.getElementById('login-pass')?.value;
    const err  = document.getElementById('login-error');

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      sessionStorage.setItem(SESSION_KEY, '1');
      entrarPainel();
    } else {
      if (err) err.textContent = 'Usuário ou senha incorretos.';
    }
  });

  /* Verifica se já tem sessão */
  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    entrarPainel();
  }
}

function entrarPainel() {
  document.getElementById('tela-login').style.display  = 'none';
  document.getElementById('painel-admin').style.display = 'block';
  Admin.logado = true;
  carregarDados();
  renderAbaAtual();
}

/* ==========================================
   LOGOUT
   ========================================== */
function initLogout() {
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });
}

/* ==========================================
   SIDEBAR MOBILE
   ========================================== */
function initSidebar() {
  const toggle  = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('admin-sidebar');

  toggle?.addEventListener('click', () => sidebar?.classList.toggle('open'));

  document.addEventListener('click', e => {
    if (sidebar?.classList.contains('open') && !sidebar.contains(e.target) && e.target !== toggle) {
      sidebar.classList.remove('open');
    }
  });
}

/* ==========================================
   NAVEGAÇÃO DE ABAS
   ========================================== */
function initNavAbas() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const aba = btn.dataset.tab;
      Admin.abaAtual = aba;

      /* Atualiza título do topbar */
      const titulos = { produtos: 'Gerenciar Produtos', avaliacoes: 'Gerenciar Avaliações', resumo: 'Resumo Geral' };
      const tb = document.getElementById('topbar-titulo');
      if (tb) tb.textContent = titulos[aba] || aba;

      renderAbaAtual();

      /* Fecha sidebar no mobile */
      document.getElementById('admin-sidebar')?.classList.remove('open');
    });
  });
}

function renderAbaAtual() {
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  const el = document.getElementById(`tab-${Admin.abaAtual}`);
  if (el) el.style.display = 'block';

  if (Admin.abaAtual === 'produtos')   renderTabelaProdutos();
  if (Admin.abaAtual === 'avaliacoes') renderTabelaAvaliacoes();
  if (Admin.abaAtual === 'resumo')     renderResumo();
}

/* ==========================================
   DADOS: carregar e salvar
   ========================================== */
function carregarDados() {
  /* Produtos */
  const pSalvos = localStorage.getItem(LS_PRODUTOS);
  if (pSalvos) {
    Admin.produtos = JSON.parse(pSalvos);
  } else {
    /* Carrega do JSON (tentativa via fetch, mas pode falhar no file://) */
    fetch('data/produtos.json')
      .then(r => r.ok ? r.json() : null)
      .then(dados => {
        if (dados) { Admin.produtos = dados; salvarProdutos(); }
        renderAbaAtual();
      })
      .catch(() => {
        Admin.produtos = getProdutosExemplo();
        salvarProdutos();
        renderAbaAtual();
      });
  }

  /* Avaliações */
  const aSalvos = localStorage.getItem(LS_AVALIACOES);
  if (aSalvos) {
    Admin.avaliacoes = JSON.parse(aSalvos);
  } else {
    fetch('data/avaliacoes.json')
      .then(r => r.ok ? r.json() : null)
      .then(dados => {
        if (dados) { Admin.avaliacoes = dados; salvarAvaliacoes(); }
        renderAbaAtual();
      })
      .catch(() => {
        Admin.avaliacoes = getAvaliacoesExemplo();
        salvarAvaliacoes();
        renderAbaAtual();
      });
  }
}

function salvarProdutos()   { localStorage.setItem(LS_PRODUTOS,   JSON.stringify(Admin.produtos)); }
function salvarAvaliacoes() { localStorage.setItem(LS_AVALIACOES, JSON.stringify(Admin.avaliacoes)); }

function proximoIdProduto()   { return Admin.produtos.length   ? Math.max(...Admin.produtos.map(p => p.id))   + 1 : 1; }
function proximoIdAvaliacao() { return Admin.avaliacoes.length ? Math.max(...Admin.avaliacoes.map(a => a.id)) + 1 : 1; }

/* ==========================================
   PRODUTOS
   ========================================== */
function initFormProdutos() {
  document.getElementById('btn-novo-produto')?.addEventListener('click', () => {
    Admin.editandoProdId = null;
    document.getElementById('prod-id').value    = '';
    document.getElementById('form-produto').reset();
    document.getElementById('form-prod-titulo').textContent = '+ Novo Produto';
    document.getElementById('form-produto-card').style.display = 'block';
    document.getElementById('form-produto-card').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('btn-cancelar-prod')?.addEventListener('click', () => {
    document.getElementById('form-produto-card').style.display = 'none';
    Admin.editandoProdId = null;
  });

  document.getElementById('form-produto')?.addEventListener('submit', e => {
    e.preventDefault();
    salvarProduto();
  });
}

function salvarProduto() {
  const nome         = document.getElementById('prod-nome')?.value.trim();
  const categoria    = document.getElementById('prod-categoria')?.value;
  const preco        = parseFloat(document.getElementById('prod-preco')?.value);
  const descricao    = document.getElementById('prod-descricao')?.value.trim();
  const ingredientes = document.getElementById('prod-ingredientes')?.value.trim();
  const imagem       = document.getElementById('prod-imagem')?.value.trim();
  const destaque     = document.getElementById('prod-destaque')?.checked;

  if (!nome || !categoria || isNaN(preco) || !descricao || !ingredientes) {
    showAdminToast('⚠️ Preencha todos os campos obrigatórios!');
    return;
  }

  if (Admin.editandoProdId !== null) {
    /* Editar */
    const idx = Admin.produtos.findIndex(p => p.id === Admin.editandoProdId);
    if (idx !== -1) {
      Admin.produtos[idx] = { ...Admin.produtos[idx], nome, categoria, preco, descricao, ingredientes, imagem, destaque };
      showAdminToast('✅ Produto atualizado com sucesso!');
    }
  } else {
    /* Novo */
    Admin.produtos.push({ id: proximoIdProduto(), nome, categoria, preco, descricao, ingredientes, imagem, destaque });
    showAdminToast('✅ Produto cadastrado com sucesso!');
  }

  salvarProdutos();
  document.getElementById('form-produto-card').style.display = 'none';
  document.getElementById('form-produto').reset();
  Admin.editandoProdId = null;
  renderTabelaProdutos();
  renderResumo();
}

function editarProduto(id) {
  const prod = Admin.produtos.find(p => p.id === id);
  if (!prod) return;

  Admin.editandoProdId = id;
  document.getElementById('prod-id').value            = id;
  document.getElementById('prod-nome').value          = prod.nome;
  document.getElementById('prod-categoria').value     = prod.categoria;
  document.getElementById('prod-preco').value         = prod.preco;
  document.getElementById('prod-descricao').value     = prod.descricao;
  document.getElementById('prod-ingredientes').value  = prod.ingredientes;
  document.getElementById('prod-imagem').value        = prod.imagem || '';
  document.getElementById('prod-destaque').checked    = prod.destaque;
  document.getElementById('form-prod-titulo').textContent = `✏️ Editar: ${prod.nome}`;
  document.getElementById('form-produto-card').style.display = 'block';
  document.getElementById('form-produto-card').scrollIntoView({ behavior: 'smooth' });
}

function excluirProduto(id) {
  const prod = Admin.produtos.find(p => p.id === id);
  confirmar(`Excluir o produto "${prod?.nome}"? Esta ação não pode ser desfeita.`, () => {
    Admin.produtos = Admin.produtos.filter(p => p.id !== id);
    salvarProdutos();
    renderTabelaProdutos();
    renderResumo();
    showAdminToast('🗑️ Produto excluído.');
  });
}

function renderTabelaProdutos() {
  const tbody = document.getElementById('tbody-produtos');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!Admin.produtos.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#a08060;padding:2rem">Nenhum produto cadastrado.</td></tr>';
    return;
  }

  Admin.produtos.forEach(prod => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>#${prod.id}</td>
      <td class="td-nome">${prod.nome}</td>
      <td><span class="badge-cat badge-${prod.categoria}">${prod.categoria}</span></td>
      <td>R$ ${parseFloat(prod.preco).toFixed(2).replace('.', ',')}</td>
      <td>${prod.destaque ? '⭐' : '–'}</td>
      <td>
        <div class="td-acoes">
          <button class="btn-edit" data-id="${prod.id}">✏️ Editar</button>
          <button class="btn-del"  data-id="${prod.id}">🗑️ Excluir</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', () => editarProduto(parseInt(btn.dataset.id))));
  tbody.querySelectorAll('.btn-del' ).forEach(btn => btn.addEventListener('click', () => excluirProduto(parseInt(btn.dataset.id))));
}

/* ==========================================
   AVALIAÇÕES
   ========================================== */
function initFormAvaliacoes() {
  /* Data padrão = hoje */
  const hoje = new Date().toISOString().split('T')[0];
  const inputData = document.getElementById('av-data');
  if (inputData) inputData.value = hoje;

  document.getElementById('btn-nova-av')?.addEventListener('click', () => {
    document.getElementById('form-av').reset();
    if (inputData) inputData.value = hoje;
    document.getElementById('form-av-card').style.display = 'block';
    document.getElementById('form-av-card').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('btn-cancelar-av')?.addEventListener('click', () => {
    document.getElementById('form-av-card').style.display = 'none';
  });

  document.getElementById('form-av')?.addEventListener('submit', e => {
    e.preventDefault();
    salvarAvaliacao();
  });
}

function salvarAvaliacao() {
  const nome       = document.getElementById('av-nome')?.value.trim();
  const nota       = parseInt(document.getElementById('av-nota')?.value);
  const produto    = document.getElementById('av-produto')?.value.trim();
  const data       = document.getElementById('av-data')?.value;
  const comentario = document.getElementById('av-comentario')?.value.trim();

  if (!nome || isNaN(nota) || !comentario || !data) {
    showAdminToast('⚠️ Preencha todos os campos obrigatórios!');
    return;
  }

  Admin.avaliacoes.push({
    id: proximoIdAvaliacao(),
    nome,
    nota,
    produto: produto || 'Produto não informado',
    data,
    comentario,
  });

  salvarAvaliacoes();
  document.getElementById('form-av-card').style.display = 'none';
  document.getElementById('form-av').reset();
  renderTabelaAvaliacoes();
  renderResumo();
  showAdminToast('✅ Avaliação adicionada com sucesso!');
}

function excluirAvaliacao(id) {
  const av = Admin.avaliacoes.find(a => a.id === id);
  confirmar(`Excluir a avaliação de "${av?.nome}"?`, () => {
    Admin.avaliacoes = Admin.avaliacoes.filter(a => a.id !== id);
    salvarAvaliacoes();
    renderTabelaAvaliacoes();
    renderResumo();
    showAdminToast('🗑️ Avaliação excluída.');
  });
}

function renderTabelaAvaliacoes() {
  const tbody = document.getElementById('tbody-avaliacoes');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!Admin.avaliacoes.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#a08060;padding:2rem">Nenhuma avaliação cadastrada.</td></tr>';
    return;
  }

  Admin.avaliacoes.forEach(av => {
    const estrelas = '★'.repeat(av.nota) + '☆'.repeat(5 - av.nota);
    const data = new Date(av.data + 'T00:00:00').toLocaleDateString('pt-BR');
    const coment = av.comentario.length > 80 ? av.comentario.substring(0, 80) + '…' : av.comentario;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="td-nome">${av.nome}</td>
      <td>${av.produto}</td>
      <td style="color:#d4a017;letter-spacing:1px">${estrelas}</td>
      <td><em style="color:#7a5c40">${coment}</em></td>
      <td>${data}</td>
      <td>
        <div class="td-acoes">
          <button class="btn-del" data-id="${av.id}">🗑️ Excluir</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-del').forEach(btn => btn.addEventListener('click', () => excluirAvaliacao(parseInt(btn.dataset.id))));
}

/* ==========================================
   RESUMO
   ========================================== */
function renderResumo() {
  const cards = document.getElementById('resumo-cards');
  if (!cards) return;

  const totalProd  = Admin.produtos.length;
  const mediaNotas = Admin.avaliacoes.length
    ? (Admin.avaliacoes.reduce((s, a) => s + a.nota, 0) / Admin.avaliacoes.length).toFixed(1)
    : 'N/A';

  cards.innerHTML = `
    <div class="resumo-card">
      <strong>${totalProd}</strong>
      <span>Produtos cadastrados</span>
    </div>
    <div class="resumo-card">
      <strong>${Admin.avaliacoes.length}</strong>
      <span>Avaliações</span>
    </div>
    <div class="resumo-card">
      <strong>${mediaNotas}</strong>
      <span>Média das notas ⭐</span>
    </div>
  `;

  /* Últimas avaliações */
  const listaA = document.getElementById('resumo-av-lista');
  if (listaA) {
    const ultimas = [...Admin.avaliacoes].sort((a, b) => b.id - a.id).slice(0, 6);
    listaA.innerHTML = '<h3>⭐ Últimas Avaliações</h3>';
    ultimas.forEach(av => {
      const estrelas = '★'.repeat(av.nota) + '☆'.repeat(5 - av.nota);
      listaA.innerHTML += `
        <div class="resumo-list-item">
          <span><strong>${av.nome}</strong> – ${av.produto}</span>
          <span style="color:#d4a017">${estrelas}</span>
        </div>`;
    });
  }
}

/* ==========================================
   CONFIRMAÇÃO DE EXCLUSÃO
   ========================================== */
function confirmar(msg, callback) {
  const overlay = document.getElementById('confirm-overlay');
  const msgEl   = document.getElementById('confirm-msg');
  if (!overlay || !msgEl) { callback(); return; }

  msgEl.textContent = msg;
  overlay.style.display = 'flex';
  Admin.confirmCb = callback;
}

function initConfirm() {
  document.getElementById('confirm-sim')?.addEventListener('click', () => {
    document.getElementById('confirm-overlay').style.display = 'none';
    Admin.confirmCb?.();
    Admin.confirmCb = null;
  });
  document.getElementById('confirm-nao')?.addEventListener('click', () => {
    document.getElementById('confirm-overlay').style.display = 'none';
    Admin.confirmCb = null;
  });
}

/* ==========================================
   TOAST ADMIN
   ========================================== */
let toastTimer = null;
function showAdminToast(msg) {
  const el = document.getElementById('admin-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

/* ==========================================
   DADOS DE EXEMPLO (fallback)
   ========================================== */
function getProdutosExemplo() {
  return [
    { id:1, nome:'Tradicional', preco:10.00, descricao:'Cookie clássico com massa amanteigada e crocante nas bordas.', ingredientes:'Farinha, manteiga, açúcar, ovos, essência de baunilha, sal', imagem:'', destaque:true, categoria:'classico' },
    { id:2, nome:'Chocolate', preco:10.00, descricao:'Cookie de chocolate ao leite com textura macia e sabor intenso.', ingredientes:'Farinha, cacau, manteiga, açúcar, ovos, chocolate ao leite, baunilha', imagem:'', destaque:true, categoria:'classico' },
    { id:3, nome:'Brigadeiro', preco:13.00, descricao:'Cookie com brigadeiro cremoso e cobertura doce por cima.', ingredientes:'Farinha, manteiga, açúcar, ovos, leite condensado, cacau, chocolate', imagem:'', destaque:true, categoria:'especial' },
    { id:4, nome:'Chocolate com Ninho', preco:13.00, descricao:'Cookie de chocolate com recheio de leite Ninho e sabor suave.', ingredientes:'Farinha, cacau, manteiga, açúcar, ovos, leite Ninho, chocolate', imagem:'', destaque:true, categoria:'premium' },
    { id:5, nome:'Nutella', preco:14.00, descricao:'Cookie com recheio cremoso de Nutella e toque de avelã.', ingredientes:'Farinha, manteiga, açúcar, ovos, Nutella, cacau', imagem:'', destaque:true, categoria:'premium' },
    { id:6, nome:'Doce de Leite', preco:13.00, descricao:'Cookie macio com doce de leite artesanal e cobertura dourada.', ingredientes:'Farinha, manteiga, açúcar, ovos, doce de leite, canela', imagem:'', destaque:false, categoria:'especial' },
    { id:7, nome:'Ninho', preco:13.00, descricao:'Cookie leve com sabor de leite Ninho e textura aveludada.', ingredientes:'Farinha, manteiga, açúcar, ovos, leite Ninho, baunilha', imagem:'', destaque:false, categoria:'especial' },
    { id:8, nome:'Red Velvet', preco:15.00, descricao:'Cookie aveludado com notas de cacau e chocolate branco.', ingredientes:'Farinha, cacau, manteiga, açúcar, ovos, corante natural, chocolate branco', imagem:'', destaque:true, categoria:'premium' },
    { id:9, nome:'Kinder', preco:16.00, descricao:'Cookie inspirado em Kinder, cremoso e levemente crocante.', ingredientes:'Farinha, manteiga, açúcar, ovos, chocolate ao leite, avelãs', imagem:'', destaque:false, categoria:'premium' },
    { id:10, nome:'Oreo', preco:15.00, descricao:'Cookie com pedaços de Oreo e toque de chocolate branco.', ingredientes:'Farinha, manteiga, açúcar, ovos, Oreo triturado, chocolate branco', imagem:'', destaque:false, categoria:'premium' }
  ];
}

function getAvaliacoesExemplo() {
  return [
    { id:1, nome:'Mariana Costa', nota:5, comentario:'O Nutella é simplesmente perfeito. Textura cremosa e sabor intenso em cada mordida.', data:'2024-12-10', produto:'Nutella' },
    { id:2, nome:'Rafael Mendes', nota:5, comentario:'O Red Velvet é de outro mundo! Crocante por fora e aveludado por dentro.', data:'2024-12-08', produto:'Red Velvet' },
  ];
}

/* ==========================================
   INICIALIZAÇÃO
   ========================================== */
function init() {
  initLogin();
  initLogout();
  initSidebar();
  initNavAbas();
  initFormProdutos();
  initFormAvaliacoes();
  initConfirm();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
