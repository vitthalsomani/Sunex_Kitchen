import MasterCrudPage from '../components/MasterCrudPage';
import { contractorsApi } from '../api/endpoints';

export default function ContractorsPage() {
  return <MasterCrudPage title="Contractors" api={contractorsApi} />;
}
