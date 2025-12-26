using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace OnlyUserActivity.Agent
{
    public class SessionStore
    {
        private readonly string sessionPath;

        public SessionStore()
        {
            var baseDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "OnlyUserActivity", "Agent");
            Directory.CreateDirectory(baseDir);
            sessionPath = Path.Combine(baseDir, "session.json");
        }

        public void Save(SessionInfo session)
        {
            var json = $"{{\"schemaVersion\":1,\"token\":\"{session.Token}\",\"expiresAt\":\"{session.ExpiresAt:O}\",\"serverUrl\":\"{session.ServerUrl}\"}}";
            var data = Encoding.UTF8.GetBytes(json);
            var protectedData = ProtectedData.Protect(data, null, DataProtectionScope.CurrentUser);
            var tmpPath = sessionPath + ".tmp";
            File.WriteAllBytes(tmpPath, protectedData);
            File.Move(tmpPath, sessionPath, true);
        }

        public SessionInfo Load()
        {
            if (!File.Exists(sessionPath)) return null;
            var protectedData = File.ReadAllBytes(sessionPath);
            var data = ProtectedData.Unprotect(protectedData, null, DataProtectionScope.CurrentUser);
            var json = Encoding.UTF8.GetString(data);
            return SessionInfo.FromJson(json);
        }

        public void Clear()
        {
            if (File.Exists(sessionPath))
            {
                File.Delete(sessionPath);
            }
        }
    }
}
