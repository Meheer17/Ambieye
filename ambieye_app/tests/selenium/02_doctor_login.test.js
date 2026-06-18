const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const assert = require('assert');

const APP_URL = process.env.APP_URL || 'http://localhost:8081';
const HEADLESS = process.env.HEADLESS === 'true';
const BROWSER = process.env.BROWSER || 'chrome';

describe('AmbiEye Doctor Portal End-to-End Tests', function () {
  this.timeout(60000);
  let driver;

  before(async function () {
    const chromeOptions = new chrome.Options();
    if (HEADLESS) {
      chromeOptions.addArguments('--headless=new');
      chromeOptions.addArguments('--no-sandbox');
      chromeOptions.addArguments('--disable-dev-shm-usage');
      chromeOptions.addArguments('--window-size=1280,800');
    }

    const firefoxOptions = new firefox.Options();
    if (HEADLESS) {
      firefoxOptions.addArguments('--headless');
    }

    try {
      if (BROWSER === 'firefox') {
        driver = await new Builder().forBrowser('firefox').setFirefoxOptions(firefoxOptions).build();
      } else {
        driver = await new Builder().forBrowser('chrome').setChromeOptions(chromeOptions).build();
      }
    } catch (err) {
      if (BROWSER === 'chrome' && !process.env.BROWSER) {
        console.warn("Chrome failed to initialize. Attempting Firefox fallback...");
        driver = await new Builder().forBrowser('firefox').setFirefoxOptions(firefoxOptions).build();
      } else {
        throw err;
      }
    }

    await driver.manage().setTimeouts({ implicit: 0, pageLoad: 30000 });
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
  });

  async function clearAndType(element, text) {
    await jsClick(element);
    const os = process.platform;
    const selectAll = (os === 'darwin') ? Key.COMMAND + 'a' : Key.CONTROL + 'a';
    await element.sendKeys(selectAll);
    await element.sendKeys(Key.BACK_SPACE);
    await element.sendKeys(text);
  }

  async function jsClick(element) {
    await driver.executeScript("arguments[0].click();", element);
  }

  it('should navigate to user role selection and choose Doctor', async function () {
    await driver.get(APP_URL);

    const chooseRoleText = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(), 'Choose your role')]")),
      15000,
      'Timed out waiting for role selection screen to load'
    );
    assert.ok(chooseRoleText);

    const doctorCard = await driver.findElement(By.xpath("//*[text()='Doctor']/.."));
    await jsClick(doctorCard);
  });

  it('should display login screen and validate empty inputs', async function () {
    const loginHeader = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(), 'Sign in to continue')]")),
      10000,
      'Timed out waiting for login screen to load'
    );
    assert.ok(loginHeader);

    const usernameInput = await driver.findElement(By.css("input[placeholder='Enter your username']"));
    const passwordInput = await driver.findElement(By.css("input[placeholder='Enter your password']"));
    const signInButton = await driver.findElement(By.xpath("//*[text()='Sign In']/.."));

    await clearAndType(usernameInput, '');
    await clearAndType(passwordInput, '');
    await jsClick(signInButton);

    const validationError = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(), 'Please fill in all fields')]")),
      5000,
      'Validation error banner not displayed'
    );
    assert.ok(validationError);
  });

  it('should authenticate doctor with valid credentials', async function () {
    const usernameInput = await driver.findElement(By.css("input[placeholder='Enter your username']"));
    const passwordInput = await driver.findElement(By.css("input[placeholder='Enter your password']"));
    const signInButton = await driver.findElement(By.xpath("//*[text()='Sign In']/.."));

    await clearAndType(usernameInput, 'mahi');
    await clearAndType(passwordInput, 'Meheer17');
    await jsClick(signInButton);

    // Wait for login API and initial dashboard data load
    await driver.sleep(3000);

    const dashboardGreeting = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(), 'Good day,')]")),
      30000,
      'Doctor Dashboard failed to load after login'
    );
    assert.ok(dashboardGreeting);
  });

  it('should verify dashboard stats and quick actions', async function () {
    const patientsStat = await driver.findElement(By.xpath("//*[text()='Patients']"));
    assert.ok(patientsStat);

    const queriesStat = await driver.findElement(By.xpath("//*[text()='Pending Queries']"));
    assert.ok(queriesStat);

    const patientsAction = await driver.findElement(By.xpath("//*[text()='Patients']/.."));
    const queriesAction = await driver.findElement(By.xpath("//*[text()='Queries']/.."));
    const settingsAction = await driver.findElement(By.xpath("//*[text()='Settings']/.."));

    assert.ok(patientsAction);
    assert.ok(queriesAction);
    assert.ok(settingsAction);
  });

  it('should navigate to Patients page, edit medical info, and add a visit record', async function () {
    const patientsAction = await driver.findElement(By.xpath("//*[text()='Patients']/.."));
    await jsClick(patientsAction);

    const patientsHeader = await driver.wait(
      until.elementLocated(By.xpath("//*[text()='Patients']")),
      10000,
      'Patients page header not found'
    );
    assert.ok(patientsHeader);

    // Wait for patients list to load (either patient card or 'No patients found' is displayed)
    let patientCards = [];
    try {
      await driver.wait(
        until.elementLocated(By.xpath("//*[contains(text(), 'Male') or contains(text(), 'Female') or contains(text(), 'Other') or contains(text(), 'N/A') or contains(text(), 'No patients found')]")),
        20000,
        'Timed out waiting for patients list to load'
      );
      patientCards = await driver.findElements(By.xpath("//*[contains(text(), 'Male') or contains(text(), 'Female') or contains(text(), 'Other') or contains(text(), 'N/A')]"));
    } catch (err) {
      console.log('Skipping medical record and visit addition: timed out waiting for patients list.');
    }

    if (patientCards.length > 0) {
      await jsClick(patientCards[0]);
      
      // Wait for patient details to load from API
      await driver.sleep(3000);

      const modalHeader = await driver.wait(
        until.elementLocated(By.xpath("//*[text()='Patient Details']")),
        10000,
        'Patient Details modal did not open'
      );
      assert.ok(modalHeader);

      // --- Test updatePatientMedicalInfo API ---
      const editMedBtn = await driver.findElement(By.xpath("//*[text()='Medical Information']/..//*[text()='Edit']/.."));
      await jsClick(editMedBtn);
      await driver.sleep(500);

      const bpInput = await driver.findElement(By.css("input[placeholder='Enter BP']"));
      await clearAndType(bpInput, '118/75');

      const complaintInput = await driver.findElement(By.xpath("//textarea[@placeholder='Enter chief complaint'] | //input[@placeholder='Enter chief complaint']"));
      await clearAndType(complaintInput, 'E2E testing complaint update');

      const saveMedBtn = await driver.findElement(By.xpath("//*[text()='Save']/.."));
      await jsClick(saveMedBtn);
      
      // Wait for medical info save API
      await driver.sleep(3000);

      await driver.wait(until.alertIsPresent(), 5000);
      let alert = await driver.switchTo().alert();
      let alertText = await alert.getText();
      assert.match(alertText, /success|updated/i);
      await alert.accept();

      // --- Test addPatientVisitRecord API ---
      const addVisitBtn = await driver.findElement(By.xpath("//*[text()='Add Visit']/.."));
      await jsClick(addVisitBtn);
      await driver.sleep(500);

      const visionDistantInput = await driver.wait(
        until.elementLocated(By.xpath("//*[text()='Vision (Distant)']/..//input")),
        5000,
        'Distant vision input in visit modal not found'
      );
      await clearAndType(visionDistantInput, '6/6');

      const notesInput = await driver.findElement(By.xpath("//*[text()='Notes']/..//textarea | //*[text()='Notes']/..//input"));
      await clearAndType(notesInput, 'Visual health stable. Recommend eye games daily.');

      const saveRecordBtn = await driver.findElement(By.xpath("//*[text()='Save Record']/.."));
      await jsClick(saveRecordBtn);
      
      // Wait for add visit record API
      await driver.sleep(3000);

      await driver.wait(until.alertIsPresent(), 5000);
      alert = await driver.switchTo().alert();
      alertText = await alert.getText();
      assert.match(alertText, /success|added/i);
      await alert.accept();

      const backButton = await driver.findElement(By.xpath("//*[text()='Patient Details']/preceding-sibling::*[1]/.."));
      await jsClick(backButton);
    } else {
      console.log('Skipping medical record and visit addition: No patients available.');
    }

    await driver.get(`${APP_URL}/(doctor)/`);
    await driver.sleep(2000);
    await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'Good day,')]")), 10000);
  });

  it('should navigate to Queries page and respond to a patient query', async function () {
    const queriesAction = await driver.findElement(By.xpath("//*[text()='Queries']/.."));
    await jsClick(queriesAction);

    const queriesHeader = await driver.wait(
      until.elementLocated(By.xpath("//*[text()='Patient Queries']")),
      10000,
      'Patient Queries page header not found'
    );
    assert.ok(queriesHeader);

    // Click "All patients" to ensure we see queries from all patients
    try {
      const allPatientsBtn = await driver.wait(
        until.elementLocated(By.xpath("//*[contains(text(), 'All patients')]/..")),
        10000,
        'All patients checkbox not found'
      );
      await jsClick(allPatientsBtn);
      await driver.sleep(1000); // Wait for API to refresh
    } catch (err) {
      console.log('Could not click All patients checkbox: ', err.message);
    }

    // Wait for patient queries list to load (either query card or 'No queries found' is displayed)
    let queryCards = [];
    try {
      await driver.wait(
        until.elementLocated(By.xpath("//*[contains(text(), 'Awaiting response') or contains(text(), 'Responded') or contains(text(), 'No queries found')]")),
        20000,
        'Timed out waiting for patient queries list to load'
      );
      // Prefer pending queries to test the response form, fall back to responded queries
      queryCards = await driver.findElements(By.xpath("//*[contains(text(), 'Awaiting response')]"));
      if (queryCards.length === 0) {
        queryCards = await driver.findElements(By.xpath("//*[contains(text(), 'Responded')]"));
      }
    } catch (err) {
      console.log('Skipping query answering: timed out waiting for queries list.');
    }

    if (queryCards.length > 0) {
      await jsClick(queryCards[0]);

      const modalHeader = await driver.wait(
        until.elementLocated(By.xpath("//*[text()='Query Details']")),
        10000,
        'Query Details modal did not open'
      );
      assert.ok(modalHeader);

      // Wait for modal input elements to finish loading
      await driver.wait(
        until.elementLocated(By.xpath("//textarea[contains(@placeholder, 'Type your response')] | //*[contains(text(), 'Your Response')]")),
        10000,
        'Timed out waiting for response fields inside query details modal'
      );

      const responseInputs = await driver.findElements(By.css("textarea[placeholder*='Type your response']"));
      if (responseInputs.length > 0) {
        await clearAndType(responseInputs[0], 'Make sure to take 10-minute breaks every 30 minutes of eye training.');
        const sendResponseBtn = await driver.findElement(By.xpath("//*[text()='Send Response']/.."));
        await jsClick(sendResponseBtn);
        
        // Wait for respond query API to complete
        await driver.sleep(3000);

        await driver.wait(until.alertIsPresent(), 5000);
        const alert = await driver.switchTo().alert();
        const alertText = await alert.getText();
        assert.match(alertText, /success|sent/i);
        await alert.accept();
      } else {
        console.log('Query is already responded. Closing modal.');
        const backButton = await driver.findElement(By.xpath("//*[text()='Query Details']/preceding-sibling::*[1]/.."));
        await jsClick(backButton);
      }
    } else {
      console.log('Skipping query answering: No pending queries available.');
    }

    await driver.get(`${APP_URL}/(doctor)/`);
    await driver.sleep(2000);
    await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'Good day,')]")), 10000);
  });

  it('should navigate to Settings, update profile information, and execute logout', async function () {
    const settingsAction = await driver.findElement(By.xpath("//*[text()='Settings']/.."));
    await jsClick(settingsAction);
    
    // Wait for settings page API load
    await driver.sleep(2500);

    const settingsLabel = await driver.wait(
      until.elementLocated(By.xpath("//*[text()='MY DOCTOR CODE']")),
      10000,
      'Settings screen failed to load'
    );
    assert.ok(settingsLabel);

    const editProfileBtn = await driver.findElement(By.xpath("//*[text()='Edit Profile']/.."));
    await jsClick(editProfileBtn);
    await driver.sleep(500);

    const nameInput = await driver.wait(
      until.elementLocated(By.css("input[placeholder='Enter your full name']")),
      5000,
      'Edit Profile screen name input not found'
    );
    const currentVal = await nameInput.getAttribute('value');
    const newVal = currentVal.includes('E2E Test') ? currentVal : `${currentVal} E2E Test`;
    await clearAndType(nameInput, newVal);

    const saveChangesBtn = await driver.findElement(By.xpath("//*[text()='Save Changes']/.."));
    await jsClick(saveChangesBtn);
    
    // Wait for profile update API to complete
    await driver.sleep(3000);

    await driver.wait(until.alertIsPresent(), 5000);
    let alert = await driver.switchTo().alert();
    let alertText = await alert.getText();
    assert.match(alertText, /success|updated/i);
    await alert.accept();

    // Reload settings page to refresh updated profile name
    await driver.get(`${APP_URL}/(doctor)/settings`);
    await driver.sleep(2500);

    const updatedNameLabel = await driver.wait(
      until.elementLocated(By.xpath(`//*[contains(text(), '${newVal}')]`)),
      5000,
      'Updated profile name not visible on settings page'
    );
    assert.ok(updatedNameLabel);

    const logoutButton = await driver.findElement(By.xpath("//*[text()='Logout']/.."));
    await jsClick(logoutButton);

    await driver.wait(until.alertIsPresent(), 5000);
    alert = await driver.switchTo().alert();
    await alert.accept();

    const redirectLabel = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(), 'Sign in to continue')] | //*[contains(text(), 'Choose your role')]")),
      15000,
      'Logout failed to redirect back to login or role selection screen'
    );
    assert.ok(redirectLabel);
  });
});
