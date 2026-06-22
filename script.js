/* =============================================
   AMORUDA COOKIES – script.js
   Vanilla JS puro, sem dependências externas
   ============================================= */

'use strict';

/* ==========================================
   ESTADO GLOBAL
   ========================================== */
const State = {
  produtos:    [],
  avaliacoes:  [],
  carrinho:    [],
  pedidoTipo:  'entrega',
  galeriaAtual: 0,
  filtroAtual: 'todos',
};

/* ==========================================
   NÚMERO DO WHATSAPP DA LOJA
   ========================================== */
const WHATSAPP_LOJA = '5519992596442';

/* ==========================================
   EMOJIS por produto (fallback visual)
   ========================================== */
const EMOJIS_PRODUTO = ['🍪','🍫','🥜','✨','🍋','🖤','🎪','🔥'];

/* ==========================================
   LOADING SCREEN
   ========================================== */
function initLoading() {
  const screen = document.getElementById('loading-screen');
  if (!screen) return;
  setTimeout(() => {
    screen.classList.add('hidden');
    document.body.style.overflow = '';
  }, 2000);
  document.body.style.overflow = 'hidden';
}

/* ==========================================
   ANO NO FOOTER
   ========================================== */
function initAno() {
  const el = document.getElementById('ano-atual');
  if (el) el.textContent = new Date().getFullYear();
}

/* ==========================================
   HEADER: scroll + menu mobile
   ========================================== */
function initHeader() {
  const header  = document.getElementById('header');
  const toggle  = document.getElementById('menu-toggle');
  const nav     = document.getElementById('nav');
  const navLinks = document.querySelectorAll('.nav-link');

  /* Scroll: adiciona sombra e marca link ativo */
  function onScroll() {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 20);

    /* Marca seção ativa */
    const sections = document.querySelectorAll('section[id]');
    let current = '';
    sections.forEach(sec => {
      const top = sec.getBoundingClientRect().top;
      if (top <= 100) current = sec.id;
    });
    navLinks.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  /* Menu mobile toggle */
  toggle?.addEventListener('click', () => {
    const open = nav?.classList.toggle('open');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    nav?.setAttribute('aria-hidden', String(!open));
  });

  /* Fechar menu ao clicar num link */
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      nav?.classList.remove('open');
      toggle?.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
      nav?.setAttribute('aria-hidden', 'true');
    });
  });

  /* Fechar menu ao clicar fora */
  document.addEventListener('click', e => {
    if (!header?.contains(e.target)) {
      nav?.classList.remove('open');
      toggle?.classList.remove('open');
    }
  });
}

/* ==========================================
   BACK TO TOP
   ========================================== */
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    const visible = window.scrollY > 400;
    btn.style.display = visible ? 'flex' : 'none';
    setTimeout(() => btn.classList.toggle('visible', visible), 10);
  }, { passive: true });

  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ==========================================
   ANIMATE ON SCROLL (IntersectionObserver)
   ========================================== */
function initScrollAnimations() {
  const els = document.querySelectorAll('.animate-on-scroll');
  if (!els.length || !('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('in-view'));
    return;
  }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); obs.unobserve(e.target); } });
  }, { threshold: .15 });
  els.forEach(el => obs.observe(el));
}

/* ==========================================
   TOAST
   ========================================== */
function showToast(msg, tipo = 'default', duracao = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const t = document.createElement('div');
  t.className = `toast toast-${tipo}`;
  t.textContent = msg;
  container.appendChild(t);

  setTimeout(() => {
    t.classList.add('toast-out');
    t.addEventListener('animationend', () => t.remove());
  }, duracao);
}

/* ==========================================
   FORMATAR MOEDA
   ========================================== */
function moeda(valor) {
  return 'R$ ' + parseFloat(valor).toFixed(2).replace('.', ',');
}

/* ==========================================
   CARRINHO
   ========================================== */
const Carrinho = {
  /* Adicionar ou incrementar */
  adicionar(produto) {
    const item = State.carrinho.find(i => i.id === produto.id);

    if (item) {
      item.qtd++;
    } else {
      State.carrinho.push({ ...produto, qtd: 1 });
    }

    this.render();
    this.atualizarContador();
    showToast(`🍪 "${produto.nome}" adicionado ao carrinho!`, 'success');

    /* Anima o ícone do carrinho */
    const cnt = document.getElementById('cart-count');
    if (cnt) {
      cnt.classList.remove('bump');
      void cnt.offsetWidth; // reflow
      cnt.classList.add('bump');
      setTimeout(() => cnt.classList.remove('bump'), 400);
    }
  },

  /* Remover item */
  remover(id) {
    State.carrinho = State.carrinho.filter(i => i.id !== id);
    this.render();
    this.atualizarContador();
  },

  /* Alterar quantidade */
  alterarQtd(id, delta) {
    const item = State.carrinho.find(i => i.id === id);
    if (!item) return;

    const novaQtd = item.qtd + delta;

    if (novaQtd <= 0) { this.remover(id); return; }

    item.qtd = novaQtd;
    this.render();
    this.atualizarContador();
  },

  total() {
    return State.carrinho.reduce((acc, i) => acc + i.preco * i.qtd, 0);
  },

  totalItens() {
    return State.carrinho.reduce((acc, i) => acc + i.qtd, 0);
  },

  atualizarContador() {
    const el = document.getElementById('cart-count');
    if (el) el.textContent = this.totalItens();
  },

  /* Renderiza o conteúdo do sidebar */
  render() {
    const lista    = document.getElementById('cart-list');
    const vazio    = document.getElementById('cart-empty');
    const footer   = document.getElementById('cart-footer');
    const subtotal = document.getElementById('cart-subtotal');
    const total    = document.getElementById('cart-total');

    if (!lista) return;

    lista.innerHTML = '';
    const temItens = State.carrinho.length > 0;

    if (vazio)  vazio.style.display  = temItens ? 'none'  : 'flex';
    if (footer) footer.style.display = temItens ? 'block' : 'none';

    State.carrinho.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'cart-item';
      li.setAttribute('role', 'listitem');
      const emoji = EMOJIS_PRODUTO[idx % EMOJIS_PRODUTO.length];
      li.innerHTML = `
        <div class="cart-item-img" aria-hidden="true">${emoji}</div>
        <div class="cart-item-info">
          <div class="cart-item-nome">${item.nome}</div>
          <div class="cart-item-preco">${moeda(item.preco)} un.</div>
        </div>
        <div class="cart-item-ctrl">
          <button class="qty-btn" data-id="${item.id}" data-delta="-1" aria-label="Diminuir quantidade">−</button>
          <span class="qty-val" aria-label="Quantidade: ${item.qtd}">${item.qtd}</span>
          <button class="qty-btn" data-id="${item.id}" data-delta="1" aria-label="Aumentar quantidade">+</button>
          <button class="cart-item-remove" data-id="${item.id}" aria-label="Remover item">✕</button>
        </div>
      `;
      lista.appendChild(li);
    });

    /* Delega eventos nos botões */
    lista.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id    = parseInt(btn.dataset.id);
        const delta = parseInt(btn.dataset.delta);
        Carrinho.alterarQtd(id, delta);
      });
    });
    lista.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', () => Carrinho.remover(parseInt(btn.dataset.id)));
    });

    const tot = this.total();
    if (subtotal) subtotal.textContent = moeda(tot);
    if (total)    total.textContent    = moeda(tot);
  },

  abrir() {
    document.getElementById('cart-overlay')?.classList.add('open');
    document.getElementById('cart-sidebar')?.classList.add('open');
    document.getElementById('cart-sidebar')?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  },

  fechar() {
    document.getElementById('cart-overlay')?.classList.remove('open');
    document.getElementById('cart-sidebar')?.classList.remove('open');
    document.getElementById('cart-sidebar')?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  },
};

function initCarrinho() {
  document.getElementById('cart-btn')?.addEventListener('click', () => Carrinho.abrir());
  document.getElementById('cart-close')?.addEventListener('click', () => Carrinho.fechar());
  document.getElementById('cart-overlay')?.addEventListener('click', () => Carrinho.fechar());

  initDeliverySelection();

  /* Finalizar pedido abre modal */
  document.getElementById('btn-finalizar')?.addEventListener('click', () => {
    Carrinho.fechar();
    abrirModal();
  });
}

function initDeliverySelection() {
  const cartButtons = document.querySelectorAll('.delivery-option');
  const formRadios = document.querySelectorAll('input[name="tipo-pedido"]');

  function setTipo(tipo) {
    State.pedidoTipo = tipo;
    cartButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.value === tipo));
    formRadios.forEach(radio => { radio.checked = radio.value === tipo; });
    updatePedidoForm();
  }

  cartButtons.forEach(btn => {
    btn.addEventListener('click', () => setTipo(btn.dataset.value));
  });

  formRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) setTipo(radio.value);
    });
  });

  setTipo(State.pedidoTipo || 'entrega');
}

function updatePedidoForm() {
  const pickupGroup = document.getElementById('pickup-group');
  const deliveryGroups = document.querySelectorAll('.delivery-address-group');
  const tipo = State.pedidoTipo || 'entrega';

  if (pickupGroup) pickupGroup.style.display = tipo === 'retirada' ? 'block' : 'none';
  deliveryGroups.forEach(el => { el.style.display = tipo === 'entrega' ? '' : 'none'; });
}

/* ==========================================
   MODAL DE PEDIDO (formulário)
   ========================================== */
function abrirModal() {
  updatePedidoForm();
  document.getElementById('modal-overlay')?.classList.add('open');
  document.getElementById('modal-overlay')?.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function fecharModal() {
  document.getElementById('modal-overlay')?.classList.remove('open');
  document.getElementById('modal-overlay')?.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function initModal() {
  document.getElementById('modal-close')?.addEventListener('click', fecharModal);
  document.getElementById('modal-overlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) fecharModal();
  });

  document.getElementById('form-pedido')?.addEventListener('submit', e => {
    e.preventDefault();
    if (validarFormulario()) enviarPedidoWhatsApp();
  });
}

/* Validação do formulário */
function validarFormulario() {
  let valido = true;

  function erro(id, errId, msg) {
    const inp = document.getElementById(id);
    const err = document.getElementById(errId);
    if (!inp || !err) return;
    if (!inp.value.trim()) {
      inp.classList.add('invalid');
      err.textContent = msg;
      valido = false;
    } else {
      inp.classList.remove('invalid');
      err.textContent = '';
    }
  }

  erro('inp-nome',    'err-nome',   'Informe seu nome completo.');

  const tipo = State.pedidoTipo || 'entrega';
  if (tipo === 'entrega') {
    erro('inp-end',     'err-end',    'Informe o endereço de entrega.');
    erro('inp-bairro',  'err-bairro', 'Informe o bairro.');
    erro('inp-cidade',  'err-cidade', 'Informe a cidade.');
    const pickup = document.getElementById('inp-pickup');
    const errPickup = document.getElementById('err-pickup');
    if (pickup && errPickup) {
      pickup.classList.remove('invalid');
      errPickup.textContent = '';
    }
  } else {
    erro('inp-pickup',  'err-pickup', 'Selecione o local de retirada.');
    ['inp-end', 'inp-bairro', 'inp-cidade'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('invalid');
    });
    ['err-end', 'err-bairro', 'err-cidade'].forEach(id => {
      const errEl = document.getElementById(id);
      if (errEl) errEl.textContent = '';
    });
  }

  /* Validação de telefone */
  const tel = document.getElementById('inp-tel');
  const errTel = document.getElementById('err-tel');
  if (tel && errTel) {
    const nums = tel.value.replace(/\D/g, '');
    if (!nums || nums.length < 10) {
      tel.classList.add('invalid');
      errTel.textContent = 'Informe um WhatsApp válido (com DDD).';
      valido = false;
    } else {
      tel.classList.remove('invalid');
      errTel.textContent = '';
    }
  }

  /* Remove erro ao digitar */
  ['inp-nome','inp-tel','inp-end','inp-bairro','inp-cidade','inp-pickup'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', function () {
      this.classList.remove('invalid');
    }, { once: false });
  });

  return valido;
}

/* Monta e abre o WhatsApp */
function enviarPedidoWhatsApp() {
  const nome    = document.getElementById('inp-nome')?.value.trim();
  const tel     = document.getElementById('inp-tel')?.value.trim();
  const pickup  = document.getElementById('inp-pickup')?.value.trim();
  const end     = document.getElementById('inp-end')?.value.trim();
  const bairro  = document.getElementById('inp-bairro')?.value.trim();
  const cidade  = document.getElementById('inp-cidade')?.value.trim();
  const obs     = document.getElementById('inp-obs')?.value.trim();

  let linhasProdutos = '';
  State.carrinho.forEach(item => {
    linhasProdutos += `  • ${item.nome} x${item.qtd} = ${moeda(item.preco * item.qtd)}\n`;
  });

  const total = moeda(Carrinho.total());
  const tipo = State.pedidoTipo || 'entrega';
  const entregaTexto = tipo === 'retirada'
    ? `Retirada em: ${pickup}`
    : `Endereço de Entrega: ${end}\nBairro: ${bairro}\nCidade: ${cidade}`;

  const msg = ` PEDIDO AMORUDA COOKIES

Cliente: ${nome}
WhatsApp: ${tel}

Itens do Pedido:
${linhasProdutos}
Total: ${total}

${entregaTexto}

${obs ? `Observações:\n${obs}\n` : ''}Pedido realizado pelo site Amoruda Cookies`;

  const url = `https://wa.me/${WHATSAPP_LOJA}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank', 'noopener');

  fecharModal();
  showToast('🚀 Pedido enviado! Aguarde o contato da loja.', 'success', 4000);

  /* Limpa o carrinho e o form após envio */
  State.carrinho = [];
  Carrinho.render();
  Carrinho.atualizarContador();
  document.getElementById('form-pedido')?.reset();
}

/* ==========================================
   PRODUTOS
   ========================================== */
function renderProdutos(filtro = 'todos') {
  const grid = document.getElementById('produtos-grid');
  if (!grid) return;

  grid.innerHTML = '';

  const lista = filtro === 'todos'
    ? State.produtos
    : State.produtos.filter(p => p.categoria === filtro);

  if (!lista.length) {
    grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;padding:2rem">Nenhum produto nesta categoria no momento.</p>';
    return;
  }

  lista.forEach((prod, idx) => {
    const card = criarCardProduto(prod, idx);
    /* Animação de entrada com delay */
    card.style.animationDelay = `${idx * 0.07}s`;
    card.style.animation = `slideUp .5s ease ${idx * 0.07}s both`;
    grid.appendChild(card);
  });
}

function criarCardProduto(prod, idx) {
  const card = document.createElement('article');
  card.className = 'produto-card animate-on-scroll';
  card.setAttribute('data-categoria', prod.categoria);

  const emoji = EMOJIS_PRODUTO[idx % EMOJIS_PRODUTO.length];

  card.innerHTML = `
    <div class="produto-img-wrap" aria-hidden="true">
      ${prod.imagem
        ? `<img src="${prod.imagem}" alt="${prod.nome}" loading="lazy" onerror="this.style.display='none';this.parentElement.querySelector('.produto-img-placeholder').style.display='flex'">`
        : ''}
      <div class="produto-img-placeholder" ${prod.imagem ? 'style="display:none"' : ''}>
        <span>${emoji}</span>
        <p>Foto em breve</p>
      </div>
      ${prod.destaque ? '<span class="produto-badge">⭐ Destaque</span>' : ''}
    </div>
    <div class="produto-body">
      <h3 class="produto-nome">${prod.nome}</h3>
      <p class="produto-descricao">${prod.descricao}</p>
      <div class="produto-ingredientes">
        <strong>🌾 Ingredientes:</strong>
        ${prod.ingredientes}
      </div>
    </div>
    <div class="produto-footer">
      <div class="produto-preco">
        ${moeda(prod.preco)}
        <span>por unidade</span>
      </div>
      <button class="btn-add" data-id="${prod.id}">+ Adicionar</button>
    </div>
  `;

  /* Evento do botão adicionar */
  const btn = card.querySelector('.btn-add');
  if (btn) {
    btn.addEventListener('click', () => Carrinho.adicionar(prod));
  }

  return card;
}

function initFiltros() {
  document.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.filtroAtual = btn.dataset.categoria;
      renderProdutos(State.filtroAtual);
      /* Re-observa os novos cards para animação */
      setTimeout(initScrollAnimations, 50);
    });
  });
}

/* ==========================================
   AVALIAÇÕES
   ========================================== */
function renderAvaliacoes() {
  const grid = document.getElementById('avaliacoes-grid');
  if (!grid) return;

  grid.innerHTML = '';

  State.avaliacoes.forEach(av => {
    const card = document.createElement('div');
    card.className = 'avaliacao-card animate-on-scroll';

    const estrelas = Array.from({ length: 5 }, (_, i) =>
      `<span class="star${i >= av.nota ? ' empty' : ''}" aria-hidden="true">★</span>`
    ).join('');

    const iniciais = av.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const dataFormatada = new Date(av.data + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    card.innerHTML = `
      <div class="avaliacao-stars" aria-label="Nota: ${av.nota} de 5 estrelas">${estrelas}</div>
      <p class="avaliacao-texto">"${av.comentario}"</p>
      <div class="avaliacao-autor">
        <div class="avaliacao-avatar" aria-hidden="true">${iniciais}</div>
        <div>
          <div class="avaliacao-nome">${av.nome}</div>
          <div class="avaliacao-produto">${av.produto} · ${dataFormatada}</div>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ==========================================
   GALERIA & LIGHTBOX
   ========================================== */
const galeriaData = [
  { emoji: '🍪', nome: 'Tradicional' },
  { emoji: '🍫', nome: 'Chocolate' },
  { emoji: '🧁', nome: 'Brigadeiro' },
  { emoji: '🥛', nome: 'Chocolate com Ninho' },
  { emoji: '🥜', nome: 'Nutella' },
  { emoji: '🍮', nome: 'Doce de Leite' },
  { emoji: '🥛', nome: 'Ninho' },
  { emoji: '❤️', nome: 'Red Velvet' },
  { emoji: '🍪', nome: 'Oreo' },
  { emoji: '🍫', nome: 'Kinder' },
];

function initGaleria() {
  const items = document.querySelectorAll('.galeria-item');
  items.forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.dataset.index);
      abrirLightbox(idx);
    });
  });
}

function abrirLightbox(idx) {
  State.galeriaAtual = idx;
  const lb = document.getElementById('lightbox');
  if (!lb) return;

  renderLightboxConteudo(idx);
  lb.classList.add('open');
  lb.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function renderLightboxConteudo(idx) {
  const content = document.getElementById('lightbox-content');
  if (!content) return;

  const dados = galeriaData[idx] || galeriaData[0];
  content.innerHTML = `
    <div class="lb-emoji">${dados.emoji}</div>
    <p>${dados.nome}</p>
  `;
}

function fecharLightbox() {
  const lb = document.getElementById('lightbox');
  lb?.classList.remove('open');
  lb?.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function initLightbox() {
  document.getElementById('lightbox-close')?.addEventListener('click', fecharLightbox);
  document.getElementById('lightbox')?.addEventListener('click', e => {
    if (e.target === document.getElementById('lightbox')) fecharLightbox();
  });

  document.getElementById('lightbox-prev')?.addEventListener('click', e => {
    e.stopPropagation();
    const prev = (State.galeriaAtual - 1 + galeriaData.length) % galeriaData.length;
    State.galeriaAtual = prev;
    renderLightboxConteudo(prev);
  });

  document.getElementById('lightbox-next')?.addEventListener('click', e => {
    e.stopPropagation();
    const next = (State.galeriaAtual + 1) % galeriaData.length;
    State.galeriaAtual = next;
    renderLightboxConteudo(next);
  });

  /* Teclas do teclado */
  document.addEventListener('keydown', e => {
    const lb = document.getElementById('lightbox');
    if (!lb?.classList.contains('open')) return;
    if (e.key === 'Escape')     fecharLightbox();
    if (e.key === 'ArrowLeft')  document.getElementById('lightbox-prev')?.click();
    if (e.key === 'ArrowRight') document.getElementById('lightbox-next')?.click();
  });
}

/* ==========================================
   MÁSCARA DE TELEFONE
   ========================================== */
function initMaskTel() {
  const tel = document.getElementById('inp-tel');
  if (!tel) return;

  tel.addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '').substring(0, 11);
    if (v.length > 6) {
      v = `(${v.substring(0,2)}) ${v.substring(2,7)}-${v.substring(7)}`;
    } else if (v.length > 2) {
      v = `(${v.substring(0,2)}) ${v.substring(2)}`;
    } else if (v.length > 0) {
      v = `(${v}`;
    }
    this.value = v;
  });
}

/* ==========================================
   LAZY LOADING (IntersectionObserver)
   ========================================== */
function initLazyLoading() {
  if (!('IntersectionObserver' in window)) return;

  const images = document.querySelectorAll('img[loading="lazy"]');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const img = e.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        obs.unobserve(img);
      }
    });
  }, { rootMargin: '200px' });

  images.forEach(img => obs.observe(img));
}

/* ==========================================
   CARREGAR DADOS (JSON local via fetch)
   ========================================== */
async function carregarDados() {
  try {
    /* Produtos */
    const resProd = await fetch('data/produtos.json');
    if (resProd.ok) {
      State.produtos = await resProd.json();
    } else {
      throw new Error('Não foi possível carregar produtos.json');
    }
  } catch (err) {
    console.warn('[Amoruda] produtos.json não carregado, usando dados de exemplo.', err.message);
    State.produtos = getDadosExemploProutos();
  }

  try {
    /* Avaliações */
    const resAv = await fetch('data/avaliacoes.json');
    if (resAv.ok) {
      State.avaliacoes = await resAv.json();
    } else {
      throw new Error('Não foi possível carregar avaliacoes.json');
    }
  } catch (err) {
    console.warn('[Amoruda] avaliacoes.json não carregado, usando dados de exemplo.', err.message);
    State.avaliacoes = getDadosExemploAvaliacoes();
  }
}

/* Fallback: dados embutidos caso o fetch falhe (ex.: abrir .html local sem servidor) */
function getDadosExemploProutos() {
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

function getDadosExemploAvaliacoes() {
  return [
    { id:1, nome:'Mariana Costa', nota:5, comentario:'O Nutella é simplesmente perfeito. Textura cremosa e sabor intenso em cada mordida.', data:'2024-12-10', produto:'Nutella' },
    { id:2, nome:'Rafael Mendes', nota:5, comentario:'O Red Velvet é de outro mundo! Crocante por fora e aveludado por dentro.', data:'2024-12-08', produto:'Red Velvet' },
    { id:3, nome:'Juliana Ferreira', nota:5, comentario:'O Brigadeiro conquistou todo mundo no aniversário. Doce na medida certa e muito cremoso.', data:'2024-12-05', produto:'Brigadeiro' },
    { id:4, nome:'Pedro Alves', nota:5, comentario:'O Oreo é um dos melhores que já provei. Crocante e com sabor equilibrado.', data:'2024-12-03', produto:'Oreo' },
    { id:5, nome:'Camila Santos', nota:5, comentario:'O Doce de Leite tem aquele toque caseiro que deixa tudo ainda mais gostoso.', data:'2024-11-28', produto:'Doce de Leite' },
    { id:6, nome:'Lucas Barbosa', nota:4, comentario:'O Kinder é incrível, só queria que viesse ainda mais quentinho!', data:'2024-11-25', produto:'Kinder' },
  ];
}

/* ==========================================
   INICIALIZAÇÃO PRINCIPAL
   ========================================== */
async function init() {
  initLoading();
  initAno();
  initHeader();
  initBackToTop();
  initCarrinho();
  initModal();
  initMaskTel();
  initGaleria();
  initLightbox();

  /* Carrega dados JSON e renderiza */
  await carregarDados();
  renderProdutos();
  renderAvaliacoes();

  /* Animações de scroll (após renderizar conteúdo) */
  setTimeout(initScrollAnimations, 100);
  setTimeout(initLazyLoading, 200);

  console.log('%c🍪 Amoruda Cookies carregado com sucesso!', 'color:#c47a3a;font-weight:bold;font-size:14px;');
}

/* Aguarda o DOM estar pronto */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
