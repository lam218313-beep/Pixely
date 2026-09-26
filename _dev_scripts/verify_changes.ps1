# Script de Verificación de Cambios en App.tsx
# Este script verifica que los cambios se aplicaron correctamente

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 79) -ForegroundColor Cyan
Write-Host "VERIFICACIÓN DE CAMBIOS EN ESTRATEGIA/APP.TSX" -ForegroundColor Yellow
Write-Host ("=" * 80) -ForegroundColor Cyan

$filePath = "d:\0.- Pixely\4.- Pixely Frontend\frontend\layout\estrategia\App.tsx"

Write-Host "`n1️⃣ Verificando que el archivo existe..." -ForegroundColor Green
if (Test-Path $filePath) {
    Write-Host "   ✅ Archivo encontrado" -ForegroundColor Green
} else {
    Write-Host "   ❌ Archivo NO encontrado" -ForegroundColor Red
    exit 1
}

Write-Host "`n2️⃣ Verificando cambio de 'post' a 'concept'..." -ForegroundColor Green
$content = Get-Content $filePath -Raw
if ($content -match "newType = 'concept'; // Changed from 'post' to 'concept'") {
    Write-Host "   ✅ Cambio aplicado: newType = 'concept'" -ForegroundColor Green
} else {
    Write-Host "   ❌ Cambio NO encontrado" -ForegroundColor Red
}

Write-Host "`n3️⃣ Verificando labels 'Objetivo Principal/Secundario'..." -ForegroundColor Green
if ($content -match "Objetivo Principal" -and $content -match "Objetivo Secundario") {
    Write-Host "   ✅ Labels correctos encontrados" -ForegroundColor Green
} else {
    Write-Host "   ❌ Labels NO encontrados" -ForegroundColor Red
}

Write-Host "`n4️⃣ Verificando espaciado mejorado..." -ForegroundColor Green
if ($content -match "childDist = parent.type === 'main' \? 280 : 240") {
    Write-Host "   ✅ Espaciado aumentado a 280/240" -ForegroundColor Green
} else {
    Write-Host "   ❌ Espaciado NO actualizado" -ForegroundColor Red
}

Write-Host "`n5️⃣ Verificando typeLabel 'OBJETIVO'..." -ForegroundColor Green
if ($content -match "else if \(isSec\) typeLabel = `"OBJETIVO`";") {
    Write-Host "   ✅ TypeLabel 'OBJETIVO' encontrado" -ForegroundColor Green
} else {
    Write-Host "   ❌ TypeLabel NO encontrado" -ForegroundColor Red
}

Write-Host "`n6️⃣ Mostrando líneas clave del archivo..." -ForegroundColor Green
$lines = Get-Content $filePath
Write-Host "   Línea 398: $($lines[397])" -ForegroundColor Cyan
Write-Host "   Línea 416: $($lines[415])" -ForegroundColor Cyan
Write-Host "   Línea 406: $($lines[405])" -ForegroundColor Cyan

Write-Host "`n" -NoNewline
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "VERIFICACIÓN COMPLETADA" -ForegroundColor Yellow
Write-Host ("=" * 80) -ForegroundColor Cyan

Write-Host "`n💡 SOLUCIÓN: Si los cambios están aplicados pero no se ven:" -ForegroundColor Yellow
Write-Host "   1. Detén el servidor de desarrollo (Ctrl+C en la terminal)" -ForegroundColor White
Write-Host "   2. Elimina la carpeta node_modules/.vite (caché)" -ForegroundColor White
Write-Host "   3. Reinicia con: npm run dev" -ForegroundColor White
Write-Host "   4. Abre el navegador en modo incógnito o limpia caché (Ctrl+Shift+Del)" -ForegroundColor White
