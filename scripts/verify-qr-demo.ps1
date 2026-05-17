$line = Get-Content "$PSScriptRoot\..\services\api\.env" |
  Where-Object { $_.StartsWith('DATABASE_URL=') }

if (-not $line) {
  throw 'DATABASE_URL not found in services/api/.env'
}

$databaseUrl = $line.Substring(13).Trim('"')

& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' `
  $databaseUrl `
  -c @"
select
  w.title,
  w.start_time at time zone 'Asia/Bangkok' as local_start,
  r.status,
  r.qr_code,
  r.checked_in_at
from workshops w
join registrations r on r.workshop_id = w.id
where w.title like 'QR Demo #%'
order by w.title;
"@
