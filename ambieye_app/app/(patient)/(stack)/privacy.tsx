import React from "react";
import { StyleSheet, View, Text, ScrollView, SafeAreaView } from "react-native";

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Disclaimer Section */}
        <Text style={styles.disclaimerTitle}>Important Disclaimer</Text>
        <Text style={styles.disclaimerText}>
          This app does not provide medical advice, diagnosis, or treatment. It is intended as an eye training and wellness tool for children with lazy eye (amblyopia) and should only be used under the supervision of a qualified healthcare professional. Parents and guardians should always consult a doctor for any medical concerns. Progress reports are for informational purposes only.
        </Text>

        <Text style={styles.lastUpdated}>
          Last updated: {new Date().toLocaleDateString()}
        </Text>

        <Text style={styles.sectionTitle}>Introduction</Text>
        <Text style={styles.paragraph}>
          Welcome to Ambieye. This Privacy Policy explains how we collect, use,
          disclose, and safeguard your information when you use our eye training
          application and related services. We are committed to protecting your
          privacy and ensuring the security of your personal information.
        </Text>

        <Text style={styles.sectionTitle}>Information We Collect</Text>

        <Text style={styles.subTitle}>Personal Information</Text>
        <Text style={styles.paragraph}>
          • Full name, username, and contact information{"\n"}• Date of birth,
          age, and gender{"\n"}• Family information (father&apos;s and
          mother&apos;s names){"\n"}• Address and phone number{"\n"}• Email
          address for account verification
        </Text>

        <Text style={styles.subTitle}>Eye Training Data</Text>
        <Text style={styles.paragraph}>
          • Progress reports and activity logs{"\n"}• Training session results{"\n"}• Feedback from supervising doctors or guardians{"\n"}
        </Text>

        <Text style={styles.subTitle}>Technical Information</Text>
        <Text style={styles.paragraph}>
          • Device information and operating system{"\n"}• App usage statistics
          and performance data{"\n"}• IP address and location data (when
          permitted){"\n"}• Crash reports and error logs
        </Text>

        <Text style={styles.sectionTitle}>How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use your information to:{"\n\n"}• Provide eye training activities{"\n"}• Maintain progress records{"\n"}• Enable communication between parents, guardians, and doctors{"\n"}• Improve our services and app functionality{"\n"}• Send important updates about your training progress{"\n"}• Comply with legal and regulatory requirements{"\n"}• Ensure the security of our platform
        </Text>

        <Text style={styles.sectionTitle}>
          Information Sharing and Disclosure
        </Text>
        <Text style={styles.paragraph}>
          We do not sell, trade, or otherwise transfer your personal information
          to third parties without your consent, except in the following
          circumstances:{"\n\n"}• With healthcare providers or guardians involved in your care{"\n"}• When required by law or legal process{"\n"}• To protect the rights, property, or safety of our users{"\n"}• With your explicit consent for specific purposes{"\n"}• In case of emergencies requiring immediate attention
        </Text>

        <Text style={styles.sectionTitle}>Data Security</Text>
        <Text style={styles.paragraph}>
          We implement industry-standard security measures to protect your
          information:{"\n\n"}• End-to-end encryption for sensitive data
          {"\n"}• Secure servers with regular security updates{"\n"}• Access
          controls and authentication protocols{"\n"}• Regular security audits
          and vulnerability assessments
        </Text>

        <Text style={styles.sectionTitle}>Your Rights</Text>
        <Text style={styles.paragraph}>
          You have the right to:{"\n\n"}• Access your personal information{"\n"}• Request corrections to inaccurate data{"\n"}•
          Delete your account and associated data{"\n"}• Restrict processing of
          your information{"\n"}• Data portability for your records
          {"\n"}• Withdraw consent for data processing{"\n"}• File complaints
          with regulatory authorities
        </Text>

        <Text style={styles.sectionTitle}>Data Retention</Text>
        <Text style={styles.paragraph}>
          We retain your information for as long as necessary to provide our
          services and comply with legal obligations. Progress records are
          typically retained for 7 years or as required by applicable regulations. You may request deletion of your data, subject to legal
          requirements.
        </Text>

        <Text style={styles.sectionTitle}>Children&apos;s Privacy</Text>
        <Text style={styles.paragraph}>
          This app is designed for children, primarily those with lazy eye (amblyopia), and should only be used under adult supervision. We do not knowingly collect personal information from children under 3. If you are a parent or guardian and believe your child has provided us
          with personal information, please contact us immediately.
        </Text>

        <Text style={styles.sectionTitle}>International Transfers</Text>
        <Text style={styles.paragraph}>
          Your information may be transferred to and processed in countries
          other than your own. We ensure appropriate safeguards are in place to
          protect your information in accordance with applicable data protection
          laws.
        </Text>

        <Text style={styles.sectionTitle}>Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. We will notify
          you of any material changes by posting the new Privacy Policy within
          the app and updating the &quot;Last updated&quot; date. Your continued
          use of the app after such changes constitutes acceptance of the
          updated policy.
        </Text>

        <Text style={styles.sectionTitle}>Contact Information</Text>
        <Text style={styles.paragraph}>
          If you have any questions about this Privacy Policy or our data
          practices, please contact us at:{"\n\n"}
          Email: privacy@ambieye.com{"\n"}
          Phone: +1 (555) 123-4567{"\n"}
          Address: 123 Healthcare Ave, Medical District, City, State 12345
        </Text>

        <Text style={styles.sectionTitle}>Consent</Text>
        <Text style={styles.paragraph}>
          By using Ambieye, you acknowledge that you have read, understood, and
          agree to be bound by this Privacy Policy and the above disclaimer. If you do not agree with these terms, please do not use our services.
        </Text>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  disclaimerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFCC00",
    marginTop: 30,
    marginBottom: 10,
    textAlign: "center",
  },
  disclaimerText: {
    fontSize: 14,
    color: "#FFD700",
    backgroundColor: "#2D1A60",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    textAlign: "center",
  },
  lastUpdated: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 25,
    marginBottom: 10,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginTop: 15,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: "#ddd",
    lineHeight: 22,
    marginBottom: 10,
    textAlign: "justify",
  },
  bottomPadding: {
    height: 30,
  },
});
