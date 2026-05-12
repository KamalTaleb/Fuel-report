const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const {
  SUPABASE_URL, SUPABASE_SERVICE_KEY,
  GMAIL_USER, GMAIL_APP_PASSWORD, REPORT_EMAIL_TO
} = process.env;

function todayStr() { return new Date().toISOString().slice(0,10); }

function prettyDate(d) {
  return d.toLocaleDateString('en-GB', {weekday:'long',year:'numeric',month:'long',day:'numeric'});
}

function buildHTML(entries, dateObj) {
  const date     = prettyDate(dateObj);
  const followed = entries.filter(e=>e.trip_status==='followed').length;
  const skipped  = entries.filter(e=>e.trip_status==='skipped').length;
  const pending  = entries.filter(e=>!e.monitor_status).length;

  if (!entries.length) return `<html><body style="font-family:Arial;padding:24px">
    <h2 style="color:#f0a500">🚛 Fleet Daily Report — ${date}</h2>
    <p style="color:#666;margin-top:12px">No entries were recorded today.</p>
  </body></html>`;

  const rows = entries.map((e,i) => {
    const stops  = (e.skipped_stops||[]).join(', ')||'—';
    const mColor = e.monitor_status==='confirmed'?'#16a34a':e.monitor_status==='flagged'?'#dc2626':'#999';
    const time   = new Date(e.created_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
    return `<tr>
      <td>${entries.length-i}</td>
      <td style="font-weight:800;color:#92400e">${e.truck_number}</td>
      <td>${e.driver_name||'—'}</td>
      <td style="color:${e.trip_status==='followed'?'#16a34a':'#dc2626'};font-weight:700">${e.trip_status==='followed'?'✓ Followed':'✗ Skipped'}</td>
      <td style="color:#b45309;font-weight:700">${stops}</td>
      <td style="color:#444">${e.skip_reason||'—'}</td>
      <td style="color:${mColor};font-weight:700">${e.monitor_status||'Pending'}</td>
      <td style="color:#444">${e.monitor_notes||'—'}</td>
      <td style="color:#999">${time}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body{font-family:Arial;padding:24px;color:#111;font-size:11px}
    .hdr{display:flex;justify-content:space-between;border-bottom:3px solid #f0a500;padding-bottom:12px;margin-bottom:16px}
    .logo{font-size:20px;font-weight:900;text-transform:uppercase}
    .logo span{color:#f0a500}
    .stats{display:flex;gap:12px;margin-bottom:16px}
    .st{flex:1;border:1px solid #e0e0e0;border-radius:6px;padding:8px 12px;text-align:center;background:#fafafa}
    .st b{display:block;font-size:20px;font-weight:900}
    .st s{font-size:9px;text-transform:uppercase;color:#888;font-style:normal;display:block;margin-top:2px}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{background:#1c2030;color:#fff;font-size:9px;letter-spacing:1px;padding:7px 9px;text-align:left;text-transform:uppercase}
    td{padding:7px 9px;bord
