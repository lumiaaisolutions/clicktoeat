import { BrandLoader } from '@/components/ui/BrandLoader';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[150]">
      <BrandLoader />
    </div>
  );
}
