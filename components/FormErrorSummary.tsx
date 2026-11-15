import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, space, typography } from '@/constants/theme';

export function FormErrorSummary({ errors,onSelect,title='Check these details' }: {
  errors:Record<string,string | undefined>; onSelect:(field:string) => void; title?:string;
}) {
  const items = Object.entries(errors).filter((item):item is [string,string] => Boolean(item[1]));
  if (!items.length) return null;
  return <View style={styles.panel}>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    {items.map(([field,message]) => <Pressable key={field} accessibilityRole="button" accessibilityLabel={`Fix: ${message}`} onPress={() => onSelect(field)} style={styles.link}>
      <Text style={styles.text}>{message}</Text>
    </Pressable>)}
  </View>;
}
const styles = StyleSheet.create({
  panel:{padding:space.md,gap:space.xs,borderRadius:radius.md,backgroundColor:color.dangerSoft,borderWidth:1,borderColor:color.danger},
  title:{...typography.bodyMedium,color:color.text},link:{minHeight:44,justifyContent:'center'},
  text:{...typography.body,color:color.primaryText,textDecorationLine:'underline',flexShrink:1},
});
