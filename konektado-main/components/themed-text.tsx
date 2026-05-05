import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontFamily: 'Satoshi-Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontFamily: 'Satoshi-Black',
    fontSize: 32,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
  },
  link: {
    fontFamily: 'Satoshi-Regular',
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
});
