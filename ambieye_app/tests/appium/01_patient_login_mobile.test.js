const assert = require('assert');

describe('AmbiEye Patient Mobile Client E2E Tests - Patient Portal', () => {
  async function getElementByText(text) {
    if (driver.isAndroid) {
      return $(`//*[@text="${text}" or @content-desc="${text}" or contains(@text, "${text}")]`);
    } else {
      return $(`//*[@label="${text}" or @name="${text}" or contains(@label, "${text}")]`);
    }
  }

  async function getInputByPlaceholder(placeholder) {
    if (driver.isAndroid) {
      return $(`//android.widget.EditText[@text="${placeholder}" or @hint="${placeholder}" or contains(@text, "${placeholder}")]`);
    } else {
      return $(`//XCUIElementTypeTextField[@value="${placeholder}" or @name="${placeholder}" or contains(@value, "${placeholder}")]`);
    }
  }

  async function getUsernameInput() {
    if (driver.isAndroid) {
      return $('//android.widget.EditText');
    } else {
      return $('//XCUIElementTypeTextField');
    }
  }

  async function getPasswordInput() {
    if (driver.isAndroid) {
      const secureField = $('//android.widget.EditText[@password="true"]');
      if (await secureField.isExisting()) return secureField;
      return $('(//android.widget.EditText)[2]');
    } else {
      const secureField = $('//XCUIElementTypeSecureTextField');
      if (await secureField.isExisting()) return secureField;
      return $('(//XCUIElementTypeTextField)[2]');
    }
  }

  it('should wait for splash redirect and load user type selection', async () => {
    const chooseRoleLabel = await getElementByText('Choose your role');
    await chooseRoleLabel.waitForDisplayed({
      timeout: 20000,
      timeoutMsg: 'Timed out waiting for Choose your role screen'
    });
    assert.ok(await chooseRoleLabel.isDisplayed());
  });

  it('should choose Patient portal role', async () => {
    const patientButton = await getElementByText('Patient');
    await patientButton.waitForDisplayed({ timeout: 5000 });
    await patientButton.click();
  });

  it('should authenticate Patient with correct credentials', async () => {
    const signinHeader = await getElementByText('Sign in to continue');
    await signinHeader.waitForDisplayed({ timeout: 10000 });

    const usernameInput = await getUsernameInput();
    const passwordInput = await getPasswordInput();
    const loginButton = await getElementByText('Sign In');

    await usernameInput.click();
    await usernameInput.setValue('mahit');
    await passwordInput.click();
    await passwordInput.setValue('Meheer17');
    await loginButton.click();

    const patientGreeting = await getElementByText('mahit');
    await patientGreeting.waitForDisplayed({
      timeout: 20000,
      timeoutMsg: 'Patient dashboard did not load after login'
    });
    assert.ok(await patientGreeting.isDisplayed());
  });

  it('should add, edit, and delete a reminder', async () => {
    // Click "Add" or "Set Reminder"
    const addReminderBtn = await getElementByText('Add');
    await addReminderBtn.click();

    // Type title in modal input
    const modalInput = await getInputByPlaceholder('Enter reminder title');
    await modalInput.waitForDisplayed({ timeout: 5000 });
    await modalInput.setValue('Mobile E2E exercise');

    const submitBtn = await getElementByText('Submit');
    await submitBtn.click();

    // Verify reminder is added
    const reminderText = await getElementByText('Mobile E2E exercise');
    await reminderText.waitForDisplayed({ timeout: 5000 });
    assert.ok(await reminderText.isDisplayed());

    // Edit reminder
    const editBtn = await $('~edit | //*[contains(@name, "edit") or @role="button"]');
    if (await editBtn.isExisting()) {
      await editBtn.click();
      const editInput = await getInputByPlaceholder('Enter reminder title');
      await editInput.setValue('Mobile E2E exercise - Done');
      const saveBtn = await getElementByText('Save');
      await saveBtn.click();

      const updatedText = await getElementByText('Mobile E2E exercise - Done');
      await updatedText.waitForDisplayed({ timeout: 5000 });
      assert.ok(await updatedText.isDisplayed());
    }

    // Delete reminder
    const deleteBtn = await $('~trash-2 | //*[contains(@name, "trash") or @role="button"]');
    if (await deleteBtn.isExisting()) {
      await deleteBtn.click();
    }
  });

  it('should navigate to Games, switch categories', async () => {
    const viewAllGamesBtn = await getElementByText('View all');
    await viewAllGamesBtn.click();

    const gamesHeader = await getElementByText('Vision Games');
    await gamesHeader.waitForDisplayed({ timeout: 10000 });

    const movementTab = await getElementByText('Movement');
    await movementTab.click();

    // Back to dashboard
    const backBtn = await $('~arrow-left | (//XCUIElementTypeButton)[1]');
    if (await backBtn.isExisting()) {
      await backBtn.click();
    } else {
      // Fallback redirect
      await driver.back();
    }
  });

  it('should create and submit a patient query to the doctor', async () => {
    const askButton = await getElementByText('Ask');
    await askButton.click();

    try {
      // Click the trigger button to open modal
      const newQueryBtn = await getElementByText('Ask a Question');
      if (await newQueryBtn.isExisting()) {
        await newQueryBtn.click();
      } else {
        const plusBtn = await getElementByText('plus');
        if (await plusBtn.isExisting()) {
          await plusBtn.click();
        }
      }
    } catch (err) {
      console.log('Error opening query modal: ' + err.message);
    }

    const queryInput = await getInputByPlaceholder('Describe your concern or question...');
    await queryInput.waitForDisplayed({ timeout: 10000 });

    const highPriorityBtn = await getElementByText('High');
    await highPriorityBtn.click();

    await queryInput.setValue('Should I train in a well-lit room on mobile?');

    const submitQueryBtn = await getElementByText('Submit');
    await submitQueryBtn.click();

    // Dismiss Alert confirmation popup
    if (await driver.isAlertOpen()) {
      await driver.acceptAlert();
    }
  });

  it('should navigate to Settings, update profile, update eye tracking server IP and logout', async () => {
    const settingsButton = await getElementByText('Settings');
    await settingsButton.click();

    // Verify Settings screen loaded
    const accountLabel = await getElementByText('ACCOUNT');
    await accountLabel.waitForDisplayed({ timeout: 10000 });

    // --- Test updateProfile API ---
    const editProfileBtn = await getElementByText('Edit Profile');
    await editProfileBtn.click();

    const nameInput = await getInputByPlaceholder('Enter your full name');
    await nameInput.waitForDisplayed({ timeout: 10000 });
    await nameInput.setValue('Mahit Mobile E2E');

    const saveChangesBtn = await getElementByText('Save Changes');
    await saveChangesBtn.click();

    if (await driver.isAlertOpen()) {
      await driver.acceptAlert();
    }

    // Configure eye tracking server config
    const opencvCard = await getElementByText('OpenCV Server');
    await opencvCard.click();

    const serverIpInput = await getInputByPlaceholder('e.g. 192.168.1.42');
    await serverIpInput.waitForDisplayed({ timeout: 5000 });
    await serverIpInput.setValue('192.168.1.160');

    const saveBtn = await getElementByText('Save');
    await saveBtn.click();

    if (await driver.isAlertOpen()) {
      await driver.acceptAlert();
    }

    // Execute Logout
    const logoutBtn = await getElementByText('Logout');
    await logoutBtn.click();

    if (await driver.isAlertOpen()) {
      await driver.acceptAlert();
    } else {
      try {
        const dialogButton = driver.isAndroid
          ? $('//*[@text="LOGOUT" or @text="Logout" or @resource-id="android:id/button1"]')
          : $('//*[@label="Logout"]');
        if (await dialogButton.isExisting()) {
          await dialogButton.click();
        }
      } catch (err) {
        console.log("No logout confirmation alert dialog button found: " + err.message);
      }
    }

    const chooseRoleLabel = await getElementByText('Choose your role');
    await chooseRoleLabel.waitForDisplayed({ timeout: 15000 });
    assert.ok(await chooseRoleLabel.isDisplayed());
  });
});
