import { AgentTypeResponse as Agent } from '@typings/agent';
import { AgentCard } from './AgentCard';
import { EmptyState } from './EmptyState';

interface AgentListProps {
  agents: Agent[];
  type: 'all' | 'builtin' | 'custom';
  onEditAgent: (agent: Agent) => void;
  onDeleteAgent: (agent: Agent) => void;
  onCreateAgent: () => void;
}

export function AgentList({ agents, type, onEditAgent, onDeleteAgent, onCreateAgent }: AgentListProps) {
  if (agents.length === 0) {
    return <EmptyState type={type} onCreateAgent={onCreateAgent} />;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          onEdit={onEditAgent}
          onDelete={onDeleteAgent}
        />
      ))}
    </div>
  );
}
