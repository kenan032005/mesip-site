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

// 内容类型 A–G 徽章
const CONTENT_TYPES = {
  A: ["已发生安全事件", "#b71c1c"], B: ["正在发展事件", "#e65100"],
  C: ["安全预警", "#e65100"], D: ["政策运营动态", "#2f6feb"],
  E: ["专业分析", "#2f6feb"], F: ["观点评论", "#888"], G: ["背景资料", "#888"],
};
function contentTypeBadge(ct) {
  const x = CONTENT_TYPES[ct] || ["信息", "#888"];
  return `<span class="badge" style="background:${x[1]};color:#fff;">${esc(x[0])}</span>`;
}
// 信息可信度 A–D 徽章
const CRED_GRADES = {
  A: ["已确认", "#1a7f37"], B: ["较高可信度", "#2f6feb"],
  C: ["尚待核实", "#b8860b"], D: ["未经证实", "#b71c1c"],
};
function credBadge(g) {
  const x = CRED_GRADES[g] || ["-", "#888"];
  return `<span class="badge" style="background:${x[1]};color:#fff;">可信度：${esc(x[0])}</span>`;
}
function statusBadge(s) {
  const m = { occurred: ["已发生", "#555"], developing: ["正在发展", "#e65100"], warning: ["预警", "#b71c1c"] };
  const x = m[s];
  return x ? `<span class="tag">${esc(x[0])}</span>` : "";
}

function eventCard(ev, opts) {
  opts = opts || {};
  const url = `event.html?id=${ev.id}`;
  const ct = ev.content_type || "A";
  const isInfo = (ct === "D" || ct === "E" || ct === "F" || ct === "G");
  const risk = Number(ev.risk_level) || 0;
  const score = (ev.risk_score !== null && ev.risk_score !== undefined && ev.risk_score !== "") ? ev.risk_score : "";
  // 注意：不能用 <a> 标签，因为整个卡片已经是 <a>，嵌套 <a> 是无效 HTML 会导致排版错乱
  const riskTag = isInfo
    ? `<span class="badge risk-0" title="信息类内容，不赋予安全事件风险等级">信息类</span>`
    : `<span class="badge risk-${risk}" title="查看风险评级方法" onclick="event.preventDefault();event.stopPropagation();window.open('methodology.html#event','_blank')">${RISK_NAME[risk] || "低风险"}${score !== "" ? (" · " + score) : ""}</span>`;
  const srcCount = (ev.source_count ? ev.source_count : (ev.updates ? (Array.isArray(ev.updates) ? ev.updates.length : 1) : 1));
  return `<a class="panel ecard" href="${url}" style="text-decoration:none;color:inherit;display:block;">
    <div class="ttl">${esc(ev.title_zh || ev.title_original)}</div>
    <div class="meta">
      ${contentTypeBadge(ct)}
      ${riskTag}
      ${ev.country ? `<span>${esc(ev.country)}</span>` : ""}
      ${ev.city ? `<span>${esc(ev.city)}</span>` : ""}
      ${statusBadge(ev.event_status)}
    </div>
    ${ev.summary ? `<div class="sum">${esc(ev.summary).slice(0, 140)}</div>` : ""}
    <div class="meta">
      ${credBadge(ev.credibility_grade)}
      ${wq1Badge(ev.wq1_relevance)}
      ${flagTags(ev)}
      <span class="muted">${fmtTimeBJ(ev.publish_time || ev.event_time)}</span>
    </div>
  </a>`;
}

// ---- 国家/地区风险 7 维渲染 ----
const DIM_NAMES_ZH = {
  d1: "武装冲突及跨境军事", d2: "恐怖主义及非国家武装", d3: "政治稳定和社会动荡",
  d4: "犯罪、绑架及外国人员", d5: "交通能源及关键基建", d6: "政府治理医疗应急", d7: "外企中资油气暴露",
};
function trendBadge(t) {
  const m = { up: ["↑ 上升", "#b71c1c"], down: ["↓ 下降", "#1a7f37"], stable: ["→ 稳定", "#888"] };
  const x = m[t] || ["", "#888"];
  return `<span class="badge" style="background:${x[1]};color:#fff;">${x[0]}</span>`;
}
function dim7Bar(d, row) {
  const val = Number(row[d + "_score"]) || 0;
  const pct = Math.min(100, (val / 5) * 100);
  return `<div class="dim"><span class="dim-l">${DIM_NAMES_ZH[d]}</span>` +
    `<span class="dim-bar"><i style="width:${pct}%"></i></span>` +
    `<span class="dim-v">${val.toFixed(1)}/5</span></div>`;
}
function _parseDrivers(row) {
  let d = row.drivers;
  if (typeof d === "string") { try { d = JSON.parse(d); } catch (e) { d = []; } }
  return Array.isArray(d) ? d : [];
}
function countryRiskCard(row) {
  const lvl = Number(row.level) || 1;
  const total = row.total != null ? row.total : 0;
  const drivers = _parseDrivers(row);
  const regional = (row.scope && row.scope !== "全国");
  return `<div class="cr-card panel">
    <div class="cr-head">
      <b>${regional ? esc(row.scope) : "全国"}</b>
      ${riskBadge(lvl)} <b>评分 ${total}/100</b>
      ${trendBadge(row.trend)}
      <span class="muted small">Δ昨日 ${row.delta_1d != null ? row.delta_1d : 0} · Δ7日 ${row.delta_7d != null ? row.delta_7d : 0}</span>
    </div>
    <div class="dims">${["d1", "d2", "d3", "d4", "d5", "d6", "d7"].map(d => dim7Bar(d, row)).join("")}</div>
    ${drivers.length ? `<div class="cr-drivers"><b>主要驱动因素：</b>${drivers.map(x => esc(x.name)).join("、")}</div>` : ""}
  </div>`;
}
function countryRiskSection(riskRows, opts) {
  opts = opts || {};
  if (!riskRows || !riskRows.length) return `<div class="empty">暂未计算国家风险（将在下次采集后自动生成）。</div>`;
  const national = riskRows.filter(r => r.scope === "全国");
  const regions = riskRows.filter(r => r.scope && r.scope !== "全国");
  let h = national.map(countryRiskCard).join("");
  if (regions.length && !opts.nationalOnly) {
    h += `<h3 class="cr-sub">地区差异（巴士拉 / 巴格达 / 北部库区 / 西部边境）</h3>` +
      `<div class="grid cards">${regions.map(countryRiskCard).join("")}</div>`;
  }
  return h;
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
    ["countries.html", "国家"], ["pro_analysis.html", "专业机构分析"], ["reports.html", "日报"],
    ["methodology.html", "评级方法"], ["admin.html", "后台"],
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
