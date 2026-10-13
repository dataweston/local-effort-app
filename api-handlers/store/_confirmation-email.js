const SITE = 'https://www.localeffortfood.com';
const INSTAGRAM = 'https://www.instagram.com/localeffortfood/';
const CONTACT = 'yum@localeffortfood.com';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));
}

function buildPizzaCustomerConfirmationHtml({ imageUrl, customerName, items, subtotal, feeLabel, fee, total, fulfillment }) {
  const itemRows = items.map((item) => {
    const description = `${item.title}${item.optionSummary ? ` (${item.optionSummary})` : ''}`;
    return `<tr><td style="padding:12px 10px 12px 0;border-bottom:1px solid #e7e1d8">${escapeHtml(description)} × ${escapeHtml(item.qty)}</td><td style="padding:12px 0;border-bottom:1px solid #e7e1d8;text-align:right;white-space:nowrap">$${(item.unitPrice / 100).toFixed(2)} each</td></tr>`;
  }).join('');
  const feeRow = fee > 0
    ? `<tr><td style="padding:8px 0">${escapeHtml(feeLabel)}</td><td style="padding:8px 0;text-align:right">$${(fee / 100).toFixed(2)}</td></tr>`
    : '';
  const image = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" width="556" alt="Pizza on Smith order" style="display:block;width:100%;height:auto;margin:0 0 24px;border-radius:4px">`
    : '';

  return `<!doctype html><html><body style="margin:0;background:#f3ebe5;color:#24201c;font-family:Arial,sans-serif"><main style="max-width:600px;margin:auto;padding:28px 22px"><p style="font-size:18px;margin:0 0 22px"><strong>Local Effort</strong></p><section style="background:#fff;padding:24px;border-top:4px solid #8b4b31">${image}<p style="margin:0 0 8px;color:#8b4b31;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Pizza on Smith</p><h1 style="font-size:26px;font-weight:normal;margin:0 0 12px">Thanks for your order${customerName ? `, ${escapeHtml(customerName)}` : ''}.</h1><p style="line-height:1.6;margin:0 0 22px">We’ve received your order. Here are the items and fulfillment details for your records.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:14px"><tbody>${itemRows}<tr><td style="padding:12px 0 4px">Subtotal</td><td style="padding:12px 0 4px;text-align:right">$${(subtotal / 100).toFixed(2)}</td></tr>${feeRow}<tr><td style="padding:12px 0;border-top:1px solid #cfc4b9;font-size:16px"><strong>Total paid</strong></td><td style="padding:12px 0;border-top:1px solid #cfc4b9;text-align:right;font-size:16px"><strong>$${(total / 100).toFixed(2)}</strong></td></tr><tr><td colspan="2" style="padding:16px 0 0"><strong>Fulfillment</strong><div style="padding-top:6px;white-space:pre-line;line-height:1.6">${escapeHtml(fulfillment)}</div></td></tr></tbody></table><p style="margin:16px 0 0;color:#625b54;font-size:12px">Payment reference: {{paymentId}}</p></section><p style="line-height:1.6;margin:22px 0 0">Questions? Reply to this email or contact <a href="mailto:${CONTACT}" style="color:#8b4b31">${CONTACT}</a>.</p><p style="font-size:13px"><a href="${SITE}" style="color:#8b4b31">Website</a> &nbsp;·&nbsp; <a href="${INSTAGRAM}" style="color:#8b4b31">Instagram</a></p></main></body></html>`;
}

module.exports = { buildPizzaCustomerConfirmationHtml };
