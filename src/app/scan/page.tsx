'use client';
import { ImageScanForm } from "@/components/hoc/ImageScanForm/ImageScanForm";
import { RecentScans } from "@/components/hoc/RecentScans/RecentScans";
import { PageTitle } from "@/components/Title/Title";
import { SbomFormat } from "@sbomvert/scan/tools";
import {useState } from "react";




const Page = () => {

  const [, setJobIdState] = useState<string | null>(null);
  const [, setJobStatus] = useState<string | null>(null);

  const handleScanSubmit = async (
    image: string,
    tools: { producers: string[], consumers: string[] },
    formats: SbomFormat[]
  ) => {
    const payload = { image, tools, formats };
    // a failure throws to the form, which shows it next to the button
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `the server answered ${res.status}`);

    setJobIdState(data.jobId);
    setJobStatus('running');
  };


  return (
    <>
      <PageTitle title="Scan an image" subtitle="Generate SBOMs with each tool, then scan them for CVEs" />
      <ImageScanForm onSubmit={handleScanSubmit} />
      <RecentScans />
    </>
  );
}

export default Page;
