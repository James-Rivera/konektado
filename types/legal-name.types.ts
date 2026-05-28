export type LegalNameEditState =
  | 'draft'
  | 'pending'
  | 'verified'
  | 'needs_name_correction'
  | 'needs_other_correction'
  | 'rejected';

export type LegalNameEditPolicy = {
  canEdit: boolean;
  canRequestCorrection: boolean;
  message: string;
  state: LegalNameEditState;
};
