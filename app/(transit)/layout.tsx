import TransitTabs from "../components/TransitTabs";

export default function TransitLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TransitTabs />
      <main className="flex-1">{children}</main>
    </>
  );
}
