// MESIP shared helpers + header/footer
const RISK_NAME = { 1: "低风险", 2: "中风险", 3: "高风险", 4: "极高风险" };
const CATEGORIES = [
  "武装冲突和军事行动", "恐怖主义和爆炸事件", "社会治安事件",
  "示威、罢工和社会动荡", "政治和政府动态", "交通、航空和出行风险",
  "能源和重要基础设施安全", "自然灾害和公共安全事件", "公共卫生风险",
  "涉及中国企业和公民", "其他安全信息",
];

function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

function esc(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function riskBadge(risk) {
  const r = Number(risk) || 1;
  return `<span class="badge risk-${r}">${RISK_NAME[r] || "低风险"}</span>`;
}

function flagTags(ev) {
  let t = "";
  if (ev.involves_china_company || ev.involves_china_citizen) t += `<span class="tag china">涉华</span>`;
  if (ev.affects_energy) t += `<span class="tag energy">能源</span>`;
  if (ev.affects_airport || ev.affects_road) t += `<span class="tag transport">交通</span>`;
  return t;
}

function fmtTime(s) {
  if (!s) return "";
  return String(s).replace("T", " ").replace("Z", "").slice(0, 16);
}

function eventCard(ev, opts) {
  opts = opts || {};
  const url = `event.html?id=${ev.id}`;
  return `<a class="panel ecard" href="${url}" style="text-decoration:none;color:inherit;">
    <div class="ttl">${esc(ev.title_zh || ev.title_original)}</div>
    <div class="meta">
      ${riskBadge(ev.risk_level)}
      <span>${esc(ev.country || "")}</span>
      ${ev.city ? `<span>${esc(ev.city)}</span>` : ""}
      <span>${esc(ev.category || "")}</span>
    </div>
    ${ev.summary ? `<div class="sum">${esc(ev.summary).slice(0, 140)}</div>` : ""}
    <div class="meta">${flagTags(ev)} <span class="muted">${fmtTime(ev.publish_time)}</span></div>
  </a>`;
}

function renderHeader(active) {
  const nav = [
    ["index.html", "首页"], ["events.html", "最新事件"], ["iraq.html", "伊拉克专题"],
    ["reports.html", "日报"], ["country.html?c=伊拉克", "国家"], ["admin.html", "后台"],
  ];
  const links = nav.map(([u, t]) => `<a href="${u}" class="${u.startsWith(active) ? "active" : ""}">${t}</a>`).join("");
  const bar = $( "#topbar" );
  if (bar) {
    bar.innerHTML = `<div class="inner">
      <div class="brand"><b>中东地区社会安全信息平台</b><span>Middle East Security Information Platform</span></div>
      <nav class="nav">${links}</nav>
      <div class="meta" id="topmeta">伊拉克时间 <b id="cl">--:--</b><br><span class="muted">最后更新 --</span></div>
    </div>`;
  }
  tickClock();
}

function tickClock() {
  const el = $("#cl");
  if (!el) return;
  const now = new Date(Date.now() + 3 * 3600 * 1000);
  el.textContent = now.toISOString().slice(11, 16);
}

function setUpdated(s) {
  const m = $("#topmeta .muted");
  if (m && s) m.textContent = "最后更新 " + s;
}

function toast(msg) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2600);
}

function getQS(name) {
  return new URLSearchParams(location.search).get(name);
}

// footer
document.addEventListener("DOMContentLoaded", () => {
  const f = document.querySelector("footer.site");
  if (f) f.innerHTML = "中东地区社会安全信息平台 · 第一阶段可运行基础版 · 数据来源于公开信息，仅供参考，不构成行动依据";
});
