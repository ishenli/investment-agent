import { Button, Modal } from '@lobehub/ui';
import { Input, Radio } from 'antd';
import React, { useState } from 'react';

export type FeedbackOptions = {
  misunderstanding: string;
  poorAnswer: string;
  betterAnswer: string;
};

interface FeedBackModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (feedback: FeedbackOptions) => void;
}

const FeedBackModal = ({ visible, onClose, onSubmit }: FeedBackModalProps) => {
  const [selectedOptions, setSelectedOptions] = useState({
    misunderstanding: '',
    poorAnswer: '',
    harmfulInfo: '',
  });
  const [betterAnswer, setBetterAnswer] = useState('');

  const handleOptionChange = (category: string, value: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [category]: value,
    }));
  };

  const handleSubmit = () => {
    onSubmit({
      misunderstanding: selectedOptions.misunderstanding,
      poorAnswer: selectedOptions.poorAnswer,
      betterAnswer,
    });
    onClose();
  };

  return (
    <Modal
      title="进一步反馈"
      open={visible}
      onCancel={onClose}
      footer={
        <>
          <Button onClick={onClose} type="default">
            取消
          </Button>
          <Button onClick={handleSubmit} type="primary">
            提交
          </Button>
        </>
      }
    >
      <div style={{ padding: '20px 0' }}>
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>理解问题有误</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <Radio
              checked={selectedOptions.misunderstanding === 'noUnderstandInstruction'}
              onChange={() => handleOptionChange('misunderstanding', 'noUnderstandInstruction')}
            >
              没有理解指令
            </Radio>
            <Radio
              checked={selectedOptions.misunderstanding === 'cannotUnderstandContext'}
              onChange={() => handleOptionChange('misunderstanding', 'cannotUnderstandContext')}
            >
              无法理解上下文
            </Radio>
            <Radio
              checked={selectedOptions.misunderstanding === 'answerNotRelevant'}
              onChange={() => handleOptionChange('misunderstanding', 'answerNotRelevant')}
            >
              答非所问
            </Radio>
            <Radio
              checked={selectedOptions.misunderstanding === 'missedProblem'}
              onChange={() => handleOptionChange('misunderstanding', 'missedProblem')}
            >
              未发现问题做的错误
            </Radio>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>回答不佳</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <Radio
              checked={selectedOptions.poorAnswer === 'repetitiveAnswer'}
              onChange={() => handleOptionChange('poorAnswer', 'repetitiveAnswer')}
            >
              回答有重复
            </Radio>
            <Radio
              checked={selectedOptions.poorAnswer === 'logicalConfusion'}
              onChange={() => handleOptionChange('poorAnswer', 'logicalConfusion')}
            >
              回答逻辑混乱
            </Radio>
            <Radio
              checked={selectedOptions.poorAnswer === 'formatError'}
              onChange={() => handleOptionChange('poorAnswer', 'formatError')}
            >
              答案格式错误
            </Radio>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>您认为更理想的回答是什么？</h4>
          <Input.TextArea
            placeholder="请输入"
            value={betterAnswer}
            onChange={(e) => setBetterAnswer(e.target.value)}
            rows={4}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </Modal>
  );
};

export default FeedBackModal;
