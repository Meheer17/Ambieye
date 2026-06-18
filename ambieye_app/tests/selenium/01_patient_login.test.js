const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const assert = require('assert');

const APP_URL = process.env.APP_URL || 'http://localhost:8081';
const HEADLESS = process.env.HEADLESS === 'true';
const BROWSER = process.env.BROWSER || 'chrome';

describe('AmbiEye Patient Portal End-to-End Tests', function () {
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

  it('should navigate to user role selection and choose Patient', async function () {
    await driver.get(APP_URL);

    const chooseRoleText = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(), 'Choose your role')]")),
      15000,
      'Timed out waiting for role selection screen to load'
    );
    assert.ok(chooseRoleText);

    const patientCard = await driver.findElement(By.xpath("//*[text()='Patient']/.."));
    await jsClick(patientCard);
  });

  it('should authenticate Patient with valid credentials', async function () {
    const loginHeader = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(), 'Sign in to continue')]")),
      10000,
      'Timed out waiting for login screen to load'
    );
    assert.ok(loginHeader);

    const usernameInput = await driver.findElement(By.css("input[placeholder='Enter your username']"));
    const passwordInput = await driver.findElement(By.css("input[placeholder='Enter your password']"));
    const signInButton = await driver.findElement(By.xpath("//*[text()='Sign In']/.."));

    await clearAndType(usernameInput, 'mahit');
    await clearAndType(passwordInput, 'Meheer17');
    await jsClick(signInButton);
    
    // Wait for authentication API and initial dashboard load
    await driver.sleep(3000);

    const greeting = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(), 'mahit')]")),
      15000,
      'Patient Dashboard failed to load after login'
    );
    assert.ok(greeting);
  });

  // it('should add, edit, and delete a reminder', async function () {
  //   const addReminderButton = await driver.findElement(By.xpath("//*[text()='Add']/.. | //*[contains(text(), 'Set Reminder')]/.."));
  //   await jsClick(addReminderButton);
  //   await driver.sleep(1000); // Give the modal plenty of time to animate open

  //   const modalInput = await driver.wait(
  //     until.elementLocated(By.css("input")),
  //     5000,
  //     'Reminder input modal not found'
  //   );
  //   await driver.wait(until.elementIsVisible(modalInput), 5000);
    
  //   const reminderTitle = 'Morning vision training';
  //   await clearAndType(modalInput, reminderTitle);

  //   const submitBtn = await driver.findElement(By.xpath("//*[text()='Add']/.. | //*[text()='Submit']/.. | //*[text()='Save']/.."));
  //   await jsClick(submitBtn);

  //   const reminderItem = await driver.wait(
  //     until.elementLocated(By.xpath(`//*[text()='${reminderTitle}']`)),
  //     5000,
  //     'New reminder not visible in list'
  //   );
  //   assert.ok(reminderItem);

  //   // Edit reminder (click first child button in the actions card container)
  //   const editBtn = await driver.findElement(By.xpath(`//*[text()='${reminderTitle}']/../following-sibling::*[1]/*[1]`));
  //   await jsClick(editBtn);
  //   await driver.sleep(1000);

  //   const updatedTitle = 'Morning vision training - Done';
  //   const editInput = await driver.wait(
  //     until.elementLocated(By.css("input")),
  //     3000,
  //     'Edit reminder input not found'
  //   );
  //   await driver.wait(until.elementIsVisible(editInput), 3000);
  //   await clearAndType(editInput, updatedTitle);
    
  //   const saveBtn = await driver.findElement(By.xpath("//*[text()='Save']/.. | //*[text()='Add']/.. | //*[text()='Submit']/.."));
  //   await jsClick(saveBtn);

  //   const updatedItem = await driver.wait(
  //     until.elementLocated(By.xpath(`//*[text()='${updatedTitle}']`)),
  //     5000,
  //     'Updated reminder not visible'
  //   );
  //   assert.ok(updatedItem);

  //   // Delete reminder (click second child button in the actions card container)
  //   const deleteBtn = await driver.findElement(By.xpath(`//*[text()='${updatedTitle}']/../following-sibling::*[1]/*[2]`));
  //   await jsClick(deleteBtn);

  //   await driver.wait(until.stalenessOf(updatedItem), 5000);
  // });

  it('should navigate to Games section and filter categories', async function () {
    const viewAllGamesBtn = await driver.findElement(By.xpath("//*[text()='Game Categories']/..//*[text()='View all']/.."));
    await jsClick(viewAllGamesBtn);
    await driver.sleep(1000);

    const gamesHeader = await driver.wait(
      until.elementLocated(By.xpath("//*[text()='Vision Games']")),
      10000,
      'Vision Games screen failed to load'
    );
    assert.ok(gamesHeader);

    const movementTab = await driver.findElement(By.xpath("//*[text()='Movement']/.."));
    await jsClick(movementTab);
    await driver.sleep(1000);

    const exerciseText = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(), 'clockwise') or contains(text(), 'Clockwise')]")),
      5000
    );
    assert.ok(exerciseText);

    await driver.get(`${APP_URL}/(patient)/`);
    await driver.sleep(2000);
    await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'mahit')]")), 10000);
  });

  it('should create and submit a patient query to the doctor', async function () {
    const askButton = await driver.findElement(By.xpath("//*[text()='Queries']/..//*[text()='Ask']/.. | //*[text()='Ask a Question']/.."));
    await jsClick(askButton);
    
    // Wait for queries page API to load
    await driver.sleep(2500);

    try {
      const newQueryBtn = await driver.wait(
        until.elementLocated(By.xpath("//*[text()='My Queries']/ancestor::*[2]/*[2] | //*[contains(text(), 'Ask a Question')]/..")),
        5000
      );
      await jsClick(newQueryBtn);
      await driver.sleep(500);
    } catch (err) {
      console.log('Already in query modal or no extra trigger required');
    }

    const queryInput = await driver.wait(
      until.elementLocated(By.xpath("//textarea[@placeholder='Describe your concern or question...']")),
      5000,
      'Query input text area not found'
    );
    await driver.wait(until.elementIsVisible(queryInput), 5000);

    const highPriorityBtn = await driver.findElement(By.xpath("//*[text()='High']/.."));
    await jsClick(highPriorityBtn);

    await clearAndType(queryInput, 'Should I use a blue light filter while playing vision games?');

    const submitQueryBtn = await driver.findElement(By.xpath("//*[text()='Submit']/.."));
    await jsClick(submitQueryBtn);
    
    // Wait for query submit API call to process
    await driver.sleep(3000);

    await driver.wait(until.alertIsPresent(), 5000);
    const alert = await driver.switchTo().alert();
    const alertText = await alert.getText();
    assert.match(alertText, /submitted/i, 'Alert matches query success text');
    await alert.accept();
  });

  it('should open Settings, update profile, update eye tracking server IP and logout', async function () {
    await driver.get(`${APP_URL}/(patient)/settings`);
    
    // Wait for Settings page details to load from API
    await driver.sleep(2500);

    const settingsLabel = await driver.wait(
      until.elementLocated(By.xpath("//*[text()='ACCOUNT']")),
      10000,
      'Settings page failed to load'
    );
    assert.ok(settingsLabel);

    // --- Test updateProfile API (Patient) ---
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
    
    // Wait for update profile API to process
    await driver.sleep(3000);

    await driver.wait(until.alertIsPresent(), 5000);
    let alert = await driver.switchTo().alert();
    let alertText = await alert.getText();
    assert.match(alertText, /success|updated/i);
    await alert.accept();

    // Reload Settings page to refresh profile name
    await driver.get(`${APP_URL}/(patient)/settings`);
    await driver.sleep(2500); // Wait for reloading settings page

    // Verify name updated
    const updatedNameLabel = await driver.wait(
      until.elementLocated(By.xpath(`//*[contains(text(), '${newVal}')]`)),
      5000,
      'Updated profile name not visible on settings page'
    );
    assert.ok(updatedNameLabel);

    // Configure OpenCV Server config
    const opencvCard = await driver.findElement(By.xpath("//*[contains(text(), 'OpenCV Server')]/.."));
    await jsClick(opencvCard);
    await driver.sleep(500);

    const serverIpInput = await driver.wait(
      until.elementLocated(By.css("input[placeholder*='192.168']")),
      5000,
      'Server IP input not found'
    );
    await clearAndType(serverIpInput, '192.168.1.150');

    const saveBtn = await driver.findElement(By.xpath("//*[text()='Save']/.."));
    await jsClick(saveBtn);

    await driver.wait(until.alertIsPresent(), 5000);
    const serverSaveAlert = await driver.switchTo().alert();
    await serverSaveAlert.accept();

    // Logout
    const logoutBtn = await driver.findElement(By.xpath("//*[text()='Logout']/.."));
    await jsClick(logoutBtn);

    await driver.wait(until.alertIsPresent(), 5000);
    const logoutAlert = await driver.switchTo().alert();
    await logoutAlert.accept();

    const redirectLabel = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(), 'Sign in to continue')] | //*[contains(text(), 'Choose your role')]")),
      15000,
      'Logout failed to redirect back to login or role selection screen'
    );
    assert.ok(redirectLabel);
  });
});
