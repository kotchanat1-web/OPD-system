const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const appData = process.env.APPDATA;
const startupDir = path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
const vbsPath = path.join(__dirname, 'run-silent-bridge.vbs');
const startupVbs = path.join(startupDir, 'OPD_SmartCard_Bridge.vbs');

const vbsContent = `Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "wscript.exe """ & "${vbsPath.replace(/\\/g, '\\\\')}" & """", 0, False
`;

try {
  fs.writeFileSync(startupVbs, vbsContent, 'utf8');
  console.log('[OK] Registered startup file successfully:', startupVbs);
} catch (err) {
  console.error('[ERR] Failed to write startup file:', err);
}

// Start the bridge silently now if not already running
exec(`netstat -ano | findstr 8181 | findstr LISTENING`, (err, stdout) => {
  if (!stdout || !stdout.includes('LISTENING')) {
    console.log('[INFO] Starting Smart Card Bridge service on port 8181...');
    exec(`wscript.exe "${vbsPath}"`, { cwd: __dirname });
  } else {
    console.log('[OK] Smart Card Bridge is already running on port 8181.');
  }
});
