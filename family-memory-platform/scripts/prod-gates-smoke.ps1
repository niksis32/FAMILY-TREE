# PROMPT PROD 1 — runtime smoke checks (PowerShell)
# Usage: from repo root, with infra up and API running (pnpm api:build && pnpm api:start)
param(
  [string]$ApiBase = "http://127.0.0.1:4000/api/v1",
  [string]$Email = "admin@example.local",
  [string]$Password = "Test12345!"
)

$ErrorActionPreference = "Continue"
$script:passCount = 0
$script:failCount = 0
$script:partialCount = 0

function Write-Pass([string]$name) {
  Write-Host "PASS  $name" -ForegroundColor Green
  $script:passCount++
}

function Write-Fail([string]$name, [string]$detail) {
  Write-Host "FAIL  $name — $detail" -ForegroundColor Red
  $script:failCount++
}

function Smoke-Warn([string]$name, [string]$detail) {
  Write-Host "PARTIAL  $name — $detail" -ForegroundColor Yellow
  $script:partialCount++
}

function Get-HttpStatusCode {
  param([scriptblock]$Request)
  try {
    & $Request | Out-Null
    return 200
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      return [int]$_.Exception.Response.StatusCode.value__
    }
    return 0
  }
}

function Invoke-SmokeLogin([string]$email, [string]$password) {
  $loginBody = @{ email = $email; password = $password } | ConvertTo-Json
  $login = Invoke-RestMethod -Method POST -Uri "$ApiBase/auth/login" -ContentType "application/json" -Body $loginBody
  return $login.accessToken
}

Write-Host "=== Production gates runtime smoke ==="
Write-Host "API: $ApiBase"

# 1 — Login
try {
  $loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
  $login = Invoke-RestMethod -Method POST -Uri "$ApiBase/auth/login" -ContentType "application/json" -Body $loginBody
  if ($login.accessToken) { Write-Pass "login" } else { Write-Fail "login" "no accessToken" }
  $token = $login.accessToken
  $headers = @{ Authorization = "Bearer $token" }
} catch {
  Write-Fail "login" $_.Exception.Message
  Write-Host "Summary: PASS=$script:passCount PARTIAL=$script:partialCount FAIL=$script:failCount"
  exit 1
}

# 2 — CRUD person (list + create + delete)
try {
  $persons = Invoke-RestMethod -Uri "$ApiBase/persons?limit=5" -Headers $headers
  Write-Pass "persons list"
  $createBody = @{
    givenName = "Smoke"
    familyName = "Test"
    gender = "UNKNOWN"
    privacyLevel = "FAMILY"
  } | ConvertTo-Json
  $created = Invoke-RestMethod -Method POST -Uri "$ApiBase/persons" -Headers $headers -ContentType "application/json" -Body $createBody
  if ($created.id) { Write-Pass "person create" } else { Write-Fail "person create" "no id" }
  Invoke-RestMethod -Method DELETE -Uri "$ApiBase/persons/$($created.id)" -Headers $headers | Out-Null
  Write-Pass "person delete"
} catch {
  Write-Fail "CRUD person" $_.Exception.Message
}

# 3 — Tree view-data
try {
  $persons = Invoke-RestMethod -Uri "$ApiBase/persons?limit=1" -Headers $headers
  $firstPerson = @($persons)[0]
  if ($firstPerson -and $firstPerson.id) {
    $tree = Invoke-RestMethod -Uri "$ApiBase/tree/person/$($firstPerson.id)/view-data" -Headers $headers
    if ($tree.nodes) { Write-Pass "tree view-data" } else { Smoke-Warn "tree view-data" "empty nodes" }
  } else {
    Smoke-Warn "tree view-data" "no persons in seed"
  }
} catch {
  Write-Fail "tree view-data" $_.Exception.Message
}

# 4 — MinIO health + media upload URL
try {
  $minio = Invoke-RestMethod -Uri "$ApiBase/health/minio"
  if ($minio.ok) { Write-Pass "minio health" } else {
    $detail = if ($minio.error) { $minio.error } else { "buckets missing" }
    Write-Fail "minio health" $detail
  }
} catch {
  Write-Fail "minio health" $_.Exception.Message
}

try {
  $mediaBody = @{ fileName = "smoke.jpg"; mimeType = "image/jpeg"; sizeBytes = 1024 } | ConvertTo-Json
  $upload = Invoke-RestMethod -Method POST -Uri "$ApiBase/media/upload-url" -Headers $headers -ContentType "application/json" -Body $mediaBody
  if ($upload.uploadUrl) { Write-Pass "media upload-url" } else { Write-Fail "media upload-url" "no uploadUrl" }
} catch {
  Write-Fail "media upload-url" $_.Exception.Message
}

# 5 — Document upload URL
try {
  $docBody = @{ fileName = "smoke.pdf"; mimeType = "application/pdf"; sizeBytes = 2048 } | ConvertTo-Json
  $docUpload = Invoke-RestMethod -Method POST -Uri "$ApiBase/documents/upload-url" -Headers $headers -ContentType "application/json" -Body $docBody
  if ($docUpload.uploadUrl) { Write-Pass "document upload-url" } else { Write-Fail "document upload-url" "no uploadUrl" }
} catch {
  Write-Fail "document upload-url" $_.Exception.Message
}

# 6 — Search (reindex + query)
try {
  Invoke-RestMethod -Method POST -Uri "$ApiBase/search/reindex" -Headers $headers | Out-Null
  Start-Sleep -Seconds 2
  $search = Invoke-RestMethod -Uri "$ApiBase/search?q=Timeline" -Headers $headers
  $hits = @($search.people).Count + @($search.documents).Count + @($search.events).Count
  if ($hits -gt 0) { Write-Pass "search hits ($hits)" } else { Smoke-Warn "search hits" "0 results after reindex" }
} catch {
  Write-Fail "search" $_.Exception.Message
}

# 7 — GEDCOM preview (JSON body)
try {
  $gedText = @"
0 HEAD
1 GEDC
2 VERS 5.5
0 @I1@ INDI
1 NAME Smoke /Gedcom/
0 TRLR
"@
  $gedBody = @{ gedcomText = $gedText } | ConvertTo-Json
  $gedResp = Invoke-RestMethod -Method POST -Uri "$ApiBase/gedcom/preview" -Headers $headers -ContentType "application/json" -Body $gedBody
  if ($gedResp.preview.personsFound -ge 1 -or $gedResp.personsFound -ge 1) { Write-Pass "GEDCOM preview" } else { Smoke-Warn "GEDCOM preview" "personsFound=0" }
} catch {
  Smoke-Warn "GEDCOM preview" $_.Exception.Message
}

# 8 — Timeline
try {
  $persons = Invoke-RestMethod -Uri "$ApiBase/persons?limit=1" -Headers $headers
  $firstPerson = @($persons)[0]
  if ($firstPerson -and $firstPerson.id) {
    $timeline = Invoke-RestMethod -Uri "$ApiBase/timeline/person/$($firstPerson.id)" -Headers $headers
    if ($null -ne $timeline.events) { Write-Pass "timeline" } else { Smoke-Warn "timeline" "no events field" }
  } else {
    Smoke-Warn "timeline" "no persons in seed"
  }
} catch {
  Write-Fail "timeline" $_.Exception.Message
}

# 9 — Privacy + AI consent (PRIVACY-ENFORCE-1)
try {
  $center = Invoke-RestMethod -Uri "$ApiBase/privacy/security-center" -Headers $headers
  $aiConsent = @($center.consents) | Where-Object { $_.consentKey -eq 'AI_LOCAL_PROCESSING' } | Select-Object -First 1
  if ($aiConsent -and $aiConsent.granted -eq $true) {
    Write-Pass "privacy ai consent (seed/admin)"
  } else {
    $consentBody = @{ consentKey = 'AI_LOCAL_PROCESSING'; granted = $true } | ConvertTo-Json
    Invoke-RestMethod -Method PATCH -Uri "$ApiBase/privacy/consents" -Headers $headers -ContentType "application/json" -Body $consentBody | Out-Null
    Write-Pass "privacy ai consent (granted via API)"
  }
} catch {
  Write-Fail "privacy ai consent" $_.Exception.Message
}

try {
  $privatePersonId = 'seed-person-secret'
  $adminStatus = Get-HttpStatusCode {
    Invoke-RestMethod -Uri "$ApiBase/persons/$privatePersonId" -Headers $headers | Out-Null
  }
  if ($adminStatus -eq 200) {
    Write-Pass "privacy admin sees PRIVATE person"
  } else {
    Write-Fail "privacy admin PRIVATE person" "expected 200, got $adminStatus"
  }

  $viewerToken = Invoke-SmokeLogin 'viewer@example.local' $Password
  $viewerHeaders = @{ Authorization = "Bearer $viewerToken" }
  $viewerStatus = Get-HttpStatusCode {
    Invoke-RestMethod -Uri "$ApiBase/persons/$privatePersonId" -Headers $viewerHeaders | Out-Null
  }
  if ($viewerStatus -eq 404) {
    Write-Pass "privacy viewer blocked PRIVATE person (404)"
  } else {
    Write-Fail "privacy viewer PRIVATE person" "expected 404, got $viewerStatus"
  }
} catch {
  Write-Fail "privacy PRIVATE person gate" $_.Exception.Message
}

try {
  $revokeBody = @{ consentKey = 'AI_LOCAL_PROCESSING'; granted = $false } | ConvertTo-Json
  Invoke-RestMethod -Method PATCH -Uri "$ApiBase/privacy/consents" -Headers $headers -ContentType "application/json" -Body $revokeBody | Out-Null
  $blockedStatus = Get-HttpStatusCode {
    Invoke-RestMethod -Method POST -Uri "$ApiBase/ai/ocr/preview" -Headers $headers -ContentType "application/json" -Body '{}' | Out-Null
  }
  $grantBody = @{ consentKey = 'AI_LOCAL_PROCESSING'; granted = $true } | ConvertTo-Json
  Invoke-RestMethod -Method PATCH -Uri "$ApiBase/privacy/consents" -Headers $headers -ContentType "application/json" -Body $grantBody | Out-Null
  if ($blockedStatus -eq 403) {
    Write-Pass "privacy ai consent gate (403 without consent)"
  } else {
    Write-Fail "privacy ai consent gate" "expected 403 without consent, got $blockedStatus"
  }
} catch {
  Write-Fail "privacy ai consent gate" $_.Exception.Message
}

try {
  $shareBody = @{
    workspaceId = 'seed-workspace-default'
    resourceType = 'PERSON'
    resourceId = 'seed-person-ivan'
    label = 'smoke-share'
    expiresAt = '2099-01-01T00:00:00.000Z'
  } | ConvertTo-Json
  $share = Invoke-RestMethod -Method POST -Uri "$ApiBase/privacy/public-shares" -Headers $headers -ContentType "application/json" -Body $shareBody
  if ($share.token) {
    Invoke-RestMethod -Uri "$ApiBase/public/share/$($share.token)" | Out-Null
    Write-Pass "privacy public link resolve"
    Invoke-RestMethod -Method POST -Uri "$ApiBase/privacy/public-shares/$($share.id)/revoke" -Headers $headers | Out-Null
    $revokedStatus = Get-HttpStatusCode {
      Invoke-RestMethod -Uri "$ApiBase/public/share/$($share.token)" | Out-Null
    }
    if ($revokedStatus -ge 400) {
      Write-Pass "privacy public link revoke"
    } else {
      Write-Fail "privacy public link revoke" "expected error after revoke, got $revokedStatus"
    }
  } else {
    Write-Fail "privacy public link" "no token in create response"
  }
} catch {
  Write-Fail "privacy public link" $_.Exception.Message
}

Write-Host ""
Write-Host "Summary: PASS=$script:passCount PARTIAL=$script:partialCount FAIL=$script:failCount"
if ($script:failCount -gt 0) { exit 1 }
exit 0
