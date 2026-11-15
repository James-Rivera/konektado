/** Local visual QA harness. Uses production components; performs no network writes. */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RateRangeInput } from '@/components/RateRangeInput';
import { PreferenceField } from '@/components/profile/PreferenceField';
import { PostingReviewDetails } from '@/components/PostingReviewDetails';
import { PostOptionPickerSheet } from '@/components/PostOptionPickerSheet';
import { color, typography } from '@/constants/theme';
import type { RateType } from '@/types/marketplace.types';

function Harness() {
  const [mode, setMode] = useState('Provider');
  const [minimum, setMinimum] = useState('');
  const [maximum, setMaximum] = useState('');
  const [unit, setUnit] = useState<RateType>('per_service');
  const [negotiable, setNegotiable] = useState(false);
  const [availability, setAvailability] = useState('');
  const [picker, setPicker] = useState(false);
  return <ScrollView style={{ flex: 1, backgroundColor: color.background }} contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
    <Text style={typography.bodyMedium}>Konektado · local interaction checks</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {['Provider','Client','Profile'].map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: mode === value }} onPress={() => setMode(value)} style={{ minHeight: 44, padding: 12, backgroundColor: mode === value ? color.primarySoft : color.surfaceAlt, borderRadius: 20 }}><Text>{value}</Text></Pressable>)}
    </View>
    {mode === 'Profile' ? <PreferenceField label="When are you available?" options={['Weekdays','Weekends','Flexible']} value={availability} onChange={setAvailability} /> : <RateRangeInput label={mode === 'Provider' ? 'Your price' : 'Your budget'} minValue={minimum} maxValue={maximum} rateType={unit} negotiable={negotiable} onMinChange={setMinimum} onMaxChange={setMaximum} onRateTypeChange={setUnit} onNegotiableChange={setNegotiable} />}
    <Pressable accessibilityRole="button" onPress={() => setPicker(true)} style={{ minHeight: 44, padding: 12, backgroundColor: color.primarySoft }}><Text>Choose service</Text></Pressable>
    <PostingReviewDetails items={[
      { label: 'Description', value: 'I offer careful cleaning for homes in our barangay. This longer description wraps naturally and stays visible in the review, including supplies, timing and the scope of the work.' },
      { label: 'Price note', value: 'Cleaning supplies included. Please confirm the number of rooms through Messages.' },
      { label: 'Availability', value: 'Weekends, after 9:00 AM. Please message first to confirm a suitable time.' },
    ]} />
    <PostOptionPickerSheet title="Choose service" allOptions={['Carpentry','Cleaning','Laundry help']} description="Choose the help needed" searchPlaceholder="Search services" onClose={() => setPicker(false)} onSelect={() => setPicker(false)} selectedValue="" visible={picker} />
  </ScrollView>;
}
createRoot(document.getElementById('root')!).render(<SafeAreaProvider><Harness /></SafeAreaProvider>);
