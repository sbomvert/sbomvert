'use client';
import { ImageScanForm } from "@/components/hoc/ImageScanForm/ImageScanForm";
import { FEATURE_FLAGS } from "@/lib/featureFlags";
import { useEffect, useState } from "react";




const Page = () => {

  const [jobId, setJobIdState] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [data, setData] = useState<string | null>(null);


  useEffect(() => {
    const interval = setInterval(() => {
        fetch(`/api/scan/status/${jobId ? jobId : 'recent'}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
    .then(response => response.json())
    .then(data => {
      console.log('Scan job submitted:', data);
      setData(data);
    })
    .catch(error => {
      console.error('Error submitting scan job:', error);
    });

    }, 2000);

    return () => clearInterval(interval);
  }, [jobId]);



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
      <div className="mt-4">
        { data && JSON.stringify(data)}
      </div>

    </>
  );
}

export default Page;