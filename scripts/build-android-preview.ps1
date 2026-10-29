param([switch]$ConfigureOnly)

$ErrorActionPreference = 'Stop'
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
    # Expo parses local dotenv files, but only these client-safe names leave this process.
    # Never upload a local .env file: it can also contain server-side credentials.
    $publicConfigJson = @'
require('@expo/env').load(process.cwd(), { silent: true });
const names = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_KEY', 'EXPO_PUBLIC_PHONE_AUTH_ENABLED', 'EXPO_PUBLIC_INTERNAL_DEMO_EDITOR_EMAILS', 'EXPO_PUBLIC_INTERNAL_DEMO_EDITOR_USER_IDS'];
const config = Object.fromEntries(names.filter(name => process.env[name] !== undefined).map(name => [name, process.env[name]]));
config.EXPO_PUBLIC_PHONE_AUTH_ENABLED ??= 'false';
process.stdout.write(JSON.stringify(config));
'@ | node
    if ($LASTEXITCODE -ne 0) { throw 'Could not read the local public Expo configuration.' }
    $publicConfig = $publicConfigJson | ConvertFrom-Json
    foreach ($requiredName in @('EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_KEY')) {
        if (-not $publicConfig.$requiredName -or $publicConfig.$requiredName -match 'your-project|your-supabase') {
            throw "Set $requiredName to the existing client-safe Supabase value before building."
        }
    }

    foreach ($entry in $publicConfig.PSObject.Properties) {
        # Values are intentionally not printed. EAS stores only explicitly allowed public config.
        $previousPreference = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        $null = & eas env:create preview --scope project --name $entry.Name --value $entry.Value --type string --visibility plaintext --force --non-interactive 2>&1
        $commandExitCode = $LASTEXITCODE
        $ErrorActionPreference = $previousPreference
        if ($commandExitCode -ne 0) { throw "Could not configure $($entry.Name) on EAS. Check Expo login and project access." }
        Write-Host "Configured $($entry.Name) for the EAS preview environment."
    }

    if (-not $ConfigureOnly) {
        $previousPreference = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        & eas build --platform android --profile preview
        $commandExitCode = $LASTEXITCODE
        $ErrorActionPreference = $previousPreference
        if ($commandExitCode -ne 0) { throw 'The Android preview build did not complete successfully. See the EAS output above.' }
    }
} finally {
    Pop-Location
}
