export async function Log(stack, level, pkg, message) {
    const url = 'http://20.207.122.201/evaluation-service/logs';
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJrYWxlZW1hZnJvel9zaGFpa0Bzcm1hcC5lZHUuaW4iLCJleHAiOjE3Nzc3MDMyNTMsImlhdCI6MTc3NzcwMjM1MywiaXNzIjoiQWZmb3JkIE1lZGljYWwgVGVjaG5vbG9naWVzIFByaXZhdGUgTGltaXRlZCIsImp0aSI6ImIxYTJkYjY1LTgzZTEtNGVjZS1iYjQyLTE2MjU5ZTIzMTBhNiIsImxvY2FsZSI6ImVuLUlOIiwibmFtZSI6ImthbGVlbSBhZnJveiBzaGFpayIsInN1YiI6IjAxZTk5NTVjLTQyYjYtNDhjMi04NmY4LTU1ZjUzNDQ5YzA4MyJ9LCJlbWFpbCI6ImthbGVlbWFmcm96X3NoYWlrQHNybWFwLmVkdS5pbiIsIm5hbWUiOiJrYWxlZW0gYWZyb3ogc2hhaWsiLCJyb2xsTm8iOiJhcDIzMTEwMDEwMzM3IiwiYWNjZXNzQ29kZSI6IlFrYnB4SCIsImNsaWVudElEIjoiMDFlOTk1NWMtNDJiNi00OGMyLTg2ZjgtNTVmNTM0NDljMDgzIiwiY2xpZW50U2VjcmV0IjoiRGR4eXdkWEFOYmN0aHNtViJ9.z3-0_lxJg4TajdIYU3ZiFb2NqlCsG_kf8l4cNrzmmhw';

    const validStacks = ['backend', 'frontend'];
    const validLevels = ['debug', 'info', 'warn', 'error', 'fatal'];
    
    const backendPackages = ['cache', 'controller', 'cron_job', 'db', 'domain', 'handler', 'repository', 'route', 'service'];
    const frontendPackages = ['api', 'component', 'hook', 'page', 'state', 'style'];
    const bothPackages = ['auth', 'config', 'middleware', 'utils'];

    if (!validStacks.includes(stack)) {
        console.error(`Invalid stack: ${stack}`);
        return;
    }
    if (!validLevels.includes(level)) {
        console.error(`Invalid level: ${level}`);
        return;
    }
    
    const isBackendPkg = backendPackages.includes(pkg);
    const isFrontendPkg = frontendPackages.includes(pkg);
    const isBothPkg = bothPackages.includes(pkg);

    let pkgValid = false;
    if (stack === 'backend' && (isBackendPkg || isBothPkg)) pkgValid = true;
    if (stack === 'frontend' && (isFrontendPkg || isBothPkg)) pkgValid = true;

    if (!pkgValid) {
        console.error(`Invalid package '${pkg}' for stack '${stack}'`);
        return;
    }

    const payload = {
        stack: stack,
        level: level,
        package: pkg,
        message: message
    };

    try {
        let response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok && response.status === 401) {
             response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify(payload)
            });
        }

        if (!response.ok) {
            console.error(`Logging failed with status: ${response.status}`, await response.text());
        } else {
            // Optional: console.log for local debugging to see it worked
            // const data = await response.json();
            // console.log(`Log successfully submitted: ${data.logID}`);
        }
    } catch (err) {
        console.error('Failed to send log:', err);
    }
}
