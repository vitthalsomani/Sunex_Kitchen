import MasterCrudPage from '../components/MasterCrudPage';
import { unitsApi } from '../api/endpoints';

export default function UnitsPage() {
  return <MasterCrudPage title="Units" api={unitsApi} uploadHint="CSV with unit names (kg, litre, cylinder, etc.)" />;
}
