$ErrorActionPreference = 'Stop'
# 版本及校验值与 @tauri-apps/cli 2.12.0 的打包工具一致。
$downloadDirectory = Join-Path $env:RUNNER_TEMP 'island-nsis-download'
$toolsDirectory = Join-Path $env:LOCALAPPDATA 'tauri'
New-Item -ItemType Directory -Force -Path $downloadDirectory, $toolsDirectory | Out-Null

function Get-VerifiedReleaseAsset($Repository, $Tag, $Name, $ExpectedHash) {
    $destination = Join-Path $downloadDirectory $Name
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        gh release download $Tag --repo $Repository --pattern $Name --dir $downloadDirectory --clobber
        if ($LASTEXITCODE -eq 0) {
            if ((Get-FileHash -LiteralPath $destination -Algorithm SHA1).Hash -ne $ExpectedHash) {
                throw "Downloaded asset checksum mismatch: $Name"
            }
            return $destination
        }
        if ($attempt -eq 3) { throw "Unable to download official release asset: $Name" }
        Start-Sleep -Seconds 2
    }
}

$archive = Get-VerifiedReleaseAsset 'tauri-apps/binary-releases' 'nsis-3.11' 'nsis-3.11.zip' 'EF7FF767E5CBD9EDD22ADD3A32C9B8F4500BB10D'
$plugin = Get-VerifiedReleaseAsset 'tauri-apps/nsis-tauri-utils' 'nsis_tauri_utils-v0.5.3' 'nsis_tauri_utils.dll' '75197FEE3C6A814FE035788D1C34EAD39349B860'
Expand-Archive -LiteralPath $archive -DestinationPath $downloadDirectory -Force
$nsisDirectory = Join-Path $toolsDirectory 'NSIS'
New-Item -ItemType Directory -Force -Path $nsisDirectory | Out-Null
Copy-Item -Path (Join-Path $downloadDirectory 'nsis-3.11/*') -Destination $nsisDirectory -Recurse -Force
$pluginDirectory = Join-Path $nsisDirectory 'Plugins/x86-unicode/additional'
New-Item -ItemType Directory -Force -Path $pluginDirectory | Out-Null
Copy-Item -LiteralPath $plugin -Destination (Join-Path $pluginDirectory 'nsis_tauri_utils.dll') -Force
Write-Output 'Official NSIS tools downloaded and verified.'
