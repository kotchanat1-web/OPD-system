using System;
using System.IO;
using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Runtime.InteropServices;
using System.Collections.Generic;

namespace ThaiCardReader {
    class Program {
        [DllImport("winscard.dll")]
        static extern int SCardEstablishContext(uint dwScope, IntPtr pvReserved1, IntPtr pvReserved2, out IntPtr phContext);

        [DllImport("winscard.dll", EntryPoint = "SCardListReadersW", CharSet = CharSet.Unicode)]
        static extern int SCardListReaders(IntPtr hContext, string mszGroups, byte[] mszReaders, ref int pcchReaders);

        [DllImport("winscard.dll", EntryPoint = "SCardConnectW", CharSet = CharSet.Unicode)]
        static extern int SCardConnect(IntPtr hContext, string szReader, uint dwShareMode, uint dwPreferredProtocols, out IntPtr phCard, out uint pdwActiveProtocol);

        [DllImport("winscard.dll")]
        static extern int SCardDisconnect(IntPtr hCard, uint dwDisposition);

        [DllImport("winscard.dll")]
        static extern int SCardReleaseContext(IntPtr phContext);

        [DllImport("winscard.dll")]
        static extern int SCardTransmit(IntPtr hCard, IntPtr pioSendPci, byte[] pbSendBuffer, int cbSendLength, IntPtr pioRecvPci, byte[] pbRecvBuffer, ref int pcbRecvLength);

        [DllImport("kernel32.dll", SetLastError = true)]
        static extern IntPtr LoadLibrary(string lpFileName);

        [DllImport("kernel32.dll", SetLastError = true)]
        static extern IntPtr GetProcAddress(IntPtr hModule, string lpProcName);

        private static readonly object _cardLock = new object();
        private static readonly List<WebSocket> _activeWebSockets = new List<WebSocket>();
        private static readonly object _wsLock = new object();

        static void Main(string[] args) {
            Console.OutputEncoding = Encoding.UTF8;

            if (args.Length > 0 && (args[0] == "--server" || args[0] == "-s" || args[0] == "/server")) {
                int port = 8181;
                if (args.Length > 1) int.TryParse(args[1], out port);
                StartHttpServer(port);
                return;
            }

            if (args.Length > 0 && (args[0] == "--health" || args[0] == "-h" || args[0] == "/health" || args[0] == "--status")) {
                string statusJson = CheckReaderStatusJson();
                Console.WriteLine(statusJson);
                return;
            }

            string json = ReadThaiCardJson();
            Console.WriteLine(json);
        }

        public static List<string> GetReaderList(IntPtr hContext) {
            List<string> readers = new List<string>();
            try {
                int pcchReaders = 4096;
                byte[] readersBuffer = new byte[pcchReaders * 2];
                int ret = SCardListReaders(hContext, null, readersBuffer, ref pcchReaders);
                if (ret == 0 && pcchReaders > 2) {
                    string allReaders = Encoding.Unicode.GetString(readersBuffer, 0, pcchReaders * 2);
                    string[] parts = allReaders.Split(new char[] { '\0' }, StringSplitOptions.RemoveEmptyEntries);
                    foreach (var p in parts) {
                        if (!string.IsNullOrEmpty(p.Trim())) {
                            readers.Add(p.Trim());
                        }
                    }
                }
            } catch {}
            return readers;
        }

        public static string CheckReaderStatusJson() {
            lock (_cardLock) {
                IntPtr hContext = IntPtr.Zero;
                try {
                    int ret = SCardEstablishContext(0, IntPtr.Zero, IntPtr.Zero, out hContext);
                    if (ret != 0) {
                        return "{\"status\":\"service_error\",\"message\":\"ไม่สามารถเชื่อมต่อ Windows Smart Card Service (Code: " + ret + ")\",\"readers\":[]}";
                    }

                    var readers = GetReaderList(hContext);
                    if (readers.Count == 0) {
                        return "{\"status\":\"no_reader\",\"message\":\"ไม่พบเครื่องอ่านบัตรประชาชน USB ที่เชื่อมต่ออยู่\",\"readers\":[]}";
                    }

                    StringBuilder sb = new StringBuilder();
                    sb.Append("{\"status\":\"ok\",\"message\":\"พบเครื่องอ่านบัตรพร้อมใช้งาน\",\"reader_count\":").Append(readers.Count).Append(",\"readers\":[");
                    for (int i = 0; i < readers.Count; i++) {
                        sb.Append("\"").Append(EscapeJson(readers[i])).Append("\"");
                        if (i < readers.Count - 1) sb.Append(",");
                    }
                    sb.Append("]}");
                    return sb.ToString();
                } catch (Exception ex) {
                    return "{\"status\":\"error\",\"message\":\"" + EscapeJson(ex.Message) + "\"}";
                } finally {
                    if (hContext != IntPtr.Zero) SCardReleaseContext(hContext);
                }
            }
        }

        public static string ReadThaiCardJson() {
            lock (_cardLock) {
                IntPtr hContext = IntPtr.Zero;
                IntPtr hCard = IntPtr.Zero;
                try {
                    int ret = SCardEstablishContext(0, IntPtr.Zero, IntPtr.Zero, out hContext);
                    if (ret != 0) {
                        return "{\"status\":\"error\",\"code\":" + ret + ",\"message\":\"ไม่สามารถเชื่อมต่อ Windows Smart Card Service (Code: " + ret + ")\"}";
                    }

                    var readers = GetReaderList(hContext);
                    if (readers.Count == 0) {
                        return "{\"status\":\"no_reader\",\"code\":-2146435026,\"message\":\"ไม่พบเครื่องอ่านบัตรประชาชน USB กรุณาเสียบสาย USB เครื่องอ่านบัตร\"}";
                    }

                    int lastConnectError = 0;
                    uint activeProto = 0;
                    string activeReader = "";

                    // Attempt connection with slight retry for hot-plugged cards
                    for (int attempt = 0; attempt < 3; attempt++) {
                        foreach (var reader in readers) {
                            ret = SCardConnect(hContext, reader, 2 /* SCARD_SHARE_SHARED */, 3 /* T0|T1 */, out hCard, out activeProto);
                            if (ret == 0 && hCard != IntPtr.Zero) {
                                activeReader = reader;
                                break;
                            }
                            lastConnectError = ret;
                        }

                        if (hCard != IntPtr.Zero) break;
                        
                        if (lastConnectError == -2146434970 || unchecked((uint)lastConnectError) == 0x80100066 ||
                            lastConnectError == -2146435061 || unchecked((uint)lastConnectError) == 0x8010000B) {
                            Thread.Sleep(60);
                        } else {
                            break;
                        }
                    }

                    if (hCard == IntPtr.Zero) {
                        if (lastConnectError == -2146434967 || unchecked((uint)lastConnectError) == 0x80100069 ||
                            lastConnectError == -2146435060 || unchecked((uint)lastConnectError) == 0x8010000C) {
                            return "{\"status\":\"waiting_card\",\"code\":" + lastConnectError + ",\"message\":\"เครื่องอ่านพร้อมใช้งาน กรุณาเสียบบัตรประชาชนเข้ากับเครื่องอ่านบัตร\"}";
                        }
                        if (lastConnectError == -2146434970 || unchecked((uint)lastConnectError) == 0x80100066) {
                            return "{\"status\":\"card_error\",\"code\":" + lastConnectError + ",\"message\":\"บัตรประชาชนตอบสนองไม่ถูกต้อง กรุณาดึงบัตรออกแล้วเสียบใหม่อีกครั้งให้แน่น\"}";
                        }
                        if (lastConnectError == -2146435061 || unchecked((uint)lastConnectError) == 0x8010000B) {
                            return "{\"status\":\"waiting_card\",\"code\":" + lastConnectError + ",\"message\":\"เครื่องอ่านกำลังประมวลผล กรุณารอสักครู่...\"}";
                        }
                        return "{\"status\":\"waiting_card\",\"code\":" + lastConnectError + ",\"message\":\"กรุณาเสียบบัตรประชาชนเข้ากับเครื่องอ่านบัตร (Code: " + lastConnectError + ")\"}";
                    }

                    IntPtr hWinscard = LoadLibrary("winscard.dll");
                    IntPtr pci = (activeProto == 2) ? GetProcAddress(hWinscard, "g_rgSCardT1Pci") : GetProcAddress(hWinscard, "g_rgSCardT0Pci");

                    // 1. Select Applet (Thai National ID Applet AID: A0 00 00 00 54 48 00 01)
                    byte[] apduSelect = new byte[] { 0x00, 0xA4, 0x04, 0x00, 0x08, 0xA0, 0x00, 0x00, 0x00, 0x54, 0x48, 0x00, 0x01 };
                    byte[] selResp = TransmitAPDU(hCard, pci, apduSelect);

                    // 2. Read CID (13 chars)
                    byte[] cidBytes = SendAndGetResponse(hCard, pci, new byte[] { 0x80, 0xb0, 0x00, 0x04, 0x02, 0x00, 0x0d });
                    string cid = Encoding.ASCII.GetString(cidBytes).Trim();

                    // If CID is empty, try selecting applet once more
                    if (string.IsNullOrEmpty(cid) || cid.Length < 13) {
                        Thread.Sleep(50);
                        TransmitAPDU(hCard, pci, apduSelect);
                        cidBytes = SendAndGetResponse(hCard, pci, new byte[] { 0x80, 0xb0, 0x00, 0x04, 0x02, 0x00, 0x0d });
                        cid = Encoding.ASCII.GetString(cidBytes).Trim();
                    }

                    // 3. Read Full Name Thai (100 chars)
                    byte[] nameBytes = SendAndGetResponse(hCard, pci, new byte[] { 0x80, 0xb0, 0x00, 0x11, 0x02, 0x00, 0x64 });
                    string nameThRaw = DecodeThaiString(nameBytes);
                    string[] nameThParts = nameThRaw.Split('#');
                    string title = nameThParts.Length > 0 ? nameThParts[0].Trim() : "";
                    string firstName = nameThParts.Length > 1 ? nameThParts[1].Trim() : "";
                    string middleName = nameThParts.Length > 2 ? nameThParts[2].Trim() : "";
                    string lastName = nameThParts.Length > 3 ? nameThParts[3].Trim() : (nameThParts.Length > 2 ? nameThParts[2].Trim() : "");
                    if (nameThParts.Length > 3 && !string.IsNullOrEmpty(middleName)) {
                        firstName = firstName + " " + middleName;
                    }

                    // 4. Read DOB (YYYYMMDD)
                    byte[] dobBytes = SendAndGetResponse(hCard, pci, new byte[] { 0x80, 0xb0, 0x00, 0xD9, 0x02, 0x00, 0x08 });
                    string dobRaw = Encoding.ASCII.GetString(dobBytes).Trim();
                    string dob = "";
                    int age = 0;
                    if (dobRaw.Length >= 8) {
                        try {
                            int y = int.Parse(dobRaw.Substring(0, 4));
                            int m = int.Parse(dobRaw.Substring(4, 2));
                            int d = int.Parse(dobRaw.Substring(6, 2));
                            if (y > 2400) y -= 543; // Convert Buddhist Era to CE
                            dob = string.Format("{0:D4}-{1:D2}-{2:D2}", y, m, d);

                            DateTime bday = new DateTime(y, m, d);
                            DateTime today = DateTime.Today;
                            age = today.Year - bday.Year;
                            if (bday.Date > today.AddYears(-age)) age--;
                        } catch {}
                    }

                    // 5. Read Gender (1 = M, 2 = F)
                    byte[] sexBytes = SendAndGetResponse(hCard, pci, new byte[] { 0x80, 0xb0, 0x00, 0xE1, 0x02, 0x00, 0x01 });
                    string sex = "ไม่ระบุ";
                    if (sexBytes.Length > 0) {
                        if (sexBytes[0] == 0x31 || sexBytes[0] == 1) sex = "ชาย";
                        else if (sexBytes[0] == 0x32 || sexBytes[0] == 2) sex = "หญิง";
                    }

                    // 6. Read Address (160 chars)
                    byte[] addrBytes = SendAndGetResponse(hCard, pci, new byte[] { 0x80, 0xb0, 0x15, 0x79, 0x02, 0x00, 0xa0 });
                    string addrRaw = DecodeThaiString(addrBytes);
                    string address = FormatThaiAddress(addrRaw);

                    StringBuilder sb = new StringBuilder();
                    sb.Append("{");
                    sb.Append("\"status\":\"success\",");
                    sb.Append("\"cid\":\"").Append(EscapeJson(cid)).Append("\",");
                    sb.Append("\"title\":\"").Append(EscapeJson(title)).Append("\",");
                    sb.Append("\"first_name\":\"").Append(EscapeJson(firstName)).Append("\",");
                    sb.Append("\"last_name\":\"").Append(EscapeJson(lastName)).Append("\",");
                    sb.Append("\"dob\":\"").Append(EscapeJson(dob)).Append("\",");
                    sb.Append("\"age\":").Append(age).Append(",");
                    sb.Append("\"sex\":\"").Append(EscapeJson(sex)).Append("\",");
                    sb.Append("\"address\":\"").Append(EscapeJson(address)).Append("\",");
                    sb.Append("\"reader\":\"").Append(EscapeJson(activeReader)).Append("\"");
                    sb.Append("}");

                    return sb.ToString();
                } catch (Exception ex) {
                    return "{\"status\":\"error\",\"message\":\"" + EscapeJson(ex.Message) + "\"}";
                } finally {
                    if (hCard != IntPtr.Zero) SCardDisconnect(hCard, 0);
                    if (hContext != IntPtr.Zero) SCardReleaseContext(hContext);
                }
            }
        }

        private static string DecodeThaiString(byte[] raw) {
            if (raw == null || raw.Length == 0) return "";
            try {
                Encoding tis620 = Encoding.GetEncoding(874);
                string text = tis620.GetString(raw).Trim();
                text = text.Replace("\0", " ");
                return text;
            } catch {
                return Encoding.UTF8.GetString(raw).Trim();
            }
        }

        private static string FormatThaiAddress(string raw) {
            if (string.IsNullOrEmpty(raw)) return "";
            string cleaned = raw.Replace('#', ' ');
            cleaned = Regex.Replace(cleaned, @"\s+", " ").Trim();
            return cleaned;
        }

        private static byte[] SendAndGetResponse(IntPtr hCard, IntPtr pci, byte[] cmd) {
            byte[] recv = TransmitAPDU(hCard, pci, cmd);
            if (recv.Length >= 2) {
                byte sw1 = recv[recv.Length - 2];
                byte sw2 = recv[recv.Length - 1];

                if (sw1 == 0x61) {
                    byte[] getResp = new byte[] { 0x00, 0xC0, 0x00, 0x00, sw2 };
                    byte[] respData = TransmitAPDU(hCard, pci, getResp);
                    if (respData.Length > 2) {
                        byte[] result = new byte[respData.Length - 2];
                        Array.Copy(respData, 0, result, 0, respData.Length - 2);
                        return result;
                    }
                } else if (sw1 == 0x90 && sw2 == 0x00 && recv.Length > 2) {
                    byte[] result = new byte[recv.Length - 2];
                    Array.Copy(recv, 0, result, 0, recv.Length - 2);
                    return result;
                }
            }
            return new byte[0];
        }

        private static byte[] TransmitAPDU(IntPtr hCard, IntPtr pci, byte[] cmd) {
            byte[] recv = new byte[512];
            int recvLen = recv.Length;
            int ret = SCardTransmit(hCard, pci, cmd, cmd.Length, IntPtr.Zero, recv, ref recvLen);
            if (ret == 0 && recvLen > 0) {
                byte[] trimmed = new byte[recvLen];
                Array.Copy(recv, 0, trimmed, 0, recvLen);
                return trimmed;
            }
            return new byte[0];
        }

        private static string EscapeJson(string s) {
            if (s == null) return "";
            return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", " ");
        }

        public static void StartHttpServer(int port) {
            HttpListener listener = new HttpListener();
            listener.Prefixes.Add("http://127.0.0.1:" + port + "/");
            listener.Prefixes.Add("http://localhost:" + port + "/");
            
            try {
                listener.Start();
            } catch (Exception ex) {
                Console.WriteLine("Server start error: " + ex.Message);
                return;
            }

            Console.WriteLine("===================================================================");
            Console.WriteLine("  Thai Smart Card Bridge (HTTP + WebSocket) is running on port " + port);
            Console.WriteLine("  Web App URL: http://127.0.0.1:" + port + "/app");
            Console.WriteLine("  WebSocket Endpoint: ws://127.0.0.1:" + port + "/ws");
            Console.WriteLine("  พร้อมรองรับการอ่านบัตรจาก Vercel / Cloud และเครื่องลูกข่าย");
            Console.WriteLine("===================================================================");

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string htmlFilePath = Path.Combine(baseDir, "index.html");

            while (true) {
                try {
                    HttpListenerContext ctx = listener.GetContext();
                    ThreadPool.QueueUserWorkItem(async (state) => {
                        HttpListenerContext c = (HttpListenerContext)state;
                        try {
                            if (c.Request.IsWebSocketRequest) {
                                await HandleWebSocket(c);
                            } else {
                                HandleHttpRequest(c, htmlFilePath, baseDir);
                            }
                        } catch (Exception) {
                            try { c.Response.StatusCode = 500; c.Response.Close(); } catch {}
                        }
                    }, ctx);
                } catch (Exception ex) {
                    Console.WriteLine("Listener Error: " + ex.Message);
                }
            }
        }

        private static async Task HandleWebSocket(HttpListenerContext ctx) {
            WebSocketContext wsContext = null;
            try {
                wsContext = await ctx.AcceptWebSocketAsync(subProtocol: null);
                WebSocket ws = wsContext.WebSocket;

                lock (_wsLock) {
                    _activeWebSockets.Add(ws);
                }

                // Send initial greeting
                string greeting = "{\"event\":\"connected\",\"message\":\"Thai Smart Card Bridge Ready\",\"status\":\"ok\"}";
                byte[] greetBytes = Encoding.UTF8.GetBytes(greeting);
                await ws.SendAsync(new ArraySegment<byte>(greetBytes), WebSocketMessageType.Text, true, CancellationToken.None);

                byte[] buffer = new byte[4096];
                while (ws.State == WebSocketState.Open) {
                    WebSocketReceiveResult result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                    if (result.MessageType == WebSocketMessageType.Close) {
                        await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
                        break;
                    } else if (result.MessageType == WebSocketMessageType.Text) {
                        string msg = Encoding.UTF8.GetString(buffer, 0, result.Count).Trim();
                        string replyJson = "";

                        if (msg.Contains("health") || msg.Contains("status")) {
                            replyJson = CheckReaderStatusJson();
                        } else {
                            replyJson = ReadThaiCardJson();
                        }

                        byte[] replyBytes = Encoding.UTF8.GetBytes(replyJson);
                        await ws.SendAsync(new ArraySegment<byte>(replyBytes), WebSocketMessageType.Text, true, CancellationToken.None);
                    }
                }
            } catch (Exception) {
            } finally {
                if (wsContext != null) {
                    lock (_wsLock) {
                        _activeWebSockets.Remove(wsContext.WebSocket);
                    }
                }
            }
        }

        private static void HandleHttpRequest(HttpListenerContext ctx, string htmlFilePath, string baseDir) {
            HttpListenerRequest req = ctx.Request;
            HttpListenerResponse res = ctx.Response;

            // CORS and Chrome Private Network Access Headers
            res.Headers.Add("Access-Control-Allow-Origin", "*");
            res.Headers.Add("Access-Control-Allow-Private-Network", "true");
            res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.Headers.Add("Access-Control-Allow-Headers", "*");

            if (req.HttpMethod == "OPTIONS") {
                res.StatusCode = 204;
                res.Close();
                return;
            }

            string path = req.Url != null ? req.Url.AbsolutePath.ToLower() : "/";

            if (path == "/" || path == "/app" || path == "/index.html" || path == "/opd") {
                if (File.Exists(htmlFilePath)) {
                    byte[] htmlBytes = File.ReadAllBytes(htmlFilePath);
                    res.ContentType = "text/html; charset=utf-8";
                    res.ContentLength64 = htmlBytes.Length;
                    res.OutputStream.Write(htmlBytes, 0, htmlBytes.Length);
                } else {
                    byte[] msgBytes = Encoding.UTF8.GetBytes("index.html not found");
                    res.ContentType = "text/plain; charset=utf-8";
                    res.ContentLength64 = msgBytes.Length;
                    res.OutputStream.Write(msgBytes, 0, msgBytes.Length);
                }
                res.Close();
                return;
            }

            string jsonResponse;
            if (path == "/health" || path == "/status" || path == "/api/health") {
                jsonResponse = CheckReaderStatusJson();
            } else {
                jsonResponse = ReadThaiCardJson();
            }

            byte[] buffer = Encoding.UTF8.GetBytes(jsonResponse);
            res.ContentType = "application/json; charset=utf-8";
            res.ContentLength64 = buffer.Length;
            res.OutputStream.Write(buffer, 0, buffer.Length);
            res.Close();
        }
    }
}
