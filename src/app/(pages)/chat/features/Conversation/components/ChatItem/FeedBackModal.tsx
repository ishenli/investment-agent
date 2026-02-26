import { Button, Modal } from '@lobehub/ui';
import { Input, Radio } from 'antd';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('chat');
  const [selectedOptions, setSelectedOptions] = useState({
    misunderstanding: '',
    poorAnswer: '',
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
      title={t('feedback.title')}
      open={visible}
      onCancel={onClose}
      footer={
        <>
          <Button onClick={onClose} type="default">
            {t('feedback.cancel')}
          </Button>
          <Button onClick={handleSubmit} type="primary">
            {t('feedback.submit')}
          </Button>
        </>
      }
    >
      <div style={{ padding: '20px 0' }}>
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>{t('feedback.misunderstanding.title')}</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <Radio
              checked={selectedOptions.misunderstanding === 'noUnderstandInstruction'}
              onChange={() => handleOptionChange('misunderstanding', 'noUnderstandInstruction')}
            >
              {t('feedback.misunderstanding.noUnderstandInstruction')}
            </Radio>
            <Radio
              checked={selectedOptions.misunderstanding === 'cannotUnderstandContext'}
              onChange={() => handleOptionChange('misunderstanding', 'cannotUnderstandContext')}
            >
              {t('feedback.misunderstanding.cannotUnderstandContext')}
            </Radio>
            <Radio
              checked={selectedOptions.misunderstanding === 'answerNotRelevant'}
              onChange={() => handleOptionChange('misunderstanding', 'answerNotRelevant')}
            >
              {t('feedback.misunderstanding.answerNotRelevant')}
            </Radio>
            <Radio
              checked={selectedOptions.misunderstanding === 'missedProblem'}
              onChange={() => handleOptionChange('misunderstanding', 'missedProblem')}
            >
              {t('feedback.misunderstanding.missedProblem')}
            </Radio>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>{t('feedback.poorAnswer.title')}</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <Radio
              checked={selectedOptions.poorAnswer === 'repetitiveAnswer'}
              onChange={() => handleOptionChange('poorAnswer', 'repetitiveAnswer')}
            >
              {t('feedback.poorAnswer.repetitiveAnswer')}
            </Radio>
            <Radio
              checked={selectedOptions.poorAnswer === 'logicalConfusion'}
              onChange={() => handleOptionChange('poorAnswer', 'logicalConfusion')}
            >
              {t('feedback.poorAnswer.logicalConfusion')}
            </Radio>
            <Radio
              checked={selectedOptions.poorAnswer === 'formatError'}
              onChange={() => handleOptionChange('poorAnswer', 'formatError')}
            >
              {t('feedback.poorAnswer.formatError')}
            </Radio>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>{t('feedback.betterAnswer.title')}</h4>
          <Input.TextArea
            placeholder={t('feedback.betterAnswer.placeholder')}
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
