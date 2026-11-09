import { Resend } from "resend";
import { env } from "../config.js";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function shell(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Montserrat,Segoe UI,Arial,sans-serif;color:#0b1220">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e6e9ee">
    <div style="background:#0b1220;padding:20px 28px;color:#fff;font-weight:700;letter-spacing:.3px">KOL Wire Mesh MFG Ltd</div>
    <div style="padding:28px"><h2 style="margin:0 0 12px;font-size:18px">${esc(title)}</h2>${body}</div>
    <div style="padding:16px 28px;color:#6b7280;font-size:12px;border-top:1px solid #e6e9ee">This message was sent from kolmesh.com</div>
  </div></body></html>`;
}

const row = (k: string, v: string) =>
  `<tr><td style="padding:6px 0;color:#6b7280;width:140px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0">${esc(v)}</td></tr>`;

export async function notifyNewEnquiry(e: {
  reference: string;
  type: "quote" | "contact";
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  location?: string | null;
  message: string;
  items?: { productName: string; variant?: string | null; quantity: number; note?: string | null }[];
}) {
  if (!resend) return;
  const items =
    e.items?.length
      ? `<h3 style="font-size:14px;margin:20px 0 8px">Requested items</h3><ul style="padding-left:18px;margin:0">${e.items
          .map((i) => `<li>${esc(i.productName)}${i.variant ? ` — ${esc(i.variant)}` : ""} × ${i.quantity}${i.note ? ` <em>(${esc(i.note)})</em>` : ""}</li>`)
          .join("")}</ul>`
      : "";
  const html = shell(
    `${e.type === "quote" ? "New quote request" : "New message"} · ${e.reference}`,
    `<table style="border-collapse:collapse;width:100%;font-size:14px">${row("Name", e.name)}${row("Email", e.email)}${
      e.phone ? row("Phone", e.phone) : ""
    }${e.company ? row("Company", e.company) : ""}${e.location ? row("Location", e.location) : ""}</table>
     <p style="white-space:pre-wrap;background:#f7f8fa;padding:14px;border-radius:10px;font-size:14px">${esc(e.message)}</p>${items}
     <p style="margin-top:20px"><a href="${env.WEB_URL}/admin/enquiries" style="background:#196ba3;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600">Open in dashboard</a></p>`,
  );
  await resend.emails.send({
    from: env.MAIL_FROM,
    to: env.MAIL_TO,
    replyTo: e.email,
    subject: `[${e.reference}] ${e.type === "quote" ? "Quote request" : "Contact"} from ${e.name}`,
    html,
  });

  // Customer acknowledgement
  await resend.emails.send({
    from: env.MAIL_FROM,
    to: e.email,
    subject: `We received your ${e.type === "quote" ? "quote request" : "message"} · ${e.reference}`,
    html: shell(
      `Thank you, ${e.name.split(" ")[0]}`,
      `<p style="font-size:14px;line-height:1.6">We've received your ${
        e.type === "quote" ? "quote request" : "message"
      } and our team will respond within one business day. Your reference is <strong>${esc(e.reference)}</strong>.</p>
       ${items}<p style="font-size:14px;color:#6b7280">Need it faster? Call us on +233 54 794 6199.</p>`,
    ),
  });
}

export async function sendAdminInvite(to: string, name: string, tempPassword: string) {
  if (!resend) {
    console.log(`[mail disabled] Invite for ${to}: temporary password ${tempPassword}`);
    return;
  }
  await resend.emails.send({
    from: env.MAIL_FROM,
    to,
    subject: "Your KOL Wire Mesh admin account",
    html: shell(
      `Welcome, ${name}`,
      `<p style="font-size:14px;line-height:1.6">An administrator account has been created for you.</p>
       <table style="font-size:14px">${row("Login", `${env.WEB_URL}/admin/login`)}${row("Email", to)}${row("Temporary password", tempPassword)}</table>
       <p style="font-size:14px">You'll be asked to set a new password and enable two-factor authentication on first login.</p>`,
    ),
  });
}
