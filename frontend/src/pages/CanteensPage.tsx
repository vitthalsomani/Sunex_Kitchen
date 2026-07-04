import MasterCrudPage from '../components/MasterCrudPage';
import { canteensApi } from '../api/endpoints';

export default function CanteensPage() {
  return <MasterCrudPage title="Canteens" api={canteensApi} uploadHint="CSV with canteen names" />;
}
