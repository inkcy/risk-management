import { getSessionUser } from '@/lib/auth';
import IncidentReportForm from '@/components/IncidentReportForm';

export const dynamic = 'force-dynamic';

export default async function ReportPage() {
  const user = await getSessionUser();
  return <IncidentReportForm canExportSaved={user?.role === 'admin'} />;
}
