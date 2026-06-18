# Selenium Testing for AmbiEye Frontend

This directory contains End-to-End (E2E) testing scripts for the AmbiEye web portal using Selenium WebDriver and Mocha.

### Included Tests

1. **Doctor Portal Tests (`doctor_login.test.js`)**:
   - Tests role card selection, validation banner verification.
   - Logs in with doctor credentials, navigates Doctor Dashboard (recent patients list, pending query list).
   - Opens patient profile detail modal and query modal.
   - Opens Settings, logs out, and accepts browser confirm alerts.
   
2. **Patient Portal Tests (`patient_login.test.js`)**:
   - Logs in with patient credentials.
   - Navigates Patient Dashboard, tests adding, editing, and deleting reminders.
   - Navigates Game selection tab and filters exercises by category.
   - Submits health query to doctor with specific priority (High/Medium/Low) and handles confirmation alert boxes.
   - Configures eye tracking OpenCV server details (IP and Port) under settings, saves it, and logs out.

## Prerequisites

1. **Node.js**: Ensure Node.js is installed.
2. **Google Chrome** or **Mozilla Firefox**: Standard browsers for Selenium testing.
3. **Webdriver**: Selenium 4 manages driver binaries automatically. However, you must have the actual browsers installed.

## Setup and Installation

1. Navigate to the Selenium tests directory:
   ```bash
   cd ambieye_app/tests/selenium
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Tests

First, start the AmbiEye frontend in Web mode. From the `ambieye_app` root directory:
```bash
npm run web
```

Then, in a new terminal, execute the Selenium tests:
```bash
# Run tests against default http://localhost:8081 with visible browser window
npm test

# Run tests headlessly (required for CI environments)
HEADLESS=true npm test

# Run tests targeting a custom URL (e.g. production or staging env)
APP_URL=https://p01--ambieye--6s9l5yxyj7q6.code.run npm test

# Run tests in Firefox instead of Chrome
BROWSER=firefox npm test
```
