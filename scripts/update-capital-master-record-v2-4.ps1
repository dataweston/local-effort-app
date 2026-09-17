param(
  [string]$Source = 'C:\Users\user\local-effort-app\artifacts\local_effort_capital_master_record_v2_3.docx',
  [string]$Output = 'C:\Users\user\local-effort-app\artifacts\local_effort_capital_master_record_v2_4.docx'
)

# Owner operating-model correction of 2026-09-15: Foodist becomes the primary
# production and small-event facility on 2026-10-01 at a flat $1,800/month with
# unlimited included kitchen hours; MSP Kitchenery (Hopkins) becomes a reserve
# kitchen with an approximately $350 September bill and unresolved post-September
# storage. This retires the $25/hour + $150 fees + $200 storage Hopkins
# assumption carried by Master Record v2.3.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$replacements = [ordered]@{
  'Version 2.3 — August 14, 2026' = 'Version 2.4 — September 16, 2026'
  'Hopkins, Minnesota' = 'Foodist (primary, from Oct. 1, 2026); MSP Kitchenery, Hopkins (reserve)'
  '8. Production Facility — Hopkins' = '8. Production Facility — Foodist primary, MSP Kitchenery reserve'
  'Local Effort has moved production to Hopkins. The prior Neon/Food Corridor hourly structure is superseded for current modeling.' = 'Effective October 1, 2026, Foodist is Local Effort''s primary production and small-event facility at a flat $1,800 per month with unlimited included kitchen hours. The Hopkins hourly structure of $25/hour plus $150 monthly fees and $200 monthly storage is superseded for current modeling, and the earlier Neon/Food Corridor tiered structure remains retired. Foodist is a working facility name and the executed agreement is outstanding diligence.'
  'Kitchen rental rate' = 'Primary facility rate (Foodist, from Oct. 1, 2026)'
  '$25/hour' = '$1,800/month flat, unlimited hours'
  'Typical monthly usage' = 'Modeled monthly kitchen hours'
  '80–100 hours' = '80–100 hours, no rate effect'
  'Implied monthly kitchen expense' = 'Monthly facility cost'
  '$2,350–$2,850' = '$1,800'
  'Implied annualized kitchen expense' = 'Annualized facility cost'
  '$28,200–$34,200' = '$21,600'
  'Effective August 1, 2026, the Hopkins arrangement is $25/hour plus $150/month in fees and $200/month in storage. At 80–100 monthly hours, total modeled facility cash cost is $2,350–$2,850/month. The superseded terms of $40/hour for the first 20 hours, $35/hour thereafter, plus $200 storage would have implied approximately $3,100–$3,800/month. The Hopkins move therefore improves modeled facility cash economics by approximately $750–$950/month, or $9,000–$11,400/year, at the same usage.' = 'Under the superseded Hopkins terms, 80–100 modeled monthly hours cost $2,350–$2,850/month. The Foodist flat rate is $1,800/month at any hour volume inside the included access, improving modeled facility cash economics by $550–$1,050/month, or $6,600–$12,600/year, at the same usage, and reducing the marginal facility cash cost of an additional kitchen hour to zero. MSP Kitchenery in Hopkins is retained as a reserve kitchen for overflow, larger events, and frozen-pizza CPG production; its September 2026 bill is approximately $350, and one to two months of transitional storage is expected. Post-September reserve storage cost is unresolved and is carried separately from the $1,800 steady-state base rather than being estimated.'
  'The $25 hourly rate, $150 monthly fees, $200 monthly storage, and 80–100 hour usage range are owner-confirmed current operating inputs effective August 1 and replace the prior tiered kitchen assumption.' = 'The $1,800 monthly flat rate, unlimited included kitchen hours, included small-event space, October 1, 2026 effective date, and MSP Kitchenery reserve role are owner-confirmed operating inputs dated September 15, 2026. They replace the $25/hour plus $150 fees plus $200 storage Hopkins assumption, which had replaced the earlier tiered $40/$35 per hour structure. Because facility cost is now fixed, modeled kitchen hours drive allocation across lines rather than total facility spend.'
  'The founder-compensation correction and Hopkins move materially lower the revenue required for normalized operations compared with the prior July model.' = 'The founder-compensation correction and the move to a flat $1,800/month facility materially lower the revenue required for normalized operations compared with the prior July model.'
  'The prior July calibrated economist model recommended approximately $50,000 of capitalization under older facility and founder-compensation assumptions. The current $65,000 target remains defensible as growth plus resilience capital, but the updated Hopkins cost structure and $90,000 combined founder-compensation policy should be incorporated into the next cash model before treating $65,000 as a mathematically optimized amount.' = 'The prior July calibrated economist model recommended approximately $50,000 of capitalization under older facility and founder-compensation assumptions. The current $65,000 target remains defensible as growth plus resilience capital, but the flat $1,800/month facility cost and $90,000 combined founder-compensation policy should be incorporated into the next cash model before treating $65,000 as a mathematically optimized amount.'
  'Hopkins facility / licensing / insurance / setup' = 'Facility transition / licensing / insurance / setup'
  'Normalize Hopkins production workflow.' = 'Normalize production workflow at the Foodist facility.'
  'During the first half of 2026, Local Effort recorded $54,051.00 in operating revenue, averaging $9,008.50 per month, with Q2 averaging $9,748.56 per month. The company moved production to Hopkins effective August 1 at $25/hour plus $350 in combined monthly fees and storage, materially lowering facility cost at its current 80–100 hours of monthly kitchen use.' = 'During the first half of 2026, Local Effort recorded $54,051.00 in operating revenue, averaging $9,008.50 per month, with Q2 averaging $9,748.56 per month. Effective October 1, 2026, the company''s primary production and small-event facility is Foodist at a flat $1,800 per month with unlimited included kitchen hours, with MSP Kitchenery in Hopkins retained as a reserve kitchen for overflow, larger events, and frozen-pizza production.'
  'Local Effort is raising $65,000 to convert a demonstrated but undercapitalized Twin Cities food operation into a stable recurring-revenue cooperative capable of supporting paid production labor, current founder salaries, and continued growth from a lower-cost Hopkins production base.' = 'Local Effort is raising $65,000 to convert a demonstrated but undercapitalized Twin Cities food operation into a stable recurring-revenue cooperative capable of supporting paid production labor, current founder salaries, and continued growth from a lower-cost, fixed-rate production base.'
  'The company has operating history, established customers, demonstrated transactions across its principal lines, a lower-cost Hopkins production base, and internal operating/data infrastructure. The remaining constraint is capitalization and execution capacity.' = 'The company has operating history, established customers, demonstrated transactions across its principal lines, a lower-cost fixed-rate production base, and internal operating/data infrastructure. The remaining constraint is capitalization and execution capacity.'
  'Hopkins kitchen agreement' = 'Foodist facility agreement and MSP Kitchenery reserve terms'
  'Executed Hopkins agreement corroborating the owner-confirmed $25/hour rate, $150 monthly fees, $200 monthly storage, and August 1 effective date.' = 'Executed Foodist agreement corroborating the owner-confirmed $1,800 monthly flat rate, unlimited included hours, small-event space, and October 1, 2026 effective date, plus the MSP Kitchenery reserve role and any post-September storage charge.'
  '12-month monthly cash-flow model using the updated $90,000 founder-compensation policy and Hopkins facility economics.' = '12-month monthly cash-flow model using the updated $90,000 founder-compensation policy and the flat $1,800/month facility economics.'
  'Hopkins kitchen cost at $25/hour plus $150 monthly fees and $200 monthly storage, using 80–100 hours/month unless newer actual usage supersedes it.' = 'Facility cost at $1,800/month flat from October 1, 2026 with unlimited included kitchen hours, plus separately identified reserve-kitchen and storage cost while the Hopkins transition completes.'
  'With founder compensation corrected to $45,000 + $45,000 and the lower-cost Hopkins kitchen in place, approximately $35,000–$40,000/month is the first normalized operating band: high enough to support both founders at current salaries plus meaningful paid production labor while holding total labor around or below 35%.' = 'With founder compensation corrected to $45,000 + $45,000 and a flat $1,800/month facility in place, approximately $35,000–$40,000/month is the first normalized operating band: high enough to support both founders at current salaries plus meaningful paid production labor while holding total labor around or below 35%.'
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
