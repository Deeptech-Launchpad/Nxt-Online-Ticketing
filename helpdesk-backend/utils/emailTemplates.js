/**
 * Email templates for ticket lifecycle notifications.
 *
 * Each function takes a plain ticket object (the shape returned by the
 * /api/tickets endpoints) and returns { subject, html, text } ready to pass
 * straight to mailer.sendMail().
 *
 * HTML is intentionally inline-styled (no external CSS) because most email
 * clients strip <style> blocks. Plain-text fallbacks are generated for
 * clients that can't render HTML (or anti-phishing tools).
 */

// Base public URL of the portal — used to build "View Ticket" buttons.
// Override via env (PORTAL_URL) for staging/local; defaults to prod.
const PORTAL_URL = (process.env.PORTAL_URL || 'https://tickets.altiusnxt.tech').replace(/\/+$/, '');

const RED = '#CC3A3A';
const NAVY = '#02172E';
const GREEN = '#16a34a';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(d) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return String(d);
  }
}

function priorityColor(p) {
  if (p === 'Very High' || p === 'High') return RED;
  if (p === 'Medium') return '#F59E0B';
  return GREEN;
}

/**
 * Shared HTML wrapper — keeps every email looking like part of the same
 * product (matches the AltiusNxt branding used in the OTP email).
 */
function wrap({ heading, intro, ticket, ctaLabel, ctaUrl, footer, extraSection }) {
  const pColor = priorityColor(ticket.priority);
  return `
<div style="font-family:Inter,Helvetica,Arial,sans-serif;background:#f5f6fa;padding:32px 16px;color:${NAVY};">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="background:${NAVY};padding:20px 28px;color:#fff;">
      <div style="font-size:13px;letter-spacing:1.5px;font-weight:700;color:#ff6b6b;text-transform:uppercase;">AltiusNxt</div>
      <div style="font-size:20px;font-weight:700;margin-top:4px;">${esc(heading)}</div>
    </div>
    <div style="padding:24px 28px;">
      <p style="margin:0 0 18px;color:#475569;font-size:14px;line-height:1.5;">${intro}</p>

      <table style="width:100%;border-collapse:collapse;font-size:13.5px;background:#f8fafc;border-radius:10px;overflow:hidden;">
        <tr><td style="padding:10px 14px;width:130px;color:#64748b;font-weight:600;">Ticket ID</td>
            <td style="padding:10px 14px;font-family:'DM Mono',monospace;color:${RED};font-weight:700;">${esc(ticket.id)}</td></tr>
        <tr><td style="padding:10px 14px;color:#64748b;font-weight:600;border-top:1px solid #e2e8f0;">Subject</td>
            <td style="padding:10px 14px;color:${NAVY};font-weight:600;border-top:1px solid #e2e8f0;">${esc(ticket.subject)}</td></tr>
        <tr><td style="padding:10px 14px;color:#64748b;font-weight:600;border-top:1px solid #e2e8f0;">Category</td>
            <td style="padding:10px 14px;color:${NAVY};border-top:1px solid #e2e8f0;">${esc(ticket.category || '-')}</td></tr>
        <tr><td style="padding:10px 14px;color:#64748b;font-weight:600;border-top:1px solid #e2e8f0;">Priority</td>
            <td style="padding:10px 14px;border-top:1px solid #e2e8f0;">
              <span style="background:${pColor}1a;color:${pColor};padding:2px 10px;border-radius:8px;font-weight:700;font-size:12px;">${esc(ticket.priority || 'Medium')}</span>
            </td></tr>
        <tr><td style="padding:10px 14px;color:#64748b;font-weight:600;border-top:1px solid #e2e8f0;">Raised By</td>
            <td style="padding:10px 14px;color:${NAVY};border-top:1px solid #e2e8f0;">${esc(ticket.employee_name || '-')}</td></tr>
        <tr><td style="padding:10px 14px;color:#64748b;font-weight:600;border-top:1px solid #e2e8f0;">Raised At</td>
            <td style="padding:10px 14px;color:${NAVY};border-top:1px solid #e2e8f0;">${esc(fmtDate(ticket.created_at))}</td></tr>
      </table>

      ${ticket.description ? `
        <div style="margin-top:18px;">
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Description</div>
          <div style="background:#fafafa;border-left:3px solid ${RED};padding:12px 14px;font-size:13px;color:${NAVY};border-radius:0 6px 6px 0;white-space:pre-wrap;">${esc(ticket.description)}</div>
        </div>` : ''}

      ${extraSection || ''}

      ${ctaUrl ? `
        <div style="margin-top:24px;text-align:center;">
          <a href="${esc(ctaUrl)}" style="display:inline-block;background:${RED};color:#fff;text-decoration:none;padding:11px 26px;border-radius:8px;font-weight:700;font-size:14px;">${esc(ctaLabel || 'View Ticket')}</a>
        </div>` : ''}

      <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">${footer || 'This is an automated message from the AltiusNxt IT Helpdesk. Do not reply to this email.'}</p>
    </div>
  </div>
</div>`;
}

/** Plain-text rendering used as fallback for non-HTML email clients. */
function plain({ heading, intro, ticket, ctaLabel, ctaUrl, footer, extra }) {
  const lines = [];
  lines.push(heading);
  lines.push('');
  lines.push(intro.replace(/<[^>]+>/g, ''));
  lines.push('');
  lines.push(`  Ticket ID:  ${ticket.id}`);
  lines.push(`  Subject:    ${ticket.subject}`);
  lines.push(`  Category:   ${ticket.category || '-'}`);
  lines.push(`  Priority:   ${ticket.priority || 'Medium'}`);
  lines.push(`  Raised by:  ${ticket.employee_name || '-'}`);
  lines.push(`  Raised at:  ${fmtDate(ticket.created_at)}`);
  if (ticket.description) {
    lines.push('');
    lines.push('Description:');
    lines.push(ticket.description);
  }
  if (extra) {
    lines.push('');
    lines.push(extra);
  }
  if (ctaUrl) {
    lines.push('');
    lines.push(`${ctaLabel || 'View ticket'}: ${ctaUrl}`);
  }
  lines.push('');
  lines.push('— AltiusNxt IT Helpdesk');
  if (footer) {
    lines.push('');
    lines.push(footer.replace(/<[^>]+>/g, ''));
  }
  return lines.join('\n');
}

// ────────────────────────────────────────────────────────────────
// Template 1 — New ticket → notify admin
// ────────────────────────────────────────────────────────────────
function newTicketForAdmin(ticket) {
  const intro = `<strong>${esc(ticket.employee_name || 'An employee')}</strong> has raised a new support ticket. Please review and respond at the earliest.`;
  const ctaUrl = `${PORTAL_URL}/admin/tickets/${encodeURIComponent(ticket.id)}`;
  return {
    subject: `[Helpdesk] New ticket ${ticket.id} — ${ticket.subject}`,
    html: wrap({
      heading: 'New Ticket Received',
      intro,
      ticket,
      ctaLabel: 'Open in Admin Panel',
      ctaUrl,
    }),
    text: plain({
      heading: 'New Ticket Received',
      intro: `${ticket.employee_name || 'An employee'} has raised a new support ticket.`,
      ticket,
      ctaLabel: 'Open in admin panel',
      ctaUrl,
    }),
  };
}

// ────────────────────────────────────────────────────────────────
// Template 2 — New ticket → confirm to user
// ────────────────────────────────────────────────────────────────
function newTicketForUser(ticket) {
  const intro = `Hi ${esc((ticket.employee_name || '').split(' ')[0] || 'there')}, we've received your support request. Our IT team has been notified and will get back to you shortly.`;
  const ctaUrl = `${PORTAL_URL}/dashboard`;
  return {
    subject: `We've received your ticket ${ticket.id}`,
    html: wrap({
      heading: 'Your Ticket Was Received',
      intro,
      ticket,
      ctaLabel: 'Track Status',
      ctaUrl,
      footer: 'You will receive another email once your ticket is resolved. You can also track status anytime in the portal.',
    }),
    text: plain({
      heading: 'Your Ticket Was Received',
      intro: `Hi ${(ticket.employee_name || '').split(' ')[0] || 'there'}, we've received your support request. Our IT team has been notified and will get back to you shortly.`,
      ticket,
      ctaLabel: 'Track status',
      ctaUrl,
      footer: 'You will receive another email once your ticket is resolved.',
    }),
  };
}

// ────────────────────────────────────────────────────────────────
// Template 3 — Resolved → notify admin (record-keeping copy)
// ────────────────────────────────────────────────────────────────
function resolvedTicketForAdmin(ticket) {
  const resolvedBy = ticket.assigned_to || 'Admin';
  const intro = `Ticket <strong>${esc(ticket.id)}</strong> has been marked as resolved by <strong>${esc(resolvedBy)}</strong>.`;
  const ctaUrl = `${PORTAL_URL}/admin/tickets/${encodeURIComponent(ticket.id)}`;
  const extraSection = ticket.resolution_note ? `
    <div style="margin-top:18px;">
      <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Action Taken</div>
      <div style="background:#f0fdf4;border-left:3px solid ${GREEN};padding:12px 14px;font-size:13px;color:${NAVY};border-radius:0 6px 6px 0;white-space:pre-wrap;">${esc(ticket.resolution_note)}</div>
    </div>` : '';
  return {
    subject: `[Helpdesk] Ticket ${ticket.id} resolved — ${ticket.subject}`,
    html: wrap({
      heading: 'Ticket Resolved',
      intro,
      ticket,
      extraSection,
      ctaLabel: 'View Ticket',
      ctaUrl,
    }),
    text: plain({
      heading: 'Ticket Resolved',
      intro: `Ticket ${ticket.id} has been marked as resolved by ${resolvedBy}.`,
      ticket,
      extra: ticket.resolution_note ? `Action taken:\n${ticket.resolution_note}` : null,
      ctaLabel: 'View ticket',
      ctaUrl,
    }),
  };
}

// ────────────────────────────────────────────────────────────────
// Template 4 — Resolved → notify user with action-taken note
// ────────────────────────────────────────────────────────────────
function resolvedTicketForUser(ticket) {
  const intro = `Hi ${esc((ticket.employee_name || '').split(' ')[0] || 'there')}, your ticket has been resolved. The action taken by our IT team is shown below. Please confirm the issue is fixed — if not, you can reopen the ticket from the portal.`;
  const ctaUrl = `${PORTAL_URL}/history`;
  const extraSection = ticket.resolution_note ? `
    <div style="margin-top:18px;">
      <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Action Taken</div>
      <div style="background:#f0fdf4;border-left:3px solid ${GREEN};padding:12px 14px;font-size:13px;color:${NAVY};border-radius:0 6px 6px 0;white-space:pre-wrap;">${esc(ticket.resolution_note)}</div>
    </div>` : '';
  return {
    subject: `Your ticket ${ticket.id} has been resolved`,
    html: wrap({
      heading: 'Your Ticket Was Resolved',
      intro,
      ticket,
      extraSection,
      ctaLabel: 'View Ticket',
      ctaUrl,
      footer: 'If the issue is not actually resolved, open the ticket in the portal and click Reopen.',
    }),
    text: plain({
      heading: 'Your Ticket Was Resolved',
      intro: `Hi ${(ticket.employee_name || '').split(' ')[0] || 'there'}, your ticket has been resolved. Please confirm the issue is fixed — if not, reopen the ticket from the portal.`,
      ticket,
      extra: ticket.resolution_note ? `Action taken:\n${ticket.resolution_note}` : null,
      ctaLabel: 'View ticket',
      ctaUrl,
      footer: 'If the issue is not actually resolved, click Reopen in the portal.',
    }),
  };
}

module.exports = {
  newTicketForAdmin,
  newTicketForUser,
  resolvedTicketForAdmin,
  resolvedTicketForUser,
};
