
  // ===== UTILITY =====
  const $ = id => document.getElementById(id);
  const toast = msg => {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 2200);
  };

  // ===== INTRO SLIDER =====
  let slide = 0, touchX = 0, touchY = 0;
  const intro = $('intro'), track = $('track'), slideBtn = $('slideBtn');
  const dots = [...document.querySelectorAll('.dots i')];
  function setSlide(n) {
    slide = Math.max(0, Math.min(2, n));
    track.style.transform = `translateX(${-slide * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('on', i === slide));
    slideBtn.textContent = slide === 2 ? 'Lanjut Ke Login' : 'Geser Ke Kanan';
  }
  function nextSlide() { if (slide < 2) setSlide(slide + 1); else showLogin(); }
  slideBtn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); nextSlide(); });
  intro.addEventListener('pointerdown', e => { touchX = e.clientX; touchY = e.clientY; }, { passive: true });
  intro.addEventListener('pointerup', e => {
    const dx = e.clientX - touchX, dy = e.clientY - touchY;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0 && slide < 2) setSlide(slide + 1);
      else if (dx > 0 && slide > 0) setSlide(slide - 1);
    }
  }, { passive: true });
  function showLogin() { intro.classList.add('gone'); $('login').classList.remove('hidden'); }

  // ================================================================
  // FIREBASE LOGIN (TERHUBUNG DENGAN ADMIN CONTROL)
  // ================================================================
  let firebaseReady = false;

  window.addEventListener('fbready', () => {
    firebaseReady = true;
    console.log('Firebase siap!');
    restoreSession();
  });

  // Fungsi login dengan Firebase
  window.doLogin = async function() {
    const username = $('user').value.trim();
    const password = $('pass').value.trim();
    if (!username || !password) {
      $('loginStatus').textContent = 'Isi username dan password.';
      return;
    }

    // Tunggu Firebase siap
    if (!firebaseReady) {
      $('loginStatus').textContent = 'Menghubungkan ke server...';
      await new Promise(r => {
        const check = () => {
          if (firebaseReady) { r(); } else { setTimeout(check, 300); }
        };
        check();
      });
    }

    $('loginStatus').textContent = 'Memeriksa akun...';
    try {
      const userRef = window.FB.ref(window.FB.db, 'users/' + username);
      const snapshot = await window.FB.get(userRef);
      const data = snapshot.val();

      if (!data) {
        $('loginStatus').textContent = 'Akun tidak ditemukan. Buat akun di Admin Control.';
        return;
      }
      if (data.banned) {
        $('loginStatus').textContent = 'Akun ini telah dibanned.';
        return;
      }
      if (data.password !== password) {
        $('loginStatus').textContent = 'Password salah.';
        return;
      }

      // Login sukses
      localStorage.setItem('xrz_current', username);
      // Simpan riwayat login lokal
      let history = JSON.parse(localStorage.getItem('xrz_login_history') || '[]');
      if (!history.find(h => h.username === username && h.password === password)) {
        history.push({ username, password });
        if (history.length > 10) history.shift();
        localStorage.setItem('xrz_login_history', JSON.stringify(history));
      }

      $('login').classList.add('hidden');
      $('app').classList.remove('hidden');
      $('nav').classList.remove('hidden');
      $('profileUser').textContent = username;
      $('aiFloating').style.display = 'flex';
      loadMediaFeed();
      renderTabungan();
      loadSpamHistory();
      toast('Selamat datang, ' + username + '!');
    } catch (err) {
      console.error('Login error:', err);
      $('loginStatus').textContent = 'Error koneksi ke server: ' + err.message;
    }
  };

  // Logout
  window.logout = function() {
    localStorage.removeItem('xrz_current');
    location.reload();
  };

  // Restore session dari localStorage
  function restoreSession() {
    const username = localStorage.getItem('xrz_current');
    if (username && firebaseReady) {
      window.FB.get(window.FB.ref(window.FB.db, 'users/' + username))
        .then(snap => {
          if (snap.exists() && !snap.val().banned) {
            // Langsung masuk
            document.getElementById('intro').classList.add('gone');
            document.getElementById('login').classList.add('hidden');
            document.getElementById('app').classList.remove('hidden');
            document.getElementById('nav').classList.remove('hidden');
            document.getElementById('profileUser').textContent = username;
            document.getElementById('aiFloating').style.display = 'flex';
            loadMediaFeed();
            renderTabungan();
            loadSpamHistory();
          } else {
            localStorage.removeItem('xrz_current');
          }
        })
        .catch(() => {
          // Fallback: tetap coba masuk
          document.getElementById('intro').classList.add('gone');
          document.getElementById('login').classList.add('hidden');
          document.getElementById('app').classList.remove('hidden');
          document.getElementById('nav').classList.remove('hidden');
          document.getElementById('profileUser').textContent = username;
          document.getElementById('aiFloating').style.display = 'flex';
          loadMediaFeed();
          renderTabungan();
          loadSpamHistory();
        });
    }
  }

  // Jika Firebase sudah siap sebelum event listener
  if (window.FB) {
    firebaseReady = true;
    restoreSession();
  } else {
    window.addEventListener('fbready', () => {
      firebaseReady = true;
      restoreSession();
    });
  }

  // ===== LOGIN DROPDOWN =====
  function toggleLoginDropdown() {
    const dd = $('loginDropdown');
    dd.classList.toggle('show');
    if (dd.classList.contains('show')) {
      const history = JSON.parse(localStorage.getItem('xrz_login_history') || '[]');
      dd.innerHTML = history.length ? history.map(h =>
        `<div class="item" onclick="fillLogin('${h.username}','${h.password}')">${h.username}</div>`
      ).join('') : '<div class="item" style="color:#8ea5bf;">Tidak ada riwayat</div>';
    }
  }
  function fillLogin(u, p) { $('user').value = u; $('pass').value = p; $('loginDropdown').classList.remove('show'); }

  // ===== NAVIGATION =====
  window.page = function(id, btn) {
    document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
    $(id).classList.add('active');
    document.querySelectorAll('.nav button').forEach(x => x.classList.remove('active'));
    if (btn) btn.classList.add('active');
    if (id !== 'games') $('gamePage').classList.add('hidden');
    if (id === 'media') loadMediaFeed();
    if (id === 'tabungan') renderTabungan();
    if (id === 'ai') { document.getElementById('aiFloating').style.display = 'none'; } else { document.getElementById('aiFloating').style.display = 'flex'; }
  };

  // ===== SIDEBAR =====
  function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('active');
  }

  // ================================================================
  // PROXY – 3 LAYER FALLBACK
  // ================================================================
  async function fetchWithProxy(url) {
    const proxies = [
      'https://api.cors.lol/?url=',
      'https://corsproxy.io/?url=',
      'https://api.allorigins.win/raw?url='
    ];
    for (const proxy of proxies) {
      try {
        const res = await fetch(proxy + encodeURIComponent(url));
        if (res.ok) return res;
      } catch (_) {}
    }
    try { const res = await fetch(url); if (res.ok) return res; } catch (_) {}
    return null;
  }

  // ================================================================
  // SPAM OTP – 45 OTP + LOOP MODE
  // ================================================================
  let spamRunning = false;
  let loopMode = false;
  let loopInterval = null;

  function toggleLoop() {
    loopMode = !loopMode;
    const btn = document.getElementById('loopToggle');
    const status = document.getElementById('loopStatus');
    if (loopMode) {
      btn.textContent = 'ON';
      btn.classList.add('active');
      status.textContent = '(Loop 50x)';
      toast('Mode Loop ON - spam akan berulang 50x');
    } else {
      btn.textContent = 'OFF';
      btn.classList.remove('active');
      status.textContent = '(Normal)';
      if (loopInterval) { clearInterval(loopInterval); loopInterval = null; }
      toast('Mode Loop OFF');
    }
  }

  function loadSpamHistory() {
    const history = JSON.parse(localStorage.getItem('xrz_spam_history') || '[]');
    const container = document.getElementById('spamHistory');
    if (!history.length) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = history.slice(-8).map(num =>
      `<button onclick="document.getElementById('otpNum').value='${num}'">${num}</button>`
    ).join('');
  }

  window.spamOTP = async function() {
    if (typeof toast === 'function') toast('Fitur pengiriman OTP massal dinonaktifkan.');
    const result = document.getElementById('otpResult');
    if (result) result.textContent = 'Pengiriman OTP massal dinonaktifkan.';
  };

  // ===== CLOCK & BATTERY =====
  setInterval(() => {
    $('time').textContent = new Date().toLocaleTimeString('id-ID');
    if (navigator.getBattery) {
      navigator.getBattery().then(b => {
        const pct = Math.round(b.level * 100);
        $('percent').textContent = pct + '%';
        $('batfill').style.width = pct + '%';
      });
    }
  }, 1000);

  // ===== CHANGE PASSWORD =====
  window.changePass = async function() {
    const newPass = $('newPassword').value.trim();
    const username = localStorage.getItem('xrz_current');
    if (!newPass || !username) {
      $('profileStatus').textContent = 'Isi password baru.';
      return;
    }
    if (!firebaseReady) {
      $('profileStatus').textContent = 'Menunggu koneksi server...';
      return;
    }
    try {
      await window.FB.update(window.FB.ref(window.FB.db, 'users/' + username), { password: newPass });
      $('profileStatus').textContent = '✅ Password berhasil diubah!';
      toast('Password berhasil diubah!');
    } catch (err) {
      $('profileStatus').textContent = '❌ Gagal mengubah password.';
      toast('Gagal mengubah password.');
    }
  };

  // ================================================================
  // TOOLS – DITAMBAH 3 TOOLS BARU (MCPEDL, Rusdi Quote, Jarvis Meme)
  // ================================================================
  const icon = path => '<span class="icon"><svg viewBox="0 0 24 24">' + path + '</svg></span>';

  const tools = [
    ['Cek Plat Nomor', 'B 1234 XYZ', 'plate', 'tool-color1', '<i class="fas fa-car"></i>'],
    ['Teks To QR', 'Tes', 'textqr', 'tool-color2', '<i class="fas fa-qrcode"></i>'],
    ['Fake NoKia', 'jatuh cinta boleh alasan jangan just friend', 'nokia', 'tool-color3', '<i class="fas fa-mobile-alt"></i>'],
    ['Fake Profile FF', 'Alwayscodex | 75813269', 'ff', 'tool-color4', '<i class="fas fa-user-astronaut"></i>'],
    ['Quote Anime', 'Halo | Higuruma | light', 'quote', 'tool-color5', '<i class="fas fa-quote-right"></i>'],
    ['Fake Saldo Dana', '500000', 'dana', 'tool-color6', '<i class="fas fa-wallet"></i>'],
    ['Fake Gopay', '890 | 159 | 0 | Mei', 'gopay', 'tool-color7', '<i class="fas fa-credit-card"></i>'],
    ['Fake Ovo', '5000002828', 'ovo', 'tool-color8', '<i class="fas fa-mobile-alt"></i>'],
    ['Fake Sertifikat Nasa', 'John Doe', 'nasa', 'tool-color9', '<i class="fas fa-certificate"></i>'],
    ['Search MCPEDL', 'Shader', 'mcpedl', 'tool-color10', '<i class="fas fa-cube"></i>'],
    ['Rusdi Quote', 'Hidup adalah perjuangan | AlwaysCodex', 'rusdi', 'tool-color1', '<i class="fas fa-quote-left"></i>'],
    ['Jarvis Meme', 'Jarvis, tolong diapakan dulu apa itu', 'jarvis', 'tool-color2', '<i class="fas fa-robot"></i>']
  ];

  $('toolGrid').innerHTML = tools.map((t, i) =>
    `<button class="tile ${t[3]}" onclick="openTool(${i})">${t[4]}<b>${t[0]}</b><small>${t[1]}</small></button>`
  ).join('');

  $('toolPages').innerHTML = tools.map((t, i) =>
    `<div id="tool${i}" class="toolpage card glass bubble">
      <button class="back" onclick="closeTool()">Kembali</button>
      <h2>${t[0]}</h2>
      <p class="sub">Contoh: ${t[1]}</p>
      <input id="tv${i}" class="input" placeholder="${t[1]}">
      <div id="extra${i}"></div>
      <button class="btn wide" style="margin-top:10px" onclick="runTool(${i})">Jalankan</button>
      <div id="res${i}" class="result"></div>
    </div>`
  ).join('');

  // Extra untuk Quote Anime
  $('extra4').innerHTML = `<div class="field"><label>Preview background</label><select id="quoteBg" class="input"><option>light</option><option>dark</option><option>blue</option></select></div>`;

  window.openTool = function(i) {
    $('toolHome').classList.add('hidden');
    document.querySelectorAll('.toolpage').forEach(x => x.classList.remove('active'));
    $('tool' + i).classList.add('active');
  };
  window.closeTool = function() {
    document.querySelectorAll('.toolpage').forEach(x => x.classList.remove('active'));
    $('toolHome').classList.remove('hidden');
  };

  window.runTool = async function(i) {
    const v = $('tv' + i).value.trim() || tools[i][1];
    const parts = v.split('|').map(s => s.trim());
    let url = '';
    switch (i) {
      case 0: url = 'https://api.alwayscodex.my.id/api/tools/cekplat?plate=' + encodeURIComponent(v); break;
      case 1: url = 'https://api.alwayscodex.my.id/api/tools/text2qr?text=' + encodeURIComponent(v); break;
      case 2: url = 'https://api.alwayscodex.my.id/api/maker/fake-nokia?text=' + encodeURIComponent(v); break;
      case 3: url = 'https://api.alwayscodex.my.id/api/maker/fake-profile-ff?nickname=' + encodeURIComponent(parts[0] || 'Alwayscodex') + '&uid=' + encodeURIComponent(parts[1] || '75813269'); break;
      case 4: url = 'https://api.alwayscodex.my.id/api/maker/quotes-anime?text=' + encodeURIComponent(parts[0] || 'Halo') + '&username=' + encodeURIComponent(parts[1] || 'Higuruma') + '&background=' + encodeURIComponent($('quoteBg').value); break;
      case 5: url = 'https://api.alwayscodex.my.id/api/maker/saldo-dana?saldo=' + encodeURIComponent(v); break;
      case 6: url = 'https://api.alwayscodex.my.id/api/maker/saldo-gopay?saldo=' + encodeURIComponent(parts[0] || 890) + '&koin=' + encodeURIComponent(parts[1] || 159) + '&terpakai=' + encodeURIComponent(parts[2] || 0) + '&bulan=' + encodeURIComponent(parts[3] || 'Mei'); break;
      case 7: url = 'https://api.alwayscodex.my.id/api/maker/saldo-ovo?saldo=' + encodeURIComponent(v); break;
      case 8: url = 'https://api.alwayscodex.my.id/api/maker/sertifikat-nasa?nama=' + encodeURIComponent(v); break;
      case 9: url = 'https://api.alwayscodex.my.id/api/search/mcpedl?query=' + encodeURIComponent(v) + '&max=15'; break;
      case 10: url = 'https://api.alwayscodex.my.id/api/maker/rusdi-quote?quote=' + encodeURIComponent(parts[0] || 'Hidup adalah perjuangan') + '&author=' + encodeURIComponent(parts[1] || 'AlwaysCodex'); break;
      case 11: url = 'https://api.alwayscodex.my.id/api/maker/jarvis-meme?text=' + encodeURIComponent(v); break;
      default: return;
    }
    const box = $('res' + i);
    box.innerHTML = '<div style="display:flex;align-items:center;gap:8px;justify-content:center;padding:12px;"><span class="loader"></span> Memproses...</div>';
    const res = await fetchWithProxy(url);
    if (!res) {
      box.textContent = 'Layanan sementara tidak tersedia. Coba lagi nanti.';
      return;
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('image')) {
      const blob = await res.blob();
      const src = URL.createObjectURL(blob);
      box.innerHTML = `<img src="${src}"><div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
        <a class="btn" style="padding:8px 16px;font-size:12px;background:rgba(46,204,113,.2);color:#2ecc71;border:1px solid #2ecc71;border-radius:12px;text-decoration:none;" href="${src}" download="xraxzz-${Date.now()}.png"><i class="fas fa-download"></i> Download</a>
        <button class="btn" style="padding:8px 16px;font-size:12px;background:rgba(241,196,15,.2);color:#f1c40f;border:1px solid #f1c40f;border-radius:12px;" onclick="saveDownloaded('${src}','xraxzz-${Date.now()}.png')"><i class="fas fa-save"></i> Simpan</button>
      </div></div>`;
    } else {
      const txt = await res.text();
      // Coba parse JSON
      try {
        const json = JSON.parse(txt);
        if (json && json.result) {
          box.innerHTML = `<div class="green-text">${json.result}</div>`;
        } else {
          box.innerHTML = `<div class="green-text">${txt}</div>`;
        }
      } catch {
        box.innerHTML = `<div class="green-text">${txt}</div>`;
      }
    }
  };

  window.saveDownloaded = function(href, name) {
    const username = localStorage.getItem('xrz_current');
    if (!username) {
      toast('Login dulu untuk menyimpan foto.');
      return false;
    }
    if (!window.FB) {
      toast('Koneksi server belum siap.');
      return false;
    }
    try {
      const photoRef = window.FB.push(window.FB.ref(window.FB.db, 'photos/' + username));
      window.FB.set(photoRef, {
        image: href,
        name: name || 'Foto',
        tool: 'XraxzzSpam',
        timestamp: Date.now()
      }).then(() => {
        toast('✅ Foto tersimpan di galeri!');
      }).catch(() => {
        toast('❌ Gagal simpan ke server.');
      });
      return true;
    } catch (err) {
      toast('❌ Gagal simpan: ' + err.message);
      return false;
    }
  };

  // ================================================================
  // GAMES
  // ================================================================
  const games = [
    ['Tic Tac Toe AI', 'AI sederhana', 'ttt', 'tool-color1', '<i class="fas fa-times"></i>'],
    ['Memory Card', 'Cocokkan kartu', 'memory', 'tool-color2', '<i class="fas fa-brain"></i>'],
    ['Flappy Bird 2D', 'Pixel arcade', 'flappy', 'tool-color3', '<i class="fas fa-crow"></i>'],
    ['Mengambar', 'Canvas gambar', 'draw', 'tool-color4', '<i class="fas fa-paint-brush"></i>'],
    ['Mobil Kanan Kiri', 'Hindari rintangan', 'car', 'tool-color5', '<i class="fas fa-car"></i>'],
    ['Kalkulator', 'Hitung cepat', 'calc', 'tool-color6', '<i class="fas fa-calculator"></i>'],
    ['Cek Kegantengan', 'Random 50-100%', 'random', 'tool-color7', '<i class="fas fa-male"></i>'],
    ['Jenis Khodam', 'Hasil random', 'khodam', 'tool-color8', '<i class="fas fa-ghost"></i>'],
    ['Cek Kecantikan', 'Random 50-100%', 'random', 'tool-color9', '<i class="fas fa-female"></i>'],
    ['Cek Kendaraan', 'Random merek', 'random', 'tool-color10', '<i class="fas fa-truck"></i>'],
    ['Cek Handphone', 'Random merek', 'random', 'tool-color1', '<i class="fas fa-phone"></i>'],
    ['Cek Khodam', 'Hasil random', 'khodam', 'tool-color2', '<i class="fas fa-skull"></i>']
  ];

  $('gameGrid').innerHTML = games.map((g, i) =>
    `<button class="tile ${g[3]}" onclick="openGame(${i})">${g[4]}<b>${g[0]}</b><small>${g[1]}</small></button>`
  ).join('');

  window.openGame = function(i) {
    const page = $('gamePage');
    page.classList.remove('hidden');
    const name = games[i][0];
    // Tic Tac Toe
    if (i === 0) {
      let board = Array(9).fill('');
      page.innerHTML = `<h2>${name}</h2><div id="ttt" class="ttt"></div><p id="ttmsg" class="sub">Giliran kamu.</p>`;
      const ttt = $('ttt'), msg = $('ttmsg');
      function renderTTT() { ttt.innerHTML = board.map((x, j) => `<button onclick="moveTT(${j})">${x}</button>`).join(''); }
      window.moveTT = function(j) {
        if (board[j]) return;
        board[j] = 'X'; renderTTT();
        if (win(board, 'X')) { msg.textContent = 'Kamu menang.'; return; }
        const empty = board.map((x, k) => x ? null : k).filter(x => x !== null);
        if (empty.length) {
          const k = empty[Math.floor(Math.random() * empty.length)];
          board[k] = 'O'; renderTTT();
          if (win(board, 'O')) msg.textContent = 'AI menang.';
        } else msg.textContent = 'Seri.';
      };
      window.win = function(board, s) {
        const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        return lines.some(q => q.every(k => board[k] === s));
      };
      renderTTT();
      return;
    }
    // Memory Card
    if (i === 1) {
      const vals = ['A','A','B','B','C','C','D','D'];
      vals.sort(() => Math.random() - .5);
      let open = [], matched = 0;
      page.innerHTML = `<h2>${name}</h2><div id="mem" class="memory"></div><p id="mems" class="sub">Pasangan: 0/4</p>`;
      const mem = $('mem');
      mem.innerHTML = vals.map((_, j) => `<button onclick="flip(${j})">?</button>`).join('');
      window.flip = function(j) {
        if (open.includes(j) || open.length === 2 || mem.children[j].textContent !== '?') return;
        mem.children[j].textContent = vals[j];
        open.push(j);
        if (open.length === 2) {
          if (vals[open[0]] === vals[open[1]]) { matched++; open = []; $('mems').textContent = 'Pasangan: ' + matched + '/4'; }
          else { setTimeout(() => { open.forEach(k => mem.children[k].textContent = '?'); open = []; }, 600); }
        }
      };
      return;
    }
    // Flappy Bird
    if (i === 2) {
      page.innerHTML = `<h2>${name}</h2><canvas id="flap" class="flappy" width="420" height="300"></canvas>
        <button class="btn wide" style="margin-top:10px" onclick="flapJump()">Naik</button><p class="sub">Klik Naik untuk menjaga burung tetap di udara.</p>`;
      const c = $('flap'), ctx = c.getContext('2d');
      let y = 140, v = 0, obs = 420;
      window.flapJump = () => v = -6;
      function loop() {
        v += .3; y += v; obs -= 2;
        if (obs < -30) obs = 420;
        ctx.clearRect(0, 0, 420, 300);
        ctx.fillStyle = '#55baff'; ctx.fillRect(80, y, 24, 18);
        ctx.fillStyle = '#168cff'; ctx.fillRect(obs, 0, 35, 95); ctx.fillRect(obs, 205, 35, 95);
        if (y < 0 || y > 280) { y = 140; v = 0; obs = 420; }
        requestAnimationFrame(loop);
      }
      loop();
      return;
    }
    // Mengambar
    if (i === 3) {
      page.innerHTML = `<h2>${name}</h2><div class="canvasbox"><canvas id="drawc" width="600" height="360"></canvas></div>
        <button class="btn wide" style="margin-top:10px" onclick="clearDraw()">Bersihkan</button>`;
      const c = $('drawc'), ctx = c.getContext('2d');
      let down = false;
      c.addEventListener('pointerdown', e => { down = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); });
      c.addEventListener('pointerup', () => down = false);
      c.addEventListener('pointermove', e => { if (!down) return; ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); });
      window.clearDraw = () => ctx.clearRect(0, 0, c.width, c.height);
      return;
    }
    // Mobil
    if (i === 4) {
      page.innerHTML = `<h2>${name}</h2><div class="cararea" id="road"><div class="roadline"></div><div id="car" class="car"></div></div>
        <p class="sub">Gunakan tombol kiri/kanan.</p><div class="grid"><button class="btn" onclick="carMove(-1)">Kiri</button><button class="btn" onclick="carMove(1)">Kanan</button></div>`;
      let pos = 45;
      window.carMove = d => { pos = Math.max(8, Math.min(82, pos + d * 12)); $('car').style.left = pos + '%'; };
      return;
    }
    // Kalkulator
    if (i === 5) {
      page.innerHTML = `<h2>${name}</h2><input id="expression" class="input" placeholder="12*8+4">
        <button class="btn wide" style="margin-top:10px" onclick="calcNow()">Hitung</button><div id="calcout" class="result"></div>`;
      window.calcNow = function() {
        const s = $('expression').value.replace(/[^0-9+\-*/().% ]/g, '');
        try { $('calcout').textContent = Function('return (' + s + ')')(); } catch { $('calcout').textContent = 'Masukkan perhitungan yang valid.'; }
      };
      return;
    }
    // Khodam (i=7 atau i=11)
    if (i === 7 || i === 11) {
      const list = ['Malaikat','Burung','Penghapus','Pensil','Pocong','Superman'];
      page.innerHTML = `<h2>${name}</h2><button class="btn wide" onclick="khodam()">Cek</button><div id="kres" class="result"></div>`;
      window.khodam = function() { $('kres').textContent = list[Math.floor(Math.random() * list.length)]; };
      return;
    }
    // Random check
    page.innerHTML = `<h2>${name}</h2><button class="btn wide" onclick="randomCheck()">Cek Sekarang</button><div id="rres" class="result"></div>`;
    window.randomCheck = function() {
      const brands = ['Vivo', 'Samsung', 'Xiaomi', 'iPhone', 'Oppo', 'Realme', 'Nokia', 'Toyota', 'Honda', 'Suzuki', 'Mitsubishi', 'Daihatsu'];
      const randBrand = brands[Math.floor(Math.random() * brands.length)];
      const percent = 50 + Math.floor(Math.random() * 51);
      $('rres').textContent = `${randBrand} · ${percent}%`;
    };
  };

  // ================================================================
  // GLOBAL CHAT
  // ================================================================
  function openGlobalChat() {
    const chatPage = document.createElement('div');
    chatPage.id = 'globalChatPage';
    chatPage.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(1,5,12,.95);padding:20px;display:flex;flex-direction:column;';
    chatPage.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h2 style="color:#4bc7ff;"><i class="fas fa-globe"></i> Global Chat</h2>
        <button onclick="this.closest('#globalChatPage').remove()" style="background:none;border:none;color:#fff;font-size:28px;"><i class="fas fa-times"></i></button>
      </div>
      <div id="chatMessages" style="flex:1;overflow-y:auto;background:rgba(7,19,37,.6);border-radius:16px;padding:12px;margin-bottom:10px;max-height:70vh;"></div>
      <div style="display:flex;gap:8px;">
        <input id="chatInput" class="input" placeholder="Tulis pesan..." style="flex:1;">
        <button class="btn" onclick="sendGlobalChat()" style="padding:12px 20px;">Kirim</button>
      </div>
    `;
    document.body.appendChild(chatPage);
    if (window.FB) {
      const chatRef = window.FB.ref(window.FB.db, 'globalChat');
      window.FB.onValue(chatRef, snap => {
        const data = snap.val() || {};
        const msgs = Object.values(data).sort((a,b)=>(a.timestamp||0)-(b.timestamp||0));
        const container = document.getElementById('chatMessages');
        if (!container) return;
        container.innerHTML = msgs.map(m =>
          `<div style="padding:6px 0;border-bottom:1px solid #1a3a5a;"><strong style="color:#4bc7ff;">${m.username}</strong> ${m.text}</div>`
        ).join('');
        container.scrollTop = container.scrollHeight;
      });
    } else {
      document.getElementById('chatMessages').innerHTML = '<div class="sub">Chat real-time memerlukan koneksi Firebase.</div>';
    }
    window.sendGlobalChat = function() {
      const input = document.getElementById('chatInput');
      const text = input.value.trim();
      if (!text || !localStorage.getItem('xrz_current')) return;
      if (window.FB) {
        window.FB.push(window.FB.ref(window.FB.db, 'globalChat'), {
          username: localStorage.getItem('xrz_current'),
          text: text,
          timestamp: Date.now()
        });
        input.value = '';
      }
    };
    document.getElementById('chatInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') sendGlobalChat(); });
  }

  // ================================================================
  // XRAXZZMEDIA
  // ================================================================
  let mediaPosts = JSON.parse(localStorage.getItem('xrz_media_posts') || '[]');

  function loadMediaFeed() {
    const storiesContainer = document.getElementById('mediaStories');
    const storyPosts = mediaPosts.filter(p => p.type === 'story').slice(-5).reverse();
    storiesContainer.innerHTML = storyPosts.map(p =>
      `<div style="min-width:66px;text-align:center;font-size:11px;color:#ddd;">
        <div style="width:64px;height:64px;border-radius:50%;padding:2px;background:linear-gradient(45deg,#fff,#777,#fff);margin:auto;">
          <span style="display:block;width:100%;height:100%;border-radius:50%;background:#111;border:2px solid #000;overflow:hidden;display:grid;place-items:center;font-size:24px;color:#fff;">${p.text ? p.text[0].toUpperCase() : '<i class="fas fa-book-open"></i>'}</span>
        </div>
        <div style="margin-top:4px;">${p.username}</div>
      </div>`
    ).join('') || '<div class="sub">Belum ada story.</div>';

    const feed = document.getElementById('mediaFeed');
    const postPosts = mediaPosts.filter(p => p.type === 'post').reverse();
    if (!postPosts.length) { feed.innerHTML = '<div class="sub">Belum ada postingan.</div>'; return; }
    feed.innerHTML = postPosts.map(post => {
      const likeCount = post.likes ? post.likes.length : 0;
      const commentCount = post.comments ? post.comments.length : 0;
      const liked = post.likes && post.likes.includes(localStorage.getItem('xrz_current'));
      return `
        <div class="media-post" data-id="${post.id}">
          <div class="header">
            <div class="avatar">${post.username ? post.username[0].toUpperCase() : 'U'}</div>
            <span class="username">${post.username || 'Anonim'}</span>
            <span style="margin-left:auto;font-size:11px;color:#8ea5bf;">${new Date(post.timestamp).toLocaleString()}</span>
          </div>
          <div class="content">
            ${post.text ? `<p>${post.text}</p>` : ''}
            ${post.image ? `<img src="${post.image}" alt="post" loading="lazy">` : ''}
          </div>
          <div class="actions">
            <button class="${liked ? 'liked' : ''}" onclick="toggleMediaLike(${post.id})">
              <i class="fas fa-heart ${liked ? 'liked' : ''}"></i> ${likeCount}
            </button>
            <button onclick="toggleMediaComment(${post.id})">
              <i class="fas fa-comment"></i> ${commentCount}
            </button>
            <button onclick="favoriteMedia(${post.id})">
              <i class="fas fa-star"></i>
            </button>
          </div>
          <div class="comments" id="mediaComments-${post.id}">
            ${(post.comments || []).slice(-3).map(c => `<div class="comment"><strong>${c.username}</strong> ${c.text}</div>`).join('')}
            <div class="comment-input">
              <input id="mediaCommentInput-${post.id}" placeholder="Tulis komentar...">
              <button onclick="addMediaComment(${post.id})">Kirim</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function openMediaModal(type) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.id = 'mediaModal';
    const title = type === 'story' ? 'Buat Story' : 'Buat Postingan';
    modal.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <h3>${title}</h3>
        <div class="field">
          <label>${type === 'story' ? 'Teks Story (opsional)' : 'Caption'}</label>
          <textarea id="mediaTextInput" placeholder="${type === 'story' ? 'Tulis story...' : 'Tulis caption...'}"></textarea>
        </div>
        <div class="field">
          <label>Pilih Foto</label>
          <input type="file" id="mediaFileInput" accept="image/*">
        </div>
        <div id="mediaPreviewContainer" style="margin-bottom:12px;"></div>
        <button class="primary" onclick="publishMedia('${type}')">Bagikan</button>
        <button class="secondary" onclick="closeMediaModal()">Batal</button>
      </div>
    `;
    document.body.appendChild(modal);
    const fileInput = document.getElementById('mediaFileInput');
    fileInput.addEventListener('change', function() {
      const preview = document.getElementById('mediaPreviewContainer');
      preview.innerHTML = '';
      if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.style.width = '100%';
          img.style.borderRadius = '12px';
          img.style.maxHeight = '200px';
          img.style.objectFit = 'cover';
          preview.appendChild(img);
        };
        reader.readAsDataURL(this.files[0]);
      }
    });
    modal.addEventListener('click', e => { if (e.target === modal) closeMediaModal(); });
  }

  function closeMediaModal() {
    const modal = document.getElementById('mediaModal');
    if (modal) modal.remove();
  }

  function publishMedia(type) {
    const text = document.getElementById('mediaTextInput').value.trim();
    const fileInput = document.getElementById('mediaFileInput');
    const file = fileInput.files[0];
    if (!text && !file) {
      toast('Isi teks atau pilih foto.');
      return;
    }
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        const imageData = e.target.result;
        const newPost = {
          id: Date.now(),
          type: type,
          username: localStorage.getItem('xrz_current'),
          text: text || '',
          image: imageData,
          likes: [],
          comments: [],
          timestamp: Date.now()
        };
        mediaPosts.unshift(newPost);
        localStorage.setItem('xrz_media_posts', JSON.stringify(mediaPosts));
        closeMediaModal();
        loadMediaFeed();
        toast(type === 'story' ? 'Story ditambahkan!' : 'Postingan dibagikan!');
      };
      reader.readAsDataURL(file);
    } else {
      const newPost = {
        id: Date.now(),
        type: type,
        username: localStorage.getItem('xrz_current'),
        text: text,
        image: '',
        likes: [],
        comments: [],
        timestamp: Date.now()
      };
      mediaPosts.unshift(newPost);
      localStorage.setItem('xrz_media_posts', JSON.stringify(mediaPosts));
      closeMediaModal();
      loadMediaFeed();
      toast(type === 'story' ? 'Story ditambahkan!' : 'Postingan dibagikan!');
    }
  }

  window.toggleMediaLike = function(id) {
    const post = mediaPosts.find(p => p.id === id);
    if (!post) return;
    const user = localStorage.getItem('xrz_current');
    if (!post.likes) post.likes = [];
    const idx = post.likes.indexOf(user);
    if (idx > -1) post.likes.splice(idx, 1);
    else post.likes.push(user);
    localStorage.setItem('xrz_media_posts', JSON.stringify(mediaPosts));
    loadMediaFeed();
  };

  window.addMediaComment = function(id) {
    const input = document.getElementById('mediaCommentInput-' + id);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const post = mediaPosts.find(p => p.id === id);
    if (!post) return;
    if (!post.comments) post.comments = [];
    post.comments.push({ username: localStorage.getItem('xrz_current'), text, timestamp: Date.now() });
    localStorage.setItem('xrz_media_posts', JSON.stringify(mediaPosts));
    loadMediaFeed();
    input.value = '';
  };

  window.favoriteMedia = function(id) { toast('⭐ Ditambahkan ke favorit!'); };

  // ================================================================
  // TABUNGAN
  // ================================================================
  let tabunganData = JSON.parse(localStorage.getItem('tabungan_bw_data') || 'null') || {
    balance: 0,
    target: 0,
    targetName: 'Target utama',
    income: 0,
    expense: 0,
    transactions: []
  };

  function saveTabungan() {
    localStorage.setItem('tabungan_bw_data', JSON.stringify(tabunganData));
  }

  function renderTabungan() {
    const rupiah = n => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n) || 0);
    document.getElementById('tabunganBalance').textContent = rupiah(tabunganData.balance);
    document.getElementById('tabunganTargetText').textContent = rupiah(tabunganData.target);
    let remain = Math.max(tabunganData.target - tabunganData.balance, 0);
    document.getElementById('tabunganRemainingText').textContent = 'Sisa ' + rupiah(remain);
    let pct = tabunganData.target ? Math.min(tabunganData.balance / tabunganData.target * 100, 100) : 0;
    document.getElementById('tabunganProgressBar').style.width = pct + '%';
    document.getElementById('tabunganPercent').textContent = pct.toFixed(0) + '% tercapai';
    document.getElementById('tabunganIncome').textContent = rupiah(tabunganData.income);
    document.getElementById('tabunganExpense').textContent = rupiah(tabunganData.expense);
    document.getElementById('tabunganCount').textContent = tabunganData.transactions.length;
    document.getElementById('tabunganGoalName').textContent = tabunganData.targetName || 'Target utama';
    document.getElementById('tabunganGoalDesc').textContent = tabunganData.target ? rupiah(tabunganData.target) + ' • ' + pct.toFixed(0) + '% tercapai' : 'Belum ada target.';

    const historyEl = document.getElementById('tabunganHistory');
    if (!tabunganData.transactions.length) {
      historyEl.innerHTML = '<div class="sub" style="text-align:center;padding:20px 0;">Belum ada transaksi.</div>';
      return;
    }
    historyEl.innerHTML = tabunganData.transactions.slice().reverse().map(t =>
      `<div class="tabungan-transaction">
        <div class="tabungan-trans-icon ${t.type === 'add' ? 'plus' : ''}">${t.type === 'add' ? '<i class="fas fa-plus"></i>' : '<i class="fas fa-minus"></i>'}</div>
        <div class="tabungan-trans-main"><b>${t.note}</b><small>${new Date(t.date).toLocaleString('id-ID')}</small></div>
        <div class="tabungan-trans-amount ${t.type === 'add' ? 'plus' : ''}">${t.type === 'add' ? '+' : '-'}${rupiah(t.amount)}</div>
      </div>`
    ).join('');
  }

  function openTabunganModal(type) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.id = 'tabunganModal';
    modal.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <h3>${type === 'add' ? 'Tambah Uang' : 'Kurangi Uang'}</h3>
        <div class="field"><label>NOMINAL (RUPIAH)</label><input id="tabunganInput" type="number" inputmode="numeric" placeholder="Contoh: 50000"></div>
        <div class="quick">
          <button onclick="setTabunganAmount(10000)">10K</button>
          <button onclick="setTabunganAmount(25000)">25K</button>
          <button onclick="setTabunganAmount(50000)">50K</button>
          <button onclick="setTabunganAmount(100000)">100K</button>
        </div>
        <div class="field"><label>KETERANGAN</label><input id="tabunganNote" placeholder="Contoh: Uang saku"></div>
        <button class="primary" onclick="saveTabunganTransaction('${type}')">Simpan Transaksi</button>
        <button class="secondary" onclick="closeTabunganModal()">Batal</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) closeTabunganModal(); });
    setTimeout(() => document.getElementById('tabunganInput')?.focus(), 100);
  }

  function closeTabunganModal() {
    const modal = document.getElementById('tabunganModal');
    if (modal) modal.remove();
  }

  function setTabunganAmount(n) {
    document.getElementById('tabunganInput').value = n;
  }

  function saveTabunganTransaction(type) {
    const amount = Number(document.getElementById('tabunganInput').value);
    const note = document.getElementById('tabunganNote').value.trim() || (type === 'add' ? 'Tambah uang' : 'Kurangi uang');
    if (!amount || amount <= 0) return toast('Nominal tidak valid');
    if (type === 'minus' && amount > tabunganData.balance) return toast('Saldo tidak mencukupi');
    if (type === 'add') { tabunganData.balance += amount; tabunganData.income += amount; }
    else { tabunganData.balance -= amount; tabunganData.expense += amount; }
    tabunganData.transactions.push({ type, amount, note, date: Date.now() });
    saveTabungan();
    renderTabungan();
    closeTabunganModal();
    toast(type === 'add' ? 'Uang berhasil ditambahkan' : 'Uang berhasil dikurangi');
  }

  function openTargetModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.id = 'targetModal';
    modal.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <h3>Set Target</h3>
        <div class="field"><label>NAMA TARGET</label><input id="targetNameInput" placeholder="Contoh: Beli HP Baru"></div>
        <div class="field"><label>NOMINAL TARGET</label><input id="targetAmountInput" type="number" inputmode="numeric" placeholder="Contoh: 3000000"></div>
        <button class="primary" onclick="saveTarget()">Simpan Target</button>
        <button class="secondary" onclick="closeTargetModal()">Batal</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('targetNameInput').value = tabunganData.targetName === 'Target utama' ? '' : tabunganData.targetName;
    document.getElementById('targetAmountInput').value = tabunganData.target || '';
    modal.addEventListener('click', e => { if (e.target === modal) closeTargetModal(); });
  }

  function closeTargetModal() {
    const modal = document.getElementById('targetModal');
    if (modal) modal.remove();
  }

  function saveTarget() {
    const target = Number(document.getElementById('targetAmountInput').value);
    const name = document.getElementById('targetNameInput').value.trim() || 'Target utama';
    if (target <= 0) return toast('Target tidak valid');
    tabunganData.target = target;
    tabunganData.targetName = name;
    saveTabungan();
    renderTabungan();
    closeTargetModal();
    toast('Target disimpan');
  }

  function clearTabunganHistory() {
    if (!tabunganData.transactions.length) return toast('Riwayat masih kosong');
    if (!confirm('Hapus semua riwayat transaksi?')) return;
    tabunganData.transactions = [];
    tabunganData.income = 0;
    tabunganData.expense = 0;
    saveTabungan();
    renderTabungan();
    toast('Riwayat dihapus');
  }

  // ================================================================
  // AI CHAT (Gemini Pro)
  // ================================================================
  let aiHistory = [];

  window.sendAI = async function() {
    const input = document.getElementById('aiInput');
    const text = input.value.trim();
    if (!text) return;
    const container = document.getElementById('aiChatContainer');
    // Tampilkan pesan user
    const userMsg = document.createElement('div');
    userMsg.className = 'ai-msg user';
    userMsg.innerHTML = `<i class="fas fa-user" style="color:#4bc7ff;"></i> ${text}`;
    container.appendChild(userMsg);
    input.value = '';
    container.scrollTop = container.scrollHeight;

    // Loading bot
    const botMsg = document.createElement('div');
    botMsg.className = 'ai-msg bot';
    botMsg.innerHTML = `<i class="fas fa-robot" style="color:#4bc7ff;"></i> <span class="typing">•••</span>`;
    container.appendChild(botMsg);
    container.scrollTop = container.scrollHeight;

    try {
      const url = `https://api.alwayscodex.my.id/api/ai/gemini-pro?teks=${encodeURIComponent(text)}`;
      const res = await fetchWithProxy(url);
      if (!res) throw new Error('Gagal terhubung ke AI');
      const data = await res.json();
      const reply = data.result || data.response || 'Maaf, saya tidak bisa menjawab saat ini.';
      // Hapus loading, tampilkan balasan
      botMsg.innerHTML = `<i class="fas fa-robot" style="color:#4bc7ff;"></i> ${reply}`;
    } catch (err) {
      botMsg.innerHTML = `<i class="fas fa-robot" style="color:#e74c3c;"></i> Error: ${err.message}`;
    }
    container.scrollTop = container.scrollHeight;
  };

  document.getElementById('aiInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') sendAI(); });

  // ================================================================
  // FIREBASE MODULE
  // ================================================================


// ===== FIREBASE =====
(async function initFirebase() {
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js");
    const { getDatabase, ref, get, set, update, push, onValue, remove } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js");
    const { getAuth, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js");

  
  const firebaseConfig = {
    apiKey: "AIzaSyDnpxy3KFcssy8pWvz3UCTtHApPS22fNgU",
    authDomain: "raxzz-project.firebaseapp.com",
    databaseURL: "https://raxzz-project-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "raxzz-project",
    storageBucket: "raxzz-project.firebasestorage.app",
    messagingSenderId: "631055650268",
    appId: "1:631055650268:web:fa220f02282b607a225319"
  };

  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);
  const auth = getAuth(app);
  await signInAnonymously(auth).catch(() => {});

  const maintenanceEl = document.getElementById('maintenance');
  onValue(ref(db, 'admin/maintenance'), snap => {
    const val = snap.val();
    maintenanceEl.classList.toggle('hidden', !val);
  });

  onValue(ref(db, 'admin/notification'), snap => {
    const n = snap.val();
    if (n && n.message && localStorage.getItem('xrz_current')) {
      window.toast(n.message);
    }
  });

  window.FB = { db, ref, get, set, update, push, onValue, remove };
  window.dispatchEvent(new Event('fbready'));

  } catch (err) {
    console.error("Firebase init failed:", err);
    window.dispatchEvent(new Event('fberror'));
  }
})();
