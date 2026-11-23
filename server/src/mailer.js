// Envoi des mails (SMTP). Sans SMTP configuré, les mails sont écrits dans les logs (mode développement).
const nodemailer = require("nodemailer");
const { t } = require("./i18n");

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function layout(title, body, button, lang) {
  const btn = button ? `<p style="margin:28px 0"><a href="${esc(button.url)}" style="background:#6d5bd0;color:#fff;text-decoration:none;padding:13px 24px;border-radius:999px;font-weight:600;display:inline-block">${esc(button.label)}</a></p>
<p style="font-size:12px;color:#888">${t(lang, "m_copy")}<br><span style="word-break:break-all">${esc(button.url)}</span></p>` : "";
  return `<!doctype html><html lang="${lang}"><body style="margin:0;background:#f4f3f8;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#222">
<div style="max-width:520px;margin:0 auto;padding:32px 20px"><div style="background:#fff;border-radius:20px;padding:32px;box-shadow:0 4px 20px rgba(0,0,0,.06)">
<div style="font-size:20px;font-weight:700;margin-bottom:18px">📖 Novelia</div><h1 style="font-size:20px;margin:0 0 14px">${esc(title)}</h1>
<div style="font-size:15px;line-height:1.55">${body}</div>${btn}</div>
<p style="font-size:12px;color:#999;text-align:center;margin-top:18px">${t(lang, "m_footer")}</p></div></body></html>`;
}

function createMailer() {
  const { SMTP_HOST, SMTP_PORT = "465", SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;
  const from = MAIL_FROM || (SMTP_USER ? `Novelia <${SMTP_USER}>` : "Novelia <noreply@localhost>");
  const tx = SMTP_HOST && (!SMTP_USER || SMTP_PASS) ? nodemailer.createTransport({
    host: SMTP_HOST, port: +SMTP_PORT, secure: +SMTP_PORT === 465, requireTLS: +SMTP_PORT !== 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    tls: { minVersion: "TLSv1.2" }, connectionTimeout: 15000,
  }) : null;
  if (!tx) console.warn("[mail] SMTP non configuré : les mails seront affichés dans les logs");

  async function send(to, subject, title, body, button, lang = "fr") {
    const text = `${title}\n\n${body.replace(/<\/(p|li|ul)>|<br\s*\/?>/g, "\n").replace(/<li>/g, "• ").replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim()}\n${button ? `\n${button.label}\n${button.url}\n` : ""}`;
    if (!tx) { console.log(`[mail] → ${to} | ${subject}\n${text}`); return; }
    try { await tx.sendMail({ from, to, subject: `Novelia — ${subject}`, text, html: layout(title, body, button, lang) }); }
    catch (e) { console.error("[mail] échec d'envoi :", e.message); }
  }
  return { send, configured: !!tx, verify: () => tx?.verify() };
}
module.exports = { createMailer, esc };
