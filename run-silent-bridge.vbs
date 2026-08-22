Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
currentDir = FSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = currentDir

On Error Resume Next
If FSO.FileExists(currentDir & "\CardReader.exe") Then
    WshShell.Run """" & currentDir & "\CardReader.exe"" --server 8181", 0, False
ElseIf FSO.FileExists(currentDir & "\smartcard-bridge.js") Then
    WshShell.Run "node """ & currentDir & "\smartcard-bridge.js""", 0, False
End If
