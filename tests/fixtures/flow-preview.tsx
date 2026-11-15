/** Actual editor, review and profile screens with synthetic local-only I/O. */
import { createRoot } from 'react-dom/client';
import { NavigationContainer,createNavigatorFactory,useNavigationBuilder,StackRouter } from 'expo-router/react-navigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Pressable,ScrollView,Text,View } from 'react-native';
import { FeedbackProvider } from '@/components/FeedbackProvider';
import JobEditor from '@/app/create-job';
import ServiceEditor from '@/app/create-service';
import JobReview from '@/app/create-job-preview';
import ServiceReview from '@/app/create-service-preview';
import ProfileEditor from '@/app/profile/complete';
import { useRouter } from './flow-router';
import { readStore,resetStore,useStore,writeStore } from './flow-data';

function Navigator({children,initialRouteName}:{children:React.ReactNode;initialRouteName?:string}) {
  const {state,descriptors,NavigationContent}=useNavigationBuilder(StackRouter,{children,initialRouteName});
  return <NavigationContent><View style={{flex:1}}>{state.routes.map((route,index)=><View key={route.key} style={{flex:1,display:index===state.index?'flex':'none'}}>{descriptors[route.key].render()}</View>)}</View></NavigationContent>;
}
const Stack=createNavigatorFactory(Navigator)();
function Home() {
  const router=useRouter(),store=useStore();
  const go=(pathname:string,params?:object)=>router.push({pathname,params});
  return <ScrollView contentContainerStyle={{padding:20,gap:12}}>
    <Text style={{fontSize:20}}>Local full-flow checks · synthetic data</Text>
    {[['New job','/create-job',{}],['Edit job','/create-job',{jobId:'job-one'}],['Repair older job','/create-job',{jobId:'job-legacy'}],['New service','/create-service',{}],['Edit service','/create-service',{serviceId:'service-one'}],['Work profile','/profile/complete',{mode:'work'}],['Hiring profile','/profile/complete',{mode:'hiring'}]].map(([label,path,params])=><Pressable key={String(label)} accessibilityRole="button" onPress={()=>go(String(path),params as object)} style={{padding:12,minHeight:44,backgroundColor:'#EAF2FF'}}><Text>{String(label)}</Text></Pressable>)}
    {['job','service'].flatMap(kind=>store.tables[kind+'_drafts'].map(draft=><Pressable key={String(draft.id)} accessibilityRole="button" onPress={()=>go('/create-'+kind,{draftId:draft.id})} style={{padding:12,minHeight:44}}><Text>Resume {kind}: {String(draft.title || 'Untitled')}</Text></Pressable>))}
    <Text accessibilityRole="header">Published listings</Text>
    {store.tables.jobs.concat(store.tables.services).map(row=><Text key={String(row.id)}>{String(row.id)}: {String(row.title)} · {String(row.description)}</Text>)}
    <Pressable accessibilityRole="button" onPress={resetStore} style={{padding:12,minHeight:44}}><Text>Reset synthetic data</Text></Pressable>
  </ScrollView>;
}
function Controls() {
  const store=useStore();
  return <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,padding:8,backgroundColor:'#F3F4F6'}}>
    <Pressable accessibilityRole="button" onPress={()=>{const s=readStore();s.offline=!s.offline;writeStore(s);}} style={{minHeight:44,justifyContent:'center'}}><Text>{store.offline?'Reconnect':'Simulate offline'}</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={()=>{const s=readStore();const row=s.tables.jobs[0];row.content_version=Number(row.content_version)+1;row.description='A newer change from another session';writeStore(s);}} style={{minHeight:44,justifyContent:'center'}}><Text>Change published job elsewhere</Text></Pressable>
  </View>;
}
function App() {
  let initialState;try { initialState=JSON.parse(sessionStorage.getItem('qa-navigation') || 'null') ?? undefined; }catch { /* no restored navigation */ }
  return <SafeAreaProvider><FeedbackProvider><NavigationContainer initialState={initialState} onStateChange={state=>sessionStorage.setItem('qa-navigation',JSON.stringify(state))}><View style={{flex:1}}><Controls/><Stack.Navigator initialRouteName="/qa"><Stack.Screen name="/qa" component={Home}/><Stack.Screen name="/create-job" component={JobEditor}/><Stack.Screen name="/create-service" component={ServiceEditor}/><Stack.Screen name="/create-job-preview" component={JobReview}/><Stack.Screen name="/create-service-preview" component={ServiceReview}/><Stack.Screen name="/profile/complete" component={ProfileEditor}/>{['/post/active','/(tabs)/post','/(tabs)/profile','/job/[jobId]'].map(name=><Stack.Screen key={name} name={name} component={Home}/>)}</Stack.Navigator></View></NavigationContainer></FeedbackProvider></SafeAreaProvider>;
}
createRoot(document.getElementById('root')!).render(<App/>);
