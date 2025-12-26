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
    public class ActivityForm : Form
    {
        private readonly DateTimePicker datePicker = new DateTimePicker();
        private readonly DateTimePicker startPicker = new DateTimePicker();
        private readonly DateTimePicker endPicker = new DateTimePicker();
        private readonly ComboBox activityTypeBox = new ComboBox();
        private readonly TextBox notesBox = new TextBox();
        private readonly Button saveButton = new Button();
        private readonly Label statusLabel = new Label();

        public SessionInfo Session { get; set; }
        public event Action ActivitySaved;

        public ActivityForm()
        {
            Text = "Add Activity";
            Size = new Size(360, 300);

            datePicker.Format = DateTimePickerFormat.Short;
            datePicker.Location = new Point(20, 20);

            startPicker.Format = DateTimePickerFormat.Time;
            startPicker.ShowUpDown = true;
            startPicker.Location = new Point(20, 60);

            endPicker.Format = DateTimePickerFormat.Time;
            endPicker.ShowUpDown = true;
            endPicker.Location = new Point(200, 60);

            activityTypeBox.Location = new Point(20, 100);
            activityTypeBox.Width = 300;

            notesBox.Location = new Point(20, 140);
            notesBox.Width = 300;
            notesBox.Height = 60;
            notesBox.Multiline = true;

            saveButton.Text = "Save";
            saveButton.Location = new Point(20, 210);
            saveButton.Click += async (s, e) => await SaveActivity();

            statusLabel.Location = new Point(20, 240);
            statusLabel.Width = 300;

            Controls.Add(datePicker);
            Controls.Add(startPicker);
            Controls.Add(endPicker);
            Controls.Add(activityTypeBox);
            Controls.Add(notesBox);
            Controls.Add(saveButton);
            Controls.Add(statusLabel);

            Load += async (s, e) => await LoadActivityTypes();
        }

        private async System.Threading.Tasks.Task LoadActivityTypes()
        {
            try
            {
                using (var client = new HttpClient())
                {
                    var request = new HttpRequestMessage(HttpMethod.Get, $"{Session.ServerUrl}/api/v1/activity-types");
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Session.Token);
                    request.Headers.Add("X-Request-Id", Guid.NewGuid().ToString());
                    var response = await client.SendAsync(request);
                    response.EnsureSuccessStatusCode();
                    var json = await response.Content.ReadAsStringAsync();
                    var serializer = new JavaScriptSerializer();
                    var data = serializer.Deserialize<Dictionary<string, object>>(json);
                    var items = data["items"] as object[];
                    activityTypeBox.Items.Clear();
                    foreach (var itemObj in items)
                    {
                        var itemDict = itemObj as Dictionary<string, object>;
                        if (itemDict == null) continue;
                        activityTypeBox.Items.Add(new ActivityType { Id = itemDict["id"].ToString(), Label = itemDict["label"].ToString() });
                    }
                    activityTypeBox.DisplayMember = "Label";
                    activityTypeBox.ValueMember = "Id";
                    if (activityTypeBox.Items.Count > 0) activityTypeBox.SelectedIndex = 0;
                }
            }
            catch
            {
                statusLabel.Text = "Failed to load activity types";
            }
        }

        private async System.Threading.Tasks.Task SaveActivity()
        {
            try
            {
                var selected = activityTypeBox.SelectedItem as ActivityType;
                if (selected == null)
                {
                    statusLabel.Text = "Select activity type";
                    return;
                }
                var payload = $"{{\"date\":\"{datePicker.Value:yyyy-MM-dd}\",\"start\":\"{startPicker.Value:HH:mm}\",\"end\":\"{endPicker.Value:HH:mm}\",\"activityTypeId\":\"{selected.Id}\",\"notes\":\"{notesBox.Text}\"}}";
                using (var client = new HttpClient())
                {
                    var request = new HttpRequestMessage(HttpMethod.Post, $"{Session.ServerUrl}/api/v1/activities");
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Session.Token);
                    request.Headers.Add("X-Request-Id", Guid.NewGuid().ToString());
                    request.Content = new StringContent(payload, Encoding.UTF8, "application/json");
                    var response = await client.SendAsync(request);
                    response.EnsureSuccessStatusCode();
                    ActivitySaved?.Invoke();
                    Close();
                }
            }
            catch
            {
                statusLabel.Text = "Failed to save";
            }
        }

        private class ActivityType
        {
            public string Id { get; set; }
            public string Label { get; set; }
            public override string ToString() => Label;
        }
    }
}
