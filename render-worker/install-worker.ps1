# Viral Factory - Render Worker: instalador e auto-start (Windows)
#
# O que este script faz nesta pasta (onde estiver, mesmo copiada para outro PC):
#   1. Garante que esta janela esta rodando como Administrador (relanca se preciso).
#   2. Verifica/instala Node.js e FFmpeg (via winget) se estiverem faltando.
#   3. Roda "npm install" para baixar as dependencias do worker.
#   4. Garante que exista um .env valido (copia de .env.example se faltar).
#   5. Cria uma Tarefa Agendada do Windows que inicia o worker automaticamente
#      no boot da maquina (mesmo sem ninguem logar), com reinicio automatico
#      em caso de falha.
#
# Uso: copie a pasta "render-worker" inteira (sem node_modules) para o novo PC,
# abra PowerShell como Administrador nessa pasta e rode:
#   .\install-worker.ps1

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$TaskName = 'ViralFactoryRenderWorker'

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    ATENCAO: $msg" -ForegroundColor Yellow }

# --- 1. Self-elevate ---------------------------------------------------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Este instalador precisa de privilegios de Administrador. Reabrindo elevado..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

Write-Host "==================================================================="
Write-Host "  Viral Factory - Instalador do Render Worker"
Write-Host "  Pasta: $Root"
Write-Host "==================================================================="

function Refresh-Path {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machine;$user"
}

# --- 2. Node.js ----------------------------------------------------------
Write-Step "Verificando Node.js"
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Warn "Node.js nao encontrado. Tentando instalar via winget..."
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        winget install --id OpenJS.NodeJS.LTS --scope machine --silent --accept-package-agreements --accept-source-agreements
        Refresh-Path
        $node = Get-Command node -ErrorAction SilentlyContinue
    }
    if (-not $node) {
        Write-Warn "Nao foi possivel instalar o Node.js automaticamente."
        Write-Warn "Baixe e instale manualmente em https://nodejs.org (versao LTS) e rode este script de novo."
        exit 1
    }
}
Write-Ok "Node.js encontrado: $(node -v)"

# --- 3. FFmpeg -------------------------------------------------------------
Write-Step "Verificando FFmpeg"
$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
    Write-Warn "FFmpeg nao encontrado no PATH. Tentando instalar via winget..."
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        winget install --id Gyan.FFmpeg --scope machine --silent --accept-package-agreements --accept-source-agreements
        Refresh-Path
        $ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
    }
    if (-not $ffmpeg) {
        Write-Warn "Nao foi possivel confirmar o FFmpeg automaticamente."
        Write-Warn "Baixe em https://www.gyan.dev/ffmpeg/builds/, extraia e adicione a pasta 'bin' ao PATH do sistema."
        Write-Warn "Depois de instalar, feche e abra este PowerShell de novo e rode o script mais uma vez."
        exit 1
    }
}
Write-Ok "FFmpeg encontrado: $($ffmpeg.Source)"

# --- 4. Dependencias do worker (npm install) --------------------------------
Write-Step "Instalando dependencias (npm install)"
Push-Location $Root
try {
    & npm install --no-fund --no-audit
    if ($LASTEXITCODE -ne 0) { throw "npm install falhou com codigo $LASTEXITCODE" }
} finally {
    Pop-Location
}
Write-Ok "Dependencias instaladas."

# --- 5. Arquivo .env ---------------------------------------------------------
Write-Step "Verificando configuracao (.env)"
$envPath = Join-Path $Root '.env'
$envExamplePath = Join-Path $Root '.env.example'
if (-not (Test-Path $envPath)) {
    Copy-Item $envExamplePath $envPath
    Write-Warn "Nenhum .env encontrado nesta copia da pasta. Criei um a partir de .env.example."
    Write-Warn "Abra '$envPath' e preencha API_URL, WS_URL e WORKER_SECRET com os mesmos valores do servidor principal antes de continuar."
    Write-Host "Pressione ENTER depois de salvar o .env para continuar (ou Ctrl+C para sair e terminar depois)..." -ForegroundColor Yellow
    Read-Host | Out-Null
} else {
    Write-Ok ".env ja existe nesta pasta (mantendo como esta)."
}

# --- 6. Tarefa Agendada: iniciar no boot com auto-restart --------------------
Write-Step "Configurando inicio automatico no boot (Tarefa Agendada: $TaskName)"

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Warn "Ja existia uma tarefa '$TaskName'. Substituindo pela configuracao atual."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$action = New-ScheduledTaskAction -Execute (Join-Path $Root 'start-worker.bat') -WorkingDirectory $Root
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
    -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Write-Ok "Tarefa '$TaskName' criada: inicia sozinha a cada boot da maquina, roda como SYSTEM, reinicia automaticamente se cair."

# --- 7. Subir agora -----------------------------------------------------------
Write-Step "Iniciando o worker agora"
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 3
$info = Get-ScheduledTaskInfo -TaskName $TaskName
Write-Ok "Worker iniciado (LastTaskResult: $($info.LastTaskResult))."

Write-Host "`n==================================================================="
Write-Host "  Instalacao concluida!" -ForegroundColor Green
Write-Host "  Esta maquina vai iniciar o worker sozinha a cada boot, mesmo sem login."
Write-Host "  Confira a conexao no painel ADM > Render Farm do Viral Factory."
Write-Host "  Para gerenciar manualmente: Agendador de Tarefas > '$TaskName'."
Write-Host "==================================================================="
