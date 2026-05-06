import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle
} from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return '#E5E7EB';
    switch (variant) {
      case 'primary': return '#E8447A';
      case 'secondary': return '#1A0A5E';
      case 'outline': return 'transparent';
      default: return '#E8447A';
    }
  };

  const getTextColor = () => {
    if (disabled) return '#9CA3AF';
    switch (variant) {
      case 'outline': return '#E8447A';
      default: return '#FFFFFF';
    }
  };

  const getBorderColor = () => {
    if (disabled) return '#E5E7EB';
    switch (variant) {
      case 'outline': return '#E8447A';
      default: return 'transparent';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small': return { paddingVertical: 8, paddingHorizontal: 14 };
      case 'medium': return { paddingVertical: 13, paddingHorizontal: 18 };
      case 'large': return { paddingVertical: 16, paddingHorizontal: 24 };
      default: return { paddingVertical: 13, paddingHorizontal: 18 };
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          ...getPadding(),
        },
        variant === 'primary' && !disabled && styles.primaryShadow,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            { color: getTextColor() },
            size === 'small' && { fontSize: 13 },
            size === 'large' && { fontSize: 17 },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    flexDirection: 'row',
    minWidth: 100,
  },
  primaryShadow: {
    shadowColor: '#E8447A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
