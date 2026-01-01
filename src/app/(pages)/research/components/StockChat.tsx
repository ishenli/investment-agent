import { ChatActionsBar, ChatList, ChatMessage } from '@lobehub/ui/chat';

interface StockChatProps {
  data: ChatMessage[];
}

export default function StockChat({ data }: StockChatProps) {
  return (
    <ChatList
      data={data}
      showTitle={true}
      renderActions={{
        default: ChatActionsBar,
      }}
      renderMessages={{
        default: ({ id, editableContent }) => <div id={id}>{editableContent}</div>,
      }}
      style={{ width: '100%' }}
    />
  );
}
