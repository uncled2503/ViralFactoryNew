# Viral Factory - Coordinator (main backend + site) auto-start installer (Windows)
#
# Registers a Windows Scheduled Task that runs the built production server
# (dist\server.cjs, via start-coordinator.bat) on every boot, even without anyone
# logged in, restarting automatically on crash. This is what the Cloudflare Tunnel
# on this machine forwards viralfactory.site traffic to (port 3000).
#
# Usage: run `npm run build` first to refresh dist\, then run this as Administrator:
#   .\install-coordinator.ps1

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$TaskName = 'ViralFactoryCoordinator'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Este instalador precisa de privilegios de Administrador. Reabrindo elevado..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Ja existia uma tarefa '$TaskName'. Substituindo pela configuracao atual." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$action = New-ScheduledTaskAction -Execute (Join-Path $Root 'start-coordinator.bat') -WorkingDirectory $Root
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
    -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Write-Host "Tarefa '$TaskName' criada: inicia sozinha a cada boot, roda como SYSTEM, reinicia automaticamente se cair." -ForegroundColor Green

Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 3
$info = Get-ScheduledTaskInfo -TaskName $TaskName
Write-Host "Coordinator iniciado (LastTaskResult: $($info.LastTaskResult))." -ForegroundColor Green
