# Viral Factory - Deploy to production (C:\ViralFactory)
#
# Rebuilds the app from this OneDrive source folder and pushes the result to the live
# production copy at C:\ViralFactory (kept outside OneDrive because the Scheduled Task
# runs as SYSTEM, which cannot reliably read OneDrive-synced files). Then restarts the
# ViralFactoryCoordinator Scheduled Task so the change goes live.
#
# Usage: run as Administrator from this folder:
#   .\deploy.ps1

$ErrorActionPreference = 'Stop'
$Src = $PSScriptRoot
$Dest = 'C:\ViralFactory'
$TaskName = 'ViralFactoryCoordinator'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Este deploy precisa de privilegios de Administrador (para reiniciar a tarefa agendada). Reabrindo elevado..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

Write-Host "==> Buildando a partir de $Src" -ForegroundColor Cyan
Push-Location $Src
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build falhou com codigo $LASTEXITCODE" }
} finally {
    Pop-Location
}

Write-Host "==> Copiando dist/ para $Dest\dist" -ForegroundColor Cyan
robocopy "$Src\dist" "$Dest\dist" /E /MIR /NFL /NDL /NJH /NJS /NC /NS | Out-Null

Write-Host "==> Sincronizando package.json (dependencias podem ter mudado)" -ForegroundColor Cyan
Copy-Item "$Src\package.json" "$Dest\package.json" -Force
Copy-Item "$Src\package-lock.json" "$Dest\package-lock.json" -Force -ErrorAction SilentlyContinue
Push-Location $Dest
try {
    npm install --omit=dev
} finally {
    Pop-Location
}

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "==> Reiniciando a tarefa '$TaskName'" -ForegroundColor Cyan
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    # Stop-ScheduledTask only kills the batch file's own cmd.exe, not the node.exe child it
    # spawned — kill whatever still holds port 4000 so the restart doesn't hit EADDRINUSE.
    $portPid = (Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue).OwningProcess
    if ($portPid) { Stop-Process -Id $portPid -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 1
    Start-ScheduledTask -TaskName $TaskName
    Start-Sleep -Seconds 3
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
    Write-Host "Deploy concluido (LastTaskResult: $($info.LastTaskResult))." -ForegroundColor Green
} else {
    Write-Host "Tarefa '$TaskName' nao encontrada. Rode install-coordinator.ps1 em C:\ViralFactory primeiro." -ForegroundColor Yellow
}
