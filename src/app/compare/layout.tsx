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
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}