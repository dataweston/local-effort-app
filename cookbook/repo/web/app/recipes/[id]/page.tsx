import RecipePage from '../../../components/RecipePage';

export default function Page({ params }: { params: { id: string } }) {
  return <RecipePage id={params.id} />;
}
