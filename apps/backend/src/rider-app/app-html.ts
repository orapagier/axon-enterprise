/**
 * MFH Rider — single-file PWA served by the backend at GET /rider-app.
 *
 * Kept as a TS string export (not a .html asset) so `medusa build` ships it
 * without a static-asset copy step. Same-origin with the /rider/* API, so no
 * CORS configuration is involved. The inline script deliberately avoids
 * template literals (backticks / dollar-brace) so this outer template literal
 * needs no escaping.
 *
 * Design: "digital route docket" — bright paper theme for outdoor sunlight
 * readability, waybill-style numbered stop tickets with perforated stubs,
 * monospace cash amounts, and a rubber-stamp DELIVERED/REFUSED action effect.
 */
export const RIDER_APP_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>MFH Rider</title>
<meta name="theme-color" content="#191d17">
<link rel="manifest" href="/rider-app/manifest">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%23157a3a'/%3E%3Ctext x='32' y='42' font-family='Arial' font-size='24' font-weight='900' fill='%23f7f4ec' text-anchor='middle'%3EMFH%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@600;700&family=Saira:wght@400;600&family=IBM+Plex+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
:root{
  --paper:#f7f4ec; --paper-2:#efeadd; --card:#fffdf7;
  --ink:#191d17; --ink-soft:#4c5247; --line:#d9d3c2;
  --green:#157a3a; --green-deep:#0d4f24; --green-tint:#e3efe2;
  --amber:#b96a00; --amber-tint:#f6ead2;
  --red:#a8261b; --red-tint:#f4e0dc;
  --mono:'IBM Plex Mono',ui-monospace,monospace;
  --cond:'Saira Condensed','Arial Narrow',sans-serif;
  --body:'Saira',system-ui,sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html{font-size:16px}
body{
  font-family:var(--body);color:var(--ink);background:var(--paper);
  background-image:
    radial-gradient(circle at 18% 8%, rgba(21,122,58,.05), transparent 42%),
    repeating-linear-gradient(0deg, transparent 0 3px, rgba(25,29,23,.014) 3px 4px);
  min-height:100dvh;padding-bottom:96px;
}
/* hazard tape header strip */
.tape{height:10px;background:repeating-linear-gradient(-45deg,var(--green) 0 14px,var(--ink) 14px 28px)}
header.bar{
  display:flex;align-items:center;gap:10px;padding:12px 16px 10px;
  border-bottom:2px solid var(--ink);background:var(--paper);
  position:sticky;top:0;z-index:30;
}
.plate{
  font-family:var(--cond);font-weight:700;font-size:1.35rem;letter-spacing:.06em;
  text-transform:uppercase;line-height:.95;
}
.plate small{display:block;font-size:.62rem;letter-spacing:.34em;color:var(--green-deep)}
.bar .spacer{flex:1}
.iconbtn{
  font-family:var(--cond);font-weight:700;text-transform:uppercase;letter-spacing:.08em;
  border:2px solid var(--ink);background:var(--card);color:var(--ink);
  padding:8px 12px;font-size:.78rem;cursor:pointer;box-shadow:2px 2px 0 rgba(25,29,23,.18);
}
.iconbtn:active{transform:translate(2px,2px);box-shadow:none}

/* ===== login ===== */
#view-login{display:flex;flex-direction:column;align-items:center;padding:9vh 22px 40px}
.login-plate{
  width:100%;max-width:400px;background:var(--card);border:2px solid var(--ink);
  box-shadow:6px 6px 0 rgba(25,29,23,.16);padding:26px 22px 28px;position:relative;
}
.login-plate:before{
  content:"";position:absolute;inset:6px;border:1px dashed var(--line);pointer-events:none;
}
.login-plate h1{font-family:var(--cond);font-size:2.2rem;line-height:.95;text-transform:uppercase;letter-spacing:.03em}
.login-plate h1 span{color:var(--green)}
.login-plate p.sub{font-size:.8rem;color:var(--ink-soft);margin:6px 0 22px;letter-spacing:.04em}
label.fld{display:block;margin-bottom:14px}
label.fld span{
  display:block;font-family:var(--cond);font-weight:700;font-size:.72rem;
  letter-spacing:.22em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:5px;
}
label.fld input{
  width:100%;font-family:var(--mono);font-size:1.25rem;font-weight:500;
  padding:13px 12px;border:2px solid var(--ink);background:var(--paper);
  border-radius:0;outline:none;letter-spacing:.06em;
}
label.fld input:focus{background:#fff;border-color:var(--green)}
button.primary{
  width:100%;margin-top:8px;padding:16px;border:2px solid var(--ink);cursor:pointer;
  background:var(--green);color:#fff;font-family:var(--cond);font-weight:700;
  font-size:1.15rem;letter-spacing:.14em;text-transform:uppercase;
  box-shadow:3px 3px 0 var(--ink);
}
button.primary:active{transform:translate(3px,3px);box-shadow:none}
button.primary[disabled]{opacity:.55}
.err{
  margin-top:14px;font-size:.84rem;color:var(--red);background:var(--red-tint);
  border:1px solid var(--red);padding:9px 11px;display:none;
}
.err.show{display:block;animation:shake .4s}
@keyframes shake{20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}
.login-foot{margin-top:26px;font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-soft)}

/* ===== run view ===== */
#view-run{display:none}
.daystrip{
  display:flex;gap:0;border-bottom:2px solid var(--ink);background:var(--paper-2);
  font-family:var(--cond);text-transform:uppercase;
}
.daystrip .cell{flex:1;padding:9px 12px 8px;border-right:1px dashed var(--line)}
.daystrip .cell:last-child{border-right:none}
.daystrip .k{font-size:.6rem;letter-spacing:.26em;color:var(--ink-soft)}
.daystrip .v{font-size:1.15rem;font-weight:700;line-height:1.05}
.daystrip .v.mono{font-family:var(--mono);font-size:.98rem;font-weight:700}

#stops{list-style:none;padding:18px 14px 8px;display:flex;flex-direction:column;gap:16px}
.ticket{
  position:relative;display:flex;background:var(--card);border:2px solid var(--ink);
  box-shadow:4px 4px 0 rgba(25,29,23,.14);
  opacity:0;transform:translateY(14px);
  animation:drop .45s cubic-bezier(.2,.9,.3,1) forwards;
  animation-delay:calc(var(--i)*70ms);
}
@keyframes drop{to{opacity:1;transform:none}}
.stub{
  width:64px;flex:0 0 64px;display:flex;flex-direction:column;align-items:center;
  justify-content:flex-start;padding-top:14px;background:var(--green-tint);
  border-right:2px dashed var(--ink);position:relative;
}
.stub:after,.stub:before{
  content:"";position:absolute;right:-7px;width:12px;height:12px;border-radius:50%;
  background:var(--paper);border:2px solid var(--ink);z-index:2;
}
.stub:before{top:-7px}
.stub:after{bottom:-7px}
.stub .n{font-family:var(--cond);font-weight:700;font-size:2.3rem;line-height:1;color:var(--green-deep)}
.stub .lbl{font-family:var(--cond);font-size:.56rem;letter-spacing:.24em;text-transform:uppercase;color:var(--ink-soft);margin-top:2px}
.tbody{flex:1;padding:13px 14px 14px;min-width:0}
.thead{display:flex;align-items:baseline;gap:8px}
.cust{font-family:var(--cond);font-weight:700;font-size:1.3rem;text-transform:uppercase;letter-spacing:.02em;line-height:1.05;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ordno{font-family:var(--mono);font-size:.74rem;font-weight:700;color:var(--ink-soft);white-space:nowrap}
.addr{font-size:.86rem;color:var(--ink-soft);margin-top:4px;line-height:1.35}
.addr b{color:var(--ink);font-weight:600}
.tel{
  display:inline-block;margin-top:7px;font-family:var(--mono);font-size:.82rem;font-weight:700;
  color:var(--green-deep);text-decoration:none;border-bottom:2px solid var(--green);
  padding-bottom:1px;
}
.cashline{
  margin-top:11px;display:flex;align-items:center;justify-content:space-between;
  background:var(--green-tint);border:1.5px solid var(--green-deep);padding:8px 11px;
}
.cashline .k{font-family:var(--cond);font-weight:700;font-size:.68rem;letter-spacing:.2em;text-transform:uppercase;color:var(--green-deep)}
.cashline .amt{font-family:var(--mono);font-weight:700;font-size:1.22rem;color:var(--green-deep)}
.cashline.tier-special{background:var(--amber-tint);border-color:var(--amber)}
.cashline.tier-special .k,.cashline.tier-special .amt{color:var(--amber)}
.actions{display:flex;gap:10px;margin-top:12px;align-items:center}
.btn-deliver{
  flex:1;padding:14px 10px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);
  font-family:var(--cond);font-weight:700;font-size:1.02rem;letter-spacing:.14em;
  text-transform:uppercase;cursor:pointer;box-shadow:3px 3px 0 rgba(21,122,58,.55);
}
.btn-deliver:active{transform:translate(2px,2px);box-shadow:none}
.btn-refuse{
  background:none;border:none;cursor:pointer;font-family:var(--cond);font-weight:700;
  font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;color:var(--red);
  border-bottom:2px solid var(--red);padding:4px 2px;
}
/* stamp */
.stamp{
  position:absolute;top:50%;left:50%;z-index:5;pointer-events:none;
  font-family:var(--cond);font-weight:700;font-size:2rem;letter-spacing:.18em;
  text-transform:uppercase;padding:8px 18px;border:4px solid currentColor;border-radius:6px;
  transform:translate(-50%,-50%) rotate(-12deg) scale(2.4);opacity:0;
  animation:stamp .38s cubic-bezier(.2,1.3,.4,1) forwards;
  mix-blend-mode:multiply;background:rgba(255,255,255,.25);
}
.stamp.ok{color:var(--green-deep)}
.stamp.bad{color:var(--red)}
@keyframes stamp{60%{opacity:1}to{opacity:.92;transform:translate(-50%,-50%) rotate(-12deg) scale(1)}}
.ticket.done{transition:opacity .4s .65s, transform .4s .65s;opacity:0;transform:translateY(-8px) scale(.97)}

.empty{
  margin:14vh 26px 0;text-align:center;color:var(--ink-soft);display:none;
}
.empty .truck{font-size:3rem;filter:grayscale(.3)}
.empty h2{font-family:var(--cond);text-transform:uppercase;letter-spacing:.1em;font-size:1.3rem;color:var(--ink);margin-top:8px}
.empty p{font-size:.85rem;margin-top:6px}

/* cash bar */
#cashbar{
  position:fixed;left:0;right:0;bottom:0;z-index:40;
  display:none;align-items:center;gap:12px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));
  background:var(--ink);color:var(--paper);border-top:3px solid var(--green);
}
#cashbar .k{font-family:var(--cond);font-weight:700;font-size:.66rem;letter-spacing:.24em;text-transform:uppercase;opacity:.75;line-height:1.2}
#cashbar .amt{font-family:var(--mono);font-weight:700;font-size:1.5rem;line-height:1}
#cashbar .note{margin-left:auto;font-family:var(--cond);font-size:.66rem;letter-spacing:.16em;text-transform:uppercase;text-align:right;opacity:.75;line-height:1.35}
#cashbar.warn{border-top-color:var(--amber);background:#3a2a10}
#cashbar.over{border-top-color:var(--red);background:#3d1310}

/* bottom sheet */
#backdrop{
  position:fixed;inset:0;background:rgba(25,29,23,.5);z-index:60;display:none;
}
#backdrop.show{display:block;animation:fade .2s}
@keyframes fade{from{opacity:0}}
#sheet{
  position:fixed;left:0;right:0;bottom:0;z-index:61;background:var(--card);
  border-top:3px solid var(--ink);padding:20px 18px calc(24px + env(safe-area-inset-bottom));
  transform:translateY(100%);transition:transform .26s cubic-bezier(.2,.9,.3,1);
}
#sheet.show{transform:none}
#sheet .grip{width:44px;height:4px;background:var(--line);margin:0 auto 14px;border-radius:2px}
#sheet h3{font-family:var(--cond);font-weight:700;font-size:1.45rem;text-transform:uppercase;letter-spacing:.05em}
#sheet .who{font-size:.85rem;color:var(--ink-soft);margin-top:3px}
#sheet .bigcash{
  margin:16px 0;padding:14px;text-align:center;border:2px dashed var(--green-deep);
  background:var(--green-tint);
}
#sheet .bigcash .k{font-family:var(--cond);font-weight:700;font-size:.7rem;letter-spacing:.26em;text-transform:uppercase;color:var(--green-deep)}
#sheet .bigcash .v{font-family:var(--mono);font-weight:700;font-size:2.2rem;color:var(--green-deep);line-height:1.1}
#sheet textarea{
  width:100%;min-height:84px;border:2px solid var(--ink);background:var(--paper);
  font-family:var(--body);font-size:.95rem;padding:10px;margin:14px 0 4px;outline:none;border-radius:0;
}
#sheet .sheet-actions{display:flex;gap:10px;margin-top:12px}
#sheet .sheet-actions .ghost{
  flex:0 0 auto;padding:14px 16px;background:var(--card);border:2px solid var(--ink);
  font-family:var(--cond);font-weight:700;font-size:.9rem;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;
}
#sheet .sheet-actions .go{
  flex:1;padding:14px;border:2px solid var(--ink);cursor:pointer;color:#fff;
  font-family:var(--cond);font-weight:700;font-size:1.05rem;letter-spacing:.14em;text-transform:uppercase;
  box-shadow:3px 3px 0 var(--ink);
}
#sheet .sheet-actions .go.ok{background:var(--green)}
#sheet .sheet-actions .go.bad{background:var(--red)}
#sheet .sheet-actions .go:active{transform:translate(3px,3px);box-shadow:none}
#sheet .sheet-actions .go[disabled]{opacity:.55}
.loading{padding:40px;text-align:center;font-family:var(--cond);letter-spacing:.2em;text-transform:uppercase;color:var(--ink-soft);display:none}
</style>
</head>
<body>
<div class="tape"></div>

<section id="view-login">
  <div class="login-plate">
    <h1>Mindanao<br>Fresh<span> Hub</span></h1>
    <p class="sub">RIDER RUN SHEET · TAGUM CITY</p>
    <form id="login-form" autocomplete="off">
      <label class="fld"><span>Mobile number</span>
        <input id="in-phone" type="tel" inputmode="tel" placeholder="+63 9xx xxx xxxx" required>
      </label>
      <label class="fld"><span>PIN</span>
        <input id="in-pin" type="password" inputmode="numeric" placeholder="••••" required>
      </label>
      <button class="primary" id="btn-login" type="submit">Clock in</button>
      <div class="err" id="login-err"></div>
    </form>
  </div>
  <div class="login-foot">Cash is traced per rider · remit at the hub</div>
</section>

<section id="view-run">
  <header class="bar">
    <div class="plate">MFH Rider<small id="rider-name">—</small></div>
    <div class="spacer"></div>
    <button class="iconbtn" id="btn-refresh" type="button">Refresh</button>
    <button class="iconbtn" id="btn-logout" type="button">Out</button>
  </header>
  <div class="daystrip">
    <div class="cell"><div class="k">Stops left</div><div class="v" id="st-left">0</div></div>
    <div class="cell"><div class="k">Done today</div><div class="v" id="st-done">0</div></div>
    <div class="cell"><div class="k">Collected today</div><div class="v mono" id="st-cash">₱0.00</div></div>
  </div>
  <div class="loading" id="loading">Loading run…</div>
  <ol id="stops"></ol>
  <div class="empty" id="empty">
    <div class="truck">🛵</div>
    <h2>No deliveries on your run</h2>
    <p>New stops appear here when your batch goes out.</p>
  </div>
</section>

<footer id="cashbar">
  <div>
    <div class="k">Cash in hand</div>
    <div class="amt" id="cb-amt">₱0.00</div>
  </div>
  <div class="note" id="cb-note">Remit at the hub counter</div>
</footer>

<div id="backdrop"></div>
<div id="sheet">
  <div class="grip"></div>
  <h3 id="sh-title">Confirm delivery</h3>
  <div class="who" id="sh-who"></div>
  <div class="bigcash" id="sh-cash"><div class="k">Collect from buyer</div><div class="v" id="sh-amt">₱0.00</div></div>
  <textarea id="sh-notes" placeholder="What happened? (e.g. buyer not home, refused at door)" style="display:none"></textarea>
  <div class="sheet-actions">
    <button class="ghost" id="sh-cancel" type="button">Back</button>
    <button class="go ok" id="sh-go" type="button">Cash collected</button>
  </div>
</div>

<script>
(function(){
  'use strict';
  var TOKEN_KEY = 'mfh_rider_token';
  var ME_KEY = 'mfh_rider_me';
  var state = { stops: [], summary: null, sheet: null, busy: false };

  function $(id){ return document.getElementById(id); }
  function peso(centavos){
    var n = (Number(centavos || 0) / 100);
    return '\\u20B1' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function token(){ return localStorage.getItem(TOKEN_KEY); }

  function api(path, opts){
    opts = opts || {};
    opts.headers = opts.headers || {};
    if (token()) opts.headers['Authorization'] = 'Bearer ' + token();
    if (opts.body) opts.headers['Content-Type'] = 'application/json';
    return fetch(path, opts).then(function(res){
      if (res.status === 401 && path.indexOf('/rider/auth/login') === -1) { logout(); throw new Error('Session expired — log in again.'); }
      return res.json().then(function(json){
        if (!res.ok) throw new Error(json && json.error ? json.error : ('Request failed (' + res.status + ')'));
        return json;
      });
    });
  }

  /* ---------- views ---------- */
  function showLogin(){
    $('view-login').style.display = 'flex';
    $('view-run').style.display = 'none';
    $('cashbar').style.display = 'none';
  }
  function showRun(){
    $('view-login').style.display = 'none';
    $('view-run').style.display = 'block';
    $('cashbar').style.display = 'flex';
    var me = null;
    try { me = JSON.parse(localStorage.getItem(ME_KEY) || 'null'); } catch (e) { me = null; }
    $('rider-name').textContent = me && me.full_name ? me.full_name : 'Rider';
  }
  function logout(){
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ME_KEY);
    showLogin();
  }

  /* ---------- login ---------- */
  $('login-form').addEventListener('submit', function(ev){
    ev.preventDefault();
    var err = $('login-err');
    err.classList.remove('show');
    $('btn-login').disabled = true;
    api('/rider/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone: $('in-phone').value.trim(), pin: $('in-pin').value.trim() })
    }).then(function(out){
      localStorage.setItem(TOKEN_KEY, out.token);
      localStorage.setItem(ME_KEY, JSON.stringify(out.rider));
      $('in-pin').value = '';
      showRun();
      load();
    }).catch(function(e){
      err.textContent = e.message;
      err.classList.add('show');
    }).then(function(){ $('btn-login').disabled = false; });
  });

  /* ---------- data ---------- */
  function collectCentavos(stop){
    var order = stop.order || {};
    var total = Math.round(Number(order.total || 0) * 100);
    var meta = order.metadata || {};
    var fee = Math.round(Number(meta.delivery_fee_php || 0) * 100);
    return total + fee;
  }

  function load(){
    $('loading').style.display = 'block';
    Promise.all([ api('/rider/manifest'), api('/rider/summary') ]).then(function(out){
      state.stops = out[0].manifest || [];
      state.summary = out[1];
      render();
    }).catch(function(e){
      console.error(e);
    }).then(function(){ $('loading').style.display = 'none'; });
  }

  function render(){
    var list = $('stops');
    list.innerHTML = '';
    var stops = state.stops;
    $('st-left').textContent = String(stops.length);
    if (state.summary) {
      $('st-done').textContent = String(state.summary.today.delivered_count);
      $('st-cash').textContent = peso(state.summary.today.collected_centavos);
      $('cb-amt').textContent = peso(state.summary.outstanding_centavos);
      var bar = $('cashbar');
      bar.classList.remove('warn', 'over');
      var limit = Number(state.summary.limit_centavos || 0);
      var out = Number(state.summary.outstanding_centavos || 0);
      if (limit > 0 && out > limit) {
        bar.classList.add('over');
        $('cb-note').textContent = 'Over the ' + peso(limit) + ' limit — remit now';
      } else if (limit > 0 && out > limit * 0.8) {
        bar.classList.add('warn');
        $('cb-note').textContent = 'Near the ' + peso(limit) + ' limit — remit soon';
      } else {
        $('cb-note').textContent = 'Remit at the hub counter';
      }
    }
    $('empty').style.display = stops.length ? 'none' : 'block';

    stops.forEach(function(stop, i){
      var order = stop.order || {};
      var addr = order.shipping_address || {};
      var meta = order.metadata || {};
      var addrMeta = addr.metadata || {};
      var name = ((addr.first_name || '') + ' ' + (addr.last_name || '')).trim() || 'Customer';
      var barangay = addrMeta.barangay || meta.delivery_barangay || '';
      var tier = meta.delivery_tier || '';

      var li = document.createElement('li');
      li.className = 'ticket';
      li.style.setProperty('--i', String(i));
      li.dataset.id = stop.dispatch_order_id;

      var stub = document.createElement('div');
      stub.className = 'stub';
      stub.innerHTML = '<div class="n">' + (i + 1) + '</div><div class="lbl">Stop</div>';
      li.appendChild(stub);

      var body = document.createElement('div');
      body.className = 'tbody';

      var head = document.createElement('div');
      head.className = 'thead';
      var cust = document.createElement('div');
      cust.className = 'cust';
      cust.textContent = name;
      var ono = document.createElement('div');
      ono.className = 'ordno';
      ono.textContent = '#' + (order.display_id != null ? order.display_id : '?');
      head.appendChild(cust); head.appendChild(ono);
      body.appendChild(head);

      var a = document.createElement('div');
      a.className = 'addr';
      var line1 = (addr.address_1 || '').trim();
      a.innerHTML = (barangay ? '<b>' + esc(barangay) + '</b> · ' : '') + esc(line1) + (addr.city ? ', ' + esc(addr.city) : '');
      body.appendChild(a);

      if (addr.phone) {
        var tel = document.createElement('a');
        tel.className = 'tel';
        tel.href = 'tel:' + addr.phone;
        tel.textContent = '\\u260E ' + addr.phone;
        body.appendChild(tel);
      }

      var cash = document.createElement('div');
      cash.className = 'cashline' + (tier === 'special' ? ' tier-special' : '');
      cash.innerHTML = '<span class="k">Collect ' + (tier ? '· ' + esc(tier) : '') + '</span><span class="amt">' + peso(collectCentavos(stop)) + '</span>';
      body.appendChild(cash);

      var actions = document.createElement('div');
      actions.className = 'actions';
      var bd = document.createElement('button');
      bd.className = 'btn-deliver';
      bd.type = 'button';
      bd.textContent = 'Delivered \\u2713';
      bd.addEventListener('click', function(){ openSheet('deliver', stop, li); });
      var br = document.createElement('button');
      br.className = 'btn-refuse';
      br.type = 'button';
      br.textContent = 'Refused';
      br.addEventListener('click', function(){ openSheet('refuse', stop, li); });
      actions.appendChild(bd); actions.appendChild(br);
      body.appendChild(actions);

      li.appendChild(body);
      list.appendChild(li);
    });
  }

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- bottom sheet ---------- */
  function openSheet(mode, stop, el){
    state.sheet = { mode: mode, stop: stop, el: el };
    var order = stop.order || {};
    var addr = order.shipping_address || {};
    var name = ((addr.first_name || '') + ' ' + (addr.last_name || '')).trim() || 'Customer';
    $('sh-who').textContent = 'Order #' + (order.display_id != null ? order.display_id : '?') + ' · ' + name;
    if (mode === 'deliver') {
      $('sh-title').textContent = 'Confirm delivery';
      $('sh-cash').style.display = 'block';
      $('sh-amt').textContent = peso(collectCentavos(stop));
      $('sh-notes').style.display = 'none';
      var go = $('sh-go');
      go.textContent = 'Cash collected';
      go.classList.remove('bad'); go.classList.add('ok');
    } else {
      $('sh-title').textContent = 'Mark as refused';
      $('sh-cash').style.display = 'none';
      $('sh-notes').style.display = 'block';
      $('sh-notes').value = '';
      var go2 = $('sh-go');
      go2.textContent = 'Confirm refusal';
      go2.classList.remove('ok'); go2.classList.add('bad');
    }
    $('backdrop').classList.add('show');
    $('sheet').classList.add('show');
  }
  function closeSheet(){
    state.sheet = null;
    $('backdrop').classList.remove('show');
    $('sheet').classList.remove('show');
  }
  $('sh-cancel').addEventListener('click', closeSheet);
  $('backdrop').addEventListener('click', closeSheet);

  $('sh-go').addEventListener('click', function(){
    if (!state.sheet || state.busy) return;
    var s = state.sheet;
    state.busy = true;
    $('sh-go').disabled = true;
    var path, body;
    if (s.mode === 'deliver') {
      path = '/rider/orders/' + s.stop.dispatch_order_id + '/delivered';
      body = '{}';
    } else {
      path = '/rider/orders/' + s.stop.dispatch_order_id + '/refused';
      body = JSON.stringify({ rider_notes: $('sh-notes').value.trim() || null });
    }
    api(path, { method: 'POST', body: body }).then(function(){
      var el = s.el;
      closeSheet();
      var stamp = document.createElement('div');
      stamp.className = 'stamp ' + (s.mode === 'deliver' ? 'ok' : 'bad');
      stamp.textContent = s.mode === 'deliver' ? 'Delivered \\u2713' : 'Refused';
      el.appendChild(stamp);
      el.classList.add('done');
      if (navigator.vibrate) navigator.vibrate(s.mode === 'deliver' ? 60 : [40, 60, 40]);
      setTimeout(load, 1150);
    }).catch(function(e){
      closeSheet();
      alert(e.message);
    }).then(function(){
      state.busy = false;
      $('sh-go').disabled = false;
    });
  });

  /* ---------- chrome ---------- */
  $('btn-refresh').addEventListener('click', load);
  $('btn-logout').addEventListener('click', logout);
  document.addEventListener('visibilitychange', function(){
    if (!document.hidden && token()) load();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/rider-app/sw').catch(function(){});
  }

  if (token()) { showRun(); load(); } else { showLogin(); }
})();
</script>
</body>
</html>`
