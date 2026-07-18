// MESIP shared API client
// 显式挂到 window.API：静态版 bootstrap 通过 window.API 覆盖 get/post。
// 若用 const/let，则是全局词法绑定而非 window 属性，覆盖会失效，
// 页面仍调用原始 fetch 版（无后端时失败）→ 空白页。window.API 在经典脚本中等同于全局 API。
window.API = {
  async get(path) {
    const r = await fetch(path, { credentials: "same-origin" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  },
  async post(path, body) {
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  },
};
