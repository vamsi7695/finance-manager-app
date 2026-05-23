import Header from './Header';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Header />
      <main className="pb-8">{children}</main>
    </div>
  );
}
