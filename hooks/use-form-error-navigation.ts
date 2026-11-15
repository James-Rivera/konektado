import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { AccessibilityInfo, findNodeHandle, Platform, type ScrollView } from 'react-native';

type FieldTarget = { focus?: () => void; focusError?: () => void; measureLayout?: (parent: unknown, success: (x:number,y:number) => void, failure: () => void) => void };
export function useFormErrorNavigation(scroll: RefObject<ScrollView | null>, actions: Record<string,() => void> = {}) {
  const targets = useRef(new Map<string,FieldTarget>());
  const actionRef = useRef(actions);
  useEffect(() => { actionRef.current = actions; });
  const register = useCallback((field:string) => (node:unknown) => {
    if (node) targets.current.set(field,node as FieldTarget); else targets.current.delete(field);
  },[]);
  const focusField = useCallback((field:string) => {
    requestAnimationFrame(() => {
      const target = targets.current.get(field);
      const focus = () => {
        if (actionRef.current[field]) actionRef.current[field]();
        else if (target?.focusError) target.focusError();
        else if (target?.focus) target.focus();
        else if (Platform.OS !== 'web' && target) {
          const handle = findNodeHandle(target as Parameters<typeof findNodeHandle>[0]);
          if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
        }
      };
      const parent = scroll.current?.getInnerViewNode();
      if (target?.measureLayout && parent) {
        target.measureLayout(parent,(_x,y) => { scroll.current?.scrollTo({y:Math.max(y-24,0),animated:false}); focus(); },focus);
      } else focus();
    });
  },[scroll]);
  const focusFirstError = useCallback((errors:Record<string,string | undefined>) => {
    const fields = Object.keys(errors).filter(key => errors[key]);
    if (!fields.length) return;
    AccessibilityInfo.announceForAccessibility(`Please correct ${fields.length} ${fields.length === 1 ? 'detail' : 'details'}.`);
    focusField(fields[0]);
  },[focusField]);
  return { register,focusField,focusFirstError };
}
