// MESIP shared helpers + header/footer
const RISK_NAME = { 1: "低风险", 2: "中风险", 3: "高风险", 4: "极高风险" };
// 分类体系：一律以英文 category_code 为权威键，zh 仅作展示。
// 任何筛选 / 分桶都必须使用 code，不得用中文名做精确比较。
const CATEGORY_LIST = [
  { code: "armed_conflict", zh: "武装冲突与军事行动" },
  { code: "terrorism", zh: "恐怖主义与爆炸事件" },
  { code: "public_security", zh: "社会治安" },
  { code: "protest_social_stability", zh: "示威与社会稳定" },
  { code: "politics_governance", zh: "政治与政府政策" },
  { code: "airspace_transport", zh: "领空与交通" },
  { code: "energy_infrastructure", zh: "能源与重要基础设施" },
  { code: "natural_disaster", zh: "自然灾害与公共安全" },
  { code: "public_health", zh: "公共卫生风险" },
  { code: "china_related", zh: "涉及中国企业和公民" },
  { code: "diplomacy_regional_relations", zh: "外交及地区关系" },
  { code: "other", zh: "其他安全信息" },
];
// 向后兼容别名（部分旧页面仍按 CATEGORIES 引用，这里给出 code 数组）
const CATEGORIES = CATEGORY_LIST.map(x => x.code);

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
  return fmtTimeBJ(s);
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

  // 风险等级标签（信息类不显示风险等级）
  const riskLabel = isInfo ? "" : `<span class="ec-risk ec-risk-${risk}">${RISK_NAME[risk] || "低风险"}</span>`;

  // Tags: 只保留与新闻直接相关的地区/主题/业务领域，最多4个
  const tags = _buildEventTags(ev);

  // 时间：格式化为 "MM-DD HH:mm"
  const timeStr = _cardTime(ev.publish_time || ev.event_time);
  const timeEl = timeStr ? `<span class="ec-time">${timeStr}</span>` : "";

  const tagLine = (riskLabel + tags || timeEl) ? `<div class="ec-tags">${riskLabel}${tags}${timeEl}</div>` : "";

  return `<a class="panel ecard" href="${url}">
    <div class="ec-title">${esc(ev.title_zh || ev.title_original)}</div>
    ${ev.summary ? `<div class="ec-summary">${esc(ev.summary).slice(0, 120)}</div>` : ""}
    ${tagLine}
  </a>`;
}

/** 卡片内时间格式化：先转北京时间，再只显示月-日 时:分 */
function _cardTime(s) {
  if (!s) return "";
  const bj = fmtTimeBJ(s);
  if (!bj) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(bj)) return bj.slice(5); // "07-19"
  var m = bj.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/);
  if (m) return m[2] + "-" + m[3] + " " + m[4] + ":" + m[5]; // "07-19 14:30"
  return "";
}

/**
 * 为事件卡片构建语义化Tags（最多4个）。
 * 仅包含：国家/地区、主题关键词、业务领域。
 * 排除：状态/可信度/WQ1/内容类型等管理字段。
 */
function _buildEventTags(ev) {
  const tags = [];
  const seen = new Set();

  function add(text) {
    if (!text || seen.has(text)) return;
    if (tags.length >= 4) return;
    seen.add(text);
    tags.push(`<span class="ec-tag">${esc(text)}</span>`);
  }

  // 国家
  if (ev.country) add(ev.country);
  // 城市（仅当与国家不同时）
  if (ev.city && ev.city !== ev.country) add(ev.city);

  // 业务领域关键词（从分类和影响标记提取）
  if (ev.affects_energy) add("能源安全");
  if ((ev.category_code || ev.category) === "airspace_transport" || ev.affects_airport) {
    add("航空安全");
  }
  if (ev.affects_road || ev.affects_port) add("交通运输");
  if (ev.involves_china_company || ev.involves_china_citizen) add("涉华");

  return tags.join("");
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
function countryRiskCard(row, countryName) {
  const lvl = Number(row.level) || 1;
  const total = row.total != null ? row.total : 0;
  const drivers = _parseDrivers(row);
  const regional = (row.scope && row.scope !== "全国");
  const title = regional ? esc(row.scope) : esc(countryName || "全国");
  return `<div class="cr-card panel">
    <div class="cr-head">
      <b>${title}</b>
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
  const countryName = opts.countryName || "";
  let h = national.map(r => countryRiskCard(r, countryName)).join("");
  if (regions.length && !opts.nationalOnly) {
    h += `<h3 class="cr-sub">地区差异（巴士拉 / 巴格达 / 北部库区 / 西部边境）</h3>` +
      `<div class="grid cards">${regions.map(r => countryRiskCard(r, countryName)).join("")}</div>`;
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
    ["methodology.html", "评级方法"], ["monitor.html", "监控"], ["admin.html", "后台"],
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
