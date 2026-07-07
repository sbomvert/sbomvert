'use client';
import { ImageScanForm } from "@/components/hoc/ImageScanForm/ImageScanForm";
import { RecentScans } from "@/components/hoc/RecentScans/RecentScans";
import {useState } from "react";




const Page = () => {

  const [, setJobIdState] = useState<string | null>(null);
  const [, setJobStatus] = useState<string | null>(null);

  const handleScanSubmit = async (image: string, tools: { producers: string[], consumers: string[] }) => {
    const payload = { image, tools };
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setJobIdState(data.jobId);
        setJobStatus('running');
      } else {
        alert(data.error || 'Failed to start scan');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to start scan');
    }
  };


  return (
    <>
      <ImageScanForm
        onSubmit={handleScanSubmit} onCancel={function (): void {
          throw new Error("Function not implemented.");
        }} />
      <RecentScans />
    </>
  );
}

export default Page;
