import { format } from 'date-fns';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildTrendLabel(trend) {
  if (!trend || trend.percent == null) return '-';
  if (trend.direction === 'up') return `+${trend.percent}%`;
  if (trend.direction === 'down') return `${trend.percent}%`;
  return `${trend.percent}%`;
}

function getTrendTone(trend) {
  if (!trend || trend.percent == null || trend.direction === 'start') {
    return {
      bg: '#eef2f7',
      color: '#64748b',
    };
  }

  if (trend.direction === 'up') {
    return {
      bg: '#fef2f2',
      color: '#dc2626',
    };
  }

  if (trend.direction === 'down') {
    return {
      bg: '#ecfdf3',
      color: '#16a34a',
    };
  }

  return {
    bg: '#eef2f7',
    color: '#64748b',
  };
}

function buildMetricCard({ label, primary, secondary, accent, bg, border }) {
  return `
    <td style="width:25%; padding:0 10px 0 0; vertical-align:top;">
      <table style="width:100%; border-collapse:separate; border-spacing:0; background:${bg}; border:1px solid ${border}; border-left:5px solid ${accent}; border-radius:20px; overflow:hidden;">
        <tr>
          <td style="padding:18px 22px;">
            <div style="font-size:16px; font-weight:700; color:#475569; margin-bottom:10px;">${escapeHtml(label)}</div>
            <div style="font-size:24px; font-weight:800; color:#0f172a; line-height:1.2;">${escapeHtml(primary)}</div>
            <div style="margin-top:10px; font-size:14px; font-weight:600; color:#64748b;">${escapeHtml(secondary)}</div>
          </td>
        </tr>
      </table>
    </td>
  `;
}

function buildMonthHeader(monthLabels = []) {
  return monthLabels.map((month) => `
    <th colspan="2" style="padding:16px 12px; border-bottom:1px solid #dbe4f0; background:#f8fafc; font-size:13px; font-weight:800; color:#334155; text-transform:uppercase; letter-spacing:0.04em; text-align:center;">
      ${escapeHtml(month.label)}
    </th>
  `).join('');
}

function buildMonthCells(row, monthLabels = []) {
  return monthLabels.map((month) => {
    const monthData = row.months?.find((item) => item.monthIndex === month.monthIndex) || {
      count: 0,
      trend: { direction: 'neutral', percent: 0 },
    };
    const tone = getTrendTone(monthData.trend);

    return `
      <td style="padding:14px 12px; border-bottom:1px solid #edf2f7; text-align:center; font-size:16px; font-weight:700; color:#0f172a;">
        ${escapeHtml(monthData.count)}
      </td>
      <td style="padding:14px 12px; border-bottom:1px solid #edf2f7; text-align:center;">
        <span style="display:inline-block; min-width:62px; padding:6px 10px; border-radius:999px; background:${tone.bg}; color:${tone.color}; font-size:12px; font-weight:800;">
          ${escapeHtml(buildTrendLabel(monthData.trend))}
        </span>
      </td>
    `;
  }).join('');
}

function buildTableRow(row, monthLabels = [], options = {}) {
  const topProblemName = options.topProblemName || '';
  const isTotal = options.isTotal;
  const isTopProblem = !isTotal && row.problemType === topProblemName;
  const rowBg = isTotal ? '#f8fafc' : isTopProblem ? '#eff6ff' : '#ffffff';
  const rowAccent = isTotal ? '#2563eb' : isTopProblem ? '#3b82f6' : 'transparent';

  return `
    <tr style="background:${rowBg};">
      <td style="padding:18px 16px; border-bottom:1px solid #edf2f7; border-left:4px solid ${rowAccent}; font-size:16px; font-weight:800; color:#0f172a; min-width:300px;">
        ${escapeHtml(row.problemType)}
      </td>
      <td style="padding:18px 12px; border-bottom:1px solid #edf2f7; text-align:center; font-size:18px; font-weight:800; color:#0f172a;">
        ${escapeHtml(row.total || 0)}
      </td>
      ${buildMonthCells(row, monthLabels)}
    </tr>
  `;
}

export async function exportMonthlyReportWorkbook({
  report,
  monthLabels,
  periodLabel,
  latestLabel,
  title,
  subtitle,
  totalLabel,
  topProblemLabel,
  topProblemHint,
  decreasedLabel,
  increasedLabel,
  greenSignalLabel,
  redSignalLabel,
  periodKeyLabel,
  lastActiveMonthKeyLabel,
  generatedAtLabel,
  monthlyChangeHint,
  problemTypeLabel,
  totalColumnLabel,
  filePrefix = 'OTK_OYLIK_HISOBOT',
}) {
  const topProblemName = report.topProblem?.name || '-';
  const topProblemCount = report.topProblem?.count || 0;
  const generatedAt = format(new Date(), 'dd.MM.yyyy HH:mm');

  const totalRow = {
    problemType: 'Jami',
    total: report.totalRecords || 0,
    months: report.totals || [],
  };

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <meta name="ProgId" content="Excel.Sheet" />
        <meta name="Generator" content="Microsoft Excel 11" />
        <style>
          body { font-family: Segoe UI, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
          table { border-collapse: separate; border-spacing: 0; width: 100%; }
        </style>
      </head>
      <body>
        <table style="margin-bottom:18px;">
          <tr>
            <td style="font-size:14px; font-weight:800; letter-spacing:0.18em; color:#2563eb; text-transform:uppercase;">WORKPLACE CRM</td>
          </tr>
          <tr>
            <td style="padding-top:8px; font-size:30px; font-weight:800; color:#0f172a;">${escapeHtml(title)}</td>
          </tr>
          <tr>
            <td style="padding-top:6px; font-size:15px; color:#64748b;">${escapeHtml(subtitle)}</td>
          </tr>
        </table>

        <table style="margin-bottom:18px;">
          <tr>
            ${buildMetricCard({
              label: totalLabel,
              primary: Number(report.totalRecords || 0).toLocaleString(),
              secondary: periodLabel,
              accent: '#2563eb',
              bg: '#f8fbff',
              border: '#dbeafe',
            })}
            ${buildMetricCard({
              label: topProblemLabel,
              primary: topProblemName,
              secondary: `${topProblemHint}: ${Number(topProblemCount).toLocaleString()}`,
              accent: '#2563eb',
              bg: '#f8fbff',
              border: '#dbeafe',
            })}
            ${buildMetricCard({
              label: decreasedLabel,
              primary: Number(report.decreasedCount || 0).toLocaleString(),
              secondary: greenSignalLabel,
              accent: '#22c55e',
              bg: '#f7fdf9',
              border: '#d1fae5',
            })}
            ${buildMetricCard({
              label: increasedLabel,
              primary: Number(report.increasedCount || 0).toLocaleString(),
              secondary: redSignalLabel,
              accent: '#ef4444',
              bg: '#fff8f8',
              border: '#fecdd3',
            })}
          </tr>
        </table>

        <table style="margin-bottom:18px; width:auto;">
          <tr>
            <td style="padding:10px 14px; border:1px solid #dbe4f0; border-radius:999px; background:#f8fafc; font-size:14px; font-weight:700; color:#475569;">
              ${escapeHtml(periodKeyLabel)}: ${escapeHtml(periodLabel)}
            </td>
            <td style="width:10px;"></td>
            <td style="padding:10px 14px; border:1px solid #dbe4f0; border-radius:999px; background:#f8fafc; font-size:14px; font-weight:700; color:#475569;">
              ${escapeHtml(lastActiveMonthKeyLabel)}: ${escapeHtml(latestLabel)}
            </td>
            <td style="width:10px;"></td>
            <td style="padding:10px 14px; border:1px solid #dbe4f0; border-radius:999px; background:#f8fafc; font-size:14px; font-weight:700; color:#475569;">
              ${escapeHtml(generatedAtLabel)}: ${escapeHtml(generatedAt)}
            </td>
          </tr>
        </table>

        <table style="margin-bottom:14px;">
          <tr>
            <td style="font-size:13px; font-weight:700; color:#64748b;">${escapeHtml(monthlyChangeHint)}</td>
          </tr>
        </table>

        <table style="border:1px solid #dbe4f0; border-radius:22px; overflow:hidden; background:#ffffff;">
          <thead>
            <tr>
              <th rowspan="2" style="padding:18px 16px; border-bottom:1px solid #dbe4f0; background:#f8fafc; font-size:13px; font-weight:800; color:#334155; text-transform:uppercase; letter-spacing:0.04em; text-align:left; min-width:300px;">
                ${escapeHtml(problemTypeLabel)}
              </th>
              <th rowspan="2" style="padding:18px 12px; border-bottom:1px solid #dbe4f0; background:#f8fafc; font-size:13px; font-weight:800; color:#334155; text-transform:uppercase; letter-spacing:0.04em; text-align:center; min-width:90px;">
                ${escapeHtml(totalColumnLabel)}
              </th>
              ${buildMonthHeader(monthLabels)}
            </tr>
            <tr>
              ${monthLabels.map(() => `
                <th style="padding:10px 12px; border-bottom:1px solid #dbe4f0; background:#f8fafc; font-size:12px; font-weight:700; color:#64748b; text-align:center;">Soni</th>
                <th style="padding:10px 12px; border-bottom:1px solid #dbe4f0; background:#f8fafc; font-size:12px; font-weight:700; color:#64748b; text-align:center;">%</th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${buildTableRow(totalRow, monthLabels, { isTotal: true })}
            ${(report.rows || []).map((row) => buildTableRow(row, monthLabels, { topProblemName })).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filePrefix}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xls`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
