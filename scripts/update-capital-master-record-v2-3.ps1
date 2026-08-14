param(
  [string]$Source = 'C:\Users\user\Downloads\local_effort_capital_master_record_v2_2.docx',
  [string]$Output = 'C:\Users\user\local-effort-app\artifacts\local_effort_capital_master_record_v2_3.docx'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$replacements = [ordered]@{
  'Version 2.2 — August 14, 2026' = 'Version 2.3 — August 14, 2026'
  '47.5%' = '56.5%'
  '45.5%' = '36.5%'
  "Renee Owens paid `$6,000 for 2%, transferred from Weston's ownership. Maria Beck has been offered an additional 1% from Weston but has not accepted; it is excluded from the accepted cap table." = "Renee Owens paid `$6,000 for 2%, transferred equally from the founders: 1% from Weston and 1% from Catherine, with `$3,000 paid to each. On July 28, 2026, the cofounders rebalanced their holdings through a 10% transfer from Weston to Catherine with no consideration. Maria Beck has been offered an additional 1% from Weston but has not accepted; it is excluded from the accepted cap table."
  'Local Effort reports more than 50% women ownership. The accepted capitalization schedule should accompany applications relying on this qualification.' = 'The accepted cap table is 63.5% women-held, and Catherine Olsen individually holds 56.5%. The accepted capitalization schedule and documentation of the July 28 founder-to-founder rebalance should accompany applications relying on this qualification.'
  'Owner correction dated August 13, 2026 supersedes the stale July economist record of $65,000 + $65,000. Compensation remains effective from April 1, 2026 for accrued-back-pay purposes.' = 'Owner confirmation dated August 14, 2026 supersedes the July 19 Company Brain policy of $90,000 for Weston and $70,000 for Catherine. The current policy is $45,000 for each founder, effective April 1, 2026 for accrued-compensation purposes.'
  'Confirmed minimum qualifying expense/draw offset since Apr. 1' = 'Local Budget PERSONAL candidate offsets, Apr. 1–Jul. 31'
  '$8,895' = '$8,755.64'
  'Maximum confirmed net liability through Jul. 31 before further offsets' = 'Provisional net accrual through Jul. 31, subject to owner/accountant review'
  '$21,105' = '$21,244.36'
  'Maximum confirmed net liability through Aug. 31 before further offsets' = 'Projected net accrual through Aug. 31 using PERSONAL posted through Aug. 13'
  '$28,605' = '$28,627.15'
  'Owner-confirmed qualifying founder expenses/draws since April 1 total at least $8,895 and are to be subtracted from deferred founder compensation. Against the $30,000 gross combined accrual through July 31, this establishes a confirmed net liability of no more than $21,105 before any additional qualifying offsets are identified. The $8,895 figure is a confirmed minimum offset, not a final reconciliation; Local Budget should still be used to identify any further qualifying PERSONAL/owner-draw offsets.' = 'Local Budget contains $8,755.64 of PERSONAL transactions from April 1 through July 31 and $8,872.85 through August 13. These are candidate founder-compensation offsets pending owner review and accountant treatment. The prior $8,895 figure appears to have been an August-to-date recollection; it is $22.15 above the posted Local Budget total through August 13 and remains unresolved rather than being forced into the ledger. Against the $30,000 gross accrual through July 31, the provisional net accrual is $21,244.36. If August fully accrues, the provisional net through August 31 is $28,627.15 using postings through August 13, before later August offsets.'
  '$7,552/month' = '$9,008.50/month'
  '$45,312' = '$54,051.00'
  '$9,045/month' = '$9,748.56/month'
  '$108,540/year' = '$116,982.72/year'
  'July 2026 accounting has subsequently been cleaned and should supersede the historical baseline once the current Local Budget complete-month export is retrieved. August is incomplete as of this record date and should not be annualized from partial-month activity.' = 'Current Local Budget records through August 13 include a complete July. July 2026 operating revenue was $13,211.14. August remains incomplete as of this record date and should not be annualized from partial-month activity.'
  'Until the current export is run, use: During the first half of 2026, Local Effort averaged approximately $7,552 per month in operating revenue, with Q2 running approximately $9,045 per month.' = 'Use: During the first half of 2026, Local Effort recorded $54,051.00 of operating revenue, averaging $9,008.50 per month, with Q2 averaging $9,748.56 per month. July operating revenue was $13,211.14.'
  '28.1%' = '27.7%'
  '$2,000–$2,500' = '$2,350–$2,850'
  '$24,000–$30,000' = '$28,200–$34,200'
  'At 80–100 monthly hours, the prior economist assumption of $40/hour for the first 20 hours, $35/hour thereafter, plus $200 storage would have implied approximately $3,100–$3,800/month. The Hopkins move therefore improves modeled facility cash economics by approximately $1,100–$1,300/month, or about $13,200–$15,600/year, before any additional storage or incidental facility charges.' = 'Effective August 1, 2026, the Hopkins arrangement is $25/hour plus $150/month in fees and $200/month in storage. At 80–100 monthly hours, total modeled facility cash cost is $2,350–$2,850/month. The superseded terms of $40/hour for the first 20 hours, $35/hour thereafter, plus $200 storage would have implied approximately $3,100–$3,800/month. The Hopkins move therefore improves modeled facility cash economics by approximately $750–$950/month, or $9,000–$11,400/year, at the same usage.'
  'The 80–100 hour monthly usage range is an owner-confirmed current operating input and should replace the stale kitchen assumption in Company Brain / economist standing facts.' = 'The $25 hourly rate, $150 monthly fees, $200 monthly storage, and 80–100 hour usage range are owner-confirmed current operating inputs effective August 1 and replace the prior tiered kitchen assumption.'
  'During the first half of 2026, Local Effort averaged approximately $7,552 per month in operating revenue, with Q2 running approximately $9,045 per month. The company has since moved production to Hopkins at $25/hour, materially lowering facility cost at its current 80–100 hours of monthly kitchen use.' = 'During the first half of 2026, Local Effort recorded $54,051.00 in operating revenue, averaging $9,008.50 per month, with Q2 averaging $9,748.56 per month. The company moved production to Hopkins effective August 1 at $25/hour plus $350 in combined monthly fees and storage, materially lowering facility cost at its current 80–100 hours of monthly kitchen use.'
  'Founder deferred-compensation schedule, confirmed $8,895 minimum offset, and final draw reconciliation' = 'Founder deferred-compensation schedule, Local Budget PERSONAL candidate offsets, and final owner/accountant draw reconciliation'
  'Fresh July 2026 complete-month Local Budget actuals and August-to-date cash actuals.' = 'Fresh August-to-date cash actuals after the August 13 source maximum.'
  'Final founder deferred-compensation reconciliation beyond the confirmed $8,895 minimum offset; current maximum confirmed net liability through July 31 is $21,105 before further qualifying offsets.' = 'Final founder deferred-compensation reconciliation: $8,755.64 of Local Budget PERSONAL candidate offsets through July 31, $8,872.85 through August 13, and an unresolved $22.15 difference from the prior approximately $8,895 owner recollection.'
  'Current Hopkins agreement details beyond the $25/hour rate, including storage or ancillary charges if any.' = 'Executed Hopkins agreement corroborating the owner-confirmed $25/hour rate, $150 monthly fees, $200 monthly storage, and August 1 effective date.'
  'Hopkins kitchen cost at $25/hour and 80–100 hours/month unless newer actual usage supersedes it.' = 'Hopkins kitchen cost at $25/hour plus $150 monthly fees and $200 monthly storage, using 80–100 hours/month unless newer actual usage supersedes it.'
}

# Windows PowerShell 5.1 reads BOM-less UTF-8 scripts using the legacy code page.
# Repair those decoded literals before matching them against UTF-8 XML.
function Repair-Utf8Literal([string]$Value) {
  $bytes = [System.Text.Encoding]::GetEncoding(1252).GetBytes($Value)
  return [System.Text.Encoding]::UTF8.GetString($bytes)
}
$encodingSafeReplacements = [ordered]@{}
foreach ($item in $replacements.GetEnumerator()) {
  $encodingSafeReplacements[(Repair-Utf8Literal $item.Key)] = Repair-Utf8Literal $item.Value
}
$replacements = $encodingSafeReplacements

if (-not (Test-Path -LiteralPath $Source)) { throw "Source DOCX not found: $Source" }
$outputDir = Split-Path -Parent $Output
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
Copy-Item -LiteralPath $Source -Destination $Output -Force

$archive = [System.IO.Compression.ZipFile]::Open($Output, [System.IO.Compression.ZipArchiveMode]::Update)
try {
  $entry = $archive.GetEntry('word/document.xml')
  if (-not $entry) { throw 'word/document.xml not found' }
  $reader = [System.IO.StreamReader]::new($entry.Open())
  try { $xmlText = $reader.ReadToEnd() } finally { $reader.Dispose() }

  $xml = [System.Xml.XmlDocument]::new()
  $xml.PreserveWhitespace = $true
  $xml.LoadXml($xmlText)
  $ns = [System.Xml.XmlNamespaceManager]::new($xml.NameTable)
  $ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')

  $counts = [ordered]@{}
  foreach ($key in $replacements.Keys) { $counts[$key] = 0 }

  foreach ($paragraph in $xml.SelectNodes('//w:p', $ns)) {
    $textNodes = $paragraph.SelectNodes('.//w:t', $ns)
    if ($textNodes.Count -eq 0) { continue }
    $current = ($textNodes | ForEach-Object { $_.InnerText }) -join ''
    if (-not $replacements.Contains($current)) { continue }
    $replacement = $replacements[$current]
    $textNodes[0].InnerText = $replacement
    $null = $textNodes[0].SetAttribute('xml:space', 'preserve')
    for ($i = 1; $i -lt $textNodes.Count; $i += 1) { $textNodes[$i].InnerText = '' }
    $counts[$current] += 1
  }

  $missing = @($counts.GetEnumerator() | Where-Object { $_.Value -eq 0 } | ForEach-Object { $_.Key })
  if ($missing.Count -gt 0) {
    throw "Expected text not found in DOCX: $($missing -join ' | ')"
  }

  $entry.Delete()
  $newEntry = $archive.CreateEntry('word/document.xml', [System.IO.Compression.CompressionLevel]::Optimal)
  $utf8 = [System.Text.UTF8Encoding]::new($false)
  $writer = [System.IO.StreamWriter]::new($newEntry.Open(), $utf8)
  try { $xml.Save($writer) } finally { $writer.Dispose() }
} finally {
  $archive.Dispose()
}

[pscustomobject]@{
  source = $Source
  output = $Output
  replacements = ($counts.Values | Measure-Object -Sum).Sum
} | ConvertTo-Json
