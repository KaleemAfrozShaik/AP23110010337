const url = 'http://20.207.122.201/evaluation-service/notifications';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJrYWxlZW1hZnJvel9zaGFpa0Bzcm1hcC5lZHUuaW4iLCJleHAiOjE3Nzc3MDMyNTMsImlhdCI6MTc3NzcwMjM1MywiaXNzIjoiQWZmb3JkIE1lZGljYWwgVGVjaG5vbG9naWVzIFByaXZhdGUgTGltaXRlZCIsImp0aSI6ImIxYTJkYjY1LTgzZTEtNGVjZS1iYjQyLTE2MjU5ZTIzMTBhNiIsImxvY2FsZSI6ImVuLUlOIiwibmFtZSI6ImthbGVlbSBhZnJveiBzaGFpayIsInN1YiI6IjAxZTk5NTVjLTQyYjYtNDhjMi04NmY4LTU1ZjUzNDQ5YzA4MyJ9LCJlbWFpbCI6ImthbGVlbWFmcm96X3NoYWlrQHNybWFwLmVkdS5pbiIsIm5hbWUiOiJrYWxlZW0gYWZyb3ogc2hhaWsiLCJyb2xsTm8iOiJhcDIzMTEwMDEwMzM3IiwiYWNjZXNzQ29kZSI6IlFrYnB4SCIsImNsaWVudElEIjoiMDFlOTk1NWMtNDJiNi00OGMyLTg2ZjgtNTVmNTM0NDljMDgzIiwiY2xpZW50U2VjcmV0IjoiRGR4eXdkWEFOYmN0aHNtViJ9.z3-0_lxJg4TajdIYU3ZiFb2NqlCsG_kf8l4cNrzmmhw';

async function fetchPriorityNotifications() {
    try {
        // Try Bearer token first
        let response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            // Fallback to just the token if Bearer format fails
            response = await fetch(url, {
                headers: {
                    'Authorization': token
                }
            });
        }

        if (!response.ok) {
            console.error('Failed to fetch:', response.status, await response.text());
            return;
        }

        const data = await response.json();
        const notifications = data.notifications || [];

        // Priority weighting: Placement > Result > Event
        const priorityMap = {
            'Placement': 3,
            'Result': 2,
            'Event': 1
        };

        // Sort by Priority (Descending), then by Timestamp (Descending)
        notifications.sort((a, b) => {
            const priorityA = priorityMap[a.Type] || 0;
            const priorityB = priorityMap[b.Type] || 0;

            if (priorityA !== priorityB) {
                return priorityB - priorityA; 
            }

            // Same priority, sort by recency
            const timeA = new Date(a.Timestamp).getTime();
            const timeB = new Date(b.Timestamp).getTime();

            return timeB - timeA;
        });

        const top10 = notifications.slice(0, 10);
        console.log(`Top 10 Priority Notifications:\n`);
        console.table(top10, ['Type', 'Message', 'Timestamp', 'ID']);

    } catch (err) {
        console.error('Error fetching notifications:', err);
    }
}

fetchPriorityNotifications();
