import { ReportDetail } from './report-detail';

export default async function ReportDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return (
    <div className="container mx-auto py-8 px-4">
      <ReportDetail id={id} />
    </div>
  );
}
