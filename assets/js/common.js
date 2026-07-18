// MESIP shared helpers + header/footer
const RISK_NAME = { 1: "低风险", 2: "中风险", 3: "高风险", 4: "极高风险" };
const CATEGORIES = [
  "武装冲突和军事行动", "恐怖主义和爆炸事件", "社会治安事件",
  "示威、罢工和社会动荡", "政治和政府动态", "交通、航空和出行风险",
  "能源和重要基础设施安全", "自然灾害和公共安全事件", "公共卫生风险",
  "涉及中国企业和公民", "其他安全信息",
];

// 中东重点国家（与 config/countries.json 保持一致；静态版与实时版共用）
const COUNTRIES = ["伊拉克","伊朗","以色列","巴勒斯坦","黎巴嫩","叙利亚","也门","沙特阿拉伯","科威特","阿联酋","卡塔尔","巴林","阿曼","约旦","土耳其","埃及"];

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

// 所有对外展示时间统一换算为北京时间（UTC+8）。
// 底层存储的 publish_time / ts 等均为 UTC；纯日期（如 2026-07-18）不转换，原样返回。
function fmtTimeBJ(s) {
  if (!s) return "";
  s = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // 纯日期不转换
  var m = s.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return String(s).replace("T", " ").replace("Z", "").slice(0, 16); // 兜底
  var Y = +m[1], Mo = +m[2] - 1, D = +m[3], h = +m[4], mi = +m[5], se = +(m[6] || 0);
  var ms = Date.UTC(Y, Mo, D, h, mi, se) + 8 * 3600 * 1000; // 视为 UTC，加 8 小时
  return new Date(ms).toISOString().slice(0, 19).replace("T", " "); // 北京时间墙钟
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
    <div class="meta">${flagTags(ev)} <span class="muted">${fmtTimeBJ(ev.publish_time)}</span></div>
  </a>`;
}

// ---- 专业机构分析专栏 helpers ----
const COPYRIGHT_STATUS = {
  allow_full: ["允许全文", "#1a7f37"], authorized: ["已授权", "#1a7f37"],
  open_license: ["开放许可", "#1a7f37"], public_domain: ["公共领域", "#1a7f37"],
  summary_only: ["仅摘要", "#b8860b"], link_only: ["仅链接", "#b8860b"],
  pending: ["待确认", "#a35a00"], forbidden: ["禁止转载", "#b71c1c"],
  paid: ["付费", "#b71c1c"], taken_down: ["已下架", "#888"],
};
const WQ1_REL = {
  direct: ["直接影响", "#b71c1c"], potential: ["潜在影响", "#e65100"],
  indirect: ["间接影响", "#b8860b"], none: ["暂无明显影响", "#888"],
};
function copyBadge(st) {
  const m = COPYRIGHT_STATUS[st] || ["未知", "#888"];
  return `<span class="badge" style="background:${m[1]};color:#fff;">${esc(m[0])}</span>`;
}
function wq1Badge(lv) {
  const m = WQ1_REL[lv] || ["-", "#888"];
  return `<span class="badge" style="background:${m[1]};color:#fff;">WQ1：${esc(m[0])}</span>`;
}
function proTypeBadge(r) {
  return r && r.content_type === "full"
    ? `<span class="badge" style="background:#1a7f37;color:#fff;">全文翻译</span>`
    : `<span class="badge" style="background:#2f6feb;color:#fff;">中文摘要</span>`;
}
function proCard(r) {
  const url = `pro_report.html?id=${r.id}`;
  return `<a class="panel ecard" href="${url}" style="text-decoration:none;color:inherit;">
    <div class="ttl">${esc(r.title_zh || r.title_orig || "")}</div>
    <div class="meta">
      <b>${esc(r.org || "")}</b>
      ${r.report_type ? `<span>${esc(r.report_type)}</span>` : ""}
      ${proTypeBadge(r)}
    </div>
    ${r.core_conclusion ? `<div class="sum">${esc(r.core_conclusion).slice(0, 160)}</div>` : ""}
    <div class="meta">
      ${copyBadge(r.copyright_status)}
      ${wq1Badge(r.wq1_relevance)}
      <span class="muted">${fmtTimeBJ(r.pub_date)}</span>
    </div>
  </a>`;
}

function renderHeader(active) {
  const nav = [
    ["index.html", "首页"], ["events.html", "最新事件"], ["iraq.html", "伊拉克专题"],
    ["countries.html", "国家"], ["pro_analysis.html", "专业机构分析"], ["reports.html", "日报"], ["admin.html", "后台"],
  ];
  const links = nav.map(([u, t]) => `<a href="${u}" class="${u.startsWith(active) ? "active" : ""}">${t}</a>`).join("");
  const bar = $( "#topbar" );
  if (bar) {
    bar.innerHTML = `<div class="top-row">
      <div class="brand"><b>中东地区社会安全信息平台</b><span>Middle East Security Information Platform</span></div>
      <div class="meta" id="topmeta">
        🕐 北京时间 <b id="clBJ">--:--:--</b>
        <span class="muted" id="updLine">更新（北京时间）：<b id="hdrUpdated">--</b></span>
      </div>
    </div>
    <nav class="navbar">${links}</nav>`;
  }
  tickClock();
  if (!window.__clockTimer__) {
    window.__clockTimer__ = setInterval(tickClock, 1000);
  }
}

function tickClock() {
  const bj = $("#clBJ");
  if (!bj) return;
  bj.textContent = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(11, 19);
}

function setUpdated(s) {
  const m = $("#hdrUpdated");
  if (m && s) m.textContent = s;
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
