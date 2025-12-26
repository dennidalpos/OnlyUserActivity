using System;
using System.Collections.Generic;
using System.Drawing;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace OnlyUserActivity.Agent
{
    public class LoginForm : Form
    {
        private readonly TextBox usernameBox = new TextBox();
        private readonly TextBox passwordBox = new TextBox();
        private readonly CheckBox rememberBox = new CheckBox();
        private readonly Button loginButton = new Button();
        private readonly Label statusLabel = new Label();

        public event Action<SessionInfo> LoginSucceeded;

        public string ServerUrl { get; set; }

        public LoginForm()
        {
            Text = "Login";
            Size = new Size(320, 220);

            var userLabel = new Label { Text = "Username", Location = new Point(20, 20), Width = 80 };
            usernameBox.Location = new Point(110, 20);
            usernameBox.Width = 160;

            var passLabel = new Label { Text = "Password", Location = new Point(20, 60), Width = 80 };
            passwordBox.Location = new Point(110, 60);
            passwordBox.Width = 160;
            passwordBox.PasswordChar = '*';

            rememberBox.Text = "Remember session";
            rememberBox.Location = new Point(110, 90);

            loginButton.Text = "Login";
            loginButton.Location = new Point(110, 120);
            loginButton.Click += async (s, e) => await PerformLogin();

            statusLabel.Location = new Point(20, 150);
            statusLabel.Width = 260;

            Controls.Add(userLabel);
            Controls.Add(usernameBox);
            Controls.Add(passLabel);
            Controls.Add(passwordBox);
            Controls.Add(rememberBox);
            Controls.Add(loginButton);
            Controls.Add(statusLabel);

            usernameBox.Text = Environment.UserName;
        }

        private async Task PerformLogin()
        {
            statusLabel.Text = "";
            var username = usernameBox.Text.Trim();
            var password = passwordBox.Text;
            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            {
                statusLabel.Text = "Missing credentials";
                return;
            }
            try
            {
                var payload = $"{{\"username\":\"{username}\",\"password\":\"{password}\"}}";
                using (var client = new HttpClient())
                {
                    var response = await client.PostAsync($"{ServerUrl}/api/v1/auth/login", new StringContent(payload, Encoding.UTF8, "application/json"));
                    if (!response.IsSuccessStatusCode)
                    {
                        statusLabel.Text = "Login failed";
                        return;
                    }
                    var json = await response.Content.ReadAsStringAsync();
                    var serializer = new JavaScriptSerializer();
                    var data = serializer.Deserialize<Dictionary<string, object>>(json);
                    var token = data["token"].ToString();
                    var expiresAt = DateTime.Parse(data["expiresAt"].ToString());
                    var session = new SessionInfo { Token = token, ExpiresAt = expiresAt, ServerUrl = ServerUrl };
                    if (rememberBox.Checked)
                    {
                        new SessionStore().Save(session);
                    }
                    LoginSucceeded?.Invoke(session);
                    Close();
                }
            }
            catch
            {
                statusLabel.Text = "Login failed";
            }
        }
    }
}
