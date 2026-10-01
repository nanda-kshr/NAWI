import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Report, TestSession, TestResult, Instrument, Laboratory } from '@/lib/models';
import { extractToken } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = extractToken(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;

  const report = await Report.findOne({ $or: [{ _id: id.match(/^[0-9a-f]{24}$/) ? id : null }, { reportNumber: id }] }).lean();
  if (!report) return Response.json({ error: 'Not found' }, { status: 404 });

  const [session, results, instrument] = await Promise.all([
    TestSession.findOne({ sessionId: report.sessionId }).lean(),
    TestResult.find({ sessionId: report.sessionId }).lean(),
    Instrument.findOne({ instrumentId: report.instrumentId }).lean(),
  ]);

  // Generate HTML report for PDF rendering
  const html = generateReportHTML({ report, session, results, instrument });

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function generateReportHTML({ report, session, results, instrument }: {
  report: Record<string, unknown>;
  session: Record<string, unknown> | null;
  results: Record<string, unknown>[];
  instrument: Record<string, unknown> | null;
}): string {
  const r = report as Record<string, string & number & Record<string, unknown>>;
  const inst = instrument as Record<string, string & number>;
  const sess = session as Record<string, string & Record<string, unknown>> | null;

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = { pass: '#16a34a', fail: '#dc2626', pending: '#d97706', not_applicable: '#6b7280' };
    const bg = colors[status] ?? '#6b7280';
    return `<span style="background:${bg};color:#fff;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase">${status}</span>`;
  };

  const envCond = sess?.environmentalConditions as Record<string, number | string> | undefined;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>NAWI Type Evaluation Report ${r.reportNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Arial', sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; }
  .page { width: 210mm; margin: 0 auto; padding: 20mm 18mm; }
  h1 { font-size: 20px; color: #0f3460; margin-bottom: 6px; }
  h2 { font-size: 14px; color: #0f3460; margin: 18px 0 8px; border-bottom: 2px solid #0f3460; padding-bottom: 4px; }
  h3 { font-size: 12px; color: #374151; margin: 12px 0 6px; }
  .header { text-align: center; border-bottom: 3px solid #0f3460; padding-bottom: 16px; margin-bottom: 20px; }
  .header .subtitle { font-size: 13px; color: #4b5563; margin-top: 4px; }
  .report-meta { display: flex; justify-content: space-between; background: #f8fafc; padding: 12px; border-radius: 6px; margin-bottom: 16px; }
  .meta-item { }
  .meta-item .label { font-size: 9px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; }
  .meta-item .value { font-size: 12px; font-weight: 700; color: #0f3460; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th { background: #0f3460; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
  tr:nth-child(even) td { background: #f9fafb; }
  .section { margin-bottom: 20px; }
  .overall-result { padding: 16px; border-radius: 8px; margin: 20px 0; text-align: center; }
  .overall-pass { background: #dcfce7; border: 2px solid #16a34a; }
  .overall-fail { background: #fee2e2; border: 2px solid #dc2626; }
  .signature-block { display: flex; gap: 20px; margin-top: 30px; }
  .sig-box { flex: 1; border: 1px solid #d1d5db; padding: 12px; border-radius: 6px; }
  .sig-line { border-top: 1px solid #374151; margin-top: 30px; padding-top: 4px; font-size: 9px; color: #6b7280; }
  .watermark { font-size: 9px; color: #9ca3af; text-align: center; margin-top: 20px; padding-top: 12px; border-top: 1px solid #e5e7eb; }
  @media print { .page { padding: 10mm; } }
</style>
</head>
<body>
<div class="page">

  <!-- Cover / Header -->
  <div class="header">
    <h1>🔬 NAWI Type Evaluation Report</h1>
    <div class="subtitle">Non-Automatic Weighing Instrument — OIML R 76 Type Evaluation</div>
    <div class="subtitle" style="margin-top:8px;font-size:11px">Standard: ${r.standardVersionId ?? 'OIML R76-1:2006'} | Rev. ${r.revisionNumber}</div>
  </div>

  <!-- Report Metadata -->
  <div class="report-meta">
    <div class="meta-item"><div class="label">Report Number</div><div class="value">${r.reportNumber}</div></div>
    <div class="meta-item"><div class="label">Generated</div><div class="value">${new Date().toLocaleDateString('en-GB')}</div></div>
    <div class="meta-item"><div class="label">Status</div><div class="value">${statusBadge(r.status)}</div></div>
    <div class="meta-item"><div class="label">Conclusion</div><div class="value" style="color:${r.overallConclusion === 'approved' ? '#16a34a' : '#dc2626'}">${String(r.overallConclusion ?? '').toUpperCase()}</div></div>
  </div>

  <!-- Instrument Details -->
  <div class="section">
    <h2>Instrument Details</h2>
    <table>
      <tr><th colspan="4">Instrument Technical Specifications</th></tr>
      <tr><td><b>Manufacturer</b></td><td>${inst?.manufacturer ?? '-'}</td><td><b>Model</b></td><td>${inst?.model ?? '-'}</td></tr>
      <tr><td><b>Serial Number</b></td><td>${inst?.serialNumber ?? '-'}</td><td><b>Accuracy Class</b></td><td>Class ${inst?.accuracyClass ?? '-'}</td></tr>
      <tr><td><b>Max Capacity</b></td><td>${inst?.maxCapacity ?? '-'} kg</td><td><b>Min Capacity</b></td><td>${inst?.minCapacity ?? '-'} kg</td></tr>
      <tr><td><b>Scale Interval (e)</b></td><td>${inst?.verificationScaleInterval ?? '-'} kg</td><td><b>Display Resolution (d)</b></td><td>${inst?.displayResolution ?? '-'} kg</td></tr>
      <tr><td><b>Intervals (n)</b></td><td>${inst?.numberOfIntervals ?? '-'}</td><td><b>Instrument Type</b></td><td>${inst?.instrumentType ?? '-'}</td></tr>
      <tr><td><b>Software Version</b></td><td>${inst?.softwareVersion ?? '-'}</td><td><b>Firmware</b></td><td>${inst?.firmwareVersion ?? '-'}</td></tr>
    </table>
  </div>

  <!-- Environmental Conditions -->
  <div class="section">
    <h2>Environmental Conditions</h2>
    <table>
      <tr>
        <th>Temperature</th><th>Relative Humidity</th><th>Atmospheric Pressure</th><th>Supply Voltage</th><th>Laboratory</th>
      </tr>
      <tr>
        <td>${envCond?.temperature ?? '-'} °C</td>
        <td>${envCond?.humidity ?? '-'} %RH</td>
        <td>${envCond?.pressure ? envCond.pressure + ' hPa' : '-'}</td>
        <td>${envCond?.supplyVoltage ? envCond.supplyVoltage + ' V' : '-'}</td>
        <td>${envCond?.laboratory ?? '-'}</td>
      </tr>
    </table>
  </div>

  <!-- Test Results -->
  <div class="section">
    <h2>Test Results</h2>
    <table>
      <tr>
        <th>Test Module</th><th>Standard Reference</th><th>Status</th><th>Summary</th>
      </tr>
      ${results.map((r: Record<string, unknown>) => `
      <tr>
        <td><b>${r.testModuleName}</b></td>
        <td style="font-size:9px">${r.standardReference ?? '-'}</td>
        <td>${statusBadge(r.status as string)}</td>
        <td style="font-size:9px">${r.notes ?? '-'}</td>
      </tr>
      ${((r.calculations as Record<string, unknown>[]) ?? []).map((calc: Record<string, unknown>) => `
      <tr style="background:#f0f9ff">
        <td colspan="2" style="padding-left:20px;font-size:9px;color:#4b5563">Formula: ${calc.formula}</td>
        <td>${statusBadge(calc.passFail as string)}</td>
        <td style="font-size:9px">Result: ${(calc.result as number)?.toFixed?.(4) ?? calc.result} | MPE: ${calc.permissibleError ?? '-'} | Error: ${(calc.actualError as number)?.toFixed?.(4) ?? '-'}</td>
      </tr>
      `).join('')}
      `).join('')}
    </table>
  </div>

  <!-- Overall Conclusion -->
  <div class="overall-result ${r.overallConclusion === 'approved' ? 'overall-pass' : 'overall-fail'}">
    <h3 style="font-size:16px">Overall Conclusion: ${String(r.overallConclusion ?? 'PENDING').toUpperCase()}</h3>
    ${r.deviations ? `<p style="margin-top:8px;font-size:10px"><b>Deviations:</b> ${r.deviations}</p>` : ''}
    ${r.remarks ? `<p style="margin-top:4px;font-size:10px"><b>Remarks:</b> ${r.remarks}</p>` : ''}
  </div>

  <!-- Signatures -->
  <div class="signature-block">
    <div class="sig-box">
      <div style="font-size:10px;font-weight:700;margin-bottom:6px">Technician</div>
      <div>${r.technicianName ?? '-'}</div>
      <div class="sig-line">Name / Date: ${r.technicianSignedAt ? new Date(r.technicianSignedAt as string).toLocaleDateString('en-GB') : '_____________'}</div>
    </div>
    <div class="sig-box">
      <div style="font-size:10px;font-weight:700;margin-bottom:6px">Reviewer</div>
      <div>${r.reviewerName ?? 'Pending'}</div>
      <div class="sig-line">Name / Date: ${r.reviewerSignedAt ? new Date(r.reviewerSignedAt as string).toLocaleDateString('en-GB') : '_____________'}</div>
    </div>
    <div class="sig-box">
      <div style="font-size:10px;font-weight:700;margin-bottom:6px">Approver</div>
      <div>${r.approverName ?? 'Pending'}</div>
      <div class="sig-line">Name / Date: ${r.approverSignedAt ? new Date(r.approverSignedAt as string).toLocaleDateString('en-GB') : '_____________'}</div>
    </div>
  </div>

  <div class="watermark">
    Generated by NAWI Platform | Report ${r.reportNumber} Rev.${r.revisionNumber} | 
    ${new Date().toISOString()} | OIML R76 Type Evaluation System
  </div>
</div>
</body>
</html>`;
}
