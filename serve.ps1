$root = Join-Path $PSScriptRoot "public"
$prefix = "http://localhost:3456/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Birthday site running at $prefix" -ForegroundColor Cyan

$mime = @{
  ".html"=  "text/html"
  ".css" =  "text/css"
  ".js"  =  "application/javascript"
  ".jpg" =  "image/jpeg"
  ".jpeg"=  "image/jpeg"
  ".png" =  "image/png"
  ".gif" =  "image/gif"
  ".svg" =  "image/svg+xml"
  ".ico" =  "image/x-icon"
}

while ($listener.IsListening) {
  $ctx  = $listener.GetContext()
  $req  = $ctx.Request
  $res  = $ctx.Response
  $path = $req.Url.LocalPath -replace '/', '\'
  if ($path -eq '\') { $path = '\index.html' }
  $file = Join-Path $root $path.TrimStart('\')
  if (Test-Path $file -PathType Leaf) {
    $ext  = [IO.Path]::GetExtension($file).ToLower()
    $ct   = if ($mime[$ext]) { $mime[$ext] } else { "application/octet-stream" }
    $bytes = [IO.File]::ReadAllBytes($file)
    $res.ContentType   = $ct
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $res.StatusCode = 404
  }
  $res.OutputStream.Close()
}
