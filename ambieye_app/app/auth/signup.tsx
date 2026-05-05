import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import Feather from "@expo/vector-icons/Feather";
import { Colors, Shadows } from "@/constants/theme";

export default function SignUpScreen() {
  const { signup, userType, isLoading, error, clearError } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [address, setAddress] = useState("");
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isDoctor = userType === "doctor";
  const accentColor = isDoctor ? Colors.primary : Colors.secondary;

  useEffect(() => {
    if (error) {
      Alert.alert("Signup Failed", error, [{ text: "OK", onPress: clearError }]);
    }
  }, [error, clearError]);

  const validateStep = (step: number) => {
    setValidationError("");
    if (step === 1) {
      if (!fullName || !username || !email || !phone) {
        setValidationError("Please fill in all fields in this step");
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setValidationError("Please enter a valid email address");
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!age || !gender || !fatherName || !motherName || !address || !dateOfBirth) {
        setValidationError("Please fill in all fields in this step");
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (!password || !confirmPassword) {
        setValidationError("Please fill in all fields in this step");
        return false;
      }
      if (password !== confirmPassword) {
        setValidationError("Passwords do not match");
        return false;
      }
      if (!agreedToPrivacy) {
        setValidationError("Please accept the Privacy Policy and Terms of Service");
        return false;
      }
      return true;
    }
    return false;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    setValidationError("");
    setCurrentStep(currentStep - 1);
  };

  const handleSignUp = async () => {
    if (!validateStep(3)) return;
    const success = await signup({
      fullName, username, email, password,
      phone, age, gender, dateOfBirth,
      fatherName, motherName, address,
    });
    if (success) {
      if (userType === "doctor") router.replace("/(doctor)/");
      else router.replace("/(patient)/");
    }
  };

  const stepLabels = ["Basic Info", "Personal", "Security"];
  const stepTitles = ["Basic Information", "Personal Details", "Create Password"];
  const stepIcons = ["user", "heart", "lock"] as const;

  const renderInput = (
    placeholder: string,
    value: string,
    onChangeText: (t: string) => void,
    options: {
      icon?: string;
      keyboardType?: any;
      multiline?: boolean;
      secureTextEntry?: boolean;
      showToggle?: boolean;
      onToggle?: () => void;
      showValue?: boolean;
    } = {}
  ) => (
    <View style={styles.inputGroup}>
      <View style={styles.inputWrapper}>
        {options.icon && (
          <View style={styles.inputIconBg}>
            <Feather name={options.icon as any} size={16} color={Colors.textSecondary} />
          </View>
        )}
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textLight}
          value={value}
          onChangeText={onChangeText}
          keyboardType={options.keyboardType || "default"}
          autoCapitalize="none"
          multiline={options.multiline}
          secureTextEntry={options.secureTextEntry && !options.showValue}
          editable={!isLoading}
        />
        {options.showToggle && (
          <TouchableOpacity onPress={options.onToggle} style={styles.eyeButton}>
            <Feather name={options.showValue ? "eye-off" : "eye"} size={16} color={Colors.textLight} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            {renderInput("Full Name", fullName, setFullName, { icon: "user" })}
            {renderInput("Username", username, setUsername, { icon: "at-sign" })}
            {renderInput("Email Address", email, setEmail, { icon: "mail", keyboardType: "email-address" })}
            {renderInput("Phone Number", phone, setPhone, { icon: "phone", keyboardType: "phone-pad" })}
          </>
        );
      case 2:
        return (
          <>
            {renderInput("Age", age, setAge, { icon: "calendar", keyboardType: "numeric" })}
            {renderInput("Date of Birth (dd-mm-yyyy)", dateOfBirth, setDateOfBirth, { icon: "calendar" })}
            {renderInput("Gender", gender, setGender, { icon: "users" })}
            {renderInput("Father's Name", fatherName, setFatherName, { icon: "user" })}
            {renderInput("Mother's Name", motherName, setMotherName, { icon: "user" })}
            {renderInput("Address", address, setAddress, { icon: "map-pin", multiline: true })}
          </>
        );
      case 3:
        return (
          <>
            {renderInput("Password", password, setPassword, {
              icon: "lock",
              secureTextEntry: true,
              showToggle: true,
              showValue: showPassword,
              onToggle: () => setShowPassword(!showPassword),
            })}
            {renderInput("Confirm Password", confirmPassword, setConfirmPassword, {
              icon: "lock",
              secureTextEntry: true,
              showToggle: true,
              showValue: showConfirmPassword,
              onToggle: () => setShowConfirmPassword(!showConfirmPassword),
            })}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgreedToPrivacy(!agreedToPrivacy)}
              disabled={isLoading}
            >
              <View style={[styles.checkbox, agreedToPrivacy && { backgroundColor: accentColor, borderColor: accentColor }]}>
                {agreedToPrivacy && <Feather name="check" size={13} color="#fff" />}
              </View>
              <View style={styles.checkboxTextRow}>
                <Text style={styles.checkboxText}>I agree to the </Text>
                <TouchableOpacity onPress={() => router.push("/auth/privacy")} disabled={isLoading}>
                  <Text style={[styles.checkboxLink, { color: accentColor }]}>Privacy Policy</Text>
                </TouchableOpacity>
                <Text style={styles.checkboxText}> and Terms</Text>
              </View>
            </TouchableOpacity>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      {/* Background decorations */}
      <View style={[styles.bgCircle1, { backgroundColor: accentColor }]} />
      <View style={styles.bgCircle2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
            <View style={styles.logoRow}>
              <View style={[styles.logoBox, { borderColor: `${accentColor}40` }]}>
                <Image source={require("../../assets/images/logo.png")} style={styles.logo} />
              </View>
              <View>
                <Text style={styles.appName}>AmbiEye</Text>
                <View style={[styles.roleBadge, { backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40` }]}>
                  <Feather name={isDoctor ? "activity" : "eye"} size={11} color={accentColor} />
                  <Text style={[styles.roleBadgeText, { color: accentColor }]}>
                    {isDoctor ? "Doctor" : "Patient"}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.headerTitle}>Create Account</Text>
          </View>

          {/* Step Progress */}
          <View style={styles.stepProgress}>
            {stepLabels.map((label, i) => {
              const step = i + 1;
              const isActive = currentStep === step;
              const isCompleted = currentStep > step;
              return (
                <React.Fragment key={step}>
                  <View style={styles.stepItem}>
                    <View style={[
                      styles.stepCircle,
                      isActive && { backgroundColor: accentColor, borderColor: accentColor },
                      isCompleted && styles.stepCircleCompleted,
                    ]}>
                      {isCompleted ? (
                        <Feather name="check" size={14} color="#fff" />
                      ) : (
                        <Feather name={stepIcons[i]} size={14} color={isActive ? "#fff" : "rgba(255,255,255,0.4)"} />
                      )}
                    </View>
                    <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>
                      {label}
                    </Text>
                  </View>
                  {i < 2 && (
                    <View style={[styles.stepConnector, isCompleted && styles.stepConnectorCompleted]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.stepTitle}>{stepTitles[currentStep - 1]}</Text>

            {validationError ? (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={15} color={Colors.error} />
                <Text style={styles.errorText}>{validationError}</Text>
              </View>
            ) : null}

            {renderStepContent()}

            {/* Buttons */}
            <View style={styles.buttonRow}>
              {currentStep > 1 && (
                <TouchableOpacity
                  style={styles.prevButton}
                  onPress={handlePrevious}
                  disabled={isLoading}
                >
                  <Feather name="arrow-left" size={16} color={Colors.textSecondary} />
                  <Text style={styles.prevButtonText}>Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  { backgroundColor: accentColor },
                  currentStep === 1 && styles.nextButtonFull,
                  isLoading && styles.nextButtonDisabled,
                ]}
                onPress={currentStep === 3 ? handleSignUp : handleNext}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.nextButtonText}>
                      {currentStep === 3 ? "Create Account" : "Continue"}
                    </Text>
                    <Feather name="arrow-right" size={16} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/auth/login" asChild>
              <TouchableOpacity disabled={isLoading}>
                <Text style={[styles.footerLink, { color: accentColor }]}>Sign in</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  bgCircle1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.08,
    top: -80,
    right: -60,
  },
  bgCircle2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.accent,
    opacity: 0.05,
    bottom: 80,
    left: -40,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 56,
    marginBottom: 24,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  logo: {
    width: 28,
    height: 28,
    resizeMode: "contain",
  },
  appName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  stepProgress: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  stepItem: {
    alignItems: "center",
    gap: 6,
  },
  stepCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
  },
  stepCircleCompleted: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  stepLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "500",
  },
  stepLabelActive: {
    color: "#FFFFFF",
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 20,
    marginHorizontal: 6,
  },
  stepConnectorCompleted: {
    backgroundColor: Colors.accent,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    ...Shadows.lg,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingRight: 14,
    minHeight: 52,
    overflow: 'hidden',
  },
  inputIconBg: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.divider,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingLeft: 12,
    paddingVertical: 12,
  },
  eyeButton: {
    padding: 4,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  checkboxTextRow: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  checkboxText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  checkboxLink: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  prevButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  prevButtonText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  nextButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
  },
});
