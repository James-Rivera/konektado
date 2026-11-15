import { useMemo } from 'react';
import { StackActions, useNavigation, useRoute } from 'expo-router/react-navigation';
export { useNavigation,useFocusEffect } from 'expo-router/react-navigation';
export function useLocalSearchParams() { return useRoute().params ?? {}; }
export function useRouter() {
  const navigation=useNavigation();
  return useMemo(()=>({
    push:(route:string|{pathname:string;params?:object})=>navigation.dispatch(StackActions.push(typeof route==='string'?route:route.pathname,typeof route==='string'?undefined:route.params)),
    replace:(route:string|{pathname:string;params?:object})=>navigation.dispatch(StackActions.replace(typeof route==='string'?route:route.pathname,typeof route==='string'?undefined:route.params)),
    dismissTo:(route:string|{pathname:string;params?:object})=>navigation.dispatch(StackActions.popTo(typeof route==='string'?route:route.pathname,typeof route==='string'?undefined:route.params)),
    back:()=>navigation.goBack(),canGoBack:()=>navigation.canGoBack(),setParams:(params:object)=>navigation.setParams(params as never),
  }),[navigation]);
}
