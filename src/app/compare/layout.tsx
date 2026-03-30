import Sidebar from "@/components/layout/Sidebar";
import React from "react";

type Props = {
  children: React.ReactNode;
};


export default function AppLayout({ children }: Props) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <main className="p-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </main>
    </div>
  );
}