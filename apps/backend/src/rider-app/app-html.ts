/**
 * MFH Rider — single-file PWA served by the backend at GET /rider-app.
 *
 * Kept as a TS string export (not a .html asset) so `medusa build` ships it
 * without a static-asset copy step. Same-origin with the /rider/* API, so no
 * CORS configuration is involved. The inline script deliberately avoids
 * template literals (backticks / dollar-brace) so this outer template literal
 * needs no escaping.
 *
 * Design: "carbon-copy waybill pad" — a digital route docket. Bright paper
 * theme for outdoor sunlight readability on cheap Android phones; numbered
 * stop tickets with perforated stubs riding a dashed route spine; CSS
 * barcodes; rubber-stamp DELIVERED/REFUSED actions; a cash-in-hand bar that
 * warns toward the remit limit. Type: Anton (signage), Archivo Narrow
 * (labels), Spline Sans Mono (money).
 */
export const RIDER_APP_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>MFH Rider</title>
<meta name="theme-color" content="#1b1f19">
<link rel="manifest" href="/rider-app/manifest">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%23137a3c'/%3E%3Ctext x='32' y='42' font-family='Arial' font-size='24' font-weight='900' fill='%23f6f2e7' text-anchor='middle'%3EMFH%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Narrow:wght@500;600;700&family=Archivo:wght@400;600&family=Spline+Sans+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
:root{
  --paper:#f6f2e7; --paper-deep:#ece5d2; --card:#fffdf6;
  --ink:#1b1f19; --ink-soft:#59604f; --line:#d6cfba; --line-soft:#e4ddc9;
  --green:#13713a; --green-deep:#0b4423; --green-tint:#e3efdd;
  --amber:#a96400; --amber-tint:#f7e9cf;
  --red:#a32417; --red-tint:#f5e1dc;
  --mono:'Spline Sans Mono',ui-monospace,monospace;
  --sign:'Anton',Impact,sans-serif;
  --cond:'Archivo Narrow','Arial Narrow',sans-serif;
  --body:'Archivo',system-ui,sans-serif;
  --shadow:5px 5px 0 rgba(27,31,25,.16);
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html{font-size:16px}
body{
  font-family:var(--body);color:var(--ink);background:var(--paper);
  background-image:
    radial-gradient(circle at 15% 6%, rgba(19,113,58,.06), transparent 46%),
    radial-gradient(circle at 90% 100%, rgba(169,100,0,.045), transparent 38%),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
  min-height:100dvh;padding-bottom:104px;
}
::selection{background:var(--green-tint)}

/* hazard tape */
.tape{
  height:12px;background:repeating-linear-gradient(-45deg,var(--green) 0 16px,var(--ink) 16px 32px);
  border-bottom:2px solid var(--ink);
  transform-origin:left;animation:tape .5s cubic-bezier(.3,.9,.3,1) both;
}
@keyframes tape{from{transform:scaleX(0)}}

/* ===== header ===== */
header.bar{
  display:flex;align-items:center;gap:10px;padding:12px 16px 11px;
  border-bottom:2px solid var(--ink);
  background:linear-gradient(var(--card),var(--paper));
  position:sticky;top:0;z-index:30;
}
.plate{display:flex;flex-direction:column;line-height:1}
.plate .t{font-family:var(--sign);font-size:1.3rem;letter-spacing:.04em;text-transform:uppercase}
.plate .t em{font-style:normal;color:var(--green)}
.plate small{
  font-family:var(--cond);font-weight:700;font-size:.6rem;letter-spacing:.3em;
  text-transform:uppercase;color:var(--ink-soft);margin-top:4px;
}
.dateplate{
  margin-left:auto;text-align:right;font-family:var(--cond);font-weight:700;
  font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-soft);
  border:1.5px solid var(--ink);background:var(--card);padding:5px 8px;
  box-shadow:2px 2px 0 rgba(27,31,25,.14);line-height:1.4;white-space:nowrap;
}
.dateplate b{display:block;color:var(--ink);font-size:.78rem;letter-spacing:.12em}
.iconbtn{
  font-family:var(--cond);font-weight:700;text-transform:uppercase;letter-spacing:.1em;
  border:2px solid var(--ink);background:var(--card);color:var(--ink);
  padding:9px 11px;font-size:.72rem;cursor:pointer;box-shadow:2px 2px 0 rgba(27,31,25,.2);
  display:inline-flex;align-items:center;gap:6px;
}
.iconbtn:active{transform:translate(2px,2px);box-shadow:none}
.iconbtn .gly{display:inline-block;font-size:.9rem;line-height:1}
.iconbtn.busy .gly{animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* ===== login ===== */
#view-login{display:flex;flex-direction:column;align-items:center;padding:8vh 22px 40px}
.login-plate{
  width:100%;max-width:400px;background:var(--card);border:2px solid var(--ink);
  box-shadow:var(--shadow);padding:0 0 26px;position:relative;overflow:hidden;
  animation:rise .55s .12s cubic-bezier(.2,.9,.3,1) both;
}
@keyframes rise{from{opacity:0;transform:translateY(22px)}}
.punchrow{
  display:flex;justify-content:space-evenly;padding:10px 18px 0;
}
.punchrow i{
  width:11px;height:11px;border-radius:50%;background:var(--paper);
  border:2px solid var(--ink);display:block;
}
.login-inner{padding:18px 24px 0}
.login-plate h1{
  font-family:var(--sign);font-size:2.5rem;line-height:.96;text-transform:uppercase;
  letter-spacing:.015em;
}
.login-plate h1 span{color:var(--green)}
.login-meta{
  display:flex;gap:8px;align-items:center;margin:10px 0 22px;
  font-family:var(--cond);font-weight:700;font-size:.62rem;letter-spacing:.26em;
  text-transform:uppercase;color:var(--ink-soft);
}
.login-meta:after{content:"";flex:1;border-top:2px dashed var(--line)}
label.fld{display:block;margin-bottom:15px;animation:rise .5s both}
label.fld.f1{animation-delay:.24s}
label.fld.f2{animation-delay:.32s}
label.fld span{
  display:block;font-family:var(--cond);font-weight:700;font-size:.66rem;
  letter-spacing:.26em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:6px;
}
label.fld input{
  width:100%;font-family:var(--mono);font-size:1.25rem;font-weight:500;
  padding:13px 12px;border:2px solid var(--ink);background:var(--paper);
  border-radius:0;outline:none;letter-spacing:.05em;transition:background .15s,border-color .15s;
}
label.fld input:focus{background:#fff;border-color:var(--green);box-shadow:inset 0 -3px 0 var(--green-tint)}
button.primary{
  width:100%;margin-top:6px;padding:16px;border:2px solid var(--ink);cursor:pointer;
  background:var(--green);color:#fff;font-family:var(--sign);
  font-size:1.2rem;letter-spacing:.14em;text-transform:uppercase;
  box-shadow:4px 4px 0 var(--ink);animation:rise .5s .4s both;
}
button.primary:active{transform:translate(4px,4px);box-shadow:none}
button.primary[disabled]{opacity:.55}
.login-or{
  display:flex;align-items:center;gap:10px;margin:18px 0 14px;
  font-family:var(--cond);font-weight:700;font-size:.62rem;letter-spacing:.3em;
  text-transform:uppercase;color:var(--ink-soft);animation:rise .5s .44s both;
}
.login-or:before,.login-or:after{content:"";flex:1;border-top:2px dashed var(--line)}
.gbtn{
  display:flex;align-items:center;justify-content:center;gap:10px;width:100%;
  padding:13px;border:2px solid var(--ink);background:var(--card);color:var(--ink);
  font-family:var(--cond);font-weight:700;font-size:.92rem;letter-spacing:.12em;
  text-transform:uppercase;text-decoration:none;cursor:pointer;
  box-shadow:4px 4px 0 rgba(27,31,25,.2);animation:rise .5s .48s both;
}
.gbtn:active{transform:translate(4px,4px);box-shadow:none}
.gbtn .gmark{
  display:inline-flex;align-items:center;justify-content:center;
  width:26px;height:26px;border:2px solid var(--ink);background:var(--paper);
  font-family:var(--sign);font-size:1rem;color:var(--green);line-height:1;
}
.err{
  margin-top:14px;font-size:.84rem;color:var(--red);background:var(--red-tint);
  border:1.5px solid var(--red);border-left-width:6px;padding:10px 12px;display:none;
}
.err.show{display:block;animation:shake .4s}
@keyframes shake{20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}
.login-barcode{
  margin:24px 24px 0;height:34px;
  background:repeating-linear-gradient(90deg,var(--ink) 0 2px,transparent 2px 5px,var(--ink) 5px 7px,transparent 7px 12px,var(--ink) 12px 13px,transparent 13px 17px,var(--ink) 17px 21px,transparent 21px 24px);
  opacity:.8;animation:rise .5s .48s both;
}
.login-foot{
  margin-top:26px;font-family:var(--cond);font-weight:600;font-size:.66rem;
  letter-spacing:.22em;text-transform:uppercase;color:var(--ink-soft);
  animation:rise .5s .56s both;text-align:center;line-height:2;
}

/* ===== run view ===== */
#view-run{display:none}
.daystrip{
  display:flex;border-bottom:2px solid var(--ink);background:var(--paper-deep);
  font-family:var(--cond);text-transform:uppercase;
}
.daystrip .cell{flex:1;padding:10px 12px 9px;border-right:2px dashed var(--line);min-width:0}
.daystrip .cell:last-child{border-right:none}
.daystrip .k{font-size:.56rem;font-weight:700;letter-spacing:.24em;color:var(--ink-soft)}
.daystrip .v{font-family:var(--sign);font-size:1.5rem;line-height:1.05;margin-top:2px}
.daystrip .v.mono{font-family:var(--mono);font-weight:700;font-size:1.02rem;padding-top:5px}

#stops{list-style:none;padding:20px 14px 8px;display:flex;flex-direction:column;gap:18px;position:relative}
#stops:before{
  content:"";position:absolute;left:46px;top:8px;bottom:8px;
  border-left:2px dashed var(--line);
}
.ticket{
  position:relative;display:flex;background:var(--card);border:2px solid var(--ink);
  box-shadow:var(--shadow);
  opacity:0;transform:translateY(16px) rotate(0deg);
  animation:drop .5s cubic-bezier(.2,.9,.3,1) forwards;
  animation-delay:calc(var(--i)*80ms);
}
.ticket:nth-child(odd){--rot:-.35deg}
.ticket:nth-child(even){--rot:.3deg}
@keyframes drop{to{opacity:1;transform:translateY(0) rotate(var(--rot,0deg))}}
.copytag{
  position:absolute;top:7px;right:-26px;transform:rotate(90deg);transform-origin:left top;
  font-family:var(--cond);font-weight:700;font-size:.52rem;letter-spacing:.3em;
  text-transform:uppercase;color:var(--ink);opacity:.38;white-space:nowrap;
}
.stub{
  width:64px;flex:0 0 64px;display:flex;flex-direction:column;align-items:center;
  padding-top:14px;border-right:2px dashed var(--ink);position:relative;
  background:
    repeating-linear-gradient(0deg, transparent 0 6px, rgba(19,113,58,.05) 6px 7px),
    var(--green-tint);
}
.stub:after,.stub:before{
  content:"";position:absolute;right:-8px;width:14px;height:14px;border-radius:50%;
  background:var(--paper);border:2px solid var(--ink);z-index:2;
}
.stub:before{top:-9px}
.stub:after{bottom:-9px}
.stub .n{font-family:var(--sign);font-size:2.5rem;line-height:1;color:var(--green-deep)}
.stub .lbl{font-family:var(--cond);font-weight:700;font-size:.52rem;letter-spacing:.3em;text-transform:uppercase;color:var(--ink-soft);margin-top:3px}
.stub .bc{
  margin-top:auto;margin-bottom:10px;width:34px;height:26px;opacity:.7;
  background:repeating-linear-gradient(90deg,var(--ink) 0 2px,transparent 2px 4px,var(--ink) 4px 5px,transparent 5px 9px,var(--ink) 9px 12px,transparent 12px 14px);
}
.tbody{flex:1;padding:14px 16px 15px;min-width:0}
.thead{display:flex;align-items:baseline;gap:8px}
.cust{
  font-family:var(--cond);font-weight:700;font-size:1.32rem;text-transform:uppercase;
  letter-spacing:.015em;line-height:1.05;flex:1;min-width:0;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.ordno{font-family:var(--mono);font-size:.72rem;font-weight:700;color:var(--ink-soft);white-space:nowrap}
.addr{font-size:.86rem;color:var(--ink-soft);margin-top:5px;line-height:1.4}
.addr b{color:var(--ink);font-weight:600}
.tel{
  display:inline-flex;align-items:center;gap:6px;margin-top:8px;
  font-family:var(--mono);font-size:.8rem;font-weight:700;
  color:var(--green-deep);text-decoration:none;
  border:1.5px solid var(--green-deep);padding:5px 9px;background:var(--card);
  box-shadow:2px 2px 0 rgba(11,68,35,.18);
}
.tel:active{transform:translate(2px,2px);box-shadow:none}
.cashline{
  margin-top:12px;display:flex;align-items:center;justify-content:space-between;
  background:var(--green-tint);border:1.5px solid var(--green-deep);
  border-left-width:6px;padding:9px 12px;
}
.cashline .k{font-family:var(--cond);font-weight:700;font-size:.64rem;letter-spacing:.22em;text-transform:uppercase;color:var(--green-deep)}
.cashline .amt{font-family:var(--mono);font-weight:700;font-size:1.3rem;color:var(--green-deep)}
.cashline.tier-special{background:var(--amber-tint);border-color:var(--amber)}
.cashline.tier-special .k,.cashline.tier-special .amt{color:var(--amber)}
.actions{display:flex;gap:12px;margin-top:13px;align-items:center}
.btn-deliver{
  flex:1;padding:15px 10px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);
  font-family:var(--sign);font-size:1.02rem;letter-spacing:.12em;
  text-transform:uppercase;cursor:pointer;box-shadow:4px 4px 0 rgba(19,113,58,.6);
}
.btn-deliver:active{transform:translate(3px,3px);box-shadow:none}
.btn-refuse{
  background:none;border:none;cursor:pointer;font-family:var(--cond);font-weight:700;
  font-size:.76rem;letter-spacing:.16em;text-transform:uppercase;color:var(--red);
  border-bottom:2px solid var(--red);padding:4px 2px;
}

/* skeleton tickets */
.ticket.skel{pointer-events:none;animation-delay:calc(var(--i)*60ms)}
.ticket.skel .ph{background:var(--line-soft);position:relative;overflow:hidden}
.ticket.skel .ph:after{
  content:"";position:absolute;inset:0;
  background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.75) 50%,transparent 70%);
  animation:scan 1.1s infinite;
}
@keyframes scan{from{transform:translateX(-100%)}to{transform:translateX(100%)}}

/* stamp */
.stamp{
  position:absolute;top:50%;left:50%;z-index:5;pointer-events:none;
  font-family:var(--sign);font-size:1.9rem;letter-spacing:.16em;
  text-transform:uppercase;padding:10px 20px;border:4px double currentColor;border-radius:8px;
  transform:translate(-50%,-50%) rotate(-12deg) scale(2.4);opacity:0;
  animation:stamp .4s cubic-bezier(.2,1.3,.4,1) forwards;
  mix-blend-mode:multiply;background:rgba(255,255,255,.22);
}
.stamp.ok{color:var(--green-deep)}
.stamp.bad{color:var(--red)}
@keyframes stamp{55%{opacity:1}to{opacity:.93;transform:translate(-50%,-50%) rotate(-12deg) scale(1)}}
.ticket.done{transition:opacity .4s .7s, transform .4s .7s;opacity:0;transform:translateY(-10px) scale(.97)}

/* end-of-run slip */
.empty{margin:7vh 26px 0;display:none;animation:rise .5s both}
.slip{
  max-width:340px;margin:0 auto;background:var(--card);border:2px dashed var(--ink);
  padding:26px 22px 24px;text-align:center;position:relative;
}
.slip .allclear{
  display:inline-block;font-family:var(--sign);font-size:1.7rem;letter-spacing:.14em;
  text-transform:uppercase;color:var(--green-deep);border:4px double var(--green-deep);
  border-radius:8px;padding:7px 18px;transform:rotate(-7deg);
  animation:stamp .45s .25s cubic-bezier(.2,1.3,.4,1) both;mix-blend-mode:multiply;
}
.slip h2{
  font-family:var(--cond);font-weight:700;font-size:.74rem;letter-spacing:.3em;
  text-transform:uppercase;color:var(--ink-soft);margin:18px 0 4px;
}
.slip p{font-size:.85rem;color:var(--ink-soft);line-height:1.5}
.slip .tally{
  display:flex;margin:16px 0 4px;border-top:2px dashed var(--line);padding-top:14px;
}
.slip .tally div{flex:1}
.slip .tally .k{font-family:var(--cond);font-weight:700;font-size:.56rem;letter-spacing:.24em;text-transform:uppercase;color:var(--ink-soft)}
.slip .tally .v{font-family:var(--mono);font-weight:700;font-size:1.05rem;color:var(--green-deep);margin-top:3px}

/* cash bar */
#cashbar{
  position:fixed;left:0;right:0;bottom:0;z-index:40;
  display:none;align-items:center;gap:14px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));
  background:var(--ink);color:var(--paper);border-top:4px solid var(--green);
  background-image:linear-gradient(rgba(255,255,255,.05),transparent 45%);
}
#cashbar .k{font-family:var(--cond);font-weight:700;font-size:.6rem;letter-spacing:.28em;text-transform:uppercase;opacity:.7;line-height:1.2}
#cashbar .amt{font-family:var(--mono);font-weight:700;font-size:1.55rem;line-height:1.1;display:inline-block}
#cashbar .amt.pulse{animation:cashpulse .5s}
@keyframes cashpulse{45%{transform:scale(1.08);color:#fff}}
#cashbar .note{margin-left:auto;font-family:var(--cond);font-weight:600;font-size:.62rem;letter-spacing:.16em;text-transform:uppercase;text-align:right;opacity:.75;line-height:1.45;max-width:46%}
#cashbar.warn{border-top-color:var(--amber);background:#39280e}
#cashbar.over{border-top-color:var(--red);background:#3d130e}
#cashbar.over .note{opacity:1;color:#ffd9d2}

/* bottom sheet */
#backdrop{position:fixed;inset:0;background:rgba(27,31,25,.55);z-index:60;display:none}
#backdrop.show{display:block;animation:fade .2s}
@keyframes fade{from{opacity:0}}
#sheet{
  position:fixed;left:0;right:0;bottom:0;z-index:61;background:var(--card);
  border-top:3px solid var(--ink);padding:18px 18px calc(24px + env(safe-area-inset-bottom));
  transform:translateY(100%);transition:transform .28s cubic-bezier(.2,1,.3,1);
  background-image:linear-gradient(var(--card),var(--paper));
}
#sheet.show{transform:none}
#sheet .grip{width:46px;height:5px;background:var(--line);margin:0 auto 16px;border-radius:3px}
#sheet h3{font-family:var(--sign);font-size:1.5rem;text-transform:uppercase;letter-spacing:.05em}
#sheet .who{font-family:var(--mono);font-size:.78rem;font-weight:500;color:var(--ink-soft);margin-top:4px}
#sheet .bigcash{
  margin:16px 0;padding:15px;text-align:center;border:2px dashed var(--green-deep);
  background:var(--green-tint);
}
#sheet .bigcash .k{font-family:var(--cond);font-weight:700;font-size:.64rem;letter-spacing:.3em;text-transform:uppercase;color:var(--green-deep)}
#sheet .bigcash .v{font-family:var(--mono);font-weight:700;font-size:2.35rem;color:var(--green-deep);line-height:1.15}
#sheet textarea{
  width:100%;min-height:88px;border:2px solid var(--ink);background:var(--paper);
  font-family:var(--body);font-size:.95rem;padding:11px;margin:14px 0 4px;outline:none;border-radius:0;
}
#sheet textarea:focus{background:#fff;border-color:var(--red)}
#sheet .sheet-actions{display:flex;gap:10px;margin-top:12px}
#sheet .sheet-actions .ghost{
  flex:0 0 auto;padding:14px 16px;background:var(--card);border:2px solid var(--ink);
  font-family:var(--cond);font-weight:700;font-size:.84rem;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;
}
#sheet .sheet-actions .go{
  flex:1;padding:14px;border:2px solid var(--ink);cursor:pointer;color:#fff;
  font-family:var(--sign);font-size:1.06rem;letter-spacing:.12em;text-transform:uppercase;
  box-shadow:4px 4px 0 var(--ink);
}
#sheet .sheet-actions .go.ok{background:var(--green)}
#sheet .sheet-actions .go.bad{background:var(--red)}
#sheet .sheet-actions .go:active{transform:translate(4px,4px);box-shadow:none}
#sheet .sheet-actions .go[disabled]{opacity:.55}

@media (prefers-reduced-motion: reduce){
  *,*:before,*:after{animation-duration:.001s!important;animation-delay:0s!important;transition-duration:.001s!important}
}
</style>
</head>
<body>
<div class="tape"></div>

<section id="view-login">
  <div class="login-plate">
    <div class="punchrow"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <div class="login-inner">
      <h1>Rider<br>Run <span>Sheet</span></h1>
      <div class="login-meta"><span>Mindanao Fresh Hub · Tagum</span></div>
      <form id="login-form" autocomplete="off">
        <label class="fld f1"><span>Mobile number</span>
          <input id="in-phone" type="tel" inputmode="tel" placeholder="+63 9xx xxx xxxx" required>
        </label>
        <label class="fld f2"><span>PIN</span>
          <input id="in-pin" type="password" inputmode="numeric" placeholder="••••" required>
        </label>
        <button class="primary" id="btn-login" type="submit">Clock in</button>
      </form>
      <div class="login-or"><span>or</span></div>
      <a class="gbtn" href="/rider/auth/google/start"><span class="gmark">G</span>Sign in with Google</a>
      <div class="err" id="login-err"></div>
    </div>
    <div class="login-barcode"></div>
  </div>
  <div class="login-foot">Cash is traced per rider<br>Remit at the hub counter</div>
</section>

<section id="view-run">
  <header class="bar">
    <div class="plate">
      <div class="t">MFH <em>Run Sheet</em></div>
      <small id="rider-name">—</small>
    </div>
    <div class="dateplate" id="dateplate"><b>—</b>Tagum Hub</div>
    <button class="iconbtn" id="btn-refresh" type="button"><span class="gly">&#8635;</span></button>
    <button class="iconbtn" id="btn-logout" type="button">Out</button>
  </header>
  <div class="daystrip">
    <div class="cell"><div class="k">Stops left</div><div class="v" id="st-left">0</div></div>
    <div class="cell"><div class="k">Done today</div><div class="v" id="st-done">0</div></div>
    <div class="cell"><div class="k">Collected today</div><div class="v mono" id="st-cash">₱0.00</div></div>
  </div>
  <ol id="stops"></ol>
  <div class="empty" id="empty">
    <div class="slip">
      <div class="allclear">All clear ✓</div>
      <h2>End of run</h2>
      <p>No deliveries on your sheet. New stops appear when your batch goes out.</p>
      <div class="tally">
        <div><div class="k">Done today</div><div class="v" id="em-done">0</div></div>
        <div><div class="k">Collected</div><div class="v" id="em-cash">₱0.00</div></div>
      </div>
    </div>
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
  var state = { stops: [], summary: null, sheet: null, busy: false, shown: { cash: 0, out: 0 } };

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

  /* count-up animation for cash figures */
  function countTo(el, fromC, toC){
    fromC = Number(fromC || 0); toC = Number(toC || 0);
    if (fromC === toC) { el.textContent = peso(toC); return; }
    var t0 = null, DUR = 480;
    function tick(ts){
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / DUR);
      var ease = 1 - Math.pow(1 - p, 3);
      el.textContent = peso(Math.round(fromC + (toC - fromC) * ease));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
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
    var d = new Date();
    var label = d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });
    $('dateplate').innerHTML = '<b>' + esc(label.toUpperCase()) + '</b>Tagum Hub';
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

  function skeletons(){
    var list = $('stops');
    list.innerHTML = '';
    $('empty').style.display = 'none';
    for (var i = 0; i < 3; i++) {
      var li = document.createElement('li');
      li.className = 'ticket skel';
      li.style.setProperty('--i', String(i));
      li.innerHTML =
        '<div class="stub"><div class="ph" style="width:34px;height:40px;margin-top:4px"></div><div class="bc ph" style="margin-top:auto;margin-bottom:10px"></div></div>' +
        '<div class="tbody">' +
          '<div class="ph" style="height:22px;width:62%"></div>' +
          '<div class="ph" style="height:12px;width:84%;margin-top:10px"></div>' +
          '<div class="ph" style="height:42px;width:100%;margin-top:14px"></div>' +
          '<div class="ph" style="height:50px;width:100%;margin-top:13px"></div>' +
        '</div>';
      list.appendChild(li);
    }
  }

  function load(){
    $('btn-refresh').classList.add('busy');
    if (!state.stops.length) skeletons();
    Promise.all([ api('/rider/manifest'), api('/rider/summary') ]).then(function(out){
      state.stops = out[0].manifest || [];
      state.summary = out[1];
      render();
    }).catch(function(e){
      console.error(e);
      render();
    }).then(function(){ $('btn-refresh').classList.remove('busy'); });
  }

  function render(){
    var list = $('stops');
    list.innerHTML = '';
    var stops = state.stops;
    $('st-left').textContent = String(stops.length);
    if (state.summary) {
      var sm = state.summary;
      $('st-done').textContent = String(sm.today.delivered_count);
      countTo($('st-cash'), state.shown.cash, sm.today.collected_centavos);
      state.shown.cash = sm.today.collected_centavos;

      var amtEl = $('cb-amt');
      var grew = Number(sm.outstanding_centavos) > Number(state.shown.out);
      countTo(amtEl, state.shown.out, sm.outstanding_centavos);
      if (grew) {
        amtEl.classList.remove('pulse');
        void amtEl.offsetWidth;
        amtEl.classList.add('pulse');
      }
      state.shown.out = sm.outstanding_centavos;

      var bar = $('cashbar');
      bar.classList.remove('warn', 'over');
      var limit = Number(sm.limit_centavos || 0);
      var out = Number(sm.outstanding_centavos || 0);
      if (limit > 0 && out > limit) {
        bar.classList.add('over');
        $('cb-note').textContent = 'Over the ' + peso(limit) + ' limit — remit now';
      } else if (limit > 0 && out > limit * 0.8) {
        bar.classList.add('warn');
        $('cb-note').textContent = 'Near the ' + peso(limit) + ' limit — remit soon';
      } else {
        $('cb-note').textContent = 'Remit at the hub counter';
      }
      $('em-done').textContent = String(sm.today.delivered_count);
      $('em-cash').textContent = peso(sm.today.collected_centavos);
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

      var tag = document.createElement('div');
      tag.className = 'copytag';
      tag.textContent = 'Rider copy';
      li.appendChild(tag);

      var stub = document.createElement('div');
      stub.className = 'stub';
      stub.innerHTML = '<div class="n">' + (i + 1) + '</div><div class="lbl">Stop</div><div class="bc"></div>';
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
    $('sh-who').textContent = 'ORDER #' + (order.display_id != null ? order.display_id : '?') + ' · ' + name.toUpperCase();
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
      setTimeout(load, 1200);
    }).catch(function(e){
      closeSheet();
      alert(e.message);
    }).then(function(){
      state.busy = false;
      $('sh-go').disabled = false;
    });
  });

  /* ---------- google sign-in return ---------- */
  /* /rider/auth/google/callback redirects here with the rider token (or an
     error code) in the URL fragment, so it never reaches server logs. */
  function googleErrorMessage(code){
    var msgs = {
      not_configured: 'Google sign-in is not set up yet. Use mobile number + PIN.',
      denied: 'Google sign-in was cancelled.',
      state: 'Sign-in expired. Try again.',
      auth_failed: 'Google sign-in failed. Try again.',
      unverified_email: 'That Google email is not verified.',
      no_rider: 'No rider account uses that Google email. Ask your hub to add it.',
      rider_inactive: 'Your rider account is inactive. Contact your hub.',
      rider_suspended: 'Your rider account is suspended. Contact your hub.'
    };
    return msgs[code] || 'Google sign-in failed. Try again.';
  }
  function handleGoogleReturn(){
    var hash = (location.hash || '').replace(/^#/, '');
    if (!hash) return false;
    var params = {};
    hash.split('&').forEach(function(kv){
      var i = kv.indexOf('=');
      if (i > 0) {
        try { params[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); } catch (e) {}
      }
    });
    if (!params.rt && !params.gerror) return false;
    history.replaceState(null, '', location.pathname);
    if (params.rt) {
      localStorage.setItem(TOKEN_KEY, params.rt);
      showRun();
      load();
      api('/rider/me').then(function(out){
        localStorage.setItem(ME_KEY, JSON.stringify(out.rider));
        $('rider-name').textContent = out.rider.full_name || 'Rider';
      }).catch(function(){});
    } else {
      showLogin();
      var err = $('login-err');
      err.textContent = googleErrorMessage(params.gerror);
      err.classList.add('show');
    }
    return true;
  }

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
