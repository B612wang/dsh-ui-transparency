# Whole-window alpha applier for the DeepSeek Harness window.
# Protocol: one integer 0-255 per line on stdin; "quit" or EOF exits.
# 255 restores the original window style, so nothing is left layered.

$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class DshWindowAlpha
{
    [DllImport("user32.dll")]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll")]
    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetLayeredWindowAttributes(IntPtr hwnd, uint crKey, byte bAlpha, uint dwFlags);

    [DllImport("user32.dll")]
    public static extern bool IsWindow(IntPtr hWnd);
}
'@

$GWL_EXSTYLE = -20
$WS_EX_LAYERED = 0x00080000
$LWA_ALPHA = 0x00000002

$script:window = [IntPtr]::Zero

function Get-TargetWindow {
    if ($script:window -ne [IntPtr]::Zero -and [DshWindowAlpha]::IsWindow($script:window)) {
        return $script:window
    }
    $target = Get-Process -ErrorAction SilentlyContinue |
        Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero -and $_.ProcessName -like '*DeepSeek*' } |
        Select-Object -First 1
    if ($null -eq $target) { return [IntPtr]::Zero }
    return $target.MainWindowHandle
}

function Set-WindowAlpha([int]$alpha) {
    $target = Get-TargetWindow
    if ($target -eq [IntPtr]::Zero) {
        return '{"ok":false,"error":"window-not-found"}'
    }

    $style = [DshWindowAlpha]::GetWindowLong($target, $GWL_EXSTYLE)

    if ($alpha -ge 255) {
        if (($style -band $WS_EX_LAYERED) -ne 0) {
            [void][DshWindowAlpha]::SetLayeredWindowAttributes($target, 0, 255, $LWA_ALPHA)
            [void][DshWindowAlpha]::SetWindowLong($target, $GWL_EXSTYLE, ($style -band (-bnot $WS_EX_LAYERED)))
        }
        $script:window = [IntPtr]::Zero
        return '{"ok":true,"alpha":255}'
    }

    if (($style -band $WS_EX_LAYERED) -eq 0) {
        [void][DshWindowAlpha]::SetWindowLong($target, $GWL_EXSTYLE, ($style -bor $WS_EX_LAYERED))
    }
    [void][DshWindowAlpha]::SetLayeredWindowAttributes($target, 0, [byte]$alpha, $LWA_ALPHA)
    $script:window = $target
    return ('{"ok":true,"alpha":' + $alpha + '}')
}

while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    $line = $line.Trim()
    if ($line.Length -eq 0) { continue }
    if ($line -eq 'quit') { break }

    $alpha = 0
    if (-not [int]::TryParse($line, [ref]$alpha)) {
        [Console]::Out.WriteLine('{"ok":false,"error":"bad-alpha"}')
        [Console]::Out.Flush()
        continue
    }
    if ($alpha -lt 0) { $alpha = 0 }
    if ($alpha -gt 255) { $alpha = 255 }

    try {
        [Console]::Out.WriteLine((Set-WindowAlpha -alpha $alpha))
    } catch {
        $message = $_.Exception.Message -replace '\\', '/' -replace '"', "'"
        [Console]::Out.WriteLine('{"ok":false,"error":"' + $message + '"}')
    }
    [Console]::Out.Flush()
}
