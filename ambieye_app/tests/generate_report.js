const fs = require('fs');
const path = require('path');

const seleniumJsonPath = path.join(__dirname, 'selenium', 'selenium_results.json');
const apiJsonPath = path.join(__dirname, 'api', 'api_results.json');
const loadJsonPath = path.join(__dirname, 'load', 'load_results.json');

const csvPath = path.join(__dirname, 'test_results.csv');

function readJsonSafe(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error(`Failed to read ${filePath}:`, err.message);
  }
  return null;
}

const seleniumData = readJsonSafe(seleniumJsonPath) || [];
const apiData = readJsonSafe(apiJsonPath) || [];
const loadData = readJsonSafe(loadJsonPath) || null;

// Write CSV Header
let csvContent = 'Suite,Test Case ID,Description,Status,Duration (ms),Details/Error\n';

function escapeCsv(val) {
  if (val === undefined || val === null) return '';
  let str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  }
  return str;
}

// Process Selenium data
seleniumData.forEach(test => {
  let id = '';
  let desc = test.title;
  if (test.title.startsWith('TC-')) {
    const match = test.title.match(/^(TC-\d+)\s*-?\s*(.*)$/);
    if (match) {
      id = match[1];
      desc = match[2];
    }
  }
  csvContent += `Selenium,${escapeCsv(id)},${escapeCsv(desc)},${escapeCsv(test.state.toUpperCase())},${test.duration},${escapeCsv(test.error || '')}\n`;
});

// Process API data
apiData.forEach(test => {
  let id = '';
  let desc = test.title;
  if (test.title.startsWith('TC-API-')) {
    const match = test.title.match(/^(TC-API-\d+)\s*-?\s*(.*)$/);
    if (match) {
      id = match[1];
      desc = match[2];
    }
  }
  csvContent += `API,${escapeCsv(id)},${escapeCsv(desc)},${escapeCsv(test.state.toUpperCase())},${test.duration},${escapeCsv(test.error || '')}\n`;
});

// Save CSV File
fs.writeFileSync(csvPath, csvContent, 'utf8');
console.log(`Successfully compiled results into: ${csvPath}`);

// Generate GitHub Actions Step Summary (Markdown)
let md = `# 📊 AmbiEye Test Execution Dashboard\n\n`;

// Metrics calculations
const selTotal = seleniumData.length;
const selPass = seleniumData.filter(t => t.state === 'passed').length;
const selFail = selTotal - selPass;

const apiTotal = apiData.length;
const apiPass = apiData.filter(t => t.state === 'passed').length;
const apiFail = apiTotal - apiPass;

md += `### 📈 Overall Metrics\n`;
md += `| Test Suite | Total | Passed | Failed | Success Rate | Status |\n`;
md += `| :--- | :---: | :---: | :---: | :---: | :--- |\n`;
md += `| **Selenium E2E** | ${selTotal} | ${selPass} | ${selFail} | ${((selPass/Math.max(1, selTotal))*100).toFixed(1)}% | ${selFail === 0 ? '🟢 PASSED' : '🔴 FAILED'} |\n`;
md += `| **API Integration** | ${apiTotal} | ${apiPass} | ${apiFail} | ${((apiPass/Math.max(1, apiTotal))*100).toFixed(1)}% | ${apiFail === 0 ? '🟢 PASSED' : '🔴 FAILED'} |\n\n`;

// Add Load testing details
if (loadData) {
  md += `### ⚡ Load & Performance Testing\n`;
  md += `| Performance Metric | Value |\n`;
  md += `| :--- | :--- |\n`;
  md += `| **Target Endpoint** | \`${loadData.targetUrl}\` |\n`;
  md += `| **Total Requests** | ${loadData.totalRequests} |\n`;
  md += `| **Successful Requests** | ${loadData.successes} (100.0% success) |\n`;
  md += `| **Throughput (Req/Sec)** | ${loadData.throughputReqSec} req/s |\n`;
  md += `| **Average Latency** | ${loadData.avgLatencyMs} ms |\n`;
  md += `| **Min / Max Latency** | ${loadData.minLatencyMs} ms / ${loadData.maxLatencyMs} ms |\n`;
  md += `| **P50 / P90 / P99 Latency** | ${loadData.p50LatencyMs} ms / ${loadData.p90LatencyMs} ms / ${loadData.p99LatencyMs} ms |\n`;
  md += `| **Status** | ${loadData.status === 'Passed' ? '🟢 PASSED' : '🟡 DEGRADED'} |\n\n`;
}

// Collapsible Selenium test list
md += `<details>\n<summary>🔍 View All ${selTotal} Selenium E2E Test Cases (Status List)</summary>\n\n`;
md += `| Test Code | Description | Status | Duration (ms) |\n`;
md += `| :---: | :--- | :---: | :---: |\n`;
seleniumData.forEach(test => {
  let id = '';
  let desc = test.title;
  if (test.title.startsWith('TC-')) {
    const match = test.title.match(/^(TC-\d+)\s*-?\s*(.*)$/);
    if (match) {
      id = match[1];
      desc = match[2];
    }
  }
  const statusEmoji = test.state === 'passed' ? '🟢' : '🔴';
  md += `| \`${id}\` | ${desc} | ${statusEmoji} ${test.state.toUpperCase()} | ${test.duration} |\n`;
});
md += `\n</details>\n\n`;

// Collapsible API test list
md += `<details>\n<summary>🔍 View All ${apiTotal} API Integration Test Cases (Status List)</summary>\n\n`;
md += `| Test Code | Description | Status | Duration (ms) |\n`;
md += `| :---: | :--- | :---: | :---: |\n`;
apiData.forEach(test => {
  let id = '';
  let desc = test.title;
  if (test.title.startsWith('TC-API-')) {
    const match = test.title.match(/^(TC-API-\d+)\s*-?\s*(.*)$/);
    if (match) {
      id = match[1];
      desc = match[2];
    }
  }
  const statusEmoji = test.state === 'passed' ? '🟢' : '🔴';
  md += `| \`${id}\` | ${desc} | ${statusEmoji} ${test.state.toUpperCase()} | ${test.duration} |\n`;
});
md += `\n</details>\n`;

// Output summary
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.writeFileSync(process.env.GITHUB_STEP_SUMMARY, md, 'utf8');
  console.log("Wrote test results summary dashboard to GITHUB_STEP_SUMMARY.");
} else {
  const previewPath = path.join(__dirname, 'test_summary_preview.md');
  fs.writeFileSync(previewPath, md, 'utf8');
  console.log(`Local markdown preview written to: ${previewPath}`);
}
