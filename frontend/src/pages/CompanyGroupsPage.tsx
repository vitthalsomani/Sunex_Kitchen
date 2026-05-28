import MasterCrudPage from '../components/MasterCrudPage';
import { companyGroupsApi } from '../api/endpoints';

export default function CompanyGroupsPage() {
  return (
    <MasterCrudPage
      title="Company Groups"
      api={companyGroupsApi}
      uploadHint="CSV: one column with group name (e.g. Company Staff, Company Helper)"
    />
  );
}
