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
  // Determine background color based on variant
  const getBackgroundColor = () => {
    if (disabled) return '#cccccc';
    switch (variant) {
      case 'primary':
        return '#5f2446';
      case 'secondary':
        return '#0D0145';
      case 'outline':
        return 'transparent';
      default:
        return '#5f2446';
    }
  };

  // Determine text color based on variant
  const getTextColor = () => {
    if (disabled) return '#666666';
    switch (variant) {
      case 'outline':
        return '#5f2446';
      default:
        return '#FFFFFF';
    }
  };

  // Determine border color based on variant
  const getBorderColor = () => {
    if (disabled) return '#cccccc';
    switch (variant) {
      case 'outline':
        return '#5f2446';
      default:
        return 'transparent';
    }
  };

  // Determine button padding based on size
  const getPadding = () => {
    switch (size) {
      case 'small':
        return { paddingVertical: 8, paddingHorizontal: 12 };
      case 'medium':
        return { paddingVertical: 12, paddingHorizontal: 16 };
      case 'large':
        return { paddingVertical: 16, paddingHorizontal: 20 };
      default:
        return { paddingVertical: 12, paddingHorizontal: 16 };
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
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            { color: getTextColor() },
            size === 'small' && { fontSize: 14 },
            size === 'large' && { fontSize: 18 },
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
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    minWidth: 100,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});