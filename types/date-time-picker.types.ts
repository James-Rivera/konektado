export type DateTimePickerMode = 'date' | 'time';

/** Mounted only while open. Selection commits; dismissal never changes a value. */
export type DateTimePickerProps = {
  label: string;
  mode: DateTimePickerMode;
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onSelect: (value: Date) => void;
  onDismiss: () => void;
};
