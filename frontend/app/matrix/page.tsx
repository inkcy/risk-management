import { RiskMatrixAssessment } from '@/components/RiskMatrixAssessment';
import { MatrixAiAnalysis } from '@/components/MatrixAiAnalysis';

export default function MatrixPage() {
  return <><MatrixAiAnalysis aiEnabled={!!process.env.GEMINI_API_KEY?.trim()} /><RiskMatrixAssessment /></>;
}
