import MasterCrudPage from '../components/MasterCrudPage';
import { itemCategoriesApi } from '../api/endpoints';

export default function ItemCategoriesPage() {
  return (
    <MasterCrudPage
      title="Categories"
      api={itemCategoriesApi}
      uploadHint="CSV with category names (Grocery, Vegetables, Coal, Gas, Oil, etc.)"
    />
  );
}
