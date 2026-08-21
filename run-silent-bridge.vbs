Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
currentDir = FSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = currentDir

' Check if node is available, otherwise run CardReader.exe --server
On Error Resume Next
WshShell.Run "cmd /c node """ & currentDir & "\smartcard-bridge.js""", 0, False
If Err.Number <> 0 Then
    WshShell.Run """" & currentDir & "\CardReader.exe"" --server", 0, False
End If
