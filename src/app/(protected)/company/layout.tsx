// import { TopBar } from '@/components/layouts/topbar';

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* <TopBar title="Company" /> */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
