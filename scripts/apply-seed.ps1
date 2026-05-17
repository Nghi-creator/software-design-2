$line = Get-Content "$PSScriptRoot\..\services\api\.env" |
  Where-Object { $_.StartsWith('DATABASE_URL=') }

if (-not $line) {
  throw 'DATABASE_URL not found in services/api/.env'
}

$databaseUrl = $line.Substring(13).Trim('"')

& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' `
  $databaseUrl `
  -v ON_ERROR_STOP=1 `
  -f "$PSScriptRoot\..\supabase\seed.sql"
