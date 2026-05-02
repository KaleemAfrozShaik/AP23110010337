import { Log } from '../logging_middleware/src/logger.js';

const depotsUrl = 'http://20.207.122.201/evaluation-service/depots';
const vehiclesUrl = 'http://20.207.122.201/evaluation-service/vehicles';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJrYWxlZW1hZnJvel9zaGFpa0Bzcm1hcC5lZHUuaW4iLCJleHAiOjE3Nzc3MDMyNTMsImlhdCI6MTc3NzcwMjM1MywiaXNzIjoiQWZmb3JkIE1lZGljYWwgVGVjaG5vbG9naWVzIFByaXZhdGUgTGltaXRlZCIsImp0aSI6ImIxYTJkYjY1LTgzZTEtNGVjZS1iYjQyLTE2MjU5ZTIzMTBhNiIsImxvY2FsZSI6ImVuLUlOIiwibmFtZSI6ImthbGVlbSBhZnJveiBzaGFpayIsInN1YiI6IjAxZTk5NTVjLTQyYjYtNDhjMi04NmY4LTU1ZjUzNDQ5YzA4MyJ9LCJlbWFpbCI6ImthbGVlbWFmcm96X3NoYWlrQHNybWFwLmVkdS5pbiIsIm5hbWUiOiJrYWxlZW0gYWZyb3ogc2hhaWsiLCJyb2xsTm8iOiJhcDIzMTEwMDEwMzM3IiwiYWNjZXNzQ29kZSI6IlFrYnB4SCIsImNsaWVudElEIjoiMDFlOTk1NWMtNDJiNi00OGMyLTg2ZjgtNTVmNTM0NDljMDgzIiwiY2xpZW50U2VjcmV0IjoiRGR4eXdkWEFOYmN0aHNtViJ9.z3-0_lxJg4TajdIYU3ZiFb2NqlCsG_kf8l4cNrzmmhw';

async function fetchWithAuth(url) {
    let response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) {
        response = await fetch(url, { headers: { 'Authorization': token } });
    }
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
    return response.json();
}

function solveKnapsack(capacity, items) {
    const n = items.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));
    
    for (let i = 1; i <= n; i++) {
        const item = items[i - 1];
        const w = parseInt(item.Duration);
        const v = parseInt(item.Impact);
        
        for (let c = 0; c <= capacity; c++) {
            if (w <= c) {
                dp[i][c] = Math.max(dp[i - 1][c], dp[i - 1][c - w] + v);
            } else {
                dp[i][c] = dp[i - 1][c];
            }
        }
    }
    
    let res = dp[n][capacity];
    let w = capacity;
    const selected = [];
    
    for (let i = n; i > 0 && res > 0; i--) {
        if (res !== dp[i - 1][w]) {
            const item = items[i - 1];
            selected.push(item.TaskID);
            res -= parseInt(item.Impact);
            w -= parseInt(item.Duration);
        }
    }
    
    return {
        maxImpact: dp[n][capacity],
        selectedTasks: selected
    };
}

async function main() {
    try {
        await Log('backend', 'info', 'service', 'Starting vehicle scheduling service');
        const depotsData = await fetchWithAuth(depotsUrl);
        const vehiclesData = await fetchWithAuth(vehiclesUrl);
        
        const depots = depotsData.depots || [];
        const vehicles = vehiclesData.vehicles || [];
        
        console.log(`Successfully fetched ${depots.length} depots and ${vehicles.length} vehicles.\n`);
        await Log('backend', 'debug', 'service', `Fetched ${depots.length} depots, ${vehicles.length} vehicles`);
        
        for (const depot of depots) {
            await Log('backend', 'debug', 'controller', `Processing depot ID: ${depot.ID}`);
            const capacity = parseInt(depot.MechanicHours);
            const { maxImpact, selectedTasks } = solveKnapsack(capacity, vehicles);
            
            console.log(`=== Depot ID: ${depot.ID} ===`);
            console.log(`Mechanic Hours Budget: ${capacity}`);
            console.log(`Maximal Operational Impact: ${maxImpact}`);
            console.log(`Number of Vehicles Scheduled: ${selectedTasks.length}`);
            console.log(`Selected Task IDs: ${selectedTasks.slice(0, 5).join(', ')}${selectedTasks.length > 5 ? ' ...' : ''}\n`);
        }
    } catch (err) {
        console.error('Error:', err);
        await Log('backend', 'error', 'handler', 'Error in main execution: ' + err.message);
    }
}

main();
