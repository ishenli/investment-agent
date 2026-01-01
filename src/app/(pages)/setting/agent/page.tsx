import { AgentManagement } from './agent-management';

export default function AgentPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <AgentManagement />
    </div>
  );
}
