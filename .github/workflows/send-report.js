const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const ws = require('ws');

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, GMAIL_USER, GMAIL_APP_PASSWORD, REPORT_EMAIL_TO } = process.env;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function prettyDate(d) {
  return d.toLocaleDateString('en-GB', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

function buildHTML(entries, dateObj) {
  var date = prettyDate(dateObj);
  var followed = entries.filter(function(e){ return e.trip_status==='followed'; }).length;
  var skipped  = entries.filter(function(e){ return e.trip_status==='skipped';  }).length;
  var pending  = entries.filter(function(e){ return !e.monitor_status; }).length;

  if (!entries.length) {
    return '<html><body style="font-family:Arial;padding:24px"><h2>Fleet Daily Report - ' + date + '</h2><p>No entries recorded today.</p></body></html>';
  }

  var rows = '';
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    var stops = (e.skipped_stops || []).join(', ') || '-';
    var mColor = e.monitor_status==='confirmed' ? '#16a34a' : e.monitor_status==='flagged' ? '#dc2626' : '#999';
    var time = new Date(e.created_at).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});
    var sColor = e.trip_status==='followed' ? '#16a34a' : '#dc2626';
    var sText  = e.trip_status==='followed' ? 'Followed' : 'Skipped';
    rows += '<tr><td>' + (entries.length-i) + '</td>';
    rows += '<td style="font-weight:800;color:#92400e">' + e.truck_number + '</td>';
    rows += '<td>' + (e.driver_name||'-') + '</td>';
    rows += '<td style="color:' + sColor + ';font-weight:700">' + sText + '</td>';
    rows += '<td style="color:#b45309;font-weight:700">' + stops + '</td>';
    rows += '<td>' + (e.skip_reason||'-') + '</td>';
    rows += '<td style="color:' + mColor + ';font-weight:700">' + (e.monitor_status||'Pending') + '</td>';
    rows += '<td>' + (e.monitor_notes||'-') + '</td>';
    rows += '<td style="color:#999">' + time + '</td></tr>';
  }

  var css = 'body{font-family:Arial;padding:24px;color:#111;font-size:11px}';
  css += '.hdr{display:flex;justify-content:space-between;border-bottom:3px solid #f0a500;padding-bottom:12px;margin-bottom:16px}';
  css += '.logo{font-size:20px;font-weight:900;text-transform:uppercase}';
  css += '.stats{display:flex;gap:12px;margin-bottom:16px}';
  css += '.st{flex:1;border:1px solid #e0e0e0;border-radius:6px;padding:8px 12px;text-align:center;background:#fafafa}';
  css += '.st b{display:block;font-size:20px;font-weight:900}';
  css += 'table{width:100%;border-collapse:collapse;font-size:11px}';
  css += 'th{background:#1c2030;color:#fff;font-size:9px;padding:7px 9px;text-align:left;text-transform:uppercase}';
  css += 'td{padding:7px 9px;border-bottom:1px solid #eee}';
  css += 'tr:nth-child(even) td{background:#f9f9f9}';

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' + css + '</style></head><body>';
  html += '<div class="hdr"><div class="logo">Fleet Daily Report</div>';
  html += '<div style="font-size:10px;color:#777">' + date + '</div></div>';
  html += '<div class="stats">';
  html += '<div class="st"><b>' + entries.length + '</b>Total</div>';
  html += '<div class="st"><b style="color:#16a34a">' + followed + '</b>Followed</div>';
  html += '<div class="st"><b style="color:#dc2626">' + skipped + '</b>Skipped</div>';
  html += '<div class="st"><b style="color:#999">' + pending + '</b>Pending</div>';
  html += '</div>';
  html += '<table><thead><tr>';
  html += '<th>#</th><th>Truck</th><th>Driver</th><th>Status</th>';
  html += '<th>Skipped Stops</th><th>Reason</th><th>Monitor</th><th>Notes</th><th>Time</th>';
  html += '</tr></thead><tbody>' + rows + '</tbody></table></body></html>';
  return html;
}

async function main() {
  console.log('=== Fleet Daily Report Job ===');
  var today = todayStr();
  console.log('Date:', today);

  var db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    global: { WebSocket: ws }
  });

  var result = await db
    .from('fleet_entries')
    .select('*')
    .eq('report_date', today)
    .order('created_at', { ascending: false });

  if (result.error) {
    console.error('Fetch failed:', result.error.message);
    process.exit(1);
  }

  var entries = result.data;
  console.log('Fetched', entries.length, 'entries');

  var html = buildHTML(entries, new Date());

  var transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
  });

  await transporter.sendMail({
    from: '"Fleet Report Bot" <' + GMAIL_USER + '>',
    to: REPORT_EMAIL_TO,
    subject: 'Fleet Daily Report - ' + prettyDate(new Date()),
    html: html,
    attachments: [{
      filename: 'fleet_report_' + today + '.html',
      content: html,
      contentType: 'text/html'
    }]
  });

  console.log('Email sent to', REPORT_EMAIL_TO);

  if (entries.length > 0) {
    var del = await db.from('fleet_entries').delete().eq('report_date', today);
    if (del.error) {
      console.error('Delete failed:', del.error.message);
      process.exit(1);
    }
    console.log('Deleted', entries.length, 'entries');
  }

  console.log('=== Done ===');
}

main().catch(function(err) {
  console.error('Error:', err.message);
  process.exit(1);
});
