/* ================================
   DAPUR WONG KITO GALO - JavaScript
   Blok JS:
   1. Carousel menu (responsive)
   2. Filter kategori (menu & resep)
   3. Sistem keranjang (cart)
   4. Form validation (contact)

   Catatan: kartu menu, kartu resep, dan detail resep sudah ditulis
   langsung di HTML masing-masing halaman (bukan digenerate JS),
   supaya kodenya sederhana dan gampang ditelusuri.
================================ */

/* ============================
   BLOK 1: CAROUSEL MENU
   Responsif: lebar kartu dihitung otomatis dari DOM,
   tombol prev/next otomatis nonaktif di ujung.
   Digunakan di: index.html
============================ */
const Carousel = (function () {
  let carousel, prevBtn, nextBtn;
  let currentIndex = 0;

  function getStep() {
    const card = carousel.querySelector('.menu-card');
    if (!card) return 0;
    const gap = parseFloat(getComputedStyle(carousel).gap) || 16;
    return card.getBoundingClientRect().width + gap;
  }

  function getVisibleCount() {
    const step = getStep();
    if (!step) return 1;
    return Math.max(1, Math.floor(carousel.parentElement.getBoundingClientRect().width / step));
  }

  function getMaxIndex() {
    const cards = carousel.querySelectorAll('.menu-card').length;
    return Math.max(0, cards - getVisibleCount());
  }
  function updateButtons() {
    const maxIndex = getMaxIndex();
    if (prevBtn) prevBtn.disabled = currentIndex <= 0;
    if (nextBtn) nextBtn.disabled = currentIndex >= maxIndex;
  }
  function slideTo(index) {
    const maxIndex = getMaxIndex();
    currentIndex = Math.max(0, Math.min(index, maxIndex));
    carousel.style.transform = `translateX(-${currentIndex * getStep()}px)`;
    updateButtons();
  }
  function init() {
    carousel = document.getElementById('menuCarousel');
    if (!carousel) return;
    currentIndex = 0;
    carousel.style.transform = 'translateX(0px)';

    prevBtn = document.getElementById('prev-btn');
    nextBtn = document.getElementById('next-btn');

    // Hindari double-binding kalau init() dipanggil ulang (mis. setelah resize data)
    if (prevBtn) { const clone = prevBtn.cloneNode(true); prevBtn.replaceWith(clone); prevBtn = clone; }
    if (nextBtn) { const clone = nextBtn.cloneNode(true); nextBtn.replaceWith(clone); nextBtn = clone; }

    prevBtn?.addEventListener('click', () => slideTo(currentIndex - 1));
    nextBtn?.addEventListener('click', () => slideTo(currentIndex + 1));

    updateButtons();
    window.addEventListener('resize', () => slideTo(currentIndex));
  }

  return { init };
})();


/* ============================
   BLOK 2: FILTER KATEGORI
   Query ulang elemen tiap kali dipanggil, supaya tetap
   berfungsi walau kartu di-render ulang lewat fetch (Blok 0).
   Digunakan di: menu.html, resep.html
============================ */
const Filter = (function () {
  function init() {
    const chips = document.querySelectorAll('.filter-chip');
    if (!chips.length) return;
    // Hindari double-binding kalau init() dipanggil ulang
    chips.forEach(chip => chip.replaceWith(chip.cloneNode(true)));
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const selected = chip.dataset.filter;
        const items = document.querySelectorAll('[data-category]');
        items.forEach(item => {
          const match = selected === 'semua' || item.dataset.category === selected;
          item.style.transition = 'opacity 0.25s, transform 0.25s';
          if (match) {
            item.style.opacity = '1';
            item.style.transform = 'scale(1)';
            item.style.display = '';
          } else {
            item.style.opacity = '0';
            item.style.transform = 'scale(0.95)';
            setTimeout(() => { item.style.display = 'none'; }, 250);
          }
        });
      });
    });
  }

  return { init };
})();


/* ============================
   BLOK 3: SISTEM KERANJANG (CART)
   Digunakan di: semua halaman (navbar), menu.html, index.html, contact.html
============================ */
const Cart = (function () {
  const STORAGE_KEY = 'dwkg_cart';

  function getCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    renderAll();
  }

  function formatRupiah(num) {
    return 'Rp ' + Number(num).toLocaleString('id-ID');
  }

  function getQty(id) {
    const item = getCart().find(i => i.id === id);
    return item ? item.qty : 0;
  }

  function getTotalQty() {
    return getCart().reduce((sum, i) => sum + i.qty, 0);
  }

  function getTotalPrice() {
    return getCart().reduce((sum, i) => sum + (i.qty * i.price), 0);
  }

  function addItem(id, name, price, icon) {
    const cart = getCart();
    const existing = cart.find(i => i.id === id);
    if (existing) existing.qty += 1;
    else cart.push({ id, name, price: Number(price), icon: icon || '🍽️', qty: 1 });
    saveCart(cart);
  }

  function changeQty(id, delta) {
    let cart = getCart();
    const item = cart.find(i => i.id === id);
    if (!item) {
      if (delta > 0) return; 
      return;
    }
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
    saveCart(cart);
  }

  function removeItem(id) {
    const cart = getCart().filter(i => i.id !== id);
    saveCart(cart);
  }

  function clearCart() {
    saveCart([]);
  }

  /* ---  jumlah item di navbar (semua halaman) --- */
  function renderBadges() {
    const total = getTotalQty();
    document.querySelectorAll('.cart-badge').forEach(badge => {
      badge.textContent = total;
      badge.classList.toggle('d-none', total === 0);
    });
  }

  /* --- RENDER: stepper qty di kartu menu (menu.html / index.html) --- */
  function renderCardSteppers() {
    document.querySelectorAll('[data-cart-id]').forEach(card => {
      const id = card.dataset.cartId;
      const qty = getQty(id);
      const valueEl = card.querySelector('.qty-value');
      const minusBtn = card.querySelector('.qty-minus');
      if (valueEl) valueEl.textContent = qty;
      if (minusBtn) minusBtn.disabled = qty === 0;
    });
  }

  /* --- RENDER: isi offcanvas keranjang --- */
  function renderOffcanvas() {
    const listEl = document.getElementById('cartItemsList');
    const totalEl = document.getElementById('cartTotalPrice');
    const emptyEl = document.getElementById('cartEmptyState');
    const footerEl = document.getElementById('cartFooter');
    if (!listEl) return;

    const cart = getCart();

    if (cart.length === 0) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      if (footerEl) footerEl.style.display = 'none';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (footerEl) footerEl.style.display = 'block';

    listEl.innerHTML = cart.map(item => `
      <div class="cart-item-row">
        <div class="cart-item-img">${item.icon}</div>
        <div class="cart-item-info">
          <h6>${item.name}</h6>
          <div class="cart-item-price">${formatRupiah(item.price)} x ${item.qty} = <strong>${formatRupiah(item.price * item.qty)}</strong></div>
        </div>
        <div class="qty-stepper">
          <button type="button" class="qty-minus" data-id="${item.id}" aria-label="Kurangi ${item.name}">−</button>
          <span class="qty-value">${item.qty}</span>
          <button type="button" class="qty-plus" data-id="${item.id}" aria-label="Tambah ${item.name}">+</button>
        </div>
        <button type="button" class="cart-remove-btn" data-id="${item.id}" title="Hapus item" aria-label="Hapus ${item.name}">✕</button>
      </div>
    `).join('');

    if (totalEl) totalEl.textContent = formatRupiah(getTotalPrice());
  }

  /* --- RENDER: ringkasan pesanan di contact.html --- */
  function renderOrderSummary() {
    const box = document.getElementById('orderSummaryBox');
    if (!box) return;
    const cart = getCart();
    const listEl = document.getElementById('orderSummaryList');
    const totalEl = document.getElementById('orderSummaryTotal');

    if (cart.length === 0) {
      box.style.display = 'none';
      return;
    }
    box.style.display = 'block';
    listEl.innerHTML = cart.map(item => `
      <div class="order-row">
        <span>${item.icon} ${item.name} <span class="text-muted">x${item.qty}</span></span>
        <span>${formatRupiah(item.price * item.qty)}</span>
      </div>
    `).join('');
    totalEl.textContent = formatRupiah(getTotalPrice());
  }

  function renderAll() {
    renderBadges();
    renderCardSteppers();
    renderOffcanvas();
    renderOrderSummary();
  }

  /* --- EVENT DELEGATION: semua klik terkait cart ditangani di sini --- */
  document.addEventListener('click', function (e) {
    const plusOnCard = e.target.closest('[data-cart-id] .qty-plus, [data-cart-id] .card-add-btn');
    if (plusOnCard) {
      const card = plusOnCard.closest('[data-cart-id]');
      addItem(card.dataset.cartId, card.dataset.cartName, card.dataset.cartPrice, card.dataset.cartIcon);
      return;
    }
    const minusOnCard = e.target.closest('[data-cart-id] .qty-minus');
    if (minusOnCard) {
      const card = minusOnCard.closest('[data-cart-id]');
      changeQty(card.dataset.cartId, -1);
      return;
    }
    const plusInCart = e.target.closest('#cartItemsList .qty-plus');
    if (plusInCart) { changeQty(plusInCart.dataset.id, 1); return; }

    const minusInCart = e.target.closest('#cartItemsList .qty-minus');
    if (minusInCart) { changeQty(minusInCart.dataset.id, -1); return; }

    const removeBtn = e.target.closest('.cart-remove-btn');
    if (removeBtn) { removeItem(removeBtn.dataset.id); return; }

    const clearBtn = e.target.closest('#cartClearBtn, #orderSummaryClearBtn');
    if (clearBtn) { clearCart(); return; }
  });

  document.addEventListener('DOMContentLoaded', renderAll);

  return { addItem, changeQty, removeItem, clearCart, getCart, getTotalPrice, renderAll };
})();
window.Cart = Cart;


/* ============================
   BLOK 4: FORM VALIDATION
   Digunakan di: contact.html
============================ */
(function () {
  const form = document.getElementById('reservasiForm');
  if (!form) return;

  function showError(input, msg) {
    input.classList.add('is-invalid');
    let fb = input.nextElementSibling;
    if (!fb || !fb.classList.contains('invalid-feedback')) {
      fb = document.createElement('div');
      fb.className = 'invalid-feedback';
      input.after(fb);
    }
    fb.textContent = msg;
  }

  function clearError(input) {
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePhone(phone) {
    return /^[0-9+\-\s]{9,15}$/.test(phone);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    let valid = true;

    const nama  = document.getElementById('nama');
    const email = document.getElementById('email');
    const telp  = document.getElementById('telp');
    const tgl   = document.getElementById('tanggal');
    const jumlah = document.getElementById('jumlah');
    const pesan = document.getElementById('pesan');

    // Reset semua validasi
    [nama, email, telp, tgl, jumlah, pesan].forEach(el => {
      if (el) { el.classList.remove('is-invalid', 'is-valid'); }
    });

    if (!nama?.value.trim()) { showError(nama, 'Nama tidak boleh kosong.'); valid = false; }
    else clearError(nama);

    if (!validateEmail(email?.value)) { showError(email, 'Format email tidak valid.'); valid = false; }
    else clearError(email);

    if (!validatePhone(telp?.value)) { showError(telp, 'Nomor telepon tidak valid (9-15 digit).'); valid = false; }
    else clearError(telp);

    if (!tgl?.value) { showError(tgl, 'Tanggal reservasi wajib diisi.'); valid = false; }
    else {
      const tglDate = new Date(tgl.value);
      const today   = new Date(); today.setHours(0,0,0,0);
      if (tglDate < today) { showError(tgl, 'Tanggal tidak boleh di masa lalu.'); valid = false; }
      else clearError(tgl);
    }

    if (!jumlah?.value || jumlah.value < 1) { showError(jumlah, 'Jumlah tamu minimal 1 orang.'); valid = false; }
    else clearError(jumlah);

    if (valid) {
      // Tampilkan pesan sukses
      const successEl = document.getElementById('successMsg');
      if (successEl) {
        successEl.style.display = 'block';
        successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      form.reset();
      [nama, email, telp, tgl, jumlah, pesan].forEach(el => {
        if (el) el.classList.remove('is-valid');
      });
      // Kosongkan keranjang setelah reservasi berhasil dikirim
      if (window.Cart) Cart.clearCart();
    }
  });
})();


/* ============================
   INIT: aktifkan carousel & filter setelah DOM siap
   (Cart punya listener DOMContentLoaded sendiri di atas)
============================ */
document.addEventListener('DOMContentLoaded', () => {
  Carousel.init();
  Filter.init();
});
