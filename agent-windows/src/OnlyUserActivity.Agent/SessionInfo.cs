using System;
using System.Collections.Generic;
using System.Web.Script.Serialization;

namespace OnlyUserActivity.Agent
{
    public class SessionInfo
    {
        public string Token { get; set; }
        public DateTime ExpiresAt { get; set; }
        public string ServerUrl { get; set; }

        public static SessionInfo FromJson(string json)
        {
            var serializer = new JavaScriptSerializer();
            var data = serializer.Deserialize<Dictionary<string, object>>(json);
            if (data == null) return null;
            var token = data.ContainsKey("token") ? data["token"].ToString() : null;
            var expiresAt = data.ContainsKey("expiresAt") ? DateTime.Parse(data["expiresAt"].ToString()) : DateTime.MinValue;
            var serverUrl = data.ContainsKey("serverUrl") ? data["serverUrl"].ToString() : null;
            return new SessionInfo { Token = token, ExpiresAt = expiresAt, ServerUrl = serverUrl };
        }
    }
}
