$repoPath = "C:\www\ChangeThis"
$todoFile = "$repoPath\AI_TODO.md"
$logFile = "$repoPath\logs\agent.log"
$logDir = Split-Path -Path $logFile -Parent

if (!(Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

if (!(Get-Command codex -ErrorAction SilentlyContinue)) {
  Add-Content $logFile "$(Get-Date -Format "yyyy-MM-dd HH:mm:ss") - codex command not found in PATH"
  exit 1
}

# ✔ Ajout du modèle par défaut
$model = "gpt-5.3-codex-spark"

while ($true) {
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

  if (!(Test-Path $todoFile)) {
    Add-Content $logFile "$timestamp - AI_TODO.md not found"
    Start-Sleep -Seconds 60
    continue
  }

  $content = Get-Content $todoFile -Raw

  if ($content -match "(?m)^- \[ \]") {
    Add-Content $logFile "$timestamp - Task detected -> running Codex"

    # ✔ Détection du quota
    $status = codex /status 2>&1

    if ($status -match "less than 5%") {
      $model = "gpt-5.3-codex-spark-low"
    }
    else {
      $model = "gpt-5.3-codex-spark"
    }

    codex "/model $model /auto Traite la prochaine tâche dans AI_TODO.md"
  }
  else {
    Add-Content $logFile "$timestamp - No pending task"
  }

  Start-Sleep -Seconds 60
}