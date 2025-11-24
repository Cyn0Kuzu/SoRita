# Fix kotlinVersion() issue in all Expo modules
$expoModules = Get-ChildItem -Path "node_modules" -Filter "build.gradle" -Recurse -Depth 3 | Where-Object { $_.FullName -like "*expo*android*" }

foreach ($file in $expoModules) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Fix kotlinVersion() method call
    if ($content -match 'ext\.kotlinVersion\(\)') {
        $content = $content -replace 'ext\.kotlinVersion\(\)', 'def kotlinVer = ext.kotlinVersion; if (kotlinVer instanceof Closure) { kotlinVer() } else { kotlinVer }'
        Write-Host "Fixed kotlinVersion in: $($file.FullName)"
    }
    
    # Fix compileSdkVersion issue - move it outside the if block
    if ($content -match 'if \(!safeExtGet\("expoProvidesDefaultConfig", false\)\) \{\s+compileSdkVersion') {
        $content = $content -replace '(android \{[^}]*?)if \(!safeExtGet\("expoProvidesDefaultConfig", false\)\) \{\s+compileSdkVersion safeExtGet\("compileSdkVersion", \d+\)', '$1compileSdkVersion 35'
        Write-Host "Fixed compileSdkVersion in: $($file.FullName)"
    }
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
    }
}

Write-Host "Expo modules fixed!"

