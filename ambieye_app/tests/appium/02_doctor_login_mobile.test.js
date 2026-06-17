const assert = require('assert');

describe('AmbiEye React Native Mobile Client E2E Tests - Doctor Portal', () => {
  // Helper to locate elements by text content on Android/iOS
  async function getElementByText(text) {
    if (driver.isAndroid) {
      return $(`//*[@text="${text}" or @content-desc="${text}" or contains(@text, "${text}")]`);
    } else {
      return $(`//*[@label="${text}" or @name="${text}" or contains(@label, "${text}")]`);
    }
  }

  // Helper to find input fields by placeholder/hint text
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

  it('should choose Doctor portal role', async () => {
    const doctorButton = await getElementByText('Doctor');
    await doctorButton.waitForDisplayed({ timeout: 5000 });
    await doctorButton.click();
  });

  it('should load login screen and validate input field warning', async () => {
    const signinHeader = await getElementByText('Sign in to continue');
    await signinHeader.waitForDisplayed({ timeout: 10000 });

    const usernameInput = await getUsernameInput();
    const passwordInput = await getPasswordInput();
    const loginButton = await getElementByText('Sign In');

    await usernameInput.click();
    await usernameInput.clearValue();
    await passwordInput.click();
    await passwordInput.clearValue();
    await loginButton.click();

    const errorMsg = await getElementByText('Please fill in all fields');
    await errorMsg.waitForDisplayed({ timeout: 5000 });
    assert.ok(await errorMsg.isDisplayed(), 'Validation banner displayed successfully');
  });

  it('should authenticate Doctor with correct credentials', async () => {
    const usernameInput = await getUsernameInput();
    const passwordInput = await getPasswordInput();
    const loginButton = await getElementByText('Sign In');

    await usernameInput.click();
    await usernameInput.setValue('mahi');
    await passwordInput.click();
    await passwordInput.setValue('Meheer17');
    await loginButton.click();

    const doctorGreeting = await getElementByText('Good day');
    await doctorGreeting.waitForDisplayed({
      timeout: 20000,
      timeoutMsg: 'Doctor dashboard did not load after login'
    });
    assert.ok(await doctorGreeting.isDisplayed());
  });

  it('should check dashboard statistics', async () => {
    const patientsStat = await getElementByText('Patients');
    const queriesStat = await getElementByText('Pending Queries');

    assert.ok(await patientsStat.isDisplayed());
    assert.ok(await queriesStat.isDisplayed());
  });

  it('should navigate to Patients, update medical info, and add a visit record', async () => {
    // Navigate to Patients
    const patientsAction = await getElementByText('Patients');
    await patientsAction.click();

    // Wait for patients screen
    const searchInput = await getInputByPlaceholder('Search patients...');
    await searchInput.waitForDisplayed({ timeout: 10000 });

    // Look for first patient card containing 'mahit'
    const patientCard = await getElementByText('mahit');
    if (await patientCard.isExisting()) {
      await patientCard.click();

      // Wait for Patient Details Modal
      const modalHeader = await getElementByText('Patient Details');
      await modalHeader.waitForDisplayed({ timeout: 10000 });

      // --- Test updatePatientMedicalInfo API ---
      // Find "Edit" button next to Medical Information section
      const editMedBtn = await getElementByText('Edit');
      await editMedBtn.click();

      // Fill BP
      const bpInput = await getInputByPlaceholder('Enter BP');
      await bpInput.setValue('115/75');

      // Fill Chief Complaint
      const complaintInput = await getInputByPlaceholder('Enter chief complaint');
      await complaintInput.setValue('Mobile E2E Testing Complaint');

      const saveMedBtn = await getElementByText('Save');
      await saveMedBtn.click();

      // Handle Success confirmation dialog alert
      if (await driver.isAlertOpen()) {
        await driver.acceptAlert();
      }

      // --- Test addPatientVisitRecord API ---
      const addVisitBtn = await getElementByText('Add Visit');
      await addVisitBtn.click();

      // Input distant vision
      const visionInput = await $('//android.widget.EditText | //XCUIElementTypeTextField');
      await visionInput.setValue('6/6');

      const saveRecordBtn = await getElementByText('Save Record');
      await saveRecordBtn.click();

      // Handle Alert popup
      if (await driver.isAlertOpen()) {
        await driver.acceptAlert();
      }

      // Close modal (clicks left back arrow button)
      const closeBtn = await $('~arrow-left | //android.widget.Button[@content-desc="arrow-left"] | (//XCUIElementTypeButton)[1]');
      await closeBtn.click();
    }
  });

  it('should navigate to Settings, update profile, and execute logout', async () => {
    // Navigate back to Dashboard Settings
    const settingsButton = await getElementByText('Settings');
    await settingsButton.waitForDisplayed({ timeout: 5000 });
    await settingsButton.click();

    // Verify Settings Screen has loaded
    const doctorCodeLabel = await getElementByText('MY DOCTOR CODE');
    await doctorCodeLabel.waitForDisplayed({ timeout: 10000 });

    // --- Test updateProfile API ---
    const editProfileBtn = await getElementByText('Edit Profile');
    await editProfileBtn.click();

    const nameInput = await getInputByPlaceholder('Enter your full name');
    await nameInput.waitForDisplayed({ timeout: 10000 });
    
    // Type name
    await nameInput.click();
    await nameInput.setValue('Dr. Mahi Mobile E2E');

    const saveChangesBtn = await getElementByText('Save Changes');
    await saveChangesBtn.click();

    // Handle profile saved confirmation alert
    if (await driver.isAlertOpen()) {
      await driver.acceptAlert();
    }

    // Execute Logout
    const logoutBtn = await getElementByText('Logout');
    await logoutBtn.waitForDisplayed({ timeout: 10000 });
    await logoutBtn.click();

    // Handle logout prompt alert
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

    // Wait for redirect to role selection
    const chooseRoleLabel = await getElementByText('Choose your role');
    await chooseRoleLabel.waitForDisplayed({ timeout: 15000 });
    assert.ok(await chooseRoleLabel.isDisplayed());
  });
});
