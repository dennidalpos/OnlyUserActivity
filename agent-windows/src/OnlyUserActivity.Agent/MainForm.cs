using System;
using System.Collections.Generic;
using System.Drawing;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace OnlyUserActivity.Agent
{
    public class MainForm : Form
    {
        private readonly Label statusLabel = new Label();
        private readonly MonthCalendar calendar = new MonthCalendar();
        private readonly ListView activitiesView = new ListView();
        private readonly ProgressBar progressBar = new ProgressBar();
        private readonly Button addButton = new Button();
        private readonly Button testButton = new Button();
        private readonly NotifyIcon trayIcon = new NotifyIcon();
        private SessionInfo session;
        private readonly SessionStore sessionStore = new SessionStore();
        private readonly string serverUrl = Environment.GetEnvironmentVariable("ONLYUSERACTIVITY_SERVER_URL") ?? "http://localhost:3000";

        public MainForm()
        {
            Text = "OnlyUserActivity Agent";
            Size = new Size(640, 480);

            statusLabel.Location = new Point(20, 20);
            statusLabel.Width = 400;

            calendar.Location = new Point(20, 50);
            calendar.MaxSelectionCount = 1;
            calendar.DateSelected += async (s, e) => await LoadDay();

            activitiesView.Location = new Point(260, 50);
            activitiesView.Size = new Size(360, 250);
            activitiesView.View = View.Details;
            activitiesView.Columns.Add("Start", 60);
            activitiesView.Columns.Add("End", 60);
            activitiesView.Columns.Add("Type", 120);
            activitiesView.Columns.Add("Notes", 120);

            progressBar.Location = new Point(260, 320);
            progressBar.Size = new Size(360, 20);

            addButton.Text = "Add activity";
            addButton.Location = new Point(260, 350);
            addButton.Click += (s, e) => ShowAddActivity();

            testButton.Text = "Test connection";
            testButton.Location = new Point(380, 350);
            testButton.Click += async (s, e) => await TestConnection();

            Controls.Add(statusLabel);
            Controls.Add(calendar);
            Controls.Add(activitiesView);
            Controls.Add(progressBar);
            Controls.Add(addButton);
            Controls.Add(testButton);

            trayIcon.Text = "OnlyUserActivity";
            trayIcon.Icon = SystemIcons.Application;
            trayIcon.Visible = true;
            trayIcon.DoubleClick += (s, e) => Show();
            var menu = new ContextMenuStrip();
            menu.Items.Add("Open", null, (s, e) => Show());
            menu.Items.Add("Exit", null, (s, e) => Close());
            trayIcon.ContextMenuStrip = menu;

            FormClosing += (s, e) => trayIcon.Visible = false;
            Shown += async (s, e) => await InitializeSession();
        }

        private async System.Threading.Tasks.Task InitializeSession()
        {
            session = sessionStore.Load();
            if (session == null || session.ExpiresAt <= DateTime.UtcNow)
            {
                await ShowLogin();
            }
            else
            {
                session.ServerUrl = serverUrl;
            }
            await TestConnection();
            await LoadDay();
        }

        private async System.Threading.Tasks.Task ShowLogin()
        {
            var login = new LoginForm { ServerUrl = serverUrl };
            login.LoginSucceeded += info => session = info;
            login.ShowDialog(this);
        }

        private async System.Threading.Tasks.Task TestConnection()
        {
            if (session == null)
            {
                statusLabel.Text = "Not authenticated";
                addButton.Enabled = false;
                return;
            }
            try
            {
                using (var client = new HttpClient())
                {
                    var request = new HttpRequestMessage(HttpMethod.Get, $"{session.ServerUrl}/api/v1/health");
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", session.Token);
                    request.Headers.Add("X-Request-Id", Guid.NewGuid().ToString());
                    var response = await client.SendAsync(request);
                    if (!response.IsSuccessStatusCode)
                    {
                        statusLabel.Text = "Offline/Not authenticated";
                        addButton.Enabled = false;
                        return;
                    }
                    var json = await response.Content.ReadAsStringAsync();
                    statusLabel.Text = "Connected";
                    addButton.Enabled = true;
                }
            }
            catch
            {
                statusLabel.Text = "Offline/Not authenticated";
                addButton.Enabled = false;
            }
        }

        private async System.Threading.Tasks.Task LoadDay()
        {
            if (session == null)
            {
                activitiesView.Items.Clear();
                return;
            }
            try
            {
                var date = calendar.SelectionStart.ToString("yyyy-MM-dd");
                using (var client = new HttpClient())
                {
                    var request = new HttpRequestMessage(HttpMethod.Get, $"{session.ServerUrl}/api/v1/days/{date}");
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", session.Token);
                    request.Headers.Add("X-Request-Id", Guid.NewGuid().ToString());
                    var response = await client.SendAsync(request);
                    if (!response.IsSuccessStatusCode)
                    {
                        activitiesView.Items.Clear();
                        return;
                    }
                    var json = await response.Content.ReadAsStringAsync();
                    var serializer = new JavaScriptSerializer();
                    var data = serializer.Deserialize<Dictionary<string, object>>(json);
                    var activities = data["activities"] as object[];
                    activitiesView.Items.Clear();
                    if (activities != null)
                    {
                        foreach (var activityObj in activities)
                        {
                            var activity = activityObj as Dictionary<string, object>;
                            if (activity == null) continue;
                            var item = new ListViewItem(activity["start"].ToString());
                            item.SubItems.Add(activity["end"].ToString());
                            item.SubItems.Add(activity["activityTypeId"].ToString());
                            item.SubItems.Add(activity.ContainsKey("notes") ? activity["notes"].ToString() : "");
                            activitiesView.Items.Add(item);
                        }
                    }
                    if (data.ContainsKey("totals"))
                    {
                        var totals = data["totals"] as Dictionary<string, object>;
                        var progress = totals != null && totals.ContainsKey("progressPercent") ? Convert.ToInt32(totals["progressPercent"]) : 0;
                        progressBar.Value = Math.Max(0, Math.Min(100, progress));
                    }
                }
            }
            catch
            {
                activitiesView.Items.Clear();
            }
        }

        private void ShowAddActivity()
        {
            if (session == null) return;
            var form = new ActivityForm { Session = session };
            form.ActivitySaved += async () => await LoadDay();
            form.ShowDialog(this);
        }
    }
}
