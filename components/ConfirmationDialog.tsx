import { useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, space, typography } from '@/constants/theme';

export function ConfirmationDialog({visible,title,message,confirmLabel='Discard changes',cancelLabel='Keep editing',busy=false,error,onCancel,onConfirm}: {
  visible:boolean;title:string;message:string;confirmLabel?:string;cancelLabel?:string;busy?:boolean;error?:string|null;onCancel:()=>void;onConfirm:()=>void;
}) {
  const cancelRef = useRef<View>(null);
  const focusCancel = () => {
    if (Platform.OS === 'web') cancelRef.current?.focus();
    else {
      const node = findNodeHandle(cancelRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }
  };
  return <Modal visible={visible} transparent animationType="fade" onShow={focusCancel} onRequestClose={busy ? undefined : onCancel} accessibilityLabel={title}>
    <View style={styles.overlay}><View accessibilityViewIsModal style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Pressable ref={cancelRef} accessibilityRole="button" disabled={busy} onPress={onCancel} style={styles.button}><Text style={styles.cancel}>{cancelLabel}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onConfirm} style={[styles.button,styles.confirm]}><Text style={styles.confirmText}>{busy?'Please wait…':confirmLabel}</Text></Pressable>
    </View></View>
  </Modal>;
}
const styles=StyleSheet.create({
  overlay:{flex:1,justifyContent:'center',padding:space.xl,backgroundColor:'rgba(0,0,0,0.35)'},
  card:{width:'100%',maxWidth:440,alignSelf:'center',backgroundColor:color.background,borderRadius:radius.lg,padding:space.lg,gap:space.md},
  title:{...typography.bodyMedium,color:color.text},message:{...typography.body,color:color.textMuted},error:{...typography.caption,color:color.danger},
  button:{minHeight:48,justifyContent:'center',alignItems:'center',padding:space.md,borderWidth:1,borderColor:color.border,borderRadius:radius.md},
  cancel:{...typography.bodyMedium,color:color.primaryText},confirm:{backgroundColor:color.primaryText,borderColor:color.primaryText},confirmText:{...typography.bodyMedium,color:color.background},
});
