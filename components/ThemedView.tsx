import { View, type ViewProps } from "react-native";

// import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedViewProps = ViewProps & {
  backgroundColor?: string;
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({
  style,
  backgroundColor,
  lightColor,
  darkColor,
  ...otherProps
}: ThemedViewProps) {
  // const backgroundColor = useThemeColor(
  //   { light: lightColor, dark: darkColor },
  //   "background"
  // );

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
