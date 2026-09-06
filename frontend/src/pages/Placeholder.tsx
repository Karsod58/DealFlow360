import { NavBar } from '../components/shared';

interface PlaceholderProps {
  title: string;
  description: string;
}

export function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <>
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <h1 className="text-3xl font-bold text-dark-text mb-4">{title}</h1>
          <p className="text-dark-muted">{description}</p>
        </div>
      </div>
    </>
  );
}
