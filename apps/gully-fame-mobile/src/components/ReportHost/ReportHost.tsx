import { useEffect, useState } from "react";
import ReportReelModal from "@/components/modals/ReportReelModal/ReportReelModal";
import { setReportListener, type ReportRequest } from "@/utils/moderation";
import { toastSuccess } from "@/components/ui/Toast";

/**
 * Mounted once in the signed-in layout. Any screen can call reportContent(kind, id) from
 * src/utils/moderation.ts and this shows the report sheet for it.
 */
export default function ReportHost() {
  const [request, setRequest] = useState<ReportRequest | null>(null);

  useEffect(() => {
    setReportListener(setRequest);
    return () => setReportListener(null);
  }, []);

  return (
    <ReportReelModal
      visible={!!request}
      reelId={request?.id ?? null}
      kind={request?.kind ?? "reel"}
      onClose={() => setRequest(null)}
      onReported={() => {
        setRequest(null);
        toastSuccess("Thanks, our team will review this report");
      }}
    />
  );
}
