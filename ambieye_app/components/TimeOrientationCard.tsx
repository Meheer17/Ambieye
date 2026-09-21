import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Animated } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "@/constants/i18n";
import { Colors, BorderRadius, Shadows, Spacing } from "@/constants/theme";

export default function TimeOrientationCard() {
  const { t, currentLang } = useTranslation();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getDayName = (date: Date) => {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  };

  const getFormattedDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getFormattedTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getSeason = (date: Date) => {
    const month = date.getMonth(); // 0 = Jan, 11 = Dec
    if (month >= 2 && month <= 4) return { name: "Spring", emoji: "🌸", color: "#EC4899" };
    if (month >= 5 && month <= 7) return { name: "Monsoon / Summer", emoji: "🌦️", color: "#0284C7" };
    if (month >= 8 && month <= 9) return { name: "Autumn", emoji: "🍂", color: "#D97706" };
    return { name: "Winter", emoji: "❄️", color: "#6366F1" };
  };

  const getTimeOfDay = (date: Date) => {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) {
      return { label: "Morning", icon: "weather-sunset-up", bg: "#EFF6FF", text: "#1D4ED8", emoji: "🌅" };
    }
    if (hour >= 12 && hour < 17) {
      return { label: "Afternoon", icon: "weather-sunny", bg: "#FEF3C7", text: "#B45309", emoji: "☀️" };
    }
    if (hour >= 17 && hour < 21) {
      return { label: "Evening", icon: "weather-sunset-down", bg: "#FFEDD5", text: "#C2410C", emoji: "🌇" };
    }
    return { label: "Night", icon: "weather-night", bg: "#F3E8FF", text: "#7E22CE", emoji: "🌙" };
  };

  const season = getSeason(currentTime);
  const timeOfDay = getTimeOfDay(currentTime);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        {/* Time of Day Badge */}
        <View style={[styles.timeOfDayBadge, { backgroundColor: timeOfDay.bg }]}>
          <Text style={styles.timeOfDayEmoji}>{timeOfDay.emoji}</Text>
          <Text style={[styles.timeOfDayText, { color: timeOfDay.text }]}>
            {timeOfDay.label}
          </Text>
        </View>

        {/* Season Badge */}
        <View style={styles.seasonBadge}>
          <Text style={styles.seasonEmoji}>{season.emoji}</Text>
          <Text style={styles.seasonText}>{season.name}</Text>
        </View>
      </View>

      <View style={styles.mainInfo}>
        {/* Big Day of Week */}
        <Text style={styles.dayText}>{getDayName(currentTime)}</Text>

        {/* Full Date */}
        <Text style={styles.dateText}>{getFormattedDate(currentTime)}</Text>

        {/* Live Digital Clock */}
        <View style={styles.clockRow}>
          <Feather name="clock" size={18} color="#2563EB" />
          <Text style={styles.clockText}>{getFormattedTime(currentTime)}</Text>
        </View>
      </View>

      <View style={styles.footerNote}>
        <Feather name="compass" size={13} color="#64748B" />
        <Text style={styles.footerText}>Always-visible Time & Day Orientation for Comfort</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    ...Shadows.md,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  timeOfDayBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  timeOfDayEmoji: {
    fontSize: 16,
  },
  timeOfDayText: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  seasonBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
  },
  seasonEmoji: {
    fontSize: 14,
  },
  seasonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  mainInfo: {
    alignItems: "center",
    marginVertical: 4,
  },
  dayText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#475569",
    marginTop: 2,
    marginBottom: 8,
  },
  clockRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  clockText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E40AF",
    letterSpacing: 1,
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
    gap: 6,
  },
  footerText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
});
