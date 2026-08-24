using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Runtime.InteropServices;
using System.Collections.Generic;

namespace ThaiCardReader {
    class Program {
        [StructLayout(LayoutKind.Sequential)]
        public struct SCARD_IO_REQUEST {
            public uint dwProtocol;
            public uint cbPciLength;
        }

        [DllImport("winscard.dll")]
        static extern int SCardEstablishContext(uint dwScope, IntPtr pvReserved1, IntPtr pvReserved2, out IntPtr phContext);

        [DllImport("winscard.dll", EntryPoint = "SCardListReadersW", CharSet = CharSet.Unicode)]
        static extern int SCardListReaders(IntPtr hContext, string mszGroups, byte[] mszReaders, ref int pcchReaders);

        [DllImport("winscard.dll", EntryPoint = "SCardConnectW", CharSet = CharSet.Unicode)]
        static extern int SCardConnect(IntPtr hContext, string szReader, uint dwShareMode, uint dwPreferredProtocols, out IntPtr phCard, out uint pdwActiveProtocol);

        [DllImport("winscard.dll", EntryPoint = "SCardReconnect")]
        static extern int SCardReconnect(IntPtr hCard, uint dwShareMode, uint dwPreferredProtocols, uint dwInitialization, out uint pdwActiveProtocol);

        [DllImport("winscard.dll")]
        static extern int SCardDisconnect(IntPtr hCard, uint dwDisposition);

        [DllImport("winscard.dll")]
        static extern int SCardReleaseContext(IntPtr phContext);

        [DllImport("winscard.dll")]
        static extern int SCardTransmit(IntPtr hCard, ref SCARD_IO_REQUEST pioSendPci, byte[] pbSendBuffer, int cbSendLength, IntPtr pioRecvPci, byte[] pbRecvBuffer, ref int pcbRecvLength);

        private static readonly object _cardLock = new object();

        static void Main(string[] args) {
            Console.OutputEncoding = Encoding.UTF8;

            int port = 8181;

            if (args.Length > 0 && (args[0] == "--health" || args[0] == "-h" || args[0] == "/health" || args[0] == "--status")) {
                string statusJson = CheckReaderStatusJson();
                Console.WriteLine(statusJson);
                return;
            }

            if (args.Length > 0 && (args[0] == "--read-once" || args[0] == "-r")) {
                string json = ReadThaiCardJson();
                Console.WriteLine(json);
                return;
            }

            for (int i = 0; i < args.Length; i++) {
                int p;
                if (int.TryParse(args[i], out p) && p > 1000 && p < 65535) {
                    port = p;
                }
            }

            StartTcpServer(port);
        }

        public static string CheckReaderStatusJson() {
            lock (_cardLock) {
                IntPtr hContext = IntPtr.Zero;
                try {
                    int ret = SCardEstablishContext(2, IntPtr.Zero, IntPtr.Zero, out hContext);
                    if (ret != 0) {
                        return "{\"status\":\"no_reader\",\"error\":\"SCardEstablishContext failed (" + ret + ")\",\"readers\":[]}";
                    }

                    int pcchReaders = 0;
                    ret = SCardListReaders(hContext, null, null, ref pcchReaders);
                    if (ret != 0 || pcchReaders <= 0) {
                        return "{\"status\":\"no_reader\",\"message\":\"No smart card readers detected\",\"readers\":[]}";
                    }

                    byte[] readersBuffer = new byte[pcchReaders * 2];
                    ret = SCardListReaders(hContext, null, readersBuffer, ref pcchReaders);
                    if (ret != 0) {
                        return "{\"status\":\"no_reader\",\"message\":\"Failed to list readers\",\"readers\":[]}";
                    }

                    string readersStr = Encoding.Unicode.GetString(readersBuffer);
                    string[] readerList = readersStr.Split(new char[] { '\0' }, StringSplitOptions.RemoveEmptyEntries);

                    if (readerList.Length == 0) {
                        return "{\"status\":\"no_reader\",\"message\":\"No readers available\",\"readers\":[]}";
                    }

                    bool anyCardPresent = false;
                    string activeReaderName = readerList[0];

                    foreach (string rName in readerList) {
                        IntPtr hCard = IntPtr.Zero;
                        uint activeProto = 0;
                        int connRet = SCardConnect(hContext, rName, 2, 3, out hCard, out activeProto);
                        if (connRet == 0 && hCard != IntPtr.Zero) {
                            anyCardPresent = true;
                            activeReaderName = rName;
                            SCardDisconnect(hCard, 0);
                            break;
                        }
                    }

                    StringBuilder sb = new StringBuilder();
                    sb.Append("{\"status\":\"ready\",\"card_present\":").Append(anyCardPresent ? "true" : "false");
                    sb.Append(",\"primary_reader\":\"").Append(EscapeJson(activeReaderName)).Append("\"");
                    sb.Append(",\"readers\":[");
                    for (int i = 0; i < readerList.Length; i++) {
                        if (i > 0) sb.Append(",");
                        sb.Append("\"").Append(EscapeJson(readerList[i])).Append("\"");
                    }
                    sb.Append("]}");
                    return sb.ToString();
                } catch (Exception ex) {
                    return "{\"status\":\"error\",\"error\":\"" + EscapeJson(ex.Message) + "\",\"readers\":[]}";
                } finally {
                    if (hContext != IntPtr.Zero) SCardReleaseContext(hContext);
                }
            }
        }

        public static string ReadThaiCardJson() {
            lock (_cardLock) {
                IntPtr hContext = IntPtr.Zero;

                try {
                    int ret = SCardEstablishContext(2, IntPtr.Zero, IntPtr.Zero, out hContext);
                    if (ret != 0) return "{\"error\":\"ไม่พบบริการ Smart Card Service ใน Windows (Error: " + ret + ")\"}";

                    int pcchReaders = 0;
                    ret = SCardListReaders(hContext, null, null, ref pcchReaders);
                    if (ret != 0 || pcchReaders <= 0) return "{\"error\":\"ไม่พบเครื่องอ่านบัตร Smart Card (กรุณาเสียบสาย USB เครื่องอ่านบัตร)\"}";

                    byte[] readersBuffer = new byte[pcchReaders * 2];
                    ret = SCardListReaders(hContext, null, readersBuffer, ref pcchReaders);
                    if (ret != 0) return "{\"error\":\"ไม่สามารถระบุรายชื่อเครื่องอ่านบัตรได้\"}";

                    string readersStr = Encoding.Unicode.GetString(readersBuffer);
                    string[] readerList = readersStr.Split(new char[] { '\0' }, StringSplitOptions.RemoveEmptyEntries);
                    if (readerList.Length == 0) return "{\"error\":\"ไม่พบเครื่องอ่านบัตรที่พร้อมใช้งาน\"}";

                    foreach (string readerName in readerList) {
                        IntPtr hCard = IntPtr.Zero;
                        uint activeProto = 0;

                        ret = SCardConnect(hContext, readerName, 2, 3, out hCard, out activeProto);
                        if (ret != 0 || hCard == IntPtr.Zero) {
                            continue;
                        }

                        try {
                            SCARD_IO_REQUEST pci = new SCARD_IO_REQUEST { dwProtocol = activeProto, cbPciLength = 8 };

                            // 1. Select Thai Card Applet
                            byte[] cmdSelectApplet = new byte[] { 0x00, 0xA4, 0x04, 0x00, 0x08, 0xA0, 0x00, 0x00, 0x00, 0x54, 0x48, 0x00, 0x01 };
                            byte[] recvBuf = new byte[258];
                            int recvLen = recvBuf.Length;
                            int transRet = SCardTransmit(hCard, ref pci, cmdSelectApplet, cmdSelectApplet.Length, IntPtr.Zero, recvBuf, ref recvLen);

                            if (transRet != 0) {
                                SCardReconnect(hCard, 2, 3, 1, out activeProto);
                                pci.dwProtocol = activeProto;
                                transRet = SCardTransmit(hCard, ref pci, cmdSelectApplet, cmdSelectApplet.Length, IntPtr.Zero, recvBuf, ref recvLen);
                            }

                            if (transRet != 0) {
                                SCardDisconnect(hCard, 0);
                                continue;
                            }

                            // 2. Read CID (National ID)
                            string cid = ReadField(hCard, ref pci, new byte[] { 0x80, 0xb0, 0x00, 0x04, 0x02, 0x00, 0x0d }, 13);
                            if (string.IsNullOrEmpty(cid) || cid.Length != 13) {
                                SCardDisconnect(hCard, 0);
                                continue;
                            }

                            // 3. Read Full Name (Thai)
                            string nameThaiRaw = ReadField(hCard, ref pci, new byte[] { 0x80, 0xb0, 0x00, 0x11, 0x02, 0x00, 0x64 }, 100);

                            // 4. Read DOB & Gender
                            string dob = ReadField(hCard, ref pci, new byte[] { 0x80, 0xb0, 0x00, 0xD9, 0x02, 0x00, 0x08 }, 8);
                            string gender = ReadField(hCard, ref pci, new byte[] { 0x80, 0xb0, 0x00, 0xE1, 0x02, 0x00, 0x01 }, 1);

                            // 5. Read Address
                            string addressRaw = ReadField(hCard, ref pci, new byte[] { 0x80, 0xb0, 0x15, 0x79, 0x02, 0x00, 0x96 }, 150);

                            // 6. Read Issue & Expire Date
                            string issueDate = ReadField(hCard, ref pci, new byte[] { 0x80, 0xb0, 0x01, 0x67, 0x02, 0x00, 0x08 }, 8);
                            string expireDate = ReadField(hCard, ref pci, new byte[] { 0x80, 0xb0, 0x01, 0x6F, 0x02, 0x00, 0x08 }, 8);

                            // Parse fields
                            string[] nameParts = ParseThaiName(nameThaiRaw);
                            string title = nameParts[0];
                            string firstName = nameParts[1];
                            string lastName = nameParts[2];

                            string sex = (gender == "1") ? "ชาย" : (gender == "2" ? "หญิง" : "ไม่ระบุ");
                            string dobFormatted = FormatDob(dob);
                            string address = CleanAddress(addressRaw);

                            Console.WriteLine("[INFO] อ่านบัตรสำเร็จ: " + title + firstName + " " + lastName + " (" + cid + ")");

                            StringBuilder sb = new StringBuilder();
                            sb.Append("{");
                            sb.Append("\"status\":\"success\",");
                            sb.Append("\"cid\":\"").Append(EscapeJson(cid)).Append("\",");
                            sb.Append("\"title\":\"").Append(EscapeJson(title)).Append("\",");
                            sb.Append("\"first_name\":\"").Append(EscapeJson(firstName)).Append("\",");
                            sb.Append("\"last_name\":\"").Append(EscapeJson(lastName)).Append("\",");
                            sb.Append("\"sex\":\"").Append(EscapeJson(sex)).Append("\",");
                            sb.Append("\"dob\":\"").Append(EscapeJson(dobFormatted)).Append("\",");
                            sb.Append("\"address\":\"").Append(EscapeJson(address)).Append("\",");
                            sb.Append("\"issue_date\":\"").Append(EscapeJson(issueDate)).Append("\",");
                            sb.Append("\"expire_date\":\"").Append(EscapeJson(expireDate)).Append("\",");
                            sb.Append("\"reader\":\"").Append(EscapeJson(readerName)).Append("\",");
                            sb.Append("\"read_at\":\"").Append(DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")).Append("\"");
                            sb.Append("}");

                            SCardDisconnect(hCard, 0);
                            return sb.ToString();
                        } catch {
                            if (hCard != IntPtr.Zero) SCardDisconnect(hCard, 0);
                        }
                    }

                    return "{\"error\":\"ไม่พบบัตรประชาชนในเครื่องอ่าน หรือเสียบบัตรไม่สนิท (กรุณาตรวจสอบว่าหงายด้านชิปสีทองถูกต้องและเสียบให้สุด)\"}";
                } catch (Exception ex) {
                    return "{\"error\":\"" + EscapeJson(ex.Message) + "\"}";
                } finally {
                    if (hContext != IntPtr.Zero) SCardReleaseContext(hContext);
                }
            }
        }

        private static string ReadField(IntPtr hCard, ref SCARD_IO_REQUEST pci, byte[] apdu, int length) {
            byte[] recvBuf = new byte[258];
            int recvLen = recvBuf.Length;
            int ret = SCardTransmit(hCard, ref pci, apdu, apdu.Length, IntPtr.Zero, recvBuf, ref recvLen);

            if (ret != 0) {
                uint proto;
                SCardReconnect(hCard, 2, 3, 1, out proto);
                pci.dwProtocol = proto;
                ret = SCardTransmit(hCard, ref pci, apdu, apdu.Length, IntPtr.Zero, recvBuf, ref recvLen);
            }

            if (ret != 0) return "";

            // Direct response
            if (recvLen > 2 && recvBuf[recvLen - 2] == 0x90 && recvBuf[recvLen - 1] == 0x00) {
                Encoding tis = Encoding.GetEncoding(874);
                int payloadLen = Math.Min(length, recvLen - 2);
                return tis.GetString(recvBuf, 0, payloadLen).Trim();
            }

            // APDU 0x61 SW2 (Response Available)
            byte getLen = (byte)length;
            if (recvLen >= 2 && recvBuf[recvLen - 2] == 0x61) {
                getLen = recvBuf[recvLen - 1];
            }

            byte[] cmdGetData = new byte[] { 0x00, 0xC0, 0x00, 0x00, getLen };
            byte[] dataBuf = new byte[258];
            int dataLen = dataBuf.Length;
            ret = SCardTransmit(hCard, ref pci, cmdGetData, cmdGetData.Length, IntPtr.Zero, dataBuf, ref dataLen);
            if (ret != 0 || dataLen < 2) return "";

            Encoding tis620 = Encoding.GetEncoding(874);
            int validLen = Math.Min(length, dataLen - 2);
            return tis620.GetString(dataBuf, 0, validLen).Trim();
        }

        private static string[] ParseThaiName(string raw) {
            if (string.IsNullOrEmpty(raw)) return new string[] { "", "", "" };
            string[] parts = raw.Split(new char[] { '#' }, StringSplitOptions.RemoveEmptyEntries);
            string title = parts.Length > 0 ? parts[0].Trim() : "";
            string first = parts.Length > 1 ? parts[1].Trim() : "";
            string middle = parts.Length > 2 ? parts[2].Trim() : "";
            string last = parts.Length > 3 ? parts[3].Trim() : "";

            if (!string.IsNullOrEmpty(middle) && string.IsNullOrEmpty(last)) {
                last = middle;
            }
            return new string[] { title, first, last };
        }

        private static string FormatDob(string yyyymmdd) {
            if (string.IsNullOrEmpty(yyyymmdd) || yyyymmdd.Length < 8) return "";
            try {
                int yearBe = int.Parse(yyyymmdd.Substring(0, 4));
                int yearCe = yearBe > 2400 ? yearBe - 543 : yearBe;
                string mm = yyyymmdd.Substring(4, 2);
                string dd = yyyymmdd.Substring(6, 2);
                return string.Format("{0:D4}-{1}-{2}", yearCe, mm, dd);
            } catch {
                return "";
            }
        }

        private static string CleanAddress(string raw) {
            if (string.IsNullOrEmpty(raw)) return "";
            string cleaned = raw.Replace('#', ' ');
            cleaned = Regex.Replace(cleaned, @"\s+", " ").Trim();
            return cleaned;
        }

        private static string EscapeJson(string s) {
            if (string.IsNullOrEmpty(s)) return "";
            return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", "\\n");
        }

        public static void StartTcpServer(int port) {
            TcpListener server = null;
            try {
                server = new TcpListener(IPAddress.Any, port);
                server.Start();

                Console.WriteLine("===================================================================");
                Console.WriteLine("  Thai Smart Card Bridge (HTTP + WebSocket) is running on port " + port);
                Console.WriteLine("  Web App URL: http://127.0.0.1:" + port + "/app");
                Console.WriteLine("  WebSocket:   ws://127.0.0.1:" + port + "/ws");
                Console.WriteLine("  สถานะ: พร้อมให้บริการอ่านบัตรประชาชน (เปิดหน้าต่างนี้ทิ้งไว้ตลอดการใช้งาน)");
                Console.WriteLine("===================================================================");
                Console.WriteLine();

                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string htmlFilePath = Path.Combine(baseDir, "index.html");

                while (true) {
                    try {
                        TcpClient client = server.AcceptTcpClient();
                        ThreadPool.QueueUserWorkItem((state) => {
                            HandleTcpClient((TcpClient)state, htmlFilePath);
                        }, client);
                    } catch (Exception ex) {
                        Console.WriteLine("Accept Error: " + ex.Message);
                        Thread.Sleep(200);
                    }
                }
            } catch (Exception ex) {
                Console.WriteLine("Fatal Server Error: " + ex.Message);
                Console.WriteLine("กรุณาตรวจสอบว่ามีโปรแกรมอื่นใช้พอร์ต " + port + " อยู่หรือไม่");
                while (true) {
                    Thread.Sleep(3000);
                }
            }
        }

        private static void HandleTcpClient(TcpClient client, string htmlFilePath) {
            try {
                using (NetworkStream stream = client.GetStream()) {
                    stream.ReadTimeout = 5000;
                    byte[] buffer = new byte[8192];
                    int bytesRead = stream.Read(buffer, 0, buffer.Length);
                    if (bytesRead <= 0) return;

                    string requestStr = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                    string[] lines = requestStr.Split(new string[] { "\r\n" }, StringSplitOptions.None);
                    if (lines.Length == 0) return;

                    string firstLine = lines[0];
                    string[] tokens = firstLine.Split(' ');
                    if (tokens.Length < 2) return;

                    string method = tokens[0].ToUpper();
                    string path = tokens[1].ToLower();

                    // Check for WebSocket Upgrade
                    bool isWebSocket = false;
                    string wsKey = "";
                    foreach (string line in lines) {
                        if (line.ToLower().StartsWith("upgrade:") && line.ToLower().Contains("websocket")) {
                            isWebSocket = true;
                        }
                        if (line.ToLower().StartsWith("sec-websocket-key:")) {
                            wsKey = line.Substring(18).Trim();
                        }
                    }

                    if (isWebSocket && !string.IsNullOrEmpty(wsKey)) {
                        HandleWebSocketStream(stream, wsKey);
                        return;
                    }

                    // CORS Preflight OPTIONS
                    if (method == "OPTIONS") {
                        string optResponse = "HTTP/1.1 204 No Content\r\n" +
                            "Access-Control-Allow-Origin: *\r\n" +
                            "Access-Control-Allow-Private-Network: true\r\n" +
                            "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
                            "Access-Control-Allow-Headers: *\r\n" +
                            "Connection: close\r\n\r\n";
                        byte[] optBytes = Encoding.UTF8.GetBytes(optResponse);
                        stream.Write(optBytes, 0, optBytes.Length);
                        return;
                    }

                    // Serve HTML
                    if (path == "/" || path == "/app" || path == "/index.html" || path == "/opd") {
                        if (File.Exists(htmlFilePath)) {
                            byte[] htmlBytes = File.ReadAllBytes(htmlFilePath);
                            string header = "HTTP/1.1 200 OK\r\n" +
                                "Content-Type: text/html; charset=utf-8\r\n" +
                                "Access-Control-Allow-Origin: *\r\n" +
                                "Access-Control-Allow-Private-Network: true\r\n" +
                                "Content-Length: " + htmlBytes.Length + "\r\n" +
                                "Connection: close\r\n\r\n";
                            byte[] hBytes = Encoding.UTF8.GetBytes(header);
                            stream.Write(hBytes, 0, hBytes.Length);
                            stream.Write(htmlBytes, 0, htmlBytes.Length);
                        } else {
                            string msg = "index.html not found";
                            byte[] msgBytes = Encoding.UTF8.GetBytes(msg);
                            string header = "HTTP/1.1 404 Not Found\r\n" +
                                "Content-Type: text/plain; charset=utf-8\r\n" +
                                "Content-Length: " + msgBytes.Length + "\r\n" +
                                "Connection: close\r\n\r\n";
                            byte[] hBytes = Encoding.UTF8.GetBytes(header);
                            stream.Write(hBytes, 0, hBytes.Length);
                            stream.Write(msgBytes, 0, msgBytes.Length);
                        }
                        return;
                    }

                    // JSON API (/health or /read)
                    string jsonResponse = "";
                    if (path.Contains("health") || path.Contains("status")) {
                        jsonResponse = CheckReaderStatusJson();
                    } else {
                        jsonResponse = ReadThaiCardJson();
                    }

                    byte[] bodyBytes = Encoding.UTF8.GetBytes(jsonResponse);
                    string resHeader = "HTTP/1.1 200 OK\r\n" +
                        "Content-Type: application/json; charset=utf-8\r\n" +
                        "Access-Control-Allow-Origin: *\r\n" +
                        "Access-Control-Allow-Private-Network: true\r\n" +
                        "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
                        "Access-Control-Allow-Headers: *\r\n" +
                        "Content-Length: " + bodyBytes.Length + "\r\n" +
                        "Connection: close\r\n\r\n";

                    byte[] resHeaderBytes = Encoding.UTF8.GetBytes(resHeader);
                    stream.Write(resHeaderBytes, 0, resHeaderBytes.Length);
                    stream.Write(bodyBytes, 0, bodyBytes.Length);
                }
            } catch {
            } finally {
                try { client.Close(); } catch {}
            }
        }

        private static void HandleWebSocketStream(NetworkStream stream, string wsKey) {
            try {
                string acceptKey = Convert.ToBase64String(
                    SHA1.Create().ComputeHash(
                        Encoding.UTF8.GetBytes(wsKey + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
                    )
                );

                string response = "HTTP/1.1 101 Switching Protocols\r\n" +
                    "Upgrade: websocket\r\n" +
                    "Connection: Upgrade\r\n" +
                    "Sec-WebSocket-Accept: " + acceptKey + "\r\n\r\n";

                byte[] resBytes = Encoding.UTF8.GetBytes(response);
                stream.Write(resBytes, 0, resBytes.Length);

                string greeting = "{\"event\":\"connected\",\"message\":\"Thai Smart Card Bridge Ready\",\"status\":\"ok\"}";
                SendWebSocketFrame(stream, greeting);

                byte[] buffer = new byte[4096];
                while (true) {
                    int bytesRead = stream.Read(buffer, 0, buffer.Length);
                    if (bytesRead <= 0) break;

                    bool fin = (buffer[0] & 0x80) != 0;
                    int opcode = buffer[0] & 0x0F;

                    if (opcode == 0x8) break;

                    if (opcode == 0x1) {
                        bool isMasked = (buffer[1] & 0x80) != 0;
                        int payloadLen = buffer[1] & 0x7F;
                        int offset = 2;

                        if (payloadLen == 126) {
                            payloadLen = (buffer[2] << 8) | buffer[3];
                            offset = 4;
                        }

                        byte[] mask = new byte[4];
                        if (isMasked) {
                            Array.Copy(buffer, offset, mask, 0, 4);
                            offset += 4;
                        }

                        byte[] decoded = new byte[payloadLen];
                        for (int i = 0; i < payloadLen; i++) {
                            decoded[i] = (byte)(buffer[offset + i] ^ (isMasked ? mask[i % 4] : 0));
                        }

                        string incomingMsg = Encoding.UTF8.GetString(decoded).Trim();
                        string replyJson = "";

                        if (incomingMsg.Contains("health") || incomingMsg.Contains("status")) {
                            replyJson = CheckReaderStatusJson();
                        } else {
                            replyJson = ReadThaiCardJson();
                        }

                        SendWebSocketFrame(stream, replyJson);
                    }
                }
            } catch {
            }
        }

        private static void SendWebSocketFrame(NetworkStream stream, string text) {
            byte[] payload = Encoding.UTF8.GetBytes(text);
            byte[] frame;

            if (payload.Length <= 125) {
                frame = new byte[2 + payload.Length];
                frame[0] = 0x81;
                frame[1] = (byte)payload.Length;
                Array.Copy(payload, 0, frame, 2, payload.Length);
            } else if (payload.Length <= 65535) {
                frame = new byte[4 + payload.Length];
                frame[0] = 0x81;
                frame[1] = 126;
                frame[2] = (byte)((payload.Length >> 8) & 0xFF);
                frame[3] = (byte)(payload.Length & 0xFF);
                Array.Copy(payload, 0, frame, 4, payload.Length);
            } else {
                frame = new byte[10 + payload.Length];
                frame[0] = 0x81;
                frame[1] = 127;
                for (int i = 0; i < 8; i++) {
                    frame[2 + i] = (byte)((payload.Length >> ((7 - i) * 8)) & 0xFF);
                }
                Array.Copy(payload, 0, frame, 10, payload.Length);
            }

            stream.Write(frame, 0, frame.Length);
        }
    }
}
