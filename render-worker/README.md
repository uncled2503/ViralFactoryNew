# 🚀 Viral Factory - Render Worker Remoto Independente

Este é o **Render Worker** independente e distribuído para o **Viral Factory SaaS**. 

A nova arquitetura distribui o processamento pesado de vídeos (FFmpeg) para máquinas externas dedicadas. O Worker se comunica em tempo real via **WebSockets** com o backend do SaaS, recebe tarefas de renderização, baixa os assets necessários, executa o pipeline, faz o upload dos arquivos gerados e se limpa automaticamente.

---

## ✨ Características do Worker
* **Independência Completa**: Roda em qualquer máquina (Windows, Linux ou VPS) com Node.js instalado.
* **Comunicação em Tempo Real**: Conexão persistente via WebSockets com reconexão automática e envio de Heartbeats contendo telemetria do sistema (Uso de CPU, RAM e OS).
* **Consumo de Memória Zero**: Utiliza pipes de streaming binário para download de ativos e upload de vídeos prontos, mantendo o consumo de memória RAM virtualmente nulo durante grandes transferências de arquivo.
* **Pipeline FFmpeg Idêntico**: Compila e processa os mesmos grafos visuais avançados, trilhas de áudio dinâmicas, animações e legendas sincronizadas palavra por palavra criadas no SaaS.
* **Auto-limpeza**: Remove de forma automática e imediata todos os arquivos temporários após a conclusão ou falha de uma tarefa, prevenindo vazamentos de espaço em disco.

---

## 📋 Pré-requisitos

1. **Node.js** (Versão 18 ou superior)
2. **FFmpeg** instalado na máquina.
   * *Linux (Ubuntu/Debian)*: `sudo apt update && sudo apt install -y ffmpeg`
   * *macOS*: `brew install ffmpeg`
   * *Windows*: Baixe o FFmpeg oficial, extraia-o e adicione a pasta `/bin` nas variáveis de ambiente do seu sistema (`PATH`).

---

## ⚙ Instalação e Execução

### 1. Clonar ou mover a pasta do Worker
Mova a pasta `render-worker` para a máquina de destino desejada (pode ser o seu computador local, uma VPS, um servidor dedicado, etc.).

### 2. Instalar as dependências
Abra o terminal na pasta `render-worker` e execute:
```bash
npm install
```

### 3. Configurar as Variáveis de Ambiente
Duplique o arquivo `.env.example` e mude o nome para `.env`:
```bash
cp .env.example .env
```

Abra o arquivo `.env` e configure os seguintes parâmetros:
```env
# O endereço HTTP e WebSocket do seu Viral Factory SaaS backend
API_URL=http://<IP-DO-SEU-SAAS>:3000
WS_URL=ws://<IP-DO-SEU-SAAS>:3000/ws/worker

# (Opcional) Nome amigável para identificar essa máquina no Dashboard do SaaS
WORKER_ID=vps-high-performance-01

# (Opcional) Caso o FFmpeg não esteja no PATH global, especifique o caminho completo
# FFMPEG_PATH=/usr/bin/ffmpeg
```

### 4. Iniciar o Worker
Com tudo configurado, basta iniciar o serviço:
```bash
npm start
```

---

## 📊 Estrutura de Comunicação (WebSocket Protocol)

O worker e o SaaS se comunicam através de payloads JSON estruturados:
* **`register` (Worker -> SaaS)**: Registra o worker no cluster de processamento enviando nome, sistema operacional e RAM total.
* **`heartbeat` (Worker -> SaaS)**: Enviado a cada 10s para reportar uso de CPU e RAM ativos.
* **`start_job` (SaaS -> Worker)**: Envia o payload da camada, preset de exportação e duração para iniciar o render.
* **`job_progress` (Worker -> SaaS)**: Atualiza o progresso em tempo real (`Preparing` -> `Rendering` -> `Encoding` -> `Saving`).
* **`job_completed` (Worker -> SaaS)**: Envia a confirmação de conclusão junto com as URLs do MP4 final, thumbnail e preview gerados.
* **`job_failed` (Worker -> SaaS)**: Notifica o SaaS sobre falhas durante o render para liberar o worker e notificar o usuário.
* **`abort_job` (SaaS -> Worker)**: Força a interrupção de um processo ativo do FFmpeg caso o usuário cancele a renderização no painel.
