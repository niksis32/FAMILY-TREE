import { GedcomImportPanel } from '@/components/gedcom-import-panel';
import { PageHeader } from '@/components/ui';

export default function SettingsImportPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="GEDCOM import"
        description="Preview перед импортом .ged: базовые теги INDI, FAM, NAME, SEX, BIRT, DEAT, FAMS, FAMC, HUSB, WIFE, CHIL, MARR, SOUR и NOTE."
      />
      <GedcomImportPanel />
    </div>
  );
}
